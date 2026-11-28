import type {ScheduleLoadResult,ScheduleEvent,ScheduleWeeklyBlock} from './types.js';

export interface ScheduleRow {
  kind:'event'|'cycle';group:string;stream:string;subject:string;type:string;date:string;start:string;end:string;location:string;teacher:string;
  weeks:string;weekNumber:number|null;cycleDates:string[];weekRangeStart:string;weekRangeEnd:string;cycleDateStatus:string;half:string;sourceUrl:string;
}
export interface ScheduleChange {kind:'added'|'removed'|'changed';before?:ScheduleRow;after?:ScheduleRow;fields:string[];}
const text=(value:unknown)=>typeof value==='string'?value.replace(/\s+/g,' ').trim():'';
export function scheduleRows(data:ScheduleLoadResult):ScheduleRow[]{
  const row=(item:ScheduleEvent|ScheduleWeeklyBlock,kind:ScheduleRow['kind']):ScheduleRow=>{
    const value=item as unknown as Record<string,unknown>;
    return {kind,group:text(value.group),stream:text(value.stream),subject:text(value.subject),type:text(value.type),date:text(value.date),start:text(value.start),end:text(value.end),location:text(value.location),teacher:text(value.teacher),weeks:text(value.weeks),weekNumber:typeof value.weekNumber==='number'?value.weekNumber:null,cycleDates:Array.isArray(value.cycleDates)?[...new Set(value.cycleDates.filter((x):x is string=>typeof x==='string'))].sort():[],weekRangeStart:text(value.weekRangeStart),weekRangeEnd:text(value.weekRangeEnd),cycleDateStatus:text(value.cycleDateStatus),half:text(value.half),sourceUrl:text(value.sourceUrl)};
  };
  return [...data.events.map(x=>row(x,'event')),...(data.weeklyBlocks??[]).map(x=>row(x,'cycle'))];
}
const fields=['kind','group','stream','subject','type','date','start','end','location','teacher','weeks','weekNumber','cycleDates','weekRangeStart','weekRangeEnd','cycleDateStatus','half'] as const;
function signature(row:ScheduleRow){return JSON.stringify(fields.map(key=>row[key]));}
function differences(a:ScheduleRow,b:ScheduleRow):string[]{return fields.filter(key=>JSON.stringify(a[key])!==JSON.stringify(b[key]));}

/** Match only unique semantic candidates. Ambiguity stays an addition/removal, never a guessed move. */
export function detailedScheduleDiff(before:ScheduleRow[],after:ScheduleRow[]):ScheduleChange[]{
  const bins=new Map<string,ScheduleRow[]>();
  for(const row of before){const key=signature(row);const list=bins.get(key)??[];list.push(row);bins.set(key,list);}
  const added:ScheduleRow[]=[];
  for(const row of after){const list=bins.get(signature(row));if(list?.length)list.pop();else added.push(row);}
  const removed=[...bins.values()].flat();
  const oldSet=new Set(removed),newSet=new Set(added),changes:ScheduleChange[]=[];
  const identity=(r:ScheduleRow)=>[r.kind,r.group,r.stream,r.half];
  const slot=(r:ScheduleRow)=>r.kind==='cycle'?[r.weekNumber]:[r.date];
  const keys=[
    (r:ScheduleRow)=>[...identity(r),r.subject,r.type,...slot(r)],
    (r:ScheduleRow)=>[...identity(r),r.subject,r.type,r.start,r.end],
    (r:ScheduleRow)=>[...identity(r),r.type,...slot(r),r.start,r.end],
    (r:ScheduleRow)=>[...identity(r),r.subject,r.type]
  ];
  for(const makeKey of keys){
    const oldBins=new Map<string,ScheduleRow[]>(),newBins=new Map<string,ScheduleRow[]>();
    for(const [rows,map] of [[oldSet,oldBins],[newSet,newBins]] as const)for(const row of rows){const key=JSON.stringify(makeKey(row));const list=map.get(key)??[];list.push(row);map.set(key,list);}
    for(const [key,old] of oldBins){const next=newBins.get(key);if(old.length!==1||next?.length!==1)continue;
      const a=old[0]!,b=next[0]!;oldSet.delete(a);newSet.delete(b);changes.push({kind:'changed',before:a,after:b,fields:differences(a,b)});
    }
  }
  for(const row of oldSet)changes.push({kind:'removed',before:row,fields:[]});
  for(const row of newSet)changes.push({kind:'added',after:row,fields:[]});
  return changes.sort((a,b)=>{const x=a.after??a.before!,y=b.after??b.before!;return (x.date||x.weekRangeStart||x.cycleDates[0]||'').localeCompare(y.date||y.weekRangeStart||y.cycleDates[0]||'')||x.start.localeCompare(y.start)||x.subject.localeCompare(y.subject,'ru');});
}
