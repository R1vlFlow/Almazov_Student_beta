import type {Task, UserProfile} from './types.js';
import type {CalendarEvent} from './calendar.js';
import {addDays} from './date.js';
import {localDate, localDateTimeToUtc} from './time.js';
import {subjectColorKey} from '../services/personalizationStore.js';

export const TASK_KINDS = {homework:'Задание', report:'Реферат', test:'Контрольная', credit:'Зачёт', makeup:'Отработка', other:'Другое'} as const;
export type TaskKind = keyof typeof TASK_KINDS;
export function taskKindLabel(task: Task): string {return TASK_KINDS[task.kind ?? 'homework'];}
export function taskIsDone(task: Task): boolean {return (task.status ?? (task.done ? 'done' : 'todo')) === 'done';}
export function taskMatchesProfile(task: Pick<Task,'program'|'course'|'group'>, profile: UserProfile): boolean {
  return task.program === profile.program && task.course === profile.course && (!task.group.trim() || task.group.trim().toLocaleLowerCase('ru') === profile.group.trim().toLocaleLowerCase('ru'));
}

/** Legacy floating deadlines follow the selected zone; new tasks retain their original zone. */
export function taskDueAt(task: Pick<Task,'due'|'dueTimeZone'>, timeZone: string): number | null {
  if (!task.due) return null;
  try {
    const zone = task.dueTimeZone || timeZone;
    let value: string;
    if (/^\d{4}-\d{2}-\d{2}$/.test(task.due)) {
      if (new Date(task.due+'T00:00:00Z').toISOString().slice(0,10) !== task.due) return null;
      return Date.parse(localDateTimeToUtc(addDays(task.due,1)+'T00:00',zone))-1;
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(task.due)) {
      const day = task.due.slice(0,10);
      if (new Date(day+'T00:00:00Z').toISOString().slice(0,10) !== day || Number(task.due.slice(11,13))>23 || Number(task.due.slice(14,16))>59 || Number(task.due.slice(17,19)||0)>59) return null;
      value = localDateTimeToUtc(task.due,zone);
    } else if (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(task.due)) value=task.due;
    else return null;
    const result=Date.parse(value);return Number.isFinite(result)?result:null;
  } catch {return null;}
}
export function taskDueDay(task: Task,timeZone: string): string | null {
  const at=taskDueAt(task,timeZone);return at===null?null:localDate(new Date(at).toISOString(),timeZone);
}
export function taskDeadlineLabel(task: Task,timeZone: string): string {
  if (!task.due) return 'Без срока';
  const at=taskDueAt(task,timeZone);if(at===null)return 'Проверьте срок задания';
  const date=new Intl.DateTimeFormat('ru-RU',{timeZone,dateStyle:'medium',...(!task.due.includes('T')?{}:{timeStyle:'short' as const})}).format(at);
  return date;
}
export function taskDueFilter(task: Task,filter: string,today: string,timeZone: string,now=Date.now()): boolean {
  const at=taskDueAt(task,timeZone),day=taskDueDay(task,timeZone);
  if(filter==='none')return !task.due;
  if(filter==='overdue')return !taskIsDone(task)&&at!==null&&at<now;
  if(filter==='today')return day===today;
  if(filter==='week')return day!==null&&day>=today&&day<=addDays(today,6);
  return true;
}
export function preparationTasks(tasks: Task[],events: CalendarEvent[],profile: UserProfile,date: string,timeZone: string): Task[] {
  const subjects=new Set(events.filter(e=>e.kind==='schedule').map(e=>subjectColorKey(e.subject||e.title)));
  return tasks.filter(task=>taskMatchesProfile(task,profile)&&!taskIsDone(task)&&(
    (taskDueDay(task,timeZone) ?? '9999-12-31')<=date || subjects.has(subjectColorKey(task.subject))
  )).sort((a,b)=>(taskDueAt(a,timeZone)??Infinity)-(taskDueAt(b,timeZone)??Infinity)||a.createdAt.localeCompare(b.createdAt));
}
/** Double parts are one preparation item. Unrelated consecutive lessons stay separate. */
export function preparationLessons(events: CalendarEvent[],date: string,timeZone: string): CalendarEvent[] {
  const result:CalendarEvent[]=[],doubles=new Map<string,CalendarEvent>();
  for(const event of events.filter(e=>e.status!=='cancelled'&&localDate(e.startAt,timeZone)===date).sort((a,b)=>a.startAt.localeCompare(b.startAt))){
    const key=event.doubleOf?`${event.kind}:${event.doubleOf}:${localDate(event.startAt,timeZone)}`:'';
    const old=key?doubles.get(key):undefined;
    if(old){if(event.endAt>old.endAt)old.endAt=event.endAt;continue;}
    const copy={...event};result.push(copy);if(key)doubles.set(key,copy);
  }
  return result;
}
