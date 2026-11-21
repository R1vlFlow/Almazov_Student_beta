import type {CalendarEvent} from './calendar.js';
import {LESSON_TOPIC_PLANS,type LessonTopicPlan} from '../data/lessonTopics.js';
import {lessonSequences,lessonTerm,normalizeLessonSubject,numberLessons} from './lessonSequence.js';

/** Timetable slots are 85–95 minutes (two academic hours), with a break
 * inside a merged 185–205 minute double. Unknown durations are not guessed. */
function blockHours(block:CalendarEvent[]):number|undefined{
  const unique=[...new Map(block.map(e=>[`${e.startAt}/${e.endAt}`,e])).values()];
  const spans=unique.map(e=>[Date.parse(e.startAt),Date.parse(e.endAt)] as const);
  if(spans.some(([start,end])=>!Number.isFinite(start)||!Number.isFinite(end)||end<=start))return;
  if(spans.some(([start,end],i)=>spans.some(([otherStart,otherEnd],j)=>i!==j&&start<otherEnd&&end>otherStart)))return;
  const hours=spans.map(([start,end])=>{const minutes=(end-start)/60000;return minutes>=80&&minutes<=100?2:minutes>=180&&minutes<=215?4:undefined;});
  if(hours.some(h=>h===undefined))return;
  const total=hours.reduce<number>((sum,h)=>sum+(h??0),0);
  if(block.some(e=>e.doubleOf)&&total!==4)return;
  return total;
}
function findPlan(e:CalendarEvent,plans:readonly LessonTopicPlan[]){
  const term=lessonTerm(e),subject=normalizeLessonSubject(e.subject||e.title);
  return plans.find(p=>p.program===e.program&&p.course===e.course&&p.type===e.type&&p.academicYear===term.academicYear&&p.semester===term.semester&&p.subjects.some(s=>normalizeLessonSubject(s)===subject));
}
/** Infer intended topics only when the full semester's teaching hours agree
 * with a verified programme. This prevents a partial import or an extra row
 * shifting every subsequent topic while presenting the result as accurate. */
export function describeLessons(events:CalendarEvent[],selectedGroup?:string,plans:readonly LessonTopicPlan[]=LESSON_TOPIC_PLANS):CalendarEvent[]{
  const result=numberLessons(events,selectedGroup).map(e=>({...e,topic:undefined as CalendarEvent['topic'],topicUnavailable:undefined as string|undefined}));
  for(const sequence of lessonSequences(result,selectedGroup)){
    const first=sequence[0]?.[0];if(!first)continue;
    const plan=findPlan(first,plans);if(!plan)continue;
    const hours=sequence.map(blockHours);
    const validPlan=plan.topics.length>0&&plan.topics.every(t=>t.title.trim()&&Number.isInteger(t.hours)&&t.hours>0&&Number.isInteger(t.page)&&t.page>0)&&plan.topics.reduce((sum,t)=>sum+t.hours,0)===plan.totalHours;
    const overlap=sequence.some((block,i)=>i>0&&Date.parse(block[0]!.startAt)<Math.max(...sequence[i-1]!.map(e=>Date.parse(e.endAt))));
    if(!validPlan||overlap||hours.some(h=>h===undefined)||hours.reduce<number>((sum,h)=>sum+(h??0),0)!==plan.totalHours){
      for(const block of sequence)for(const e of block)e.topicUnavailable='Тема не определена: объём или структура расписания не совпадает с проверенным планом. Нужна сверка с кафедрой.';
      continue;
    }
    let offset=0;
    sequence.forEach((block,index)=>{
      const end=offset+hours[index]!;let plannedOffset=0;
      const topics=plan.topics.filter(t=>{const start=plannedOffset;plannedOffset+=t.hours;return start<end&&plannedOffset>offset;});
      for(const e of block)e.topic={titles:[...new Set(topics.map(t=>t.title))],pages:[...new Set(topics.map(t=>t.page))],sourceUrl:plan.sourceUrl,planYear:plan.academicYear};
      offset=end;
    });
  }
  return result;
}
