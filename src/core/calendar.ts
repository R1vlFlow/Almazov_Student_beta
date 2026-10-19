import type {LessonType,ScheduleEvent,EventStatus} from './types.js';
import {localDate,localTime,localDateTimeInput,localDateTimeToUtc} from './time.js';

export type CalendarEventKind='schedule'|'personal';
export type {EventStatus};
export interface CalendarEvent{
  sourceNotice?:string;sourceUrl?:string;
  id:string;kind:CalendarEventKind;title:string;subject?:string;description?:string;category?:string;status?:EventStatus;startAt:string;endAt:string;timeZone:string;allDay?:boolean;location?:string;meetingUrl?:string;attendees?:string[];recurrence?:RecurrenceRule|null;seriesId?:string;readOnly:boolean;privacy?:'public'|'private';
  program?:ScheduleEvent['program'];course?:ScheduleEvent['course'];group?:string;stream?:ScheduleEvent['stream'];type?:LessonType;teacher?:string;half?:ScheduleEvent['half'];doublePart?:ScheduleEvent['doublePart'];weeks?:string;
}
export interface RecurrenceRule{frequency:'daily'|'weekly'|'monthly'|'yearly';interval:number;weekdays?:number[];until?:string|null;}
export function displayScheduleParts(e:ScheduleEvent):ScheduleEvent[]{
  if(!(e.orgMerged||e.mergedConsecutive)||e.doublePart)return [e];
  const parts=e.lessonParts;
  if(parts?.length===2&&parts[0]!.start===e.start&&parts[1]!.end===e.end&&parts.every(p=>/^\d{2}:\d{2}$/.test(p.start)&&/^\d{2}:\d{2}$/.test(p.end)&&p.start<p.end)&&parts[0]!.end<=parts[1]!.start){
    return parts.map((p,i)=>({...e,...p,id:`${e.id}-part-${i+1}`,doublePart:(i+1) as 1|2}));
  }
  const start=Number(e.start.slice(0,2))*60+Number(e.start.slice(3));
  const end=Number(e.end.slice(0,2))*60+Number(e.end.slice(3));
  const duration=end-start;
  if(![185,205].includes(duration))return [e];
  const partMinutes=(duration-15)/2;
  const format=(value:number)=>`${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
  const firstEnd=start+partMinutes;
  const secondStart=firstEnd+15;
  return [
    {...e,id:`${e.id}-1`,end:format(firstEnd),double:true,doublePart:1,mergedConsecutive:undefined,durationMinutes:partMinutes},
    {...e,id:`${e.id}-2`,start:format(secondStart),double:true,doublePart:2,mergedConsecutive:undefined,durationMinutes:partMinutes}
  ];
}
export function scheduleToCalendarEvent(e:ScheduleEvent,_displayTimeZone:string):CalendarEvent{const startAt=localDateTimeToUtc(`${e.date}T${e.start}`,'Europe/Moscow');const endAt=localDateTimeToUtc(`${e.date}T${e.end}`,'Europe/Moscow');return{id:e.id,kind:'schedule',title:e.subject,sourceNotice:e.sourceNotice,sourceUrl:e.sourceUrl,description:e.sourceNotice??e.description??'',category:e.type,status:'planned',startAt,endAt,timeZone:'Europe/Moscow',allDay:false,location:e.location,program:e.program,course:e.course,group:e.group,stream:e.stream,type:e.type,teacher:e.teacher,half:e.half,doublePart:e.doublePart,weeks:e.weeks,readOnly:true};}
export function decorateEvent(e:CalendarEvent,timeZone:string){return{event:e,date:localDate(e.startAt,timeZone),start:localTime(e.startAt,timeZone),end:localTime(e.endAt,timeZone),startInput:localDateTimeInput(e.startAt,timeZone),endInput:localDateTimeInput(e.endAt,timeZone)};}
export function eventDates(e:CalendarEvent,timeZone:string):string[]{const first=localDate(e.startAt,timeZone),last=localDate(e.endAt,timeZone),out:string[]=[];let cursor=first;while(cursor<=last&&out.length<370){out.push(cursor);const d=new Date(`${cursor}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+1);cursor=d.toISOString().slice(0,10);}return out;}
