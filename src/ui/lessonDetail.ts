import type {CalendarEvent} from '../core/calendar.js';
import {localDate,localTime} from '../core/time.js';
import {longDateRu} from '../core/date.js';
import {escapeHtml as esc} from './studyPlanner.js';
import {icon} from './icons.js';

const kinds:Record<string,string>={lecture:'Лекция',practice:'Практическое занятие',lab:'Лабораторная работа',assessment:'Контроль',other:'Занятие'};
export function lessonKind(event:CalendarEvent):string{return event.kind==='personal'?'Личное событие':kinds[event.type||'other']!;}
export function topicDetailMarkup(event:CalendarEvent):string {
 if(event.topic){const topic=event.topic;
  const url=/^https?:\/\//i.test(topic.sourceUrl)?`${topic.sourceUrl.split('#')[0]}#page=${topic.pages[0]}`:'';
  return `<section class="lesson-topic-panel"><div class="lesson-section-label">${icon('books')}<span>Тема по программе</span></div><h3>${esc(topic.titles.join(' · '))}</h3><details class="lesson-disclosure"><summary>Источник и точность темы</summary><p>Сопоставлена по порядку занятий и учебным часам, отдельно для лекций и ПЗ. Фактическую тему может изменить преподаватель.</p>${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Программа · набор ${topic.cohortYear}, ${topic.teachingSemester}-й семестр · стр. ${topic.pages.join(', ')}</a>`:''}</details></section>`;
 }
 return event.topicUnavailable?`<details class="lesson-disclosure"><summary>Тема пока не подтверждена</summary><p>${esc(event.topicUnavailable)}</p><button class="text-link" data-topic-subject="${esc(event.subject||event.title)}">Посмотреть программу предмета</button></details>`:'';
}
interface DetailContext {timeZone:string;mapHtml:string;updatesHtml:string;errorDraft:string;}
export function lessonDetailMarkup(event:CalendarEvent,context:DetailContext):string {
 const {timeZone,mapHtml,updatesHtml,errorDraft}=context;
 const type=event.type==='practice'&&event.lessonNumber?`Практика №${event.lessonNumber}`:lessonKind(event);
 const status=({planned:'Запланировано',confirmed:'Подтверждено',in_progress:'Сейчас идёт',completed:'Завершено',cancelled:'Отменено'} as Record<string,string>)[event.status||'planned'];
 const date=longDateRu(localDate(event.startAt,timeZone)),time=event.allDay?'Весь день':`${localTime(event.startAt,timeZone)}–${localTime(event.endAt,timeZone)}`;
 return `<div class="lesson-summary-row"><span class="lesson-type-chip">${icon(event.type==='lecture'?'books':'medicine')}${esc(type)}</span>${event.doublePart?`<span class="lesson-part-chip">${event.doublePart}-я часть сдвоенного занятия</span>`:''}<span class="lesson-status-chip status-${esc(event.status||'planned')}">${esc(status)}</span></div><section class="lesson-time-card"><div class="lesson-time-main">${icon('clock')}<strong>${esc(time)}</strong></div><p>${esc(date)}</p><small>${esc(timeZone==='Europe/Moscow'?'Московское время':timeZone)}</small></section>${updatesHtml}<section class="lesson-place-card"><span class="detail-section-icon">${icon('pin')}</span><div><span class="lesson-field-label">Место проведения</span><h3>${esc(event.location||'Место пока не указано')}</h3>${mapHtml}</div></section>${event.teacher?`<div class="lesson-teacher-line">${icon('profile')}<div><span class="lesson-field-label">Преподаватель</span><b>${esc(event.teacher)}</b></div></div>`:''}${topicDetailMarkup(event)}${event.sourceNotice?`<aside class="lesson-source-notice"><b>Уточнение к расписанию</b><p>${esc(event.sourceNotice)}</p></aside>`:''}${event.description&&event.description!==event.sourceNotice?`<section class="lesson-description"><h3>О занятии</h3><p>${esc(event.description)}</p></section>`:''}${event.kind==='schedule'?`<details class="lesson-disclosure lesson-error-report"><summary>${icon('flag')}Сообщить об ошибке</summary><p>Скопируйте сведения, добавьте описание и отправьте в поддержку.</p><textarea id="scheduleErrorDraft" readonly aria-label="Сведения об ошибке расписания">${esc(errorDraft)}</textarea><button class="btn small" data-copy-schedule-error>Скопировать сведения</button></details>`:''}`;
}
export function lessonDetailActions(event:CalendarEvent):string {
 return event.kind==='personal'?'<button class="btn primary" data-action="edit-opened">Изменить</button><button class="btn danger" data-action="delete-opened">Удалить</button>':`<button class="btn primary" data-homework-from-event="${esc(event.id)}">${icon('tasks')}Записать задание</button><button class="btn" data-materials-subject="${esc(event.subject||event.title)}">${icon('books')}Материалы</button><button class="lesson-program-action text-link" data-topic-subject="${esc(event.subject||event.title)}">Темы и программа ${icon('arrow')}</button>`;
}
