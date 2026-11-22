import type {CalendarEvent} from './calendar.js';
import {LESSON_TOPIC_PLANS,type LessonTopicPlan} from '../data/lessonTopics.js';
import {lessonSequences,lessonTerm,normalizeLessonSubject,numberLessons} from './lessonSequence.js';

/** Known contact-time formats. A 09:00–12:30 clinical day is four academic
 * hours with breaks. Irregular durations remain unresolved. */
export function teachingHours(minutes:number):number|undefined{
  if(!Number.isFinite(minutes))return;
  for(const [min,max,hours] of [[40,55,1],[80,105,2],[125,155,3],[175,215,4],[270,300,6]] as const){
    if(minutes>=min&&minutes<=max)return hours;
  }
}
function blockHours(block:CalendarEvent[]):number|undefined{
  const unique=[...new Map(block.map(e=>[`${e.startAt}/${e.endAt}`,e])).values()];
  const spans=unique.map(e=>[Date.parse(e.startAt),Date.parse(e.endAt)] as const);
  if(spans.some(([start,end])=>!Number.isFinite(start)||!Number.isFinite(end)||end<=start))return;
  if(spans.some(([start,end],i)=>spans.some(([otherStart,otherEnd],j)=>i!==j&&start<otherEnd&&end>otherStart)))return;
  const hours=spans.map(([start,end])=>teachingHours((end-start)/60000));
  if(hours.some(h=>h===undefined))return;
  const total=hours.reduce<number>((sum,h)=>sum+(h??0),0);
  if(block.some(e=>e.doubleOf)){
    const labels=new Set(block.map(e=>e.doublePart).filter(Boolean));
    if(labels.size&&(!labels.has(1)||!labels.has(2)))return;
    if(unique.length===1&&total<4)return;
  }
  return total;
}
const indices=new WeakMap<readonly LessonTopicPlan[],Map<string,LessonTopicPlan|null>>();
function planKey(program:unknown,course:unknown,year:number,semester:number,type:unknown,subject:string){return JSON.stringify([program,course,year,semester,type,normalizeLessonSubject(subject)]);}
function planIndex(plans:readonly LessonTopicPlan[]){
  const cached=indices.get(plans);if(cached)return cached;
  const index=new Map<string,LessonTopicPlan|null>();
  for(const p of plans)for(const subject of p.subjects){
    const key=planKey(p.program,p.course,p.academicYear,p.semester,p.type,subject);
    const existing=index.get(key);
    index.set(key,existing===undefined?p:existing===p?existing:null);
  }
  indices.set(plans,index);return index;
}
export function findLessonTopicPlan(e:CalendarEvent,plans:readonly LessonTopicPlan[]=LESSON_TOPIC_PLANS):LessonTopicPlan|null|undefined{
  const term=lessonTerm(e);
  return planIndex(plans).get(planKey(e.program,e.course,term.academicYear,term.semester,e.type,e.subject||e.title));
}
export function validateTopicPlan(plan:LessonTopicPlan):boolean{
  return Number.isInteger(plan.course)&&plan.course>=1&&plan.course<=6&&Number.isInteger(plan.academicYear)&&plan.academicYear>=2000
    &&(plan.semester===1||plan.semester===2)
    &&(plan.curriculumYear===undefined||plan.curriculumYear===plan.academicYear-plan.course+1)
    &&(plan.teachingSemester===undefined||plan.teachingSemester===(plan.course-1)*2+plan.semester)
    &&(plan.mappingIssue===undefined||typeof plan.mappingIssue==='string'&&plan.mappingIssue.trim().length>0)
    &&/^https:\/\/education\.almazovcentre\.ru\//.test(plan.sourceUrl)
    &&/^[a-f0-9]{64}$/.test(plan.sha256)
    &&plan.topics.length>0&&plan.topics.every(t=>t.title.trim().length>=6&&!/название темы|наименование темы/i.test(t.title)&&Number.isInteger(t.hours)&&t.hours>0&&Number.isInteger(t.page)&&t.page>0)
    &&plan.topics.reduce((sum,t)=>sum+t.hours,0)===plan.totalHours;
}
/** Full semester reconciliation is required before deriving a date's topic.
 * Unsupported documents stay available in the library without guessing. */
export function describeLessons(events:CalendarEvent[],selectedGroup?:string,plans:readonly LessonTopicPlan[]=LESSON_TOPIC_PLANS):CalendarEvent[]{
  const subjectKey=(e:CalendarEvent)=>findLessonTopicPlan(e,plans)?.id??normalizeLessonSubject(e.subject||e.title);
  const result=numberLessons(events,selectedGroup,subjectKey).map(e=>({...e,topic:undefined as CalendarEvent['topic'],topicUnavailable:undefined as string|undefined}));
  for(const sequence of lessonSequences(result,selectedGroup,subjectKey)){
    const first=sequence[0]?.[0];if(!first)continue;
    const plan=findLessonTopicPlan(first,plans);if(plan===undefined)continue;
    const hours=sequence.map(blockHours);
    const overlap=sequence.some((block,i)=>i>0&&Date.parse(block[0]!.startAt)<Math.max(...sequence[i-1]!.map(e=>Date.parse(e.endAt))));
    let notice='';
    if(!plan)notice='Найдены разные планы для этого предмета. Тема требует сверки с кафедрой.';
    else if(!validateTopicPlan(plan))notice='Тематический план требует проверки. Откройте официальную программу предмета.';
    else if(plan.mappingIssue)notice=plan.mappingIssue;
    else if(overlap)notice='В расписании пересекаются занятия этого предмета. Тема требует сверки.';
    else if(hours.some(h=>h===undefined))notice='Продолжительность занятия требует уточнения. Темы доступны в программе предмета.';
    else if(hours.reduce<number>((sum,h)=>sum+(h??0),0)!==plan.totalHours)notice='Объём расписания не совпадает с тематическим планом. Темы доступны в программе предмета.';
    if(notice||!plan){for(const block of sequence)for(const e of block)e.topicUnavailable=notice;continue;}
    let offset=0;
    sequence.forEach((block,index)=>{
      const end=offset+hours[index]!;let plannedOffset=0;
      const topics=plan.topics.filter(t=>{const start=plannedOffset;plannedOffset+=t.hours;return start<end&&plannedOffset>offset;});
      for(const e of block)e.topic={titles:[...new Set(topics.map(t=>t.title))],pages:[...new Set(topics.map(t=>t.page))],sourceUrl:plan.sourceUrl,planYear:plan.curriculumYear??plan.academicYear-plan.course+1,cohortYear:plan.curriculumYear??plan.academicYear-plan.course+1,teachingSemester:plan.teachingSemester??(plan.course-1)*2+plan.semester,planId:plan.id,verifiedAt:plan.verifiedAt};
      offset=end;
    });
  }
  return result;
}
