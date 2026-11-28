import {GUIDE_ROOT,GUIDE_PDF,GUIDE_PDF_BYTES,guidePageUrl,guideSectionForPage} from '../data/firstYearGuide.js';
import {HANDBOOK_ARTICLES,HANDBOOK_GROUPS,findHandbookArticles,handbookSlideDeck,type HandbookArticle} from '../data/handbookContent.js';
import {icon} from './icons.js';
import {enhanceControls} from './customControls.js';

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const slideCount=(n:number)=>n+' '+(n%100>=11&&n%100<=14?'слайдов':n%10===1?'слайд':n%10>=2&&n%10<=4?'слайда':'слайдов');
const pdfSize=Math.ceil(GUIDE_PDF_BYTES/1024/1024)+' МБ';
let callbacks:{open:(id:string)=>void;refresh:()=>void}|null=null,activeId='',pageIndex=0,mode:'page'|'width'='page',zoom=1;
const bodyElement=()=>document.getElementById('firstYearGuideBody')!;
const articleById=(id:string)=>HANDBOOK_ARTICLES.find(a=>a.id===id);

export function guideIntroMarkup(course:number):string{
 if(course!==1)return '';
 return `<article class="first-year-guide-intro"><img src="${GUIDE_ROOT}cover.webp" width="320" height="453" loading="lazy" decoding="async" alt="Обложка гайда первокурсника"><div><span class="guide-edition">Первый курс · 2026/27</span><h2>Памятка первокурсника</h2><p>Коротко об учёбе, документах и студенческой жизни.</p><button type="button" class="btn primary" data-guide-open>Открыть памятку</button></div></article>`;
}
export function handbookContentsMarkup(query=''):string{
 const articles=findHandbookArticles(query);
 return HANDBOOK_GROUPS.map(group=>{const rows=articles.filter(a=>a.group===group.id);return rows.length?`<section class="handbook-group"><div class="handbook-group-heading"><span aria-hidden="true">${icon(group.id==='community'?'graduate':group.id==='support'?'medicine':group.id==='everyday'?'pin':'books')}</span><div><h3>${esc(group.title)}</h3><p>${esc(group.description)}</p></div></div>${rows.map(a=>`<button type="button" class="handbook-topic" data-guide-article="${a.id}"><span>${esc(a.title)}</span><span aria-hidden="true">↗</span></button>`).join('')}</section>`:'';}).join('')||'<p class="guide-no-results" role="status">Ничего не найдено. Попробуйте «пропуск», «стипендия» или «куратор».</p>';
}
function landing(){
 activeId='';const body=bodyElement();body.dataset.guideView='handbook';
 document.getElementById('firstYearGuideTitle')!.textContent='Памятка первокурсника';
 body.innerHTML=`<div class="handbook-welcome"><span class="guide-edition">Гайд кураторов «PROсвет»</span><h3>Первый курс: с чего начать</h3><p>Ответы на вопросы, которые возникают в первые месяцы учёбы.</p></div><label class="guide-search" for="firstYearGuideSearch"><span class="visually-hidden">Поиск по памятке</span><span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="7.2"/><path d="m16 16 5 5"/></svg></span><input id="firstYearGuideSearch" data-guide-search type="search" placeholder="Например, пропуск или студсовет" autocomplete="off" aria-controls="firstYearGuideSearchResults"></label><div id="firstYearGuideSearchResults" class="handbook-groups">${handbookContentsMarkup()}</div><footer class="guide-credit">По гайду школы кураторов «PROсвет» для набора 2026/27. Авторы: Эмилия Евсюкова, Валентина Коршунова, Алёна Телегина. При поддержке профсоюза обучающихся.</footer>`;
 body.scrollTop=0;callbacks?.refresh();
}
export function handbookArticleMarkup(article:HandbookArticle):string{
 const group=HANDBOOK_GROUPS.find(g=>g.id===article.group),index=HANDBOOK_ARTICLES.indexOf(article),prev=HANDBOOK_ARTICLES[index-1],next=HANDBOOK_ARTICLES[index+1];
 return `<article class="handbook-article"><div class="handbook-article-top"><button type="button" class="btn small" data-guide-home>← Все разделы</button><span>${esc(group?.title??'Памятка')}</span></div><header><h3 tabindex="-1" id="handbookArticleTitle">${esc(article.title)}</h3><p>${esc(article.summary)}</p></header><div class="handbook-prose">${article.blocks.map(block=>`<section>${block.heading?`<h4>${esc(block.heading)}</h4>`:''}${block.text?`<p>${esc(block.text)}</p>`:''}${block.items?`<ul>${block.items.map(text=>`<li>${esc(text)}</li>`).join('')}</ul>`:''}</section>`).join('')}</div>${article.links?.length?`<div class="handbook-links">${article.links.map(link=>`<a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)} ↗</a>`).join('')}</div>`:''}<div class="handbook-source"><span>Адаптировано по гайду «PROсвет» · 2026/27</span><button type="button" class="btn small" data-guide-original>Открыть презентацию раздела · ${slideCount(handbookSlideDeck(article).pages.length)}</button></div><nav class="handbook-article-nav" aria-label="Разделы памятки">${prev?`<button type="button" data-guide-article="${prev.id}"><small>← Предыдущий раздел</small><b>${esc(prev.title)}</b></button>`:'<span></span>'}${next?`<button type="button" data-guide-article="${next.id}"><small>Следующий раздел →</small><b>${esc(next.title)}</b></button>`:''}</nav></article>`;
}
function article(id:string){const item=articleById(id);if(!item)return;activeId=id;pageIndex=0;const body=bodyElement();body.dataset.guideView='article';document.getElementById('firstYearGuideTitle')!.textContent='Памятка первокурсника';body.innerHTML=handbookArticleMarkup(item);body.scrollTop=0;callbacks?.refresh();document.getElementById('handbookArticleTitle')?.focus({preventScroll:true});}
function updateView(){
 const viewport=document.getElementById('firstYearGuideViewport');if(!viewport)return;viewport.dataset.mode=mode;viewport.scrollTo(0,0);
 (document.getElementById('firstYearGuidePage') as HTMLImageElement).style.width=mode==='width'?zoom*100+'%':'';
 document.querySelectorAll<HTMLElement>('[data-guide-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.guideMode===mode)));
 const label=document.querySelector<HTMLElement>('[data-guide-zoom]');if(label)label.textContent=mode==='width'?`${Math.round(zoom*100)}% +`:'+';
}
function loadPage(retry=false){
 const selected=articleById(activeId),page=selected?handbookSlideDeck(selected).pages[pageIndex]:undefined;if(!page)return;
 const image=document.getElementById('firstYearGuidePage') as HTMLImageElement,viewport=document.getElementById('firstYearGuideViewport')!;viewport.dataset.load='loading';viewport.setAttribute('aria-busy','true');
 const reveal=()=>{const requested=image.src;void image.decode().then(()=>{if(image.isConnected&&image.src===requested)requestAnimationFrame(()=>{viewport.dataset.load='ready';viewport.setAttribute('aria-busy','false');});}).catch(()=>{if(image.src===requested){viewport.dataset.load='error';viewport.setAttribute('aria-busy','false');}});};
 image.onload=reveal;image.onerror=()=>{if(image.isConnected){viewport.dataset.load='error';viewport.setAttribute('aria-busy','false');}};image.src=guidePageUrl(page)+(retry?'?retry='+Date.now():'');if(image.complete&&image.naturalWidth)reveal();
}
function original(focus?:string){
 const selected=articleById(activeId);if(!selected)return;const deck=handbookSlideDeck(selected),page=deck.pages[pageIndex]!;
 const body=bodyElement();body.dataset.guideView='original';document.getElementById('firstYearGuideTitle')!.textContent='Исходный гайд';
 body.innerHTML=`<div class="handbook-original-top"><button type="button" class="btn small" data-guide-text>← Читать текст</button><label class="guide-slide-picker" for="firstYearGuideSlideSelect"><span>${esc(deck.title)} · ${slideCount(deck.pages.length)}</span><select id="firstYearGuideSlideSelect" data-guide-slide aria-label="Все слайды раздела">${deck.pages.map((n,i)=>`<option value="${i}" ${i===pageIndex?'selected':''}>${i+1}. ${esc(guideSectionForPage(n)?.title??'Гайд')} · стр. ${n}</option>`).join('')}</select></label></div><div class="guide-reader-controls"><div class="guide-page-navigation"><button type="button" class="icon" data-guide-shift="-1" aria-label="Предыдущая исходная страница" ${pageIndex===0?'disabled':''}>←</button><span role="status">${pageIndex+1} / ${deck.pages.length}</span><button type="button" class="icon" data-guide-shift="1" aria-label="Следующая исходная страница" ${pageIndex===deck.pages.length-1?'disabled':''}>→</button></div><div class="guide-view-options" role="group" aria-label="Масштаб исходной страницы"><button type="button" class="btn small" data-guide-mode="page">Вся страница</button><button type="button" class="btn small" data-guide-mode="width">По ширине</button><button type="button" class="btn small" data-guide-zoom aria-label="Увеличить страницу">+</button></div></div><div class="guide-page-viewport" id="firstYearGuideViewport" tabindex="0" aria-label="Исходная страница ${page}"><img class="guide-page-image" id="firstYearGuidePage" alt="${esc(guideSectionForPage(page)?.title??selected.title)}, исходная страница ${page}" width="1200" height="1698" decoding="async"><span class="guide-image-loading" role="status">Открываем страницу…</span><div class="guide-image-error" role="alert"><p>Не удалось загрузить страницу.</p><button type="button" class="btn" data-guide-retry>Попробовать ещё раз</button></div></div><footer class="guide-reading-footer"><span>Гайд кураторов · 2026/27</span><a href="${GUIDE_PDF}#page=${page}" target="_blank" rel="noopener noreferrer">Архивный PDF · ${pdfSize} ↗</a></footer>`;
 enhanceControls(body);updateView();loadPage();callbacks?.refresh();if(focus){const target=body.querySelector<HTMLElement>(focus),visibleTarget=target?.closest('[data-ui-select-wrapper]')?.querySelector<HTMLElement>('.ui-select-trigger')??target;if(visibleTarget&&!visibleTarget.hasAttribute('disabled'))visibleTarget.focus({preventScroll:true});}
}
export function openFirstYearGuide(){if(!callbacks)return;landing();callbacks.open('firstYearGuideModal');}
export function initFirstYearGuide(options:NonNullable<typeof callbacks>){
 if(callbacks)return;callbacks=options;
 document.addEventListener('input',e=>{const input=e.target as HTMLInputElement;if(input.hasAttribute('data-guide-search')){const results=document.getElementById('firstYearGuideSearchResults');if(results)results.innerHTML=handbookContentsMarkup(input.value);}});
 document.addEventListener('click',e=>{const el=(e.target as Element|null)?.closest<HTMLElement>('[data-guide-open],[data-guide-article],[data-guide-home],[data-guide-original],[data-guide-text],[data-guide-shift],[data-guide-mode],[data-guide-zoom],[data-guide-retry]');if(!el)return;
  if(el.hasAttribute('data-guide-open')){openFirstYearGuide();return;}if(el.dataset.guideArticle){article(el.dataset.guideArticle);return;}if(el.hasAttribute('data-guide-home')){landing();document.getElementById('firstYearGuideSearch')?.focus({preventScroll:true});return;}
  if(el.hasAttribute('data-guide-text')){article(activeId);return;}if(el.hasAttribute('data-guide-original')){const selected=articleById(activeId);if(!selected)return;pageIndex=handbookSlideDeck(selected).pages.indexOf(selected.pages[0]!);mode='page';zoom=1;original();return;}
  if(el.dataset.guideMode==='page'||el.dataset.guideMode==='width'){mode=el.dataset.guideMode;zoom=1;updateView();return;}if(el.hasAttribute('data-guide-zoom')){zoom=mode==='page'?1.5:zoom===1?1.5:zoom===1.5?2:1;mode='width';updateView();return;}if(el.hasAttribute('data-guide-retry')){loadPage(true);return;}
  if(el.dataset.guideShift){const selected=articleById(activeId),next=pageIndex+Number(el.dataset.guideShift);if(selected&&Number.isInteger(next)&&next>=0&&next<handbookSlideDeck(selected).pages.length){pageIndex=next;original(`[data-guide-shift="${el.dataset.guideShift}"]`);}}
 });
 document.addEventListener('change',e=>{const select=e.target;if(!(select instanceof HTMLSelectElement)||!select.matches('[data-guide-slide]'))return;const selected=articleById(activeId),next=Number(select.value);if(selected&&Number.isInteger(next)&&next>=0&&next<handbookSlideDeck(selected).pages.length){pageIndex=next;original('#firstYearGuideSlideSelect');}});
}
