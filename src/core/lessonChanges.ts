import type {CalendarEvent} from './calendar.js';
import type {ScheduleRow,ScheduleChange} from './scheduleDiff.js';
import type {GroupHistory} from '../services/groupScheduleHistory.js';
import {localDate,localTime} from './time.js';
import {subjectColorKey} from '../services/personalizationStore.js';

export interface LessonChangeRef {batchId:string;index:number;at:string;seen:boolean;change:ScheduleChange;}
export function lessonChangeRefs(history:GroupHistory|null):LessonChangeRef[]{
 return history?.batches.flatMap(batch=>batch.changes.map((change,index)=>({batchId:batch.id,index,at:batch.at,seen:batch.seen||(Array.isArray(batch.seenChanges)&&batch.seenChanges.includes(index)),change})))??[];
}
export function rowHasDate(row:ScheduleRow,date:string):boolean {
 if(row.kind==='event')return row.date===date;
 return row.cycleDateStatus==='matrix-subcolumns'&&row.cycleDates.includes(date);
}
export function changesForLesson(event:CalendarEvent,refs:LessonChangeRef[]):LessonChangeRef[]{
 if(event.kind!=='schedule')return [];
 const date=localDate(event.startAt,'Europe/Moscow'),start=localTime(event.startAt,'Europe/Moscow'),end=localTime(event.endAt,'Europe/Moscow'),subject=subjectColorKey(event.subject||event.title);
 return refs.filter(ref=>{const row=ref.change.after;if(!row||!rowHasDate(row,date)||subjectColorKey(row.subject)!==subject||row.type!==event.type)return false;
  if(row.group&&event.group&&row.group!==event.group)return false;
  if(row.stream&&event.stream&&row.stream!==event.stream)return false;
  if(row.half&&event.half&&row.half!==event.half)return false;
  return event.doubleOf?row.start<=start&&row.end>=end:row.start===start&&row.end===end;
 });
}
export function departuresOnDate(refs:LessonChangeRef[],date:string):LessonChangeRef[]{
 return refs.filter(ref=>{if(ref.seen)return false;const {before,after}=ref.change;if(!before)return false;
  const hadDate=rowHasDate(before,date)||(before.kind==='cycle'&&before.cycleDateStatus!=='matrix-subcolumns'&&before.weekRangeStart===date);
  const hasDate=after&&(rowHasDate(after,date)||(after.kind==='cycle'&&after.cycleDateStatus!=='matrix-subcolumns'&&after.weekRangeStart===date));
  return hadDate&&!hasDate;
 });
}
