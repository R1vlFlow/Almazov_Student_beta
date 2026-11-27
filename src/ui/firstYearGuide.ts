import {ALMAZOV_ADDRESSES} from '../data/addresses.js';
import {groupAddressPlaces} from '../core/courseAddresses.js';
import {GUIDE_ROOT,GUIDE_PDF,GUIDE_PDF_BYTES,GUIDE_PAGE_COUNT,GUIDE_CHAPTERS,GUIDE_CAMPUSES,GUIDE_CORRECTIONS,guidePageUrl,findGuideSections,guideSectionForPage} from '../data/firstYearGuide.js';
import {icon} from './icons.js';

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const pdfSize=Math.ceil(GUIDE_PDF_BYTES/1024/1024)+' МБ';
const allPages=Array.from({length:GUIDE_PAGE_COUNT},(_,i)=>i+1);
let callbacks:{open:(id:string)=>void;refresh:()=>void}|null=null;
let pages=[...allPages],index=0,campusId='',mode:'page'|'width'='page',zoom=1;

export function guideIntroMarkup(course:number):string{
 if(course!==1)return '';
 return `<article class="first-year-guide-intro"><img src="${GUIDE_ROOT}cover.webp" width="320" height="453" loading="lazy" decoding="async" alt="Обложка гайда первокурсника"><div><span class="guide-edition">Первый курс · 2026/27</span><h2>Памятка первокурсника</h2><p>Учёба, документы и студенческая жизнь. Выберите вопрос в оглавлении.</p><button type="button" class="btn primary" data-guide-open>Открыть памятку</button></div></article>`;
}
function contentsMarkup(query:string,compact=false):string{
 const sections=findGuideSections(query),current=pages[index];
 return GUIDE_CHAPTERS.map(chapter=>{const rows=sections.filter(s=>s.chapter===chapter.id);if(!rows.length)return '';return `<section class="guide-index-group"><h3>${esc(chapter.title)}</h3>${rows.map(s=>`<button type="button" class="guide-section-link" data-guide-section="${s.id}" ${compact&&current!==undefined&&current>=s.first&&current<=s.last?'aria-current="page"':''}><span>${esc(s.title)}</span><small>${s.first===s.last?s.first:s.first+'–'+s.last}</small></button>`).join('')}</section>`;}).join('')||'<p class="guide-no-results" role="status">Ничего не найдено. Попробуйте «пропуск», «стипендия» или «куратор».</p>';
}
function searchMarkup(id:string){return `<label class="guide-search" for="${id}"><span class="visually-hidden">Найти вопрос в оглавлении</span><span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="7.2"/><path d="m16 16 5 5"/></svg></span><input id="${id}" data-guide-search type="search" placeholder="Что ищем? Например, пропуск" autocomplete="off" aria-controls="${id}Results"></label>`;}
function bodyElement(){return document.getElementById('firstYearGuideBody')!;}
function landing(){
 const body=bodyElement();body.dataset.guideView='contents';delete body.dataset.contentsOpen;
 document.getElementById('firstYearGuideTitle')!.textContent='Памятка первокурсника';
 body.innerHTML=`<div class="guide-index-intro"><div><span class="guide-edition">Гайд кураторов «PROсвет»</span><h3>С чего начнём?</h3><p>Найдите нужный вопрос — откроется сразу его страница.</p></div><a class="btn small" href="${GUIDE_PDF}" target="_blank" rel="noopener noreferrer">Полный PDF · ${pdfSize} ↗</a></div>${searchMarkup('firstYearGuideSearch')}<div id="firstYearGuideSearchResults" class="guide-index">${contentsMarkup('')}</div><footer class="guide-credit">Авторы: Эмилия Евсюкова, Валентина Коршунова, Алёна Телегина. Школа кураторов «PROсвет», при поддержке профсоюза обучающихся · 2026/27. Правила, суммы выплат и часы работы могли измениться.</footer>`;
 body.scrollTop=0;callbacks?.refresh();
}
function updateView(){
 const viewport=document.getElementById('firstYearGuideViewport');if(!viewport)return;
 viewport.dataset.mode=mode;viewport.scrollTo(0,0);
 const image=document.getElementById('firstYearGuidePage') as HTMLImageElement;
 image.style.width=mode==='width'?zoom*100+'%':'';
 document.querySelectorAll<HTMLElement>('[data-guide-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.guideMode===mode)));
 const label=document.querySelector<HTMLElement>('[data-guide-zoom]');if(label)label.textContent=mode==='width'?`${Math.round(zoom*100)}% +`:'+';
 const hint=document.getElementById('firstYearGuideViewHint');if(hint)hint.textContent=mode==='page'?'Страница целиком':zoom>1?'Прокручивайте страницу по горизонтали и вертикали':'Прокручивайте страницу вниз';
}
function loadPage(retry=false){
 const page=pages[index]!,image=document.getElementById('firstYearGuidePage') as HTMLImageElement,viewport=document.getElementById('firstYearGuideViewport')!;
 viewport.dataset.load='loading';viewport.setAttribute('aria-busy','true');
 const reveal=()=>{const requested=image.src;void image.decode().then(()=>{if(!image.isConnected||image.src!==requested)return;requestAnimationFrame(()=>{viewport.dataset.load='ready';viewport.setAttribute('aria-busy','false');});}).catch(()=>{if(image.src===requested){viewport.dataset.load='error';viewport.setAttribute('aria-busy','false');}});};
 image.onload=reveal;
 image.onerror=()=>{viewport.dataset.load='error';viewport.setAttribute('aria-busy','false');};
 image.src=guidePageUrl(page)+(retry?'?retry='+Date.now():'');
 if(image.complete&&image.naturalWidth)reveal();
}
function reader(focus?:string){
 const page=pages[index]!,campus=GUIDE_CAMPUSES.find(c=>c.id===campusId),section=guideSectionForPage(page);
 const place=campus?groupAddressPlaces(ALMAZOV_ADDRESSES,[]).places.find(p=>p.members.some(m=>m.guideId===campus.id)):undefined;
 const body=bodyElement();body.dataset.guideView='reader';body.dataset.contentsOpen='false';
 document.getElementById('firstYearGuideTitle')!.textContent=campus?'Как найти вход · '+campus.title:'Памятка первокурсника';
 body.innerHTML=`<aside class="guide-reader-index"><button type="button" class="btn guide-toc-toggle" data-guide-toc aria-expanded="false" aria-controls="firstYearGuideToc">${icon('books')} Оглавление <span aria-hidden="true">⌄</span></button><div class="guide-toc-panel" id="firstYearGuideToc"><div class="guide-toc-heading"><button type="button" class="btn small" data-guide-home>← Все разделы</button></div>${searchMarkup('firstYearGuideTocSearch')}<div id="firstYearGuideTocSearchResults" class="guide-toc-list">${contentsMarkup('',true)}</div></div></aside><section class="guide-reading-area"><div class="guide-reading-heading"><h3>${esc(campus?campus.title:section?.title??'Гайд первокурсника')}</h3>${place?`<a class="guide-campus-map" href="https://yandex.ru/maps/?text=${encodeURIComponent(place.address)}" target="_blank" rel="noopener noreferrer">${esc(place.address)} ↗</a>`:''}${GUIDE_CORRECTIONS[page]?`<p class="guide-correction" role="note">${esc(GUIDE_CORRECTIONS[page]!)}</p>`:''}</div><div class="guide-reader-controls"><div class="guide-page-navigation"><button type="button" class="icon" data-guide-shift="-1" aria-label="Предыдущая страница" ${index===0?'disabled':''}>←</button><span role="status" aria-live="polite">${index+1} / ${pages.length}</span><button type="button" class="icon" data-guide-shift="1" aria-label="Следующая страница" ${index===pages.length-1?'disabled':''}>→</button></div><form class="guide-page-jump" data-guide-jump><label for="firstYearGuidePageNumber">Стр.</label><input id="firstYearGuidePageNumber" type="number" inputmode="numeric" min="1" max="${GUIDE_PAGE_COUNT}" required value="${page}" aria-label="Номер страницы от 1 до 71"><button type="submit" class="btn small" aria-label="Перейти к странице" title="Перейти к странице">ОК</button></form><div class="guide-view-options" role="group" aria-label="Масштаб страницы"><button type="button" class="btn small" data-guide-mode="page">Вся страница</button><button type="button" class="btn small" data-guide-mode="width">По ширине</button><button type="button" class="btn small" data-guide-zoom aria-label="Увеличить страницу" title="Увеличить страницу">+</button></div></div><div class="guide-page-viewport" id="firstYearGuideViewport" tabindex="0" aria-label="Страница ${page}. Масштаб меняется кнопками над страницей."><img class="guide-page-image" id="firstYearGuidePage" alt="Гайд кураторов, страница ${page}: ${esc(section?.title??campus?.title??'Памятка первокурсника')}" width="1200" height="1698" decoding="async"><span class="guide-image-loading" role="status">Открываем страницу…</span><div class="guide-image-error" role="alert"><p>Не удалось загрузить страницу.</p><button type="button" class="btn" data-guide-retry>Попробовать ещё раз</button></div></div><footer class="guide-reading-footer"><span id="firstYearGuideViewHint"></span><a href="${GUIDE_PDF}#page=${page}" target="_blank" rel="noopener noreferrer">PDF · ${pdfSize} ↗</a></footer></section>`;
 updateView();loadPage();callbacks?.refresh();
 if(focus){const element=body.querySelector<HTMLElement>(focus);if(element&&!element.hasAttribute('disabled'))element.focus({preventScroll:true});else body.querySelector<HTMLButtonElement>('[data-guide-shift]:not(:disabled)')?.focus({preventScroll:true});}
}
export function openFirstYearGuide(campus?:string){
 if(!callbacks)return;mode='page';zoom=1;campusId=campus??'';
 if(campus){const c=GUIDE_CAMPUSES.find(c=>c.id===campus);if(!c)return;pages=[...c.pages];index=0;reader();}else{pages=[...allPages];index=0;landing();}
 callbacks.open('firstYearGuideModal');
}
export function initFirstYearGuide(options:NonNullable<typeof callbacks>){
 if(callbacks)return;callbacks=options;
 document.addEventListener('input',e=>{const input=e.target as HTMLInputElement;if(input.hasAttribute('data-guide-search')){const results=document.getElementById(input.id+'Results');if(results)results.innerHTML=contentsMarkup(input.value,bodyElement().dataset.guideView==='reader');}});
 document.addEventListener('submit',e=>{const form=e.target as HTMLFormElement;if(!form.hasAttribute('data-guide-jump'))return;e.preventDefault();const page=Number((document.getElementById('firstYearGuidePageNumber') as HTMLInputElement).value);if(!Number.isInteger(page)||page<1||page>GUIDE_PAGE_COUNT)return;pages=[...allPages];index=page-1;campusId='';reader('#firstYearGuidePageNumber');});
 document.addEventListener('click',e=>{
  const el=(e.target as Element|null)?.closest<HTMLElement>('[data-guide-open],[data-guide-campus],[data-guide-section],[data-guide-home],[data-guide-shift],[data-guide-mode],[data-guide-zoom],[data-guide-toc],[data-guide-retry]');if(!el)return;
  if(el.hasAttribute('data-guide-open')){openFirstYearGuide();return;}
  if(el.dataset.guideCampus){openFirstYearGuide(el.dataset.guideCampus);return;}
  if(el.dataset.guideSection){const section=findGuideSections('').find(s=>s.id===el.dataset.guideSection);if(!section)return;pages=[...allPages];index=section.first-1;campusId='';mode='page';zoom=1;reader('#firstYearGuideViewport');return;}
  if(el.hasAttribute('data-guide-home')){landing();document.getElementById('firstYearGuideSearch')?.focus({preventScroll:true});return;}
  if(el.hasAttribute('data-guide-toc')){const open=bodyElement().dataset.contentsOpen!=='true';bodyElement().dataset.contentsOpen=String(open);el.setAttribute('aria-expanded',String(open));if(open)document.getElementById('firstYearGuideTocSearch')?.focus({preventScroll:true});return;}
  if(el.dataset.guideMode==='page'||el.dataset.guideMode==='width'){mode=el.dataset.guideMode;zoom=1;updateView();return;}
  if(el.hasAttribute('data-guide-zoom')){zoom=mode==='page'?1.5:zoom===1?1.5:zoom===1.5?2:1;mode='width';updateView();return;}
  if(el.hasAttribute('data-guide-retry')){loadPage(true);return;}
  if(el.dataset.guideShift){const next=index+Number(el.dataset.guideShift);if(Number.isInteger(next)&&next>=0&&next<pages.length){index=next;reader(`[data-guide-shift="${el.dataset.guideShift}"]`);}}
 });
}
