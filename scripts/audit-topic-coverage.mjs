import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {LESSON_TOPIC_PLANS} from '../dist/data/lessonTopics.js';
import {TOPIC_SOURCES} from '../dist/data/topicSources.js';
import {describeLessons,validateTopicPlan} from '../dist/core/lessonTopics.js';
import {displayScheduleParts,scheduleToCalendarEvent} from '../dist/core/calendar.js';
import {expandPracticeCycles} from '../dist/core/practiceCycles.js';
import {eventAppliesToGroup} from '../dist/core/filter.js';
import {groupsFor,streamForGroup} from '../dist/data/roster.js';
import {normalizeLessonSubject} from '../dist/core/lessonSequence.js';
import {subjectTopicCoverage,topicLibraryEntries} from '../dist/core/topicLibrary.js';
const root=new URL('../',import.meta.url),keys=new Set();
for(const p of LESSON_TOPIC_PLANS){
  assert.ok(validateTopicPlan(p),`invalid reviewed plan: ${p.id}`);
  for(const subject of new Set(p.subjects.map(normalizeLessonSubject))){
    const key=JSON.stringify([p.program,p.course,p.academicYear,p.semester,p.type,subject]);
    assert.ok(!keys.has(key),`ambiguous topic match: ${p.id}`);keys.add(key);
  }
}
const scopes=[],maxCourse=process.argv.includes('--first-two')?2:6;
const reportName=maxCourse===2?'topic-coverage-first-two':'topic-coverage-latest';
for(const program of ['31.05.01','31.05.02','37.05.01'])for(let course=1;course<=maxCourse;course++){
  const payload=JSON.parse(await readFile(new URL(`dist/data/schedules/${program}/${course}.json`,root),'utf8'));
  if(payload.status==='unpublished')continue;
  const plans=LESSON_TOPIC_PLANS.filter(p=>p.program===program&&p.course===course);
  const subjectRows=new Map(),library=topicLibraryEntries({program,course});
  const scope={program,course,catalogEntries:TOPIC_SOURCES.filter(s=>s.program===program&&s.course===course).length,groups:groupsFor(program,course).length,plans:plans.map(p=>({id:p.id,subject:p.subjects[0],type:p.type,semester:p.teachingSemester??(p.course-1)*2+p.semester,topics:p.topics.length,hours:p.totalHours,...(p.mappingIssue?{mappingIssue:p.mappingIssue}:{}),groupsWithMappedTopics:0,groupsRequiringReconciliation:0}))};
  for(const group of groupsFor(program,course)){
    const profile={program,course,group,stream:streamForGroup(program,group)};
    const events=[...(payload.events??[]),...expandPracticeCycles(payload.weeklyBlocks??[])].filter(e=>eventAppliesToGroup(e,profile)).flatMap(displayScheduleParts).map(e=>scheduleToCalendarEvent(e,'Europe/Moscow'));
    const described=describeLessons(events,group),mapped=new Set(described.filter(e=>e.topic).map(e=>e.topic.planId));
    for(const row of subjectTopicCoverage(described,library)){
      const key=JSON.stringify([normalizeLessonSubject(row.subject),row.type,row.semester]);
      const total=subjectRows.get(key)??{...row,groups:0,groupsWithMappedTopics:0,unavailableReasons:[]};
      total.groups++;if(row.mapped)total.groupsWithMappedTopics++;
      if(!row.mapped){
        const matching=described.filter(e=>normalizeLessonSubject(e.subject||e.title)===normalizeLessonSubject(row.subject)&&e.type===row.type&&(Number(e.startAt.slice(5,7))>=9||Number(e.startAt.slice(5,7))===1?1:2)===row.semester);
        const reasons=matching.map(e=>e.topicUnavailable).filter(Boolean);
        if(!reasons.length)reasons.push(row.planIds.length?'Привязка к расписанию не подтверждена.':'Проверенный план для этого предмета, вида занятий и семестра отсутствует.');
        total.unavailableReasons=[...new Set([...total.unavailableReasons,...reasons])];
      }
      subjectRows.set(key,total);
    }
    for(const row of scope.plans){
      if(mapped.has(row.id))row.groupsWithMappedTopics++;
      else if(described.some(e=>e.topicUnavailable&&normalizeLessonSubject(e.subject||e.title)===normalizeLessonSubject(row.subject)&&e.type===row.type))row.groupsRequiringReconciliation++;
    }
  }
  scope.subjects=[...subjectRows.values()];
  scope.missingReviewedPlans=scope.subjects.filter(s=>!s.planIds.length).length;
  scope.subjectsRequiringReconciliation=scope.subjects.filter(s=>s.groupsWithMappedTopics!==s.groups).length;
  scope.completeTopicCoverage=scope.missingReviewedPlans===0&&scope.subjects.length>0&&scope.subjects.every(s=>s.groupsWithMappedTopics===s.groups);
  scopes.push(scope);
}
const report={schemaVersion:1,courses:Array.from({length:maxCourse},(_,i)=>i+1),catalogEntries:TOPIC_SOURCES.length,reviewedPlans:LESSON_TOPIC_PLANS.length,reviewedTopics:LESSON_TOPIC_PLANS.reduce((sum,p)=>sum+p.topics.length,0),dateMatchingRule:'expected programme order; reconcile full semester hours; never teacher-confirmed by this audit',scopes};
if(!process.argv.includes('--check')){
  await mkdir(new URL('reports/',root),{recursive:true});
  await writeFile(new URL(`reports/${reportName}.json`,root),JSON.stringify(report,null,2)+'\n');
  const label={'31.05.01':'Лечебное дело','31.05.02':'Педиатрия','37.05.01':'Клиническая психология'};
  const markdown=['# Проверка тематических планов','',`Область: ${maxCourse===2?'1–2 курсы всех трёх направлений':'все опубликованные курсы'}. Основание перечня — действующее расписание. Весенние планы в библиотеке не означают, что весеннее расписание уже проверено.`, '', '«План проверен» означает сверку порядка тем и указанных часов по программе. Привязка к датам дополнительно требует совпадения полного объёма расписания; противоречия в источнике её блокируют. Это не подтверждение фактической темы преподавателем.','', '| Направление | Курс | Планов в библиотеке | Предметов / видов без плана | Требуют сверки с расписанием |','|---|---:|---:|---:|---:|',...scopes.map(s=>`| ${label[s.program]} | ${s.course} | ${s.plans.length} | ${s.missingReviewedPlans} | ${s.subjectsRequiringReconciliation} |`),''];
  for(const scope of scopes){
    markdown.push(`## ${label[scope.program]}, ${scope.course} курс`,'');
    for(const row of scope.subjects.filter(s=>s.groupsWithMappedTopics!==s.groups))markdown.push(`- ${row.subject} · ${row.type==='lecture'?'лекции':'ПЗ'} · ${row.semester===1?'осень':'весна'}: привязка у ${row.groupsWithMappedTopics} из ${row.groups} групп. ${row.unavailableReasons.join(' ')}`);
    markdown.push('');
  }
  await writeFile(new URL(`reports/${reportName}.md`,root),markdown.join('\n'));
}
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
else{
  console.log(`Topics: ${report.reviewedPlans} reviewed plans, ${report.reviewedTopics} source topics. Date mapping remains independently gated.`);
  for(const s of scopes)console.log(`${s.program} / ${s.course}: plans=${s.plans.length}, missing=${s.missingReviewedPlans}, reconciliation=${s.subjectsRequiringReconciliation}, complete=${s.completeTopicCoverage}`);
}
if(process.argv.includes('--require-complete'))assert.ok(scopes.length>0&&scopes.every(s=>s.completeTopicCoverage),`Full topic coverage is not achieved; see subject-level blockers in reports/${reportName}.json`);
