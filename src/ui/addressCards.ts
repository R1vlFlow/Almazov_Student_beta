import type {AddressPlace} from '../core/courseAddresses.js';
import {GUIDE_CAMPUSES} from '../data/firstYearGuide.js';
import {icon} from './icons.js';
import {addressPhotoFor} from '../data/addressPhotos.js';

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function campusFor(place:AddressPlace){return GUIDE_CAMPUSES.find(c=>place.members.some(m=>m.guideId===c.id));}
export function addressDisplayName(place:AddressPlace):string{
 const campus=campusFor(place);if(campus)return campus.title;
 if(place.name.includes('Поленова'))return 'Институт Поленова';
 if(/Пархоменко, д\. 15/u.test(place.address))return 'Пархоменко · ЛРК';
 if(place.name==='Детский лечебно-реабилитационный комплекс')return 'ДЛРК';
 return place.name.replace(/^(?:СПб ГБУЗ|СПб ГКУЗ|СПБ ГБПОУ|СПб ГБУСОН|ФГБУ НУ|ФГБУЗ|ФГБНУ|ФГБУ|ГБУЗ|ГБУ|ООО|ЧУЗ|ЧОУ ДПО)\s*/u,'').replace(/^[«"]|[»"]$/g,'');
}
const streetLabel=(address:string)=>address.replace(/^г\. Санкт-Петербург,\s*/u,'').replace(/муниципальный округ [^,]+,\s*/u,'');
function aliasesMarkup(name:string,aliases:string[]){
 const key=(s:string)=>s.toLocaleLowerCase('ru').replace(/\s+/g,'');
 const seen=new Set<string>(),title=key(name);
 const labels=aliases.filter(alias=>{const value=key(alias);if(title.includes(value)||seen.has(value))return false;seen.add(value);return true;}).slice(0,3);
 return labels.length?`<p class="address-aliases">${labels.map(label=>`<span>${esc(label)}</span>`).join('')}</p>`:'';
}
export function addressPlacesMarkup(places:AddressPlace[]):string{
 const order=(place:AddressPlace)=>{const campus=campusFor(place);return campus?GUIDE_CAMPUSES.indexOf(campus):GUIDE_CAMPUSES.length+(addressPhotoFor(place.key)?0:1);};
 return [...places].sort((a,b)=>order(a)-order(b)).map(place=>{
  const campus=campusFor(place),name=addressDisplayName(place),source=place.members[0]!,photo=addressPhotoFor(place.key);
  return `<article class="address-card card" data-has-photo="${!!photo}" ${campus?`data-address-campus="${campus.id}"`:''}>${photo?`<button type="button" class="address-photo-trigger" data-address-photo="${photo.id}" aria-label="Открыть фотографию: ${esc(name)}"><img class="address-photo" src="${photo.src}" width="1100" height="620" loading="lazy" decoding="async" alt="${esc(photo.caption)}">${photo.kind==='project'?'<span class="address-photo-label">Визуализация проекта</span>':''}<span class="address-photo-expand" aria-hidden="true">↗</span></button>`:''}<div class="address-card-content"><header class="address-heading">${photo?'':`<span class="address-icon" aria-hidden="true">${icon('pin')}</span>`}<div class="address-copy">${photo?'':`<p class="eyebrow">${esc(source.category)}</p>`}<h2>${esc(name)}</h2>${aliasesMarkup(name,place.aliases)}</div></header><p class="address-street">${esc(streetLabel(place.address))}</p><div class="address-footer"><a class="btn primary address-map-link" href="https://yandex.ru/maps/?text=${encodeURIComponent(place.address)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(name)} — Яндекс Карты">На карте ↗</a>${campus?`<button type="button" class="btn" data-guide-campus="${campus.id}">Как найти вход</button>`:''}</div><details class="address-details"><summary>Корпуса и занятия${place.subjects.length?' · '+place.subjects.length+' предм.':''}</summary><div>${place.members.filter(m=>m.note).map(m=>`<p class="address-note">${esc(m.note!)}</p>`).join('')}<h3>Корпуса</h3><ul>${[...new Set(place.members.map(m=>m.name+' — '+m.address))].map(text=>`<li>${esc(text)}</li>`).join('')}</ul>${place.locations.length?`<h3>Места в расписании</h3><ul>${place.locations.map(text=>`<li>${esc(text)}</li>`).join('')}</ul>`:''}${place.subjects.length?`<h3>Предметы</h3><ul>${[...place.subjects].sort().map(text=>`<li>${esc(text)}</li>`).join('')}</ul>`:''}<a class="address-source" href="${esc(source.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(source.sourceLabel||'Источник адреса')} ↗</a>${photo?`<a class="address-source address-photo-source" href="${esc(photo.sourceUrl)}" target="_blank" rel="noopener noreferrer">Фото: ${esc(photo.credit)} ↗</a>`:''}</div></details></div></article>`;
 }).join('');
}
