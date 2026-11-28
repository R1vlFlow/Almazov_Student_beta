import {CAMPUS_ROUTES,type CampusRoute} from '../data/campusRoutes.js';
import {ALMAZOV_ADDRESSES} from '../data/addresses.js';
import {GUIDE_CAMPUSES} from '../data/firstYearGuide.js';
import {transitForCampus} from '../data/campusTransit.js';
import {groupAddressPlaces} from '../core/courseAddresses.js';
import {campusTransitMarkup,publicTransportUrl} from './campusTransit.js';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
type RouteView='transport'|'entrance';
let callbacks:{open:(id:string)=>void;refresh:()=>void}|null=null,activeId='',stepIndex=0,activeView:RouteView='transport';
function entranceMarkup(route:CampusRoute,index:number,campusTitle:string):string{
 const step=route.steps[index];if(!step)return '';
 return `<p class="campus-route-intro">${esc(route.intro)}</p>${route.note?`<p class="campus-route-note">${esc(route.note)}</p>`:''}<nav class="campus-route-steps" aria-label="Фотоориентиры площадки">${route.steps.map((s,i)=>`<button type="button" data-route-step="${i}" aria-current="${i===index?'step':'false'}"><span>${i+1}</span>${esc(s.title)}</button>`).join('')}</nav><figure class="campus-route-photo"><img id="campusRouteImage" src="${step.image}" alt="${esc(step.title+' · '+campusTitle)}" width="1000" height="550" decoding="async"><p class="campus-route-image-error" hidden>Фото не загрузилось. <button type="button" class="btn small" data-route-retry>Повторить</button></p></figure><div class="campus-route-caption"><span>${index+1} из ${route.steps.length}</span><h4 tabindex="-1" id="campusRouteStepTitle">${esc(step.title)}</h4><p>${esc(step.text)}</p></div><div class="campus-route-navigation"><button type="button" class="btn" data-route-shift="-1" ${index===0?'disabled':''}>← Назад</button><span>Гайд «PROсвет» · 2026/27 · стр. ${step.sourcePage}</span><button type="button" class="btn" data-route-shift="1" ${index===route.steps.length-1?'disabled':''}>Далее →</button></div>`;
}
export function campusRouteMarkup(route:CampusRoute,index:number,view:RouteView='transport'):string{
 const campus=GUIDE_CAMPUSES.find(c=>c.id===route.id),place=groupAddressPlaces(ALMAZOV_ADDRESSES,[]).places.find(p=>p.members.some(m=>m.guideId===route.id));if(!campus||!place)return '';
 const transit=transitForCampus(route.id);
 return `<div class="campus-route-heading"><div><p class="guide-edition">Транспорт и вход</p><h3>${esc(campus.title)}</h3><p>${esc(place.address)}</p></div><a class="btn primary" href="${publicTransportUrl(place.address)}" target="_blank" rel="noopener noreferrer">Построить маршрут ↗</a></div><div class="campus-route-tabs" role="group" aria-label="Раздел инструкции"><button type="button" data-route-view="transport" aria-pressed="${view==='transport'}">Как добраться</button><button type="button" data-route-view="entrance" aria-pressed="${view==='entrance'}">Вход в корпус</button></div><div class="campus-route-panel">${view==='transport'&&transit?campusTransitMarkup(transit,place.address):entranceMarkup(route,index,campus.title)}</div>`;
}
function render(focus=false){
 const route=CAMPUS_ROUTES.find(r=>r.id===activeId);if(!route)return;
 const body=document.getElementById('campusRouteBody')!;body.innerHTML=campusRouteMarkup(route,stepIndex,activeView);body.scrollTop=0;
 const image=document.getElementById('campusRouteImage') as HTMLImageElement|null;
 if(image)image.onerror=()=>{if(image.isConnected)body.querySelector<HTMLElement>('.campus-route-image-error')!.hidden=false;};
 callbacks?.refresh();if(focus)document.getElementById('campusRouteStepTitle')?.focus({preventScroll:true});
}
export function openCampusRoute(id:string){if(!callbacks||!CAMPUS_ROUTES.some(r=>r.id===id))return;activeId=id;stepIndex=0;activeView='transport';render();callbacks.open('campusRouteModal');}
export function initCampusRoutes(options:NonNullable<typeof callbacks>){
 if(callbacks)return;callbacks=options;
 document.addEventListener('click',e=>{
  const el=(e.target as Element|null)?.closest<HTMLElement>('[data-guide-campus],[data-route-view],[data-route-step],[data-route-shift],[data-route-retry]');if(!el)return;
  if(el.dataset.guideCampus){openCampusRoute(el.dataset.guideCampus);return;}
  const route=CAMPUS_ROUTES.find(r=>r.id===activeId);if(!route)return;
  if(el.dataset.routeView==='transport'||el.dataset.routeView==='entrance'){activeView=el.dataset.routeView;render();document.querySelector<HTMLElement>(`[data-route-view="${activeView}"]`)?.focus({preventScroll:true});return;}
  if(el.hasAttribute('data-route-retry')){const image=document.getElementById('campusRouteImage') as HTMLImageElement;image.src=route.steps[stepIndex]!.image+'?retry='+Date.now();document.querySelector<HTMLElement>('.campus-route-image-error')!.hidden=true;return;}
  const next=el.dataset.routeStep===undefined?stepIndex+Number(el.dataset.routeShift):Number(el.dataset.routeStep);
  if(Number.isInteger(next)&&next>=0&&next<route.steps.length){stepIndex=next;activeView='entrance';render(true);}
 });
}