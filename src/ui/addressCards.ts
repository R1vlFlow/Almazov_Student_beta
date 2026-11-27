import type {AddressPlace} from '../core/courseAddresses.js';
import {GUIDE_CAMPUSES,GUIDE_ROOT} from '../data/firstYearGuide.js';
import {icon} from './icons.js';

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function campusFor(place:AddressPlace){return GUIDE_CAMPUSES.find(c=>place.members.some(m=>m.guideId===c.id));}
function aliasesMarkup(name:string,aliases:string[]){
 const key=(s:string)=>s.toLocaleLowerCase('ru').replace(/\s+/g,'');
 const seen=new Set<string>(),title=key(name);
 const labels=aliases.filter(alias=>{const value=key(alias);if(title.includes(value)||seen.has(value))return false;seen.add(value);return true;}).slice(0,3);
 return labels.length?`<p class="address-aliases">${labels.map(label=>`<span>${esc(label)}</span>`).join('')}</p>`:'';
}
export function addressPlacesMarkup(places:AddressPlace[]):string{
 const order=(place:AddressPlace)=>{const campus=campusFor(place);return campus?GUIDE_CAMPUSES.indexOf(campus):GUIDE_CAMPUSES.length;};
 return [...places].sort((a,b)=>order(a)-order(b)).map(place=>{
  const campus=campusFor(place),name=campus?.title??place.name,source=place.members[0]!;
  return `<article class="address-card card" ${campus?`data-address-campus="${campus.id}"`:''}>${campus?`<img class="address-photo" src="${GUIDE_ROOT+campus.id}.webp" width="900" height="600" loading="lazy" decoding="async" alt="${esc(name)}">`:''}<div class="address-card-content"><header class="address-heading">${campus?'':`<span class="address-icon" aria-hidden="true">${icon('pin')}</span>`}<div class="address-copy">${campus?'':`<p class="eyebrow">${esc(source.category)}</p>`}<h2>${esc(name)}</h2>${aliasesMarkup(name,place.aliases)}</div></header><p class="address-street">${esc(place.address)}</p><div class="address-footer"><a class="btn primary address-map-link" href="https://yandex.ru/maps/?text=${encodeURIComponent(place.address)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(name)} — Яндекс Карты">На карте ↗</a>${campus?`<button type="button" class="btn" data-guide-campus="${campus.id}">Как найти вход</button>`:''}</div><details class="address-details"><summary>Корпуса и занятия${place.subjects.length?' · '+place.subjects.length+' предм.':''}</summary><div>${place.members.filter(m=>m.note).map(m=>`<p class="address-note">${esc(m.note!)}</p>`).join('')}<h3>Корпуса</h3><ul>${[...new Set(place.members.map(m=>m.name+' — '+m.address))].map(text=>`<li>${esc(text)}</li>`).join('')}</ul>${place.locations.length?`<h3>Места в расписании</h3><ul>${place.locations.map(text=>`<li>${esc(text)}</li>`).join('')}</ul>`:''}${place.subjects.length?`<h3>Предметы</h3><ul>${[...place.subjects].sort().map(text=>`<li>${esc(text)}</li>`).join('')}</ul>`:''}<a class="address-source" href="${esc(source.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(source.sourceLabel||'Источник адреса')} ↗</a></div></details></div></article>`;
 }).join('');
}
