import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const time=await import('../dist/core/time.js');
const {localDate,localTime,localDateTimeToUtc}=time;
const {normalizeLiveEvents}=await import('../dist/core/validate.js');
const {displayScheduleParts}=await import('../dist/core/calendar.js');

test('timezone conversion preserves Zurich summer time',()=>{
  const utc=localDateTimeToUtc('2026-07-01T10:00','Europe/Zurich');
  assert.equal(utc,'2026-07-01T08:00:00.000Z');
  assert.equal(localDate(utc,'Europe/Zurich'),'2026-07-01');
  assert.equal(localTime(utc,'Europe/Zurich'),'10:00');
});

test('merged consecutive pair displays as two separate timed parts',()=>{
  const event={id:'merged-pair',program:'31.05.01',course:1,group:'123',stream:'A',date:'2026-10-06',start:'09:00',end:'12:25',subject:'Химия',location:'ауд. 1',teacher:'Иванов И.И.',type:'practice',double:true,mergedConsecutive:true};
  const parts=displayScheduleParts(event);
  assert.deepEqual(parts.map(e=>[e.start,e.end,e.doublePart]),[['09:00','10:35',1],['10:50','12:25',2]]);
  assert.ok(parts.every(e=>e.double===true));
});

test('Saturday ORG double for group 124 renders as two consecutive parts',()=>{
  const event={id:'org-merged',program:'31.05.01',course:1,group:'124',stream:'A',date:'2026-10-10',start:'09:00',end:'12:25',subject:'Основы Российской государственности',location:'ауд. 1',teacher:'Иванов И.И.',type:'lecture',double:true,orgMerged:true,mergedConsecutive:true};
  const parts=displayScheduleParts(event);
  assert.deepEqual(parts.map(e=>[e.group,e.date,e.start,e.end,e.doublePart]),[['124','2026-10-10','09:00','10:35',1],['124','2026-10-10','10:50','12:25',2]]);
});

const appSource=await readFile('src/app.ts','utf8');

test('imported long practice blocks use the shared double-part display path',()=>{
  assert.match(appSource,/function importedPracticeCalendar\(e:ImportedPractice\):CalendarEvent\[\]/);
  assert.match(appSource,/const isDouble=\[185,205\]\.includes\(duration\)/);
  assert.match(appSource,/return displayScheduleParts\(schedule\)\.map\(/);
  assert.equal((appSource.match(/\.flatMap\(importedPracticeCalendar\)/g)??[]).length,2);
});

test('timezone conversion handles Zurich winter DST offset',()=>{
  const utc=localDateTimeToUtc('2026-01-15T10:00','Europe/Zurich');
  assert.equal(utc,'2026-01-15T09:00:00.000Z');
});

test('event created in New York renders on correct Zurich day',()=>{
  const utc=localDateTimeToUtc('2026-10-08T18:00','America/New_York');
  assert.equal(utc,'2026-10-08T22:00:00.000Z');
  assert.equal(localDate(utc,'Europe/Zurich'),'2026-10-09');
  assert.equal(localTime(utc,'Europe/Zurich'),'00:00');
});


test('official practice matrices stay week-based and never invent a weekday',async()=>{
  const payload=JSON.parse(await readFile('dist/data/schedules/31.05.01/4.json','utf8'));
  const blocks=payload.weeklyBlocks;
  const week6=blocks.filter((e)=>e.group==='413'&&e.weekNumber===5&&e.type==='practice'&&e.start==='13:30');
  assert.equal(week6.length,1);
  assert.deepEqual(week6.map((e)=>[e.weekRangeStart,e.weekRangeEnd,e.start,e.end,e.stream]),[['2026-09-28','2026-10-03','13:30','16:55','B']]);
  assert.equal('weekday' in week6[0]||'date' in week6[0],false);
  const explicitHalves = {schemaVersion:7,generatedAt:'2026-10-01T00:00:00Z',specialty:'31.05.01',courses:{'1':{specialty:'31.05.01',groups:['123'],events:[
    {id:'explicit-half-1',group:'123',stream:'A',date:'2026-10-06',start:'09:00',end:'10:35',subject:'Химия',location:'ауд. 1',teacher:'Иванов И.И.',type:'practice',doubleIndex:1,doubleOf:'verified-series'},
    {id:'explicit-half-2',group:'123',stream:'A',date:'2026-10-06',start:'10:50',end:'12:25',subject:'Химия',location:'ауд. 1',teacher:'Иванов И.И.',type:'practice',doubleIndex:2,doubleOf:'verified-series'}
  ]}}};
  const halves = normalizeLiveEvents(explicitHalves);
  assert.equal(halves.length,2,'explicit 1/2 and 2/2 parts must remain separate');
  assert.deepEqual(halves.map(e=>e.doublePart),[1,2]);
  const course6=JSON.parse(await readFile('dist/data/schedules/31.05.01/6.json','utf8'));
  assert.equal(course6.status,'live','verified 6K weekly blocks have no unresolved parser collisions');
  assert.ok(course6.weeklyBlocks.length>0,'current official 6K PDF practice rows should be included as week-based blocks');
  assert.ok(!course6.issues.includes('SCHEDULE_SLOT_CONFLICT_REVIEW_REQUIRED'));
});

const {shiftCalendarPeriod}=await import('../dist/core/date.js');
test('calendar arrows move in opposite directions in every view',()=>{
 for(const view of ['day','workweek','week','agenda','list','month']){
  const before=shiftCalendarPeriod('2026-10-15',view,-1);
  const after=shiftCalendarPeriod('2026-10-15',view,1);
  assert.ok(before<'2026-10-15',view+' backwards');
  assert.ok(after>'2026-10-15',view+' forwards');
  assert.equal(shiftCalendarPeriod(after,view,-1),'2026-10-15');
 }
 assert.equal(shiftCalendarPeriod('2026-10-15','week',1),'2026-10-22');
 assert.equal(shiftCalendarPeriod('2026-10-15','day',1),'2026-10-16');
 assert.match(appSource,/shiftCalendarPeriod\(state.focusDate,state.view,action==='next-period'\?1:-1\)/);
});
test('month arrows respect short months, leap years and year boundaries',()=>{
 for(const [date,direction,expected] of [
  ['2026-01-31',1,'2026-02-28'],['2028-01-31',1,'2028-02-29'],
  ['2026-03-31',-1,'2026-02-28'],['2026-12-15',1,'2027-01-15'],
  ['2026-01-15',-1,'2025-12-15'],['2026-08-31',1,'2026-09-30']
 ])assert.equal(shiftCalendarPeriod(date,'month',direction),expected);
});
import {expandPracticeCycles,hasImportedPracticeOverlap} from '../dist/core/practiceCycles.js';

test('senior course cycles become daily events without competing subjects',async()=>{
 for(const course of [4,5,6]){
  const snapshot=JSON.parse(await readFile(`dist/data/schedules/31.05.01/${course}.json`,'utf8'));
  const events=expandPracticeCycles(snapshot.weeklyBlocks);
  assert.ok(events.length>1000);
  assert.ok(events.every(e=>e.type==='practice'&&new Date(e.date).getUTCDay()!==0));
  assert.ok(events.every(e=>e.date!=='2026-11-04'));
  for(const e of events){
   assert.ok(!events.some(other=>other.id!==e.id&&other.group===e.group&&other.date===e.date&&other.start<e.end&&other.end>e.start),`${e.group} ${e.date}`);
  }
 }
 const six=JSON.parse(await readFile('dist/data/schedules/31.05.01/6.json','utf8'));
 const group=expandPracticeCycles(six.weeklyBlocks).filter(e=>e.group==='601'&&e.date>='2026-10-12'&&e.date<='2026-10-17');
 assert.equal(group.length,6);
 assert.ok(group.filter(e=>e.date<='2026-10-14').every(e=>e.subject.includes('Организация')));
 assert.ok(group.filter(e=>e.date>='2026-10-15').every(e=>e.subject.includes('Инфекционные')));
 assert.equal(expandPracticeCycles([{...six.weeklyBlocks[0],cycleDateStatus:'unresolved'}]).length,0);
});
test('import overrides only its group, date and overlapping practice interval',()=>{
 const event={program:'31.05.01',course:6,group:'601',date:'2026-10-16',start:'09:00',end:'12:25',type:'practice'};
 assert.equal(hasImportedPracticeOverlap(event,[event]),true);
 for(const change of [{group:'602'},{course:5},{date:'2026-10-17'},{start:'12:25',end:'14:00'}])assert.equal(hasImportedPracticeOverlap(event,[{...event,...change}]),false);
 assert.equal(hasImportedPracticeOverlap({...event,type:'lecture'},[event]),false);
 assert.match(appSource,/toggle-practice-import/);
});

test('repeated calendar conversions reuse bounded timezone formatters',async()=>{
 const {localDateTimeToUtc,localDate,localTime,localParts}=await import('../dist/core/time.js');
 const Native=Intl.DateTimeFormat;let created=0;
 Intl.DateTimeFormat=function(...args){created++;return new Native(...args);};
 try{
  for(let i=0;i<1000;i++){
   const utc=localDateTimeToUtc('2026-10-16T09:00','Asia/Tokyo');
   assert.equal(utc,'2026-10-16T00:00:00.000Z');
   assert.equal(localDate(utc,'Asia/Tokyo'),'2026-10-16');
   assert.equal(localTime(utc,'Asia/Tokyo'),'09:00');
  }
  assert.ok(created<=1,`created ${created} formatters`);
  const copy=localParts('2026-10-16T00:00:00.000Z','Asia/Tokyo');copy.hour=99;
  assert.equal(localTime('2026-10-16T00:00:00.000Z','Asia/Tokyo'),'09:00');
 }finally{Intl.DateTimeFormat=Native;}
});
