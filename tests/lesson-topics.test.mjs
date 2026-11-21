import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {describeLessons} from '../dist/core/lessonTopics.js';
import {LESSON_TOPIC_PLANS} from '../dist/data/lessonTopics.js';
import {displayScheduleParts,scheduleToCalendarEvent} from '../dist/core/calendar.js';
import {normalizeLiveEvents} from '../dist/core/validate.js';
import {eventAppliesToGroup} from '../dist/core/filter.js';
import {groupsFor,streamForGroup} from '../dist/data/roster.js';

const plan=(subject,type)=>LESSON_TOPIC_PLANS.find(p=>p.subjects.includes(subject)&&p.type===type);
function semester(p,{group='124',start='2026-09-01',split=false}={}){
  const hours=p.type==='practice'?4:2;
  return Array.from({length:p.totalHours/hours},(_,i)=>{
    const d=new Date(`${start}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+i);const date=d.toISOString().slice(0,10);
    const raw={id:`${group}-${p.type}-${i}`,subject:p.subjects[0],program:p.program,course:p.course,group,type:p.type,date,start:'09:00',end:hours===4?'12:25':'10:35',location:'Солнечное',mergedConsecutive:split&&hours===4};
    return (split?displayScheduleParts(raw):[raw]).map(e=>scheduleToCalendarEvent(e,'Europe/Moscow'));
  }).flat();
}
test('verified plans have explicit provenance and exactly the source teaching-hour totals',()=>{
  assert.equal(LESSON_TOPIC_PLANS.length,6);
  for(const p of LESSON_TOPIC_PLANS){
    assert.equal(p.topics.reduce((sum,t)=>sum+t.hours,0),p.totalHours,p.id);
    assert.match(p.sha256,/^[a-f0-9]{64}$/);assert.equal(new URL(p.sourceUrl).hostname,'education.almazovcentre.ru');
    assert.ok(p.topics.every(t=>t.title.length>5&&t.page>=8&&t.page<=17&&[2,4].includes(t.hours)));
    const described=describeLessons(semester(p));assert.ok(described.every(e=>e.topic),p.id);
    assert.equal(described.at(-1).topic.titles.at(-1),p.topics.at(-1).title);
  }
});
test('groups starting in September and November get the same intended first practice topic',()=>{
  const p=plan('Биология','practice');
  const september=semester(p,{group:'101'}),november=semester(p,{group:'124',start:'2026-11-01'});
  const described=describeLessons([...november,...september].reverse());
  for(const group of ['101','124']){
    const first=described.find(e=>e.id===`${group}-practice-0`);
    assert.equal(first.lessonNumber,1);assert.deepEqual(first.topic.titles,['Строение ядра']);
  }
  assert.equal(september[0].topic,undefined,'input remains unchanged');
});
test('a double keeps one PZ number and can cover two two-hour programme topics',()=>{
  const p=plan('Химия','practice');const described=describeLessons(semester(p,{split:true}));
  assert.deepEqual(described.slice(0,4).map(e=>e.lessonNumber),[1,1,2,2]);
  assert.deepEqual(described[0].topic.titles,['Способы выражения концентрации растворов','Осмотические явления в клетке']);
  assert.deepEqual(described[0].topic,described[1].topic);
  assert.deepEqual(described[2].topic.titles,['Основы химической термодинамики и биоэнергетики','Основы химической кинетики']);
  assert.deepEqual(described.at(-1).topic.titles,['Итоговое занятие по биоорганической химии']);
});
test('one four-hour programme topic spans two single slots without shifting subsequent topics',()=>{
  const p=plan('Биология','practice');const rows=semester(p);
  const first=rows.shift();rows.unshift({...first,id:'second-half',startAt:first.startAt.replace('06:00','07:50'),endAt:first.endAt}, {...first,id:'first-half',endAt:first.startAt.replace('06:00','07:35')});
  const described=describeLessons(rows);
  assert.deepEqual(described[0].topic.titles,['Строение ядра']);assert.deepEqual(described[1].topic.titles,['Строение ядра']);
  assert.equal(described[2].topic.titles[0],p.topics[1].title);
});
test('lecture and practice sequences remain separate and lectures never display a lesson number',()=>{
  const lectures=semester(plan('Анатомия','lecture'));
  const practices=semester(plan('Анатомия','practice'),{split:true});
  const rows=describeLessons([...practices,...lectures]);
  assert.ok(rows.filter(e=>e.type==='lecture').every(e=>e.topic&&e.lessonNumber===undefined));
  assert.equal(rows.find(e=>e.type==='lecture').topic.titles[0],plan('Анатомия','lecture').topics[0].title);
  assert.equal(rows.filter(e=>e.type==='practice').at(-1).lessonNumber,15);
});
test('moved events follow their new chronology; cancellations and duplicate source rows consume no hours',()=>{
  const rows=semester(plan('Анатомия','lecture'));
  [rows[0].startAt,rows[1].startAt]=[rows[1].startAt,rows[0].startAt];
  [rows[0].endAt,rows[1].endAt]=[rows[1].endAt,rows[0].endAt];
  const out=describeLessons([...rows,{...rows[2],id:'duplicate'},{...rows[3],id:'cancelled',status:'cancelled'}]);
  assert.equal(out[1].topic.titles[0],plan('Анатомия','lecture').topics[0].title);
  assert.equal(out[0].topic.titles[0],plan('Анатомия','lecture').topics[1].title);
  assert.deepEqual(out.at(-2).topic,out[2].topic);assert.equal(out.at(-1).topic,undefined);
});
test('incomplete, overlapping and malformed semesters are not labelled with misleading topics',()=>{
  const rows=semester(plan('Биология','practice'),{split:true});
  for(const input of [rows.slice(2),rows.slice(1),[...rows,{...rows[0],id:'extra',doubleOf:'extra'}],rows.map((e,i)=>i?e:{...e,endAt:e.startAt}),rows.map((e,i)=>i===2?{...e,startAt:rows[0].startAt,endAt:rows[0].endAt}:e)]){
    const out=describeLessons(input);
    assert.ok(out.every(e=>!e.topic));assert.ok(out.some(e=>e.topicUnavailable));
  }
});
test('unsupported subjects, programmes, years, semesters and personal events never inherit stale topics',()=>{
  const rows=semester(plan('Химия','lecture'));
  for(const extra of [{subject:'Физика',title:'Физика'},{program:'31.05.02'},{course:2},{kind:'personal'},{startAt:'2027-02-01T06:00:00Z',endAt:'2027-02-01T07:35:00Z'},{startAt:'2027-09-01T06:00:00Z',endAt:'2027-09-01T07:35:00Z'}]){
    const out=describeLessons(rows.map(e=>({...e,topic:{titles:['stale']},...extra})));
    assert.ok(out.every(e=>!e.topic));
  }
});
test('all 35 real first-year groups reconcile with all six verified lecture/practice plans',async()=>{
  const raw=JSON.parse(await readFile(new URL('../data/official-schedules.json',import.meta.url),'utf8'));
  const all=normalizeLiveEvents(raw);
  let checked=0;
  for(const group of groupsFor('31.05.01',1)){
    const profile={program:'31.05.01',course:1,group,stream:streamForGroup('31.05.01',group)};
    const rows=all.filter(e=>eventAppliesToGroup(e,profile)).flatMap(displayScheduleParts).map(e=>scheduleToCalendarEvent(e,'Europe/Moscow'));
    const out=describeLessons(rows,group);
    for(const p of LESSON_TOPIC_PLANS){
      const matches=out.filter(e=>p.subjects.includes(e.subject||e.title)&&e.type===p.type&&e.startAt.startsWith('2026-'));
      assert.ok(matches.length,`${group}: missing ${p.id}`);
      assert.ok(matches.every(e=>e.topic&&!e.topicUnavailable),`${group}: semester hours mismatch for ${p.id}`);
      assert.equal(matches.at(-1).topic.titles.at(-1),p.topics.at(-1).title,`${group}: last topic ${p.id}`);
      if(p.type==='lecture')assert.ok(matches.every(e=>e.lessonNumber===undefined));
      checked++;
    }
  }
  assert.equal(checked,210);
});
