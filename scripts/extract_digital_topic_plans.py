"""Extract source-anchored review candidates from vector PDF thematic tables.

No candidate is a verified plan. Preserve chapter, PDF page, cell geometry,
semester markers, and unresolved rows for independent review.
"""
from __future__ import annotations
import argparse
import json
import re
from pathlib import Path
import fitz

def clean(value):
    return re.sub(r'\s+', ' ', value or '').strip()

def contains(outer, inner):
    return all((outer[i] <= inner[i]+.2 if i<2 else outer[i] >= inner[i]-.2) for i in range(4))

def hour_amount(value):
    # Contact hours come first; the following practical-preparation subtotal
    # belongs to those hours. Decimal or mixed cells remain unresolved.
    value=clean(value)
    # A page break may leave only «6 из них на ПП» from the preceding
    # «8 / 6 из них на ПП» cell. This is an included subtotal, not six new hours.
    if re.match(r'^\d+\s+из\s+них\s+на\s+ПП\b',value,re.I):return None
    match=re.match(r'^(\d{1,3})(?=$|\s|\(|,\s)',value)
    return int(match[1]) if match else None

def chapter_title(text):
    if not re.search(r'РАБОЧАЯ\s+ПРОГРАММА',text[:1800]):return None
    match=re.search(r'(?:По дисциплине|Дисциплина|по дисциплине)\s*(.+?)(?:\(наименование|Специалитет)',text,re.S)
    return clean(match[1]) if match else None

def extract_theme_flow(doc, chapter):
    """Reconcile merged theme cells across pages, keeping source totals separate.

    This second pass is deliberately limited to explicitly numbered «Тема» tables.
    It never infers missing hours or promotes its output to a reviewed plan.
    """
    rows=[]; totals=[]; columns=None; kind=None; semester=None; active=None
    for index in range(chapter['startPage']-1,chapter['endPage']):
        page=doc[index];blocks=page.get_text('blocks');events=[]
        for block in blocks:
            value=clean(block[4])
            if re.search(r'4\.[34].{0,12}Темат',value,re.I):
                typ='practice' if re.search(r'семинар|практич',value,re.I) else 'lecture'
                events.append((block[1],0,'kind',typ))
            elif re.match(r'(?:4\.5\s+Содержание|5\.?\s+(?:ОБРАЗОВАТЕЛЬНЫЕ|ОЦЕНОЧНЫЕ|ОЦЕНКА|ОРГАНИЗАЦИЯ|УЧЕБНО-МЕТОДИЧЕСКОЕ)|6\.?\s+(?:ОЦЕНОЧНЫЕ|УЧЕБНО)|Приложение\s*№?\s*1)',value,re.I):
                events.append((block[1],0,'kind',None))
            m=re.search(r'Курс\s*[-–—]?\s*([1-6]).{0,15}?семестр\s*[-–—]?\s*(1[012]|[1-9])(?=\D|$)',value,re.I)
            if m and (int(m[2])+1)//2==int(m[1]):events.append((block[1],1,'semester',int(m[2])))
        if kind is None and not any(e[2]=='kind' and e[3] for e in events):continue
        textpage=page.get_textpage();cache={}
        def cell_text(c):
            key=tuple(c)
            if key not in cache:cache[key]=clean(page.get_textbox(c,textpage=textpage))
            return cache[key]
        try:cells=sorted(set(tuple(c) for t in page.find_tables().tables for c in t.cells),key=lambda c:(c[1],c[0]))
        except Exception:continue
        for c in cells:
            if 'наименованиетемы' in re.sub(r'\s+','',cell_text(c)).lower() and c[3]-c[1]<150:
                hc=next((h for h in cells if abs(h[1]-c[1])<12 and re.match('Час',cell_text(h),re.I)),None)
                if hc:columns=((c[0],c[2]),(hc[0],hc[2]));events.append((c[3],2,'header',None))
        if columns is None:
            for _,_,action,value in sorted(events):
                if action=='kind':kind=value
            continue
        tc,hc=columns
        # Numbered theme labels locate starts even when a PDF has spurious narrow cells.
        starts={};theme_cells=[]
        for c in sorted(cells,key=lambda c:-(c[2]-c[0])*(c[3]-c[1])):
            if c[0]>=tc[0]-2 and c[2]<=tc[1]+2 and c[2]-c[0]>(tc[1]-tc[0])/2:
                value=cell_text(c)
                m=re.match(r'^Тема\s*(\d+(?:\.\d+)*)\.?\s*',value,re.I)
                if m:
                    if any(code==m[1] and contains(outer,c) for code,outer in theme_cells):continue
                    theme_cells.append((m[1],c))
                    key=(m[1],round(c[1],1));starts[key]=min(starts.get(key,c[1]),c[1])
            value=cell_text(c)
            if c[0]<tc[1] and c[2]>tc[0] and re.match(r'^(?:Всего|Итого)',value,re.I):events.append((c[1],2,'total',value))
        for (code,_),y in starts.items():events.append((y,3,'theme',code))
        for block in page.get_text('dict',clip=fitz.Rect(tc[0],0,tc[1],page.rect.height))['blocks']:
            for line in block.get('lines',[]):
                value=clean(''.join(s['text'] for s in line['spans']))
                if value:events.append((line['bbox'][1]+.5,5,'title',value))
        hcenter=(hc[0]+hc[1])/2
        seen=set();hour_cells=[]
        for c in sorted(cells,key=lambda c:-(c[2]-c[0])*(c[3]-c[1])):
            if c[0]<=hcenter<=c[2] and c[2]-c[0]<90:
                value=cell_text(c)
                # A footnote, total or malformed “42” is preserved, never corrected here.
                amount=hour_amount(value)
                if amount is not None:
                    if any(contains(outer,c) for outer in hour_cells):continue
                    hour_cells.append(c)
                    # A real hour cell and a PDF's artificial text-line cell can
                    # overlap. Their common top and value identify one amount.
                    key=(round(c[1],1),amount)
                    if key not in seen:events.append((c[1]+.75,6,'hours',amount));seen.add(key)
        total=None;header=False
        for y,_,action,value in sorted(events):
            if action=='kind':kind=value;active=None;total=None;header=False
            elif action=='semester':semester=value;active=None;total=None
            elif action=='header':header=True
            elif action=='theme' and kind:
                active={'type':kind,'semester':semester,'code':value,'title':'','hours':0,'page':index+1,'endPage':index+1,'fragments':[]}
                rows.append(active);total=None;header=False
            elif action=='total' and kind:
                total={'type':kind,'semester':semester,'label':value,'hours':0,'page':index+1};totals.append(total);active=None
            elif action=='title' and active and not header:
                title=re.sub(r'^Тема\s*\d+(?:\.\d+)*\.?\s*','',value,flags=re.I)
                if title and not re.search(r'^(?:Раздел|Курс|Всего|Итого|Наименование|темы занятия)',title,re.I):
                    active['title']=clean(active['title']+' '+title);active['endPage']=index+1
            elif action=='hours' and kind:
                # A source total is one amount. Spurious cells around a
                # preparation subtotal must not be added to that total.
                if total and not total['hours']:total['hours']=value
                elif active:
                    active['hours']+=value;active['endPage']=index+1
                    active['fragments'].append({'page':index+1,'y':round(y,2),'hours':value})
    return {'rows':rows,'totals':totals}

def extract_pdf(path, selected=None):
    doc=fitz.open(path);chapters=[];current=None;kind=None;columns={};semester=None
    for index,page in enumerate(doc):
        text=page.get_text();title=chapter_title(text)
        if title:
            current={'subject':title,'startPage':index+1,'rows':[],'totals':[],'warnings':[],'sectionPages':{}}
            chapters.append(current);kind=None;columns={};semester=None
            if not selected or any(s.casefold() in title.casefold() for s in selected):print(f'Reading page {index+1}: {title}',flush=True)
        if current is None or (selected and not any(s.casefold() in current['subject'].casefold() for s in selected)):continue
        # Only the actual thematic sections; never assessment/question lists.
        headings=[]
        for block in page.get_text('blocks'):
            value=clean(block[4])
            if re.search(r'4\.[34].{0,12}Темат',value,re.I):
                typ='practice' if re.search(r'семинар',value,re.I) else 'lecture'
                headings.append((block[1],typ));current['sectionPages'].setdefault(typ,index+1)
            # A table's fifth numbered lesson is not document section five.
            elif re.match(r'(?:4\.5\s+Содержание|5\.?\s+(?:ОБРАЗОВАТЕЛЬНЫЕ|ОЦЕНОЧНЫЕ|ОЦЕНКА|ОРГАНИЗАЦИЯ|УЧЕБНО-МЕТОДИЧЕСКОЕ)|6\.?\s+(?:ОЦЕНОЧНЫЕ|УЧЕБНО)|Приложение\s*№?\s*1)',value,re.I):headings.append((block[1],None))
        markers=[]
        for block in page.get_text('blocks'):
            value=clean(block[4]);m=re.search(r'Курс\s*[-–—]?\s*([1-6]).{0,15}?семестр\s*[-–—]?\s*(1[012]|[1-9])(?=\D|$)',value,re.I)
            if m and (int(m[2])+1)//2==int(m[1]):markers.append((block[1],int(m[2])))
        if not kind and not headings:continue
        textpage=page.get_textpage()
        cache={}
        def cell_text(cell):
            key=tuple(cell)
            if key not in cache:cache[key]=clean(page.get_textbox(cell,textpage=textpage))
            return cache[key]
        try:tables=page.find_tables().tables
        except Exception as exc:
            current['warnings'].append({'page':index+1,'reason':str(exc)});continue
        for table in tables:
            cells=sorted(set(tuple(c) for c in table.cells),key=lambda c:(c[1],c[0]))
            headers=[]
            has_title=any('наименованиетемы' in re.sub(r'\s+','',cell_text(c)).lower() for c in cells if c[3]-c[1]<150)
            for cell in cells:
                value=cell_text(cell)
                compact=re.sub(r'\s+','',value).lower()
                if ('наименованиетемы' in compact or (not has_title and compact=='краткоесодержаниезанятия')) and cell[3]-cell[1]<150:
                    hours=[c for c in cells if abs(c[1]-cell[1])<12 and re.match('Час',cell_text(c),re.I)]
                    if hours:headers.append((cell[3],(cell[0],cell[2]),(hours[0][0],hours[0][2])))
            for cell in cells:
                active=kind
                for y,typ in sorted(headings):
                    if y<=cell[1]+2:active=typ
                if active is None:continue
                for y,tc,hc in headers:
                    if y<=cell[1]+2:columns[active]=(tc,hc)
                cols=columns.get(active)
                if not cols:continue
                tc,hc=cols
                if abs(cell[0]-tc[0])>2 or abs(cell[2]-tc[1])>2:continue
                value=cell_text(cell)
                if not value or re.search(r'Итого|Всего|Раздел\s|Наименование|Курс\s*[-\d]|семестр',value,re.I):continue
                value=re.sub(r'^Тема\s*\d+(?:\.\d+)*\.?\s*','',value,flags=re.I)
                # PDF text can split a narrow header into many artificial columns.
                # The body hour cell may span those columns; use its interior.
                hcenter=(hc[0]+hc[1])/2
                hcells=[c for c in cells if c[0]<=hcenter<=c[2] and c[2]-c[0]<90 and c[1]>=cell[1]-2 and c[3]<=cell[3]+2]
                amounts=[]
                counted=[]
                for hcell in sorted(hcells,key=lambda c:-(c[2]-c[0])*(c[3]-c[1])):
                    if any(contains(outer,hcell) for outer in counted):continue
                    amount=hour_amount(cell_text(hcell))
                    if amount is not None:amounts.append(amount);counted.append(hcell)
                for y,sem in sorted(markers):
                    if y<=cell[1]+2:semester=sem
                row={'type':active,'semester':semester,'title':value,'hours':sum(amounts) if amounts else None,'page':index+1,'bounds':list(cell)}
                if not current['rows'] or current['rows'][-1]!=row:current['rows'].append(row)
        for y,typ in sorted(headings):kind=typ
        for y,sem in sorted(markers):semester=sem
    for i,chapter in enumerate(chapters):chapter['endPage']=chapters[i+1]['startPage']-1 if i+1<len(chapters) else len(doc)
    for chapter in chapters:
        if not selected or any(s.casefold() in chapter['subject'].casefold() for s in selected):chapter['themeFlow']=extract_theme_flow(doc,chapter)
    return {'schemaVersion':1,'review':'candidate','chapters':[c for c in chapters if not selected or any(s.casefold() in c['subject'].casefold() for s in selected)]}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('pdf',type=Path);parser.add_argument('--output',type=Path,required=True);parser.add_argument('--subjects',nargs='*');args=parser.parse_args()
    result=extract_pdf(args.pdf,args.subjects);args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2),'utf-8')
    print(f'{len(result["chapters"])} chapters, {sum(len(c["rows"]) for c in result["chapters"])} candidate rows; publication disabled.')
