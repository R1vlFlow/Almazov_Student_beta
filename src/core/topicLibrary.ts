import {TOPIC_SOURCES,type TopicSource} from '../data/topicSources.js';
import {LESSON_TOPIC_PLANS,type LessonTopicPlan} from '../data/lessonTopics.js';
import {normalizeLessonSubject} from './lessonSequence.js';
import {validateTopicPlan} from './lessonTopics.js';

export interface TopicLibraryEntry {source:TopicSource;plans:readonly LessonTopicPlan[];}
export interface SubjectTopicCoverage {subject:string;type:'lecture'|'practice';semester:number;sourceIds:string[];planIds:string[];mapped:boolean;}
/** Use the timetable as the denominator. A bundle PDF is not a reviewed subject plan. */
export function subjectTopicCoverage(events:import('./calendar.js').CalendarEvent[],entries:TopicLibraryEntry[]):SubjectTopicCoverage[]{
  const rows=new Map<string,SubjectTopicCoverage>();
  for(const event of events){
    if(event.kind!=='schedule'||event.status==='cancelled'||(event.type!=='lecture'&&event.type!=='practice'))continue;
    const subject=normalizeLessonSubject(event.subject||event.title);
    const semester=Number(event.startAt.slice(5,7))>=9||Number(event.startAt.slice(5,7))===1?1:2;
    const matching=entries.filter(e=>!e.source.bundle&&[e.source.subject,...e.source.aliases,...e.plans.flatMap(p=>p.subjects)].some(s=>normalizeLessonSubject(s)===subject));
    const plans=matching.flatMap(e=>e.plans).filter(p=>p.type===event.type&&p.semester===semester);
    const key=JSON.stringify([subject,event.type,semester]);
    const row=rows.get(key)??{subject:event.subject||event.title,type:event.type as 'lecture'|'practice',semester,sourceIds:matching.map(e=>e.source.id),planIds:plans.map(p=>p.id),mapped:false};
    row.mapped ||= !!event.topic&&row.planIds.includes(event.topic.planId);
    rows.set(key,row);
  }
  return [...rows.values()].sort((a,b)=>a.subject.localeCompare(b.subject,'ru')||a.type.localeCompare(b.type)||a.semester-b.semester);
}
export function officialTopicUrl(value:string):string|undefined{
  try{const url=new URL(value);return url.protocol==='https:'&&url.hostname==='education.almazovcentre.ru'&&!url.username&&!url.password?url.href:undefined;}catch{return;}
}
export function topicLibraryEntries(profile:{program:string;course:number},sources:readonly TopicSource[]=TOPIC_SOURCES,plans:readonly LessonTopicPlan[]=LESSON_TOPIC_PLANS):TopicLibraryEntry[]{
  return sources.filter(s=>s.program===profile.program&&s.course===profile.course&&officialTopicUrl(s.url)).map(source=>({source,plans:plans.filter(p=>!source.bundle&&p.program===source.program&&p.course===source.course&&p.academicYear===source.academicYear&&(p.curriculumYear??p.academicYear-p.course+1)===source.cohortYear&&p.sha256===source.sha256&&officialTopicUrl(p.sourceUrl)===officialTopicUrl(source.url)&&p.subjects.some(subject=>[source.subject,...source.aliases].some(alias=>normalizeLessonSubject(subject)===normalizeLessonSubject(alias)))&&p.topics.every(t=>t.page>=(source.pageStart??1)&&t.page<=(source.pageEnd??source.pages??Infinity))&&validateTopicPlan(p))})).sort((a,b)=>a.source.subject.localeCompare(b.source.subject,'ru'));
}
export function filterTopicLibrary(entries:TopicLibraryEntry[],query:string,type:string,semester:string):TopicLibraryEntry[]{
  const q=normalizeLessonSubject(query);
  return entries.map(entry=>({...entry,plans:entry.plans.filter(p=>(type==='all'||p.type===type)&&(semester==='all'||String(p.semester)===semester))})).filter(entry=>{
    if((type!=='all'||semester!=='all')&&!entry.plans.length)return false;
    return !q||normalizeLessonSubject([entry.source.subject,...entry.source.aliases,...entry.plans.flatMap(p=>[...p.subjects,...p.topics.map(t=>t.title)])].join(' ')).includes(q);
  });
}
