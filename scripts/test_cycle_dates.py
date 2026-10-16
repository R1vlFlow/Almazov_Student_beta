from cycle_dates import cell_week_span, resolve_cycle_dates

week={'from':'2026-10-12','to':'2026-10-17'}
descriptor={'edges':[100,125,200],'label':'12.10.25 - 17.10.25'}
# Unequal widths: first 25 pixels are three days, remaining 75 are three days.
left=cell_week_span((100,0,125,20),descriptor)
right=cell_week_span((125,0,200,20),descriptor)
resolve_cycle_dates(left,week);resolve_cycle_dates(right,week)
assert left['cycleDates']==['2026-10-12','2026-10-13','2026-10-14']
assert right['cycleDates']==['2026-10-15','2026-10-16','2026-10-17']
holiday={'matrixWeekSlots':[0,1],'matrixWeekSlotCount':2,'matrixDateLabel':'02.11.25 - 07.11.25 (4.11 ВЫХОДНОЙ)'}
resolve_cycle_dates(holiday,{'from':'2026-11-02','to':'2026-11-07'})
assert holiday['cycleDates']==['2026-11-02','2026-11-03','2026-11-05','2026-11-06','2026-11-07']
first={'matrixWeekSlots':[0],'matrixWeekSlotCount':1,'matrixDateLabel':'03.09.25 -'}
resolve_cycle_dates(first,{'from':'2026-09-01','to':'2026-09-05'})
assert first['cycleDates']==['2026-09-03','2026-09-04','2026-09-05']
for patch in [{'matrixWeekSlotCount':3},{'matrixDateLabel':'19.10.25 - 24.10.25'},{'matrixDateLabel':''}]:
 invalid={**left,**patch};resolve_cycle_dates(invalid,week)
 assert invalid['cycleDates']==[] and invalid['cycleDateStatus']=='unresolved'
print('CYCLE DATES: PASS — logical columns, partial first week, explicit holiday, unknown layout rejection')

from pathlib import Path
import json
import build_official_schedule as parser
root=Path(__file__).resolve().parents[1]
rows=parser.parse_week_matrix_pdfplumber_cells(
    (root/'tests/fixtures/6k_ld_live_2026_2027.pdf').read_bytes(),6,'fixture://6k','')
weeks={w['weekNumber']:w for w in json.loads((root/'data/academic-weeks-2026-2027.json').read_text(encoding='utf-8'))['weeks']}
for row in rows:
    resolve_cycle_dates(row,weeks[row['weekNumber']])
assert len(rows)==372 and all(row['cycleDateStatus']=='matrix-subcolumns' for row in rows)
org=next(r for r in rows if r['group']=='601' and r['weekNumber']==7 and 'Организация' in r['subject'])
infection=next(r for r in rows if r['group']=='601' and r['weekNumber']==7 and 'Инфекционные' in r['subject'])
assert org['cycleDates']==['2026-10-12','2026-10-13','2026-10-14']
assert infection['cycleDates']==['2026-10-15','2026-10-16','2026-10-17']
# The cell text independently names 17.09 as the first internal-medicine day.
internal=next(r for r in rows if r['group']=='607' and r['weekNumber']==3 and 'Внутренние' in r['subject'])
assert internal['cycleDates']==['2026-09-17','2026-09-18','2026-09-19']
assert all('2026-11-04' not in r['cycleDates'] for r in rows)
print('LIVE PDF CYCLE DATES: PASS — half-week transitions agree with dated cell notes')

from cycle_dates import validate_cycle_assignments
for row in rows:
 row['calendarWeekNumber']=row['weekNumber']
assert not validate_cycle_assignments(rows,weeks)
bad=dict(rows[0]);bad['cycleDates']=[]
assert validate_cycle_assignments([bad],weeks)
assert validate_cycle_assignments([rows[0],dict(rows[0])],weeks)
print('CYCLE RELEASE GATE: PASS — missing dates and overlaps rejected')
