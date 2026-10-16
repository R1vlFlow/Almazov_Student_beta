import type {ScheduleEvent,ScheduleWeeklyBlock} from './types.js';

/** Only explicitly resolved teaching dates become calendar events. */
export function expandPracticeCycles(blocks:ScheduleWeeklyBlock[]):ScheduleEvent[]{
 const result:ScheduleEvent[]=[];
 for(const block of blocks){
  if(block.cycleDateStatus!=='matrix-subcolumns')continue;
  for(const date of new Set(block.cycleDates??[])){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!block.weekRangeStart||!block.weekRangeEnd||date<block.weekRangeStart||date>block.weekRangeEnd)continue;
   if(new Date(`${date}T12:00:00Z`).getUTCDay()===0)continue;
   result.push({id:`${block.id}-day-${date}`,program:block.program,course:block.course,
    group:block.group,stream:block.stream,date,start:block.start,end:block.end,
    subject:block.subject,location:block.location,teacher:block.teacher,type:block.type,
    sourceUrl:block.sourceUrl,sourceKind:'official-pdf',sourceTitle:'Практический цикл',
    description:`Практический цикл · ${block.weekNumber}-я учебная неделя`,double:false});
  }
 }
 return result;
}

/** A personal import replaces only the overlapping practice, not the semester. */
export function hasImportedPracticeOverlap(event:ScheduleEvent,imports:Array<{program:string;course:number;group:string;date:string;start:string;end:string}>):boolean{
 return event.type==='practice'&&imports.some(row=>row.program===event.program&&row.course===event.course&&row.group===event.group&&row.date===event.date&&row.start<event.end&&row.end>event.start);
}
