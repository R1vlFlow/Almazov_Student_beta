import {eventAppliesToGroup} from '../core/filter.js';
import {detailedScheduleDiff,scheduleRows,type ScheduleChange,type ScheduleRow} from '../core/scheduleDiff.js';
import type {GroupRef,ScheduleLoadResult} from '../core/types.js';

const KEY='almazov.group-schedule-history.v1';
export interface ChangeBatch {id:string;at:string;generatedAt?:string;seen:boolean;seenChanges?:number[];total:number;changes:ScheduleChange[];}
export interface GroupHistory {checkedAt:string;generatedAt?:string;baselineAt:string;rows:ScheduleRow[];batches:ChangeBatch[];}
type Saved={version:1;profiles:Record<string,GroupHistory>};
export const historyProfileKey=(profile:GroupRef)=>`${profile.program}:${profile.course}:${profile.group.trim().toLocaleLowerCase('ru')}:${profile.stream??''}`;
function readAll():Saved {
  try{const value=JSON.parse(localStorage.getItem(KEY)||'null');if(value?.version===1&&value.profiles&&typeof value.profiles==='object'&&!Array.isArray(value.profiles))return value;}catch{}
  return {version:1,profiles:{}};
}
export function readGroupHistory(profile:GroupRef):GroupHistory|null {
  const value=readAll().profiles[historyProfileKey(profile)];
  if(!value||typeof value.checkedAt!=='string'||typeof value.baselineAt!=='string'||!Array.isArray(value.rows)||!Array.isArray(value.batches))return null;
  const rowValid=(row:unknown):row is ScheduleRow=>Boolean(row&&typeof row==='object'&&['event','cycle'].includes(String((row as ScheduleRow).kind))&&['group','stream','subject','type','date','start','end','location','teacher','weeks','weekRangeStart','weekRangeEnd','cycleDateStatus','half','sourceUrl'].every(key=>typeof (row as unknown as Record<string,unknown>)[key]==='string')&&Array.isArray((row as ScheduleRow).cycleDates)&&(row as ScheduleRow).cycleDates.every(x=>typeof x==='string'));
  if(!value.rows.every(rowValid))return null;
  if(value.batches.some(batch=>batch?.seenChanges!==undefined&&(!Array.isArray(batch.seenChanges)||batch.seenChanges.some(index=>!Number.isInteger(index)||index<0))))return null;
  if(!value.batches.every(batch=>batch&&typeof batch.id==='string'&&typeof batch.at==='string'&&Number.isInteger(batch.total)&&batch.total>=0&&typeof batch.seen==='boolean'&&Array.isArray(batch.changes)&&batch.changes.every(change=>change&&['added','removed','changed'].includes(change.kind)&&Array.isArray(change.fields)&&change.fields.every(x=>typeof x==='string')&&(change.kind==='added'?rowValid(change.after):change.kind==='removed'?rowValid(change.before):rowValid(change.before)&&rowValid(change.after)))))return null;
  return value;
}
function save(all:Saved,key:string):void {
  const others=Object.keys(all.profiles).filter(x=>x!==key).sort((a,b)=>all.profiles[b]!.checkedAt.localeCompare(all.profiles[a]!.checkedAt));
  // History is a bounded device journal; personal notes and tasks use other storage.
  for(const old of others.slice(3))delete all.profiles[old];
  localStorage.setItem(KEY,JSON.stringify(all));
}
export function recordGroupScheduleCheck(profile:GroupRef,data:ScheduleLoadResult,at=new Date().toISOString()):'ignored'|'baseline'|'changed'|'unchanged'|'storage-error' {
  if(!profile.group||['error','unavailable','partial','loading'].includes(data.status)||data.coverage?.status==='partial'||data.issues.some(x=>x==='SCHEDULE_OFFLINE_CACHE')||(data.status==='cache'&&!data.issues.includes('SCHEDULE_SNAPSHOT_STALE')))return 'ignored';
  const selected:ScheduleLoadResult={...data,events:data.events.filter(row=>eventAppliesToGroup(row,profile)),weeklyBlocks:(data.weeklyBlocks??[]).filter(row=>eventAppliesToGroup({...row,date:''},profile))};
  if(!selected.events.length&&!selected.weeklyBlocks?.length)return 'ignored';
  const key=historyProfileKey(profile),all=readAll(),old=readGroupHistory(profile);
  if(old?.generatedAt&&data.generatedAt&&Date.parse(data.generatedAt)<Date.parse(old.generatedAt))return 'ignored';
  const rows=scheduleRows(selected),changes=old?detailedScheduleDiff(old.rows,rows):[];
  let batches=old?.batches??[];
  if(changes.length){
    batches=[{id:crypto.randomUUID(),at,generatedAt:data.generatedAt,seen:false,total:changes.length,changes:changes.slice(0,60)},...batches].slice(0,20);
    let remaining=120;batches=batches.map(batch=>{const kept=batch.changes.slice(0,remaining);remaining-=kept.length;return {...batch,changes:kept};});
  }
  all.profiles[key]={checkedAt:at,generatedAt:data.generatedAt,baselineAt:old?.baselineAt??at,rows,batches};
  try{save(all,key);return old?(changes.length?'changed':'unchanged'):'baseline';}catch{return 'storage-error';}
}
export function markGroupChangesSeen(profile:GroupRef,id?:string):boolean {
  const key=historyProfileKey(profile),all=readAll(),old=readGroupHistory(profile);if(!old)return true;
  all.profiles[key]={...old,batches:old.batches.map(batch=>!id||batch.id===id?{...batch,seen:true}:batch)};
  try{save(all,key);return true;}catch{return false;}
}
export function markLessonChangeSeen(profile:GroupRef,batchId:string,index:number):boolean {
  const key=historyProfileKey(profile),all=readAll(),old=readGroupHistory(profile);if(!old)return true;
  const batch=old.batches.find(b=>b.id===batchId);if(!batch||!Number.isInteger(index)||index<0||index>=batch.changes.length)return false;
  all.profiles[key]={...old,batches:old.batches.map(b=>{if(b.id!==batchId)return b;const seenChanges=[...new Set([...(b.seenChanges??[]).filter(i=>Number.isInteger(i)&&i>=0&&i<b.total),index])];return {...b,seenChanges,seen:b.seen||seenChanges.length>=b.total};})};
  try{save(all,key);return true;}catch{return false;}
}
export function unreadGroupChanges(profile:GroupRef):number {return readGroupHistory(profile)?.batches.filter(batch=>!batch.seen).reduce((n,batch)=>n+Math.max(0,batch.total-new Set((Array.isArray(batch.seenChanges)?batch.seenChanges:[]).filter(i=>Number.isInteger(i)&&i>=0&&i<batch.total)).size),0)??0;}
