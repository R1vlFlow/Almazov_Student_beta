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
