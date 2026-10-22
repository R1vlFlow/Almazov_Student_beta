import test from 'node:test';
import assert from 'node:assert/strict';
import {numberLessons} from '../dist/core/lessonSequence.js';
import {displayScheduleParts,scheduleToCalendarEvent} from '../dist/core/calendar.js';
const row=(id,date,type='practice',extra={})=>({id,kind:'schedule',title:'Анатомия',program:'31.05.01',course:1,group:'124',type,startAt:date+'T06:00:00Z',endAt:date+'T07:30:00Z',timeZone:'Europe/Moscow',readOnly:true,...extra});
test('ordinals are chronological, separate by type, group, subject and semester',()=>{
 const input=[row('b','2026-09-08'),row('a','2026-09-01'),row('l','2026-09-03','lecture'),row('g','2026-09-03','practice',{group:'125'}),row('s','2026-02-01'),row('jan','2027-01-10'),row('new','2027-02-10')];
 assert.deepEqual(numberLessons(input).map(x=>x.lessonNumber),[2,1,undefined,1,1,3,1]);assert.equal(input[0].lessonNumber,undefined);
});
test('both parts of explicit and duration-based doubles share one number',()=>{
 const e={id:'double',program:'31.05.01',course:1,group:'124',stream:'B',date:'2026-09-01',start:'09:00',end:'12:25',subject:'Анатомия',location:'Солнечное',teacher:'',type:'practice',mergedConsecutive:true};
 for(const lessonParts of [undefined,[{start:'09:00',end:'10:35'},{start:'10:55',end:'12:25'}]]){
  const parts=displayScheduleParts({...e,lessonParts}).map(x=>scheduleToCalendarEvent(x,'UTC'));
  assert.deepEqual(numberLessons([...parts,row('next','2026-09-08')]).map(x=>x.lessonNumber),[1,1,2]);
 }
});
test('recurring double identifiers count once per day; separate singles stay separate',()=>{
 const events=[row('a','2026-09-01','practice',{doubleOf:'same'}),row('b','2026-09-08','practice',{doubleOf:'same'}),row('c','2026-09-08','practice',{startAt:'2026-09-08T12:00:00Z',endAt:'2026-09-08T13:30:00Z'})];
 assert.deepEqual(numberLessons(events).map(x=>x.lessonNumber),[1,2,3]);
});
test('personal and cancelled events have no ordinal; duplicate source rows do not increment',()=>{
 assert.deepEqual(numberLessons([row('a','2026-09-01'),row('dup','2026-09-01'),row('b','2026-09-02','practice',{status:'cancelled'}),row('p','2026-09-02','practice',{kind:'personal'}),row('c','2026-09-03')]).map(x=>x.lessonNumber),[1,1,undefined,undefined,2]);
});

test('only practices receive numbers, including after recalculation of old numbered lectures',()=>{
 const events=['lecture','lab','assessment','other','practice'].map((type,i)=>row(String(i),'2026-09-01',type,{lessonNumber:99}));
 assert.deepEqual(numberLessons(events,'124').map(x=>x.lessonNumber),[undefined,undefined,undefined,undefined,1]);
});
