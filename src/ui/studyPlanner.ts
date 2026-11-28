import type {CalendarEvent} from '../core/calendar.js';
import type {Task,UserProfile} from '../core/types.js';
import type {PreparationItem} from '../services/personalizationStore.js';
import {subjectColorKey} from '../services/personalizationStore.js';
import {preparationLessons,preparationTasks,taskDeadlineLabel,taskDueAt,taskKindLabel} from '../core/studyPlanner.js';
import {localTime} from '../core/time.js';
import {groupAddressPlaces} from '../core/courseAddresses.js';
import {ALMAZOV_ADDRESSES} from '../data/addresses.js';
import {icon} from './icons.js';

export const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]!));
const esc=escapeHtml;
interface PreparationMaterial {id:string;title:string;subject:string;url:string;fileMaterial:boolean;}
interface PreparationContext {profile:UserProfile;date:string;timeZone:string;events:CalendarEvent[];tasks:Task[];materials:PreparationMaterial[];status:string;changeBadge?:(event:CalendarEvent)=>string;}
const types:Record<string,string>={lecture:'Лекция',practice:'Практика',lab:'Лабораторная',assessment:'Контроль',other:'Занятие'};
export function lessonTypeMarkup(event:CalendarEvent):string {
  const kind=event.kind==='personal'?'personal':Object.hasOwn(types,event.type||'')?event.type!:'other';
  const label=kind==='personal'?(event.category||'Личное событие'):types[kind];
  return `<span class="lesson-kind-pill lesson-kind-${kind}">${icon(kind==='lecture'?'books':kind==='practice'?'medicine':kind==='lab'?'flask':kind==='assessment'?'tasks':'calendar')}<span>${esc(label)}</span></span>`;
}
export function lessonPlaceMarkup(location?:string):string {
  return `<span class="lesson-place-line">${icon('pin')}<span class="lesson-place-copy"><span class="lesson-place-caption">Место</span><strong>${esc(location||'Место пока не указано')}</strong></span></span>`;
}
export function preparationMarkup(context:PreparationContext):{summary:string;html:string} {
  const {profile,date,timeZone,events,tasks,materials,status}=context;
  const lessons=preparationLessons(events,date,timeZone),classes=lessons.filter(e=>e.kind==='schedule');
  const relevant=preparationTasks(tasks,lessons,profile,date,timeZone);
  const first=classes[0],addresses=first?.location?groupAddressPlaces(ALMAZOV_ADDRESSES,[{location:first.location,subject:first.title}]).places.filter(p=>p.locations.includes(first.location!)):[];
  const address=addresses.length===1?addresses[0]:undefined;
  const plural=(n:number,one:string,few:string,many:string)=>n%10===1&&n%100!==11?one:n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?few:many;
  const summary=`${classes.length} ${plural(classes.length,'занятие','занятия','занятий')} · ${relevant.length} ${plural(relevant.length,'задание','задания','заданий')} для подготовки`;
  const route=first?`<section class="planner-arrival"><div><p class="eyebrow">Первое занятие · ${esc(localTime(first.startAt,timeZone))}</p><h2>${esc(address?.name||first.location||'Место не указано')}</h2>${address?`<p>${esc(address.address)}</p>`:'<p>Точное место проверьте в карточке занятия.</p>'}</div>${address?`<a class="btn" href="https://yandex.ru/maps/?text=${encodeURIComponent(address.address)}" target="_blank" rel="noopener noreferrer">Маршрут в Яндекс Картах</a>`:'<button class="btn" data-page="addresses">Посмотреть адреса</button>'}</section>`:'';
  const lessonsHtml=lessons.map(e=>{
    const subject=e.subject||e.title;
    return `<article class="planner-lesson"><div class="planner-time">${e.allDay?'Весь день':`${esc(localTime(e.startAt,timeZone))}<span>${esc(localTime(e.endAt,timeZone))}</span>`}</div><div class="planner-lesson-body">${e.type==='practice'&&e.lessonNumber?`<span class="planner-kind">ПЗ №${e.lessonNumber}${e.doubleOf?' · сдвоенное':''}</span>`:''}<h3>${esc(e.title)}</h3>${e.topic?`<p class="planner-topic">${esc(e.topic.titles.join('; '))}</p>`:''}<span class="lesson-card-facts">${lessonTypeMarkup(e)}${lessonPlaceMarkup(e.location)}</span>${e.teacher?`<p class="muted">${esc(e.teacher)}</p>`:''}${context.changeBadge?.(e)??''}<div class="planner-row-actions"><button class="btn small" data-open-event="${esc(e.id)}">Подробнее</button>${e.kind==='schedule'?`<button class="btn small" data-action="planner-materials" data-subject="${esc(subject)}">Материалы предмета</button><button class="btn small" data-homework-from-event="${esc(e.id)}">Записать задание</button>`:''}</div></div></article>`;
  }).join('');
  const taskHtml=relevant.map(task=>{const overdue=(taskDueAt(task,timeZone)??Infinity)<Date.now();return `<article class="planner-task"><button type="button" class="task-check" data-task-toggle="${esc(task.id)}" aria-label="Выполнить: ${esc(task.text)}"></button><div><span class="planner-kind">${esc(taskKindLabel(task))}</span><b>${esc(task.subject)}</b><p>${esc(task.text)}</p><small class="${overdue?'planner-overdue':''}">${overdue?'Просрочено · ':''}${esc(taskDeadlineLabel(task,timeZone))}</small></div><button type="button" class="btn small" data-task-edit="${esc(task.id)}">Изменить</button></article>`;}).join('');
  const empty=status==='loading'?'Загружаем занятия…':['error','unavailable'].includes(status)?'Расписание пока недоступно. Обновите данные перед подготовкой.':'В загруженном расписании занятий на завтра нет.';
  const dayOff=classes.length===0&&status==='live'?`<div class="planner-day-off"><img src="./assets/tomorrow-hamster.webp" width="1266" height="1243" loading="lazy" decoding="async" fetchpriority="low" alt="Довольный хомяк с розовыми щёчками"><div><p class="planner-day-off-caption">Завтра без пар</p><h3>Алмазик <em>отдыхает</em></h3><p class="planner-day-off-note">В загруженном расписании на завтра занятий нет.</p></div></div>`:'';
  return {summary,html:`${status==='cache'||status==='partial'?'<p class="planner-notice" role="status">Показан сохранённый или неполный снимок расписания. Проверьте актуальность перед поездкой.</p>':''}${route}<div class="planner-columns"><section class="card panel"><div class="section-head"><h2>Занятия завтра</h2><button class="btn small" data-action="planner-day">В расписании</button></div>${dayOff}${lessonsHtml||(!dayOff?`<p class="muted">${empty}</p>`:'')}</section><section class="card panel"><div class="section-head"><h2>Что подготовить</h2><button class="btn small" data-action="add-task">Добавить</button></div><p class="muted">Задания со сроком до завтра включительно и по завтрашним предметам. У каждого указан его собственный срок.</p>${taskHtml||'<p class="planner-empty">Подходящих невыполненных заданий пока нет.</p>'}<button class="text-link" data-page="homework">Все задания</button></section></div>`};
}
export function preparationChecklistMarkup(items:PreparationItem[]):string {
  return items.map(item=>`<li class="preparation-item ${item.done?'done':''}"><label><input type="checkbox" data-preparation-check="${esc(item.id)}" ${item.done?'checked':''}><span>${esc(item.text)}</span></label><button class="btn small" data-action="delete-preparation-item" data-id="${esc(item.id)}" aria-label="Удалить: ${esc(item.text)}">Удалить</button></li>`).join('')||'<li class="muted">Добавьте, например, халат, сменную обувь или тетрадь.</li>';
}
