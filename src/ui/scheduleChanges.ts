import type {GroupHistory} from '../services/groupScheduleHistory.js';
import type {ScheduleChange,ScheduleRow} from '../core/scheduleDiff.js';
import {escapeHtml as esc} from './studyPlanner.js';

const label:Record<string,string>={subject:'Предмет',type:'Вид занятия',date:'Дата',start:'Начало',end:'Окончание',location:'Место',teacher:'Преподаватель',weeks:'Учебные недели',weekNumber:'Неделя цикла',cycleDates:'Даты цикла',weekRangeStart:'Начало периода',weekRangeEnd:'Конец периода',cycleDateStatus:'Точность дат цикла',half:'Подгруппа'};
const typeLabel:Record<string,string>={lecture:'Лекция',practice:'Практика',lab:'Лабораторная',assessment:'Контроль',other:'Занятие'};
function stamp(value?:string){return value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('ru-RU',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Moscow'}).format(new Date(value)):'не указана';}
function dateLabel(value:string){const at=new Date(value+'T00:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(at.getTime())?new Intl.DateTimeFormat('ru-RU',{dateStyle:'medium',timeZone:'UTC'}).format(at):value;}
function rowLabel(row:ScheduleRow){return `${row.kind==='cycle'?`Цикл · неделя ${row.weekNumber??'?'}`:dateLabel(row.date)} · ${row.start}–${row.end}`;}
function value(row:ScheduleRow,key:string):string {
  const result=row[key as keyof ScheduleRow];
  if(key==='type')return typeLabel[String(result)]||String(result||'Не указано');
  if(key==='cycleDateStatus')return result==='unresolved'?'Даты не уточнены':result==='matrix-subcolumns'?'Даты указаны в источнике':String(result||'Не указано');
  if(Array.isArray(result))return result.map(dateLabel).join(', ')||'Не указано';
  if(['date','weekRangeStart','weekRangeEnd'].includes(key)&&typeof result==='string'&&result)return dateLabel(result);
  return String(result??'').trim()||'Не указано';
}
function changeMarkup(change:ScheduleChange){
  const row=change.after??change.before!,kind=change.kind;
  const heading=kind==='added'?'Добавлено в снимок':kind==='removed'?'Запись исчезла из снимка':'Изменилось занятие';
  const details=kind==='changed'?`<dl class="change-fields">${change.fields.filter(key=>label[key]).map(key=>`<div><dt>${esc(label[key])}</dt><dd><span class="change-before">${esc(value(change.before!,key))}</span><span aria-hidden="true"> → </span><span class="sr-only">Стало: </span><strong>${esc(value(change.after!,key))}</strong></dd></div>`).join('')}</dl>`:`<p>${esc(row.location||'Место не указано')}</p>${kind==='removed'?'<small>Это изменение снимка. Причину уточняйте в официальном источнике.</small>':''}`;
  return `<article class="schedule-change"><span class="planner-kind">${heading}</span><h3>${esc(row.subject)}</h3><p class="muted">${esc(rowLabel(row))} · ${esc(typeLabel[row.type]||row.type)}</p>${details}${/^https?:\/\//i.test(row.sourceUrl)?`<a class="text-link" href="${esc(row.sourceUrl)}" target="_blank" rel="noopener noreferrer">Источник занятия</a>`:''}</article>`;
}
export function scheduleChangesMarkup(history:GroupHistory|null):string {
  if(!history)return '<div class="card panel"><h2>Сначала загрузите расписание группы</h2><p>Первая успешная загрузка станет точкой отсчёта. Новые изменения появятся при следующем отличающемся снимке.</p></div>';
  const context=`<div class="planner-notice"><p>Снимок загружен: <b>${esc(stamp(history.checkedAt))}</b>. Дата данных: <b>${esc(stamp(history.generatedAt))}</b>.</p><p>Это сравнение полученных снимков для выбранной группы. Время загрузки на устройство не означает время проверки официального сайта. Время здесь — московское.</p></div>`;
  if(!history.batches.length)return context+`<div class="card panel"><h2>Изменений пока не обнаружено</h2><p>Точка отсчёта: ${esc(stamp(history.baselineAt))}. Первая загрузка не считается обновлением занятий.</p></div>`;
  return context+history.batches.map(batch=>`<section class="card panel change-batch ${batch.seen?'':'unread'}"><header class="section-head"><div><span class="planner-kind">${batch.seen?'Просмотрено':'Есть непросмотренные изменения'}</span><h2>${esc(stamp(batch.at))}</h2><p class="muted">Изменений: ${batch.total} · дата данных: ${esc(stamp(batch.generatedAt))}</p></div>${batch.seen?'':`<button class="btn small" data-action="mark-changes-seen" data-batch="${esc(batch.id)}">Отметить просмотренным</button>`}</header>${batch.changes.map(changeMarkup).join('')}${batch.total>batch.changes.length?`<p class="muted">Сохранены подробности ${batch.changes.length} из ${batch.total} изменений. История хранится на устройстве в ограниченном объёме; полное расписание доступно во вкладке «Расписание».</p>`:''}</section>`).join('');
}
