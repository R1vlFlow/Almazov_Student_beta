import test from 'node:test';
import assert from 'node:assert/strict';
import {TOPIC_SOURCES} from '../dist/data/topicSources.js';
import {LESSON_TOPIC_PLANS} from '../dist/data/lessonTopics.js';
import {topicLibraryEntries,filterTopicLibrary,officialTopicUrl,subjectTopicCoverage} from '../dist/core/topicLibrary.js';
import {describeLessons,teachingHours,validateTopicPlan} from '../dist/core/lessonTopics.js';
import {normalizeLessonSubject} from '../dist/core/lessonSequence.js';
import {renderTopicLibrary} from '../dist/ui/topicLibrary.js';

const base=LESSON_TOPIC_PLANS.find(p=>p.program==='31.05.01'&&p.subjects.includes('Химия')&&p.type==='lecture');
const fake=(extra={})=>({...base,id:'fixture',course:6,curriculumYear:2021,teachingSemester:11,subjects:['Клинический предмет'],totalHours:6,topics:[{title:'Первая тема',hours:2,page:1},{title:'Вторая тема',hours:4,page:2}],...extra});
const event=(id,date,minutes,type='practice',extra={})=>({id,kind:'schedule',program:'31.05.01',course:6,group:'601',title:'Клинический предмет',type,startAt:date+'T06:00:00Z',endAt:new Date(Date.parse(date+'T06:00:00Z')+minutes*60000).toISOString(),timeZone:'Europe/Moscow',readOnly:true,...extra});

test('coverage lists every timetable subject/type/semester including absent sources, without counting bundles as themes',()=>{
  const profile={program:'31.05.01',course:3},entries=topicLibraryEntries(profile);
  const rows=subjectTopicCoverage([
    event('a','2026-09-01',95,'lecture',{course:3,title:'Патологическая анатомия'}),
    event('b','2026-09-02',95,'lecture',{course:3,title:'Патологическая анатомия'}),
    event('c','2027-02-02',95,'lecture',{course:3,title:'Патологическая анатомия'}),
    event('d','2026-09-02',95,'practice',{course:3,title:'Неизвестный предмет'}),
    event('e','2026-09-03',95,'practice',{course:3,title:'Отменённый предмет',status:'cancelled'})
  ],entries);
  assert.equal(rows.length,3);
  assert.equal(rows.find(r=>r.subject==='Патологическая анатомия'&&r.semester===1).planIds.length,1);
  assert.equal(rows.find(r=>r.subject==='Патологическая анатомия'&&r.semester===2).planIds.length,0);
  assert.equal(rows.find(r=>r.subject==='Неизвестный предмет').sourceIds.length,0);
  const bundle=topicLibraryEntries({program:'31.05.02',course:1});
  assert.equal(subjectTopicCoverage([event('f','2026-09-02',95,'practice',{title:bundle.find(e=>e.source.bundle).source.subject})],bundle)[0].sourceIds.length,0);
});

test('third-course reviewed themes keep previous-course pathology and sixth-course anaesthesia out of their sequences',()=>{
  const entries=topicLibraryEntries({program:'31.05.01',course:3});
  const pathology=entries.find(e=>e.source.subject==='Патологическая анатомия');
  assert.deepEqual(pathology.plans.map(p=>p.totalHours),[20,40]);
  assert.equal(pathology.plans[0].topics[0].title,'Гипертоническая болезнь и атеросклероз');
  const anaesthesia=entries.find(e=>e.source.subject==='Анестезиология и реаниматология');
  assert.ok(anaesthesia.plans.every(p=>p.teachingSemester===6));
  assert.deepEqual(anaesthesia.plans.map(p=>p.totalHours),[6,12]);
  assert.ok(anaesthesia.plans.every(p=>p.topics.every(t=>!t.title.includes('Общая анестезия'))));
  const surgery=entries.find(e=>e.source.subject==='Общая хирургия');
  assert.equal(surgery.plans.find(p=>p.semester===1&&p.type==='practice').topics.length,16);
});
test('known teaching durations include one-hour lectures and four-hour clinical days; irregular slots are not guessed',()=>{
  assert.deepEqual([45,85,95,135,185,205,210,270,300].map(teachingHours),[1,2,2,3,4,4,4,6,6]);
  for(const value of [0,-1,30,65,110,160,240,330,NaN,Infinity])assert.equal(teachingHours(value),undefined);
});
test('a clinical cycle advances across its explicit teaching days, independently of calendar weeks',()=>{
  const plan=fake({type:'practice',totalHours:12,topics:[{title:'Первый день цикла',hours:4,page:1},{title:'Второй день цикла',hours:4,page:2},{title:'Третий день цикла',hours:4,page:3}]});
  const rows=[event('a','2026-11-04',210),event('b','2026-11-05',210),event('c','2026-11-09',210)];
  const out=describeLessons(rows,'601',[plan]);
  assert.deepEqual(out.map(e=>e.lessonNumber),[1,2,3]);assert.deepEqual(out.map(e=>e.topic.titles[0]),plan.topics.map(t=>t.title));
});
test('two one-hour programme themes can share a lecture slot without displaying its ordinal',()=>{
  const plan=fake({type:'lecture',totalHours:2,topics:[{title:'Вводная тема',hours:1,page:1},{title:'Вторая тема',hours:1,page:1}]});
  const out=describeLessons([event('a','2026-09-01',95,'lecture')],'601',[plan]);
  assert.deepEqual(out[0].topic.titles,['Вводная тема','Вторая тема']);assert.equal(out[0].lessonNumber,undefined);
});
test('explicit subject aliases and room/date suffixes do not restart a verified sequence',()=>{
  const plan=fake({type:'practice',subjects:['Клинический предмет','Краткое название']});
  const rows=[event('a','2026-09-01',95,'practice',{title:'2157 Клинический предмет'}),event('b','2026-09-02',205,'practice',{title:'Краткое название'})];
  const out=describeLessons(rows,'601',[plan]);assert.deepEqual(out.map(e=>e.lessonNumber),[1,2]);assert.ok(out.every(e=>e.topic));
  assert.equal(normalizeLessonSubject('Внутренние болезни 17.09-23.09'),'внутренние болезни');
  assert.notEqual(normalizeLessonSubject('Хирургические болезни'),normalizeLessonSubject('Общая хирургия'));
});
test('a mismatched cohort, absolute semester, placeholder or conflicting source prevents automatic topic mapping',()=>{
  for(const extra of [{curriculumYear:2022},{teachingSemester:12},{curriculumYear:0},{sourceUrl:'https://example.org/plan.pdf'},{topics:[{title:'Название темы',hours:6,page:1}]}])assert.equal(validateTopicPlan(fake(extra)),false);
  const plan=fake({type:'practice'}),out=describeLessons([event('a','2026-09-01',270)],'601',[plan,{...plan,id:'different'}]);
  assert.equal(out[0].topic,undefined);assert.match(out[0].topicUnavailable,/разные планы/);
});
test('all six general-medicine courses have sources and plans from the appropriate cohort only',()=>{
  for(let course=1;course<=6;course++){
    const entries=topicLibraryEntries({program:'31.05.01',course});assert.ok(entries.length);
    assert.ok(entries.every(e=>e.source.cohortYear===2027-course));
    assert.ok(entries.some(e=>e.plans.length),`missing reviewed plans for course ${course}`);
  }
  assert.ok(TOPIC_SOURCES.length>=60);
});
test('pediatrics and psychology use their own official programme bundles without borrowing general-medicine topics',()=>{
  for(const program of ['31.05.02','37.05.01'])for(const course of [1,2]){
    const entries=topicLibraryEntries({program,course});assert.ok(entries.length);
    assert.ok(entries.some(e=>e.source.bundle));
    assert.ok(entries.every(e=>e.plans.every(p=>p.program===program&&p.course===course)));
    assert.ok(entries.filter(e=>e.source.bundle).every(e=>!e.plans.length));
  }
});

test('a shared bundle URL and SHA cannot attach a plan to an unrelated chapter or a bundle cover',()=>{
  const entries=topicLibraryEntries({program:'37.05.01',course:1});
  const foreign=entries.find(e=>e.source.subject==='Иностранный язык');
  const general=entries.find(e=>e.source.subject==='Общая психология');
  assert.equal(foreign.plans.length,2);assert.equal(general.plans.length,4);
  assert.equal(foreign.source.sha256,general.source.sha256);
  assert.ok(foreign.plans.every(p=>p.topics.every(t=>t.page>=foreign.source.pageStart&&t.page<=foreign.source.pageEnd)));
  assert.ok(!foreign.plans.some(p=>general.plans.includes(p)));
  const outside={...foreign.plans[0],topics:foreign.plans[0].topics.map(t=>({...t,page:general.source.pageStart}))};
  assert.equal(topicLibraryEntries({program:'37.05.01',course:1},[foreign.source],[outside])[0].plans.length,0);
});

test('an unresolved contradiction in the official programme blocks dates even when timetable hours happen to agree',()=>{
  const plan=fake({type:'practice',mappingIssue:'В официальной программе расходятся учебные часы.'});
  assert.ok(validateTopicPlan(plan));
  const out=describeLessons([event('a','2026-09-01',270)],'601',[plan]);
  assert.equal(out[0].topic,undefined);assert.equal(out[0].topicUnavailable,plan.mappingIssue);
});

test('spring programmes preserve cohort differences and do not fill autumn gaps with a different semester',()=>{
  const entries=(program,course)=>topicLibraryEntries({program,course});
  const find=(program,course,subject)=>entries(program,course).find(e=>e.source.subject===subject);
  const ld=find('31.05.01',1,'Анатомия человека');
  const pediatrics=find('31.05.02',1,'Анатомия человека');
  assert.equal(ld.plans.find(p=>p.semester===2&&p.type==='practice').totalHours,60);
  assert.equal(pediatrics.plans.find(p=>p.semester===2&&p.type==='practice').totalHours,68);
  const physiology=find('31.05.02',2,'Нормальная физиология');
  assert.ok(physiology.plans.find(p=>p.type==='lecture').mappingIssue);
  const it=entries('37.05.01',1).find(e=>e.source.subject==='Информационные и компьютерные технологии в науке и образовании');
  assert.ok(it.plans.length);
  assert.ok(it.plans.every(p=>p.semester===2));
  assert.ok(!entries('37.05.01',2).flatMap(e=>e.plans).some(p=>p.subjects.includes(it.source.subject)));
});

test('named first-year PE tracks cannot be inferred from a generic timetable subject',()=>{
  const entries=topicLibraryEntries({program:'31.05.01',course:1});
  const tracks=entries.filter(e=>e.source.subject.startsWith('Физическая культура и спорт:'));
  assert.equal(tracks.length,3);
  assert.ok(tracks.every(e=>e.plans.length===2&&e.plans.every(p=>p.totalHours===32)));
  const coverage=subjectTopicCoverage([event('pe','2026-09-02',95,'practice',{
    course:1,title:'Физическая культура и спорт'
  })],entries);
  assert.equal(coverage[0].planIds.length,0);
});

test('explicit campus and room prefixes preserve subject identity without merging distinct academic titles',()=>{
  for(const subject of ['(Город) Общая психология','(Солнечное) Общая психология','ул. Аккуратова, д. 2, лит. А, КПК, ауд. 2154 Общая психология','Солнечное, лит. С, ауд. 3.56 Общая психология','ЦДТИ, ауд. 3.1.9 Общая психология'])assert.equal(normalizeLessonSubject(subject),'общая психология');
  assert.equal(normalizeLessonSubject('КПК, "Коротков" Микробиология'),'микробиология');
  assert.notEqual(normalizeLessonSubject('Общая психология'),normalizeLessonSubject('Социальная психология'));
  assert.equal(normalizeLessonSubject('(Город)'),'(город)','an empty source cell must not become an invented subject');
});
test('source links are restricted to the official HTTPS host and unreviewed rows are not presented as verified plans',()=>{
  for(const value of ['javascript:alert(1)','http://education.almazovcentre.ru/x','https://education.almazovcentre.ru.evil.test/x','https://a@education.almazovcentre.ru/x'])assert.equal(officialTopicUrl(value),undefined);
  const entries=topicLibraryEntries({program:'31.05.01',course:1});
  assert.ok(entries.some(e=>!e.plans.length));assert.ok(entries.every(e=>officialTopicUrl(e.source.url)));
});
test('topic search finds verified topic text, type filters separate lectures/PZ, and lecture topics have no lesson number badge',()=>{
  const entries=topicLibraryEntries({program:'31.05.01',course:1});
  assert.ok(filterTopicLibrary(entries,'Биоэнергетика','lecture','1').some(e=>e.source.subject==='Химия'));
  assert.ok(filterTopicLibrary(entries,'','practice','all').every(e=>e.plans.every(p=>p.type==='practice')));
  const spring=filterTopicLibrary(entries,'','all','2');
  assert.ok(spring.length>0);
  assert.ok(spring.every(e=>e.plans.length>0&&e.plans.every(p=>p.semester===2)));
  const rendered=renderTopicLibrary({program:'31.05.01',course:1,group:'124'},[]);
  assert.match(rendered.html,/data-topic-plan/);assert.doesNotMatch(rendered.html,/class="lesson-number"/);
  assert.doesNotMatch(rendered.html,/<ul class="topic-plan-list">/,'large lists are populated only when expanded');
});
