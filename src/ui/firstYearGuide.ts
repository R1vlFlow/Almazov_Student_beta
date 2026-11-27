import {ALMAZOV_ADDRESSES} from '../data/addresses.js';
import {groupAddressPlaces} from '../core/courseAddresses.js';
import {GUIDE_ROOT,GUIDE_PDF,GUIDE_PDF_BYTES,GUIDE_PAGE_COUNT,GUIDE_CHAPTERS,GUIDE_CAMPUSES,GUIDE_CORRECTIONS,guidePageUrl,findGuideChapters} from '../data/firstYearGuide.js';
import {icon} from './icons.js';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const pdfSize=Math.ceil(GUIDE_PDF_BYTES/1024/1024)+' МБ';
const places=()=>groupAddressPlaces(ALMAZOV_ADDRESSES,[]).places;
let callbacks:{open:(id:string)=>void;refresh:()=>void}|null=null,pages:number[]=[],index=0,title='',zoom=1,campusId='';
export function guideIntroMarkup(course:number):string{
 if(course!==1)return '';
 return `<article class="first-year-guide-intro"><img src="${GUIDE_ROOT}cover.webp" width="320" height="453" loading="lazy" decoding="async" alt="Обложка гайда первокурсника"><div><span class="guide-edition">Первый курс · 2026/27</span><h2>Памятка первокурсника</h2><p>Корпуса, дорога и первые занятия. Гайд кураторов «PROсвет» в удобном формате.</p><button type="button" class="btn primary" data-guide-open>Открыть памятку</button></div></article>`;
}
function campusCards():string{return GUIDE_CAMPUSES.map(c=>{const p=places().find(p=>p.members.some(m=>m.guideId===c.id));if(!p)return '';return `<article class="guide-campus"><img src="${GUIDE_ROOT+c.id}.webp" alt="${esc(c.title)}" width="900" height="600" loading="lazy" decoding="async"><div><h3>${esc(c.title)}</h3><p>${esc(p.address)}</p><div class="guide-campus-actions"><a class="btn small" href="https://yandex.ru/maps/?text=${encodeURIComponent(p.address)}" target="_blank" rel="noopener noreferrer">На карте ↗</a><button type="button" class="btn small" data-guide-campus="${c.id}">Как найти вход</button></div></div></article>`;}).join('');}
function chaptersMarkup(query:string):string{return findGuideChapters(query).map(c=>`<button type="button" class="guide-chapter" data-guide-chapter="${c.id}"><span>${icon(c.id==='routes'?'pin':c.id==='community'?'graduate':'books')}</span><span><b>${esc(c.title)}</b><small>${esc(c.description)}</small></span><span aria-hidden="true">↗</span></button>`).join('')||'<p class="guide-no-results">Ничего не найдено. Попробуйте «пропуск», «дорога» или «куратор».</p>';}
function landing(){
 const body=document.getElementById('firstYearGuideBody')!;document.getElementById('firstYearGuideTitle')!.textContent='Памятка первокурсника';
 body.innerHTML=`<div class="guide-welcome"><p>Самое полезное из 71-страничного гайда кураторов: найдите корпус, выберите вопрос или откройте нужные страницы.</p><a class="btn" href="${GUIDE_PDF}" target="_blank" rel="noopener noreferrer">Полный PDF · ${pdfSize} ↗</a></div><section><h3 class="guide-section-title">Куда ехать</h3><div class="guide-campus-grid">${campusCards()}</div></section><section class="guide-topics"><div class="guide-topics-heading"><h3 class="guide-section-title">Что нужно узнать</h3><label class="guide-search"><span class="visually-hidden">Найти раздел памятки</span><input id="firstYearGuideSearch" type="search" placeholder="Например, пропуск или куратор" autocomplete="off"></label></div><div id="firstYearGuideChapters" class="guide-chapter-grid">${chaptersMarkup('')}</div></section><footer class="guide-credit">Советы кураторов «PROсвет» для набора 2026/27. Авторы: Эмилия Евсюкова, Валентина Коршунова, Алёна Телегина. При поддержке профсоюза обучающихся. Адреса основных площадок сверены с <a href="https://education.almazovcentre.ru/sveden/common/" target="_blank" rel="noopener noreferrer">официальным перечнем</a>; НОК указан по гайду. Правила, суммы выплат и часы работы могут меняться.</footer>`;
 body.scrollTop=0;callbacks?.refresh();
}
function reader(){
 const page=pages[index]!;document.getElementById('firstYearGuideTitle')!.textContent=title;
 const c=GUIDE_CAMPUSES.find(c=>c.id===campusId),place=c?places().find(p=>p.members.some(m=>m.guideId===c.id)):undefined;
 const note=GUIDE_CORRECTIONS[page];
 const body=document.getElementById('firstYearGuideBody')!;
 body.innerHTML=`<div class="guide-reader-top"><button type="button" class="btn small" data-guide-home>← К разделам</button>${place?`<a class="btn small" href="https://yandex.ru/maps/?text=${encodeURIComponent(place.address)}" target="_blank" rel="noopener noreferrer">${esc(place.name)} на карте ↗</a>`:''}</div>${c?`<p class="guide-reader-summary">${esc(c.summary)}</p>`:''}${note?`<p class="guide-correction" role="note">${esc(note)}</p>`:''}<div class="guide-page-toolbar"><div><button type="button" class="icon" data-guide-shift="-1" aria-label="Предыдущая страница" ${index===0?'disabled':''}>←</button><span role="status" aria-live="polite">Страница <b>${page}</b> из ${GUIDE_PAGE_COUNT}</span><button type="button" class="icon" data-guide-shift="1" aria-label="Следующая страница" ${index===pages.length-1?'disabled':''}>→</button></div><button type="button" class="btn small" data-guide-zoom>Масштаб ${Math.round(zoom*100)}%</button></div><div class="guide-page-scroll" tabindex="0" aria-label="Страница гайда; при увеличении её можно прокручивать"><div class="guide-page-sheet" style="width:${zoom*100}%"><img id="firstYearGuidePage" src="${guidePageUrl(page)}" alt="Гайд кураторов 2026/27, страница ${page}: ${esc(title)}" width="1200" height="1698" decoding="async"></div></div><div class="guide-reader-footer"><span>Оригинальная страница кураторского гайда · 2026/27</span><a href="${GUIDE_PDF}#page=${page}" target="_blank" rel="noopener noreferrer">Открыть в PDF · ${pdfSize} ↗</a></div>`;
 body.scrollTop=0;callbacks?.refresh();body.querySelector<HTMLButtonElement>('[data-guide-home]')?.focus({preventScroll:true});
}
export function openFirstYearGuide(campus?:string){
 if(!callbacks)return;
 if(campus){const c=GUIDE_CAMPUSES.find(c=>c.id===campus);if(!c)return;pages=[...c.pages];index=0;title=c.title;campusId=c.id;zoom=1;reader();}else{pages=[];campusId='';zoom=1;landing();}
 callbacks.open('firstYearGuideModal');
}
export function initFirstYearGuide(options:NonNullable<typeof callbacks>){
 if(callbacks)return;callbacks=options;
 document.addEventListener('input',e=>{const input=e.target as HTMLInputElement;if(input.id==='firstYearGuideSearch')document.getElementById('firstYearGuideChapters')!.innerHTML=chaptersMarkup(input.value);});
 document.addEventListener('click',e=>{const el=(e.target as Element|null)?.closest<HTMLElement>('[data-guide-open],[data-guide-campus],[data-guide-chapter],[data-guide-home],[data-guide-shift],[data-guide-zoom]');if(!el)return;
  if(el.hasAttribute('data-guide-open')){openFirstYearGuide();return;}
  if(el.dataset.guideCampus){openFirstYearGuide(el.dataset.guideCampus);return;}
  if(el.dataset.guideChapter){const chapter=GUIDE_CHAPTERS.find(c=>c.id===el.dataset.guideChapter);if(!chapter)return;pages=[...chapter.pages];index=0;title=chapter.title;zoom=1;campusId='';reader();return;}
  if(el.hasAttribute('data-guide-home')){landing();document.querySelector<HTMLButtonElement>('#firstYearGuideBody [data-guide-chapter]')?.focus({preventScroll:true});return;}
  if(el.hasAttribute('data-guide-zoom')){zoom=zoom===1?1.5:zoom===1.5?2:1;reader();document.querySelector<HTMLButtonElement>('#firstYearGuideBody [data-guide-zoom]')?.focus({preventScroll:true});return;}
  if(el.dataset.guideShift){const next=index+Number(el.dataset.guideShift);if(Number.isInteger(next)&&next>=0&&next<pages.length){const direction=el.dataset.guideShift;index=next;reader();const same=document.querySelector<HTMLButtonElement>(`#firstYearGuideBody [data-guide-shift="${direction}"]`);if(same&&!same.disabled)same.focus({preventScroll:true});else document.querySelector<HTMLButtonElement>('#firstYearGuideBody [data-guide-shift]:not(:disabled)')?.focus({preventScroll:true});}}
 });
}
