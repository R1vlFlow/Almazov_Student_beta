import type {CalendarEvent} from './calendar.js';
import {localDate} from './time.js';

export function normalizeLessonSubject(subject:string):string{return subject.normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s+/g,' ').trim();}
export function lessonTerm(e:CalendarEvent){
  const date=localDate(e.startAt,'Europe/Moscow'),year=Number(date.slice(0,4)),month=Number(date.slice(5,7));
  return {academicYear:month>=9?year:year-1,semester:month>=9||month===1?1:2};
}
/** Full semester input, already filtered to the selected group. Each block is one
 * logical lesson; repeated double identifiers remain scoped to their date. */
export function lessonSequences(events:CalendarEvent[],selectedGroup?:string):CalendarEvent[][][]{
  const sequences=new Map<string,Map<string,CalendarEvent[]>>();
  const ordered=events.filter(e=>e.kind==='schedule'&&(e.type==='practice'||e.type==='lecture')&&e.status!=='cancelled').sort((a,b)=>a.startAt.localeCompare(b.startAt)||a.id.localeCompare(b.id));
  for(const e of ordered){
    const date=localDate(e.startAt,'Europe/Moscow'),term=lessonTerm(e);
    const key=JSON.stringify([e.program,e.course,selectedGroup??e.group,term.academicYear,term.semester,normalizeLessonSubject(e.subject||e.title),e.type]);
    const lessons=sequences.get(key)??new Map<string,CalendarEvent[]>();
    const identity=JSON.stringify(e.doubleOf?[date,e.doubleOf]:[date,e.startAt,e.endAt,e.location||'']);
    const block=lessons.get(identity)??[];block.push(e);lessons.set(identity,block);sequences.set(key,lessons);
  }
  return [...sequences.values()].map(lessons=>[...lessons.values()]);
}
/** Ordinals describe the loaded timetable, not attendance or a department topic plan. */
export function numberLessons(events:CalendarEvent[],selectedGroup?:string):CalendarEvent[]{
  const result=events.map(e=>({...e,lessonNumber:undefined as number|undefined}));
  for(const sequence of lessonSequences(result,selectedGroup))sequence.forEach((block,index)=>{
    for(const e of block)if(e.type==='practice')e.lessonNumber=index+1;
  });
  return result;
}
