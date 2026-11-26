import test from 'node:test';
import assert from 'node:assert/strict';
import {taskDueAt,taskDueDay,taskDueFilter,taskMatchesProfile,preparationLessons,preparationTasks} from '../dist/core/studyPlanner.js';
import {scheduleRows,detailedScheduleDiff} from '../dist/core/scheduleDiff.js';
import {recordGroupScheduleCheck,readGroupHistory,unreadGroupChanges,markGroupChangesSeen} from '../dist/services/groupScheduleHistory.js';
import {validatePersonalBackup,restorePersonalBackup,createPersonalBackup} from '../dist/services/personalBackup.js';
import {preparationMarkup,preparationChecklistMarkup} from '../dist/ui/studyPlanner.js';
import {scheduleChangesMarkup} from '../dist/ui/scheduleChanges.js';
import {readFile} from 'node:fs/promises';

const profile={program:'31.05.01',course:1,group:'123',stream:'A'};
const task=(patch={})=>({id:'t',...profile,subject:'Анатомия',text:'Подготовиться',due:'2026-11-27T09:00',done:false,createdAt:'2026-11-26T09:00:00Z',...patch});
const event=(patch={})=>({id:'e',...profile,date:'2026-11-27',start:'09:00',end:'10:35',subject:'Анатомия',type:'practice',location:'КПК',teacher:'Иванов',...patch});
const snapshot=(events=[event()],weeklyBlocks=[])=>({status:'live',events,weeklyBlocks,issues:[],generatedAt:'2026-11-26T09:00:00Z',message:''});
const calendar=(patch={})=>({id:'e',kind:'schedule',title:'Анатомия',subject:'Анатомия',type:'practice',startAt:'2026-11-27T06:00:00Z',endAt:'2026-11-27T07:35:00Z',timeZone:'Europe/Moscow',readOnly:true,...patch});
class MemoryStorage {values=new Map();getItem(k){return this.values.get(k)??null;}setItem(k,v){this.values.set(k,String(v));}removeItem(k){this.values.delete(k);}}

test('deadlines retain their source zone, reject impossible dates and honor date-only end of day',()=>{
 assert.equal(taskDueAt(task({dueTimeZone:'Europe/Moscow'}),'Asia/Vladivostok'),Date.parse('2026-11-27T06:00:00Z'));
 assert.equal(taskDueAt(task(),'Asia/Vladivostok'),Date.parse('2026-11-26T23:00:00Z'));
 assert.equal(taskDueAt(task({due:'2026-11-27'}),'Europe/Moscow'),Date.parse('2026-11-27T20:59:59.999Z'));
 for(const due of ['nonsense','2026-02-30','2026-11-27T25:00','2026-02-30T09:00','2026-11-27T09:66'])assert.equal(taskDueAt(task({due}),'Europe/Moscow'),null,due);
 assert.equal(taskDueAt(task({dueTimeZone:'bad/zone'}),'Europe/Moscow'),null);
 assert.equal(taskDueDay(task({due:'2026-11-27T23:00',dueTimeZone:'Europe/Moscow'}),'Asia/Vladivostok'),'2026-11-28');
});
test('deadline filters use calendar days in selected zone and exclude completed overdue work',()=>{
 const now=Date.parse('2026-11-27T08:00:00Z');
 assert.equal(taskDueFilter(task(),'overdue','2026-11-27','Europe/Moscow',now),true);
 assert.equal(taskDueFilter(task({done:true}),'overdue','2026-11-27','Europe/Moscow',now),false);
 assert.equal(taskDueFilter(task({due:'2026-11-27'}),'overdue','2026-11-27','Europe/Moscow',now),false);
 assert.equal(taskDueFilter(task({due:undefined}),'none','2026-11-27','Europe/Moscow',now),true);
 assert.equal(taskDueFilter(task({due:'2026-12-03'}),'week','2026-11-27','Europe/Moscow',now),true);
 assert.equal(taskDueFilter(task({due:'2026-12-04'}),'week','2026-11-27','Europe/Moscow',now),false);
});
test('preparation selects own group and overdue/due work plus subjects tomorrow, without completed tasks',()=>{
 const tasks=[task(),task({id:'subject',due:'2026-12-20'}),task({id:'due',subject:'Химия'}),task({id:'late',subject:'Химия',due:'2026-11-25'}),task({id:'done',done:true}),task({id:'other-group',group:'124'}),task({id:'future',subject:'Химия',due:'2026-12-20'}),task({id:'none',subject:'Химия',due:undefined}),task({id:'peds',program:'31.05.02'})];
 const result=preparationTasks(tasks,[calendar()],profile,'2026-11-27','Europe/Moscow');
 assert.deepEqual(new Set(result.map(t=>t.id)),new Set(['t','subject','due','late']));
 assert.equal(taskMatchesProfile(task({group:''}),profile),true);
 assert.equal(taskMatchesProfile(task({course:2}),profile),false);
});
test('preparation merges only explicit double parts and never mutates schedule events',()=>{
 const events=[calendar({doubleOf:'d',doublePart:1}),calendar({id:'e2',doubleOf:'d',doublePart:2,startAt:'2026-11-27T07:50:00Z',endAt:'2026-11-27T09:25:00Z'}),calendar({id:'separate',startAt:'2026-11-27T09:30:00Z'}),calendar({id:'cancelled',status:'cancelled'}),calendar({id:'previous',startAt:'2026-11-26T06:00:00Z'})];
 const result=preparationLessons(events,'2026-11-27','Europe/Moscow');
 assert.equal(result.length,2);assert.equal(result[0].endAt,'2026-11-27T09:25:00Z');assert.equal(events[0].endAt,'2026-11-27T07:35:00Z');
});
test('detailed diff ignores IDs, source URL and row ordering while respecting duplicate counts',()=>{
 const a=scheduleRows(snapshot([event(),event({id:'dup'})]));
 const b=scheduleRows(snapshot([event({id:'new',sourceUrl:'https://example.org/new.pdf'}),event()]));
 assert.deepEqual(detailedScheduleDiff(a,b),[]);
 const diff=detailedScheduleDiff(a,scheduleRows(snapshot([event()])));assert.equal(diff.length,1);assert.equal(diff[0].kind,'removed');
});
test('changed time, room, teacher and date are explained as changes',()=>{
 const diff=detailedScheduleDiff(scheduleRows(snapshot()),scheduleRows(snapshot([event({date:'2026-11-28',start:'11:00',end:'12:35',location:'Солнечное',teacher:'Петров'})])));
 assert.equal(diff.length,1);assert.equal(diff[0].kind,'changed');assert.deepEqual(diff[0].fields,['date','start','end','location','teacher']);
});
test('ambiguous moves remain separate additions/removals rather than invented pairings',()=>{
 const old=[event(),event({start:'11:00',end:'12:35'})],next=[event({date:'2026-11-28',start:'13:00',end:'14:35'}),event({date:'2026-11-28',start:'15:00',end:'16:35'})];
 const diff=detailedScheduleDiff(scheduleRows(snapshot(old)),scheduleRows(snapshot(next)));
 assert.equal(diff.length,4);assert.ok(diff.every(x=>x.kind!=='changed'));
});
test('cycle dates are order independent, but changed week/dates are detected',()=>{
 const block={...event(),weekNumber:8,cycleDates:['2026-11-27','2026-11-26']};
 const before=scheduleRows(snapshot([],[block]));
 assert.deepEqual(detailedScheduleDiff(before,scheduleRows(snapshot([],[{...block,cycleDates:[...block.cycleDates].reverse()}]))),[]);
 const diff=detailedScheduleDiff(before,scheduleRows(snapshot([],[{...block,weekNumber:9,cycleDates:['2026-12-01']}])));
 assert.equal(diff[0].kind,'changed');assert.ok(diff[0].fields.includes('weekNumber'));assert.ok(diff[0].fields.includes('cycleDates'));
});
test('history baselines silently, filters other groups/streams and acknowledges only saved changes',()=>{
 globalThis.localStorage=new MemoryStorage();
 const base=snapshot([event(),event({group:'124'}),event({group:'ALL',stream:'B'})]);
 assert.equal(recordGroupScheduleCheck(profile,base),'baseline');assert.equal(unreadGroupChanges(profile),0);
 assert.equal(recordGroupScheduleCheck(profile,snapshot([event(),event({group:'124',location:'new'}),event({group:'ALL',stream:'B'})])),'unchanged');
 assert.equal(recordGroupScheduleCheck(profile,snapshot([event({location:'new'}),event({group:'ALL',stream:'A',subject:'Лекция',type:'lecture'})])),'changed');
 assert.equal(unreadGroupChanges(profile),2);
 assert.equal(recordGroupScheduleCheck(profile,snapshot([event({location:'new'}),event({group:'ALL',stream:'A',subject:'Лекция',type:'lecture'})])),'unchanged');
 assert.equal(readGroupHistory(profile).batches.length,1);
 const id=readGroupHistory(profile).batches[0].id;assert.equal(markGroupChangesSeen(profile,id),true);assert.equal(unreadGroupChanges(profile),0);
});
test('offline, failed, empty, partial and older snapshots cannot manufacture removals or overwrite baseline',()=>{
 globalThis.localStorage=new MemoryStorage();recordGroupScheduleCheck(profile,snapshot());
 const before=readGroupHistory(profile);
 for(const next of [snapshot([]),{...snapshot(),status:'error'},{...snapshot(),status:'partial'},{...snapshot(),status:'cache',issues:['SCHEDULE_OFFLINE_CACHE']},{...snapshot(),generatedAt:'2026-10-01T00:00:00Z'}])assert.equal(recordGroupScheduleCheck(profile,next),'ignored');
 assert.deepEqual(readGroupHistory(profile),before);
 const next={...snapshot([event({start:'11:00'})]),generatedAt:'2026-11-27T00:00:00Z'};
 recordGroupScheduleCheck(profile,next);assert.equal(unreadGroupChanges(profile),1);
});
test('storage failure cannot break schedule display or pretend an acknowledgement was saved',()=>{
 globalThis.localStorage=new MemoryStorage();recordGroupScheduleCheck(profile,snapshot());recordGroupScheduleCheck(profile,snapshot([event({location:'new'})]));
 localStorage.setItem=()=>{throw Error('quota');};
 assert.equal(markGroupChangesSeen(profile),false);assert.equal(unreadGroupChanges(profile),1);
 assert.equal(recordGroupScheduleCheck(profile,snapshot([event({location:'next'})])),'storage-error');
});
test('corrupt saved history becomes a fresh baseline without hiding the schedule',()=>{
 globalThis.localStorage=new MemoryStorage();recordGroupScheduleCheck(profile,snapshot());
 const saved=JSON.parse(localStorage.getItem('almazov.group-schedule-history.v1'));
 Object.values(saved.profiles)[0].rows=[null];localStorage.setItem('almazov.group-schedule-history.v1',JSON.stringify(saved));
 assert.equal(readGroupHistory(profile),null);assert.equal(recordGroupScheduleCheck(profile,snapshot()),'baseline');assert.equal(unreadGroupChanges(profile),0);
});
test('large history bounds stored details and discloses full change count',()=>{
 globalThis.localStorage=new MemoryStorage();recordGroupScheduleCheck(profile,snapshot());
 recordGroupScheduleCheck(profile,snapshot(Array.from({length:200},(_,i)=>event({subject:'Предмет '+i}))));
 const history=readGroupHistory(profile),batch=history.batches[0];assert.ok(batch.total>60);assert.equal(batch.changes.length,60);
 assert.match(scheduleChangesMarkup(history),/из 201 изменений/);
});
test('rendered preparation and change history escape student/source strings and avoid unsafe links',()=>{
 const bad='<img src=x onerror=alert(1)>';
 const view=preparationMarkup({profile,date:'2026-11-27',timeZone:'Europe/Moscow',events:[calendar({title:bad,subject:bad,location:bad,type:'lecture',lessonNumber:10})],tasks:[task({subject:bad,text:bad})],materials:[{id:'m',subject:bad,title:bad,url:'javascript:alert(1)'}],status:'live'}).html;
 assert.ok(!view.includes('<img'));assert.ok(!view.includes('javascript:'));assert.ok(!view.includes('ПЗ №10'));
 assert.ok(!preparationChecklistMarkup([{id:bad,text:bad,done:false}]).includes('<img'));
 const row=scheduleRows(snapshot([event({subject:bad,sourceUrl:'javascript:alert(1)'})]))[0];
 const history={checkedAt:'2026-11-26',baselineAt:'2026-11-26',rows:[],batches:[{id:'b',at:'2026-11-26',total:1,seen:false,changes:[{kind:'added',after:row,fields:[]}]}]};
 const html=scheduleChangesMarkup(history);assert.ok(!html.includes('<img'));assert.ok(!html.includes('javascript:'));
});
test('legacy tasks gain safe defaults and task edits preserve attachment, identity and profile',async()=>{
 globalThis.localStorage=new MemoryStorage();
 localStorage.setItem('almazov.personalization.v1',JSON.stringify({tasks:[task({attachmentData:'data:application/pdf;base64,JVBERi0=',attachmentName:'notes.pdf',status:'done'})],materials:[]}));
 const store=await import('../dist/services/personalizationStore.js?planner-migration');
 const initial=store.readPersonalization();assert.equal(initial.tasks[0].kind,'homework');assert.deepEqual(initial.preparationItems,[]);
 const current=initial.tasks[0];store.updatePersonalization({tasks:[{...current,text:'Обновлено',kind:'report',dueTimeZone:'Europe/Moscow'}]});
 const saved=store.readPersonalization().tasks[0];assert.equal(saved.attachmentData,current.attachmentData);assert.equal(saved.id,current.id);assert.equal(saved.group,'123');assert.equal(saved.status,'done');
 assert.ok(localStorage.getItem('almazov.backup.personalization.pre-v2'));
});
test('real profile schedule fixtures produce preparation lessons for all published programs/courses',async()=>{
 for(const [program,courses] of [['31.05.01',[1,2,3,4,5,6]],['31.05.02',[1,2]],['37.05.01',[1,2]]])for(const course of courses){
  const payload=JSON.parse(await readFile(new URL(`../dist/data/schedules/${program}/${course}.json`,import.meta.url),'utf8'));
  assert.ok(payload.events.length||payload.weeklyBlocks?.length,`${program}/${course}`);
  const rows=scheduleRows({...payload,events:payload.events??[]});assert.ok(rows.length>0);
  assert.deepEqual(detailedScheduleDiff(rows,rows.map(r=>({...r}))),[]);
 }
});
test('backup accepts actual task schema and validates optional preparation checklist',()=>{
 const backup={format:'almazov-personal-backup',version:1,createdAt:new Date().toISOString(),personalization:{tasks:[task()],materials:[],preparationItems:[{id:'p',...profile,date:'2026-11-27',text:'Халат',done:false,createdAt:'2026-11-26'}]},local:{},stores:{files:[],'practice-events':[],tickets:[]}};
 assert.equal(validatePersonalBackup(backup),backup);
 const bad=structuredClone(backup);bad.personalization.preparationItems[0].date='2026-02-30';assert.throws(()=>validatePersonalBackup(bad));
 const old=structuredClone(backup);delete old.personalization.preparationItems;assert.equal(validatePersonalBackup(old),old);
});
