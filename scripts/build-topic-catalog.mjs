import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const catalog=JSON.parse(await readFile(new URL('data/topic-catalog.json',root),'utf8'));
const reviewed=JSON.parse(await readFile(new URL('data/topic-plans-reviewed.json',root),'utf8'));
assert.equal(catalog.schemaVersion,1);assert.equal(reviewed.schemaVersion,1);
const safeUrl=value=>{const u=new URL(value);assert.equal(u.protocol,'https:');assert.equal(u.hostname,'education.almazovcentre.ru');assert.ok(!u.username&&!u.password);};
const ids=new Set();
for(const source of catalog.sources){
  assert.ok(!ids.has(source.id),'duplicate source ID');ids.add(source.id);safeUrl(source.url);safeUrl(source.catalogUrl);
  assert.ok(['31.05.01','31.05.02','37.05.01'].includes(source.program));
  assert.ok(Number.isInteger(source.course)&&source.course>=1&&source.course<=6);
  assert.equal(source.cohortYear,source.academicYear-source.course+1);
  if(source.sha256)assert.match(source.sha256,/^[a-f0-9]{64}$/);
  if(source.pageStart!==undefined){assert.ok(Number.isInteger(source.pageStart)&&source.pageStart>=1);assert.ok(Number.isInteger(source.pageEnd)&&source.pageEnd>=source.pageStart&&source.pageEnd<=source.pages);}
}
ids.clear();
for(const plan of reviewed.plans){
  assert.equal(plan.review,'verified','OCR candidates cannot be bundled');
  assert.ok(!ids.has(plan.id),'duplicate plan ID');ids.add(plan.id);
  assert.equal(plan.curriculumYear,plan.academicYear-plan.course+1);
  assert.equal(plan.teachingSemester,(plan.course-1)*2+plan.semester);
  assert.ok(['lecture','practice'].includes(plan.type));assert.ok([1,2].includes(plan.semester));
  assert.ok(plan.mappingIssue===undefined||typeof plan.mappingIssue==='string'&&plan.mappingIssue.trim().length>0);
  assert.ok(plan.subjects.length&&plan.subjects.every(s=>typeof s==='string'&&s.trim()));
  const key=value=>value.toLocaleLowerCase('ru').replaceAll('ё','е').replace(/\s+/g,' ').trim();
  const source=catalog.sources.find(s=>!s.bundle&&s.program===plan.program&&s.course===plan.course&&s.cohortYear===plan.curriculumYear&&s.sha256===plan.sha256&&new URL(s.url).href===new URL(plan.sourceUrl).href&&plan.subjects.some(subject=>[s.subject,...s.aliases].some(alias=>key(subject)===key(alias)))&&plan.topics.every(t=>t.page>=(s.pageStart??1)&&t.page<=(s.pageEnd??s.pages)));
  assert.ok(source,`missing verified source: ${plan.id}`);
  assert.ok(plan.topics.length);assert.equal(plan.topics.reduce((sum,t)=>sum+t.hours,0),plan.totalHours);
  assert.ok(plan.topics.every(t=>t.title.trim().length>=6&&!/название темы|наименование темы/i.test(t.title)&&Number.isInteger(t.hours)&&t.hours>0&&Number.isInteger(t.page)&&t.page>=1&&t.page<=source.pages));
}
const sourceType='export interface TopicSource {id:string;program:string;course:number;academicYear:number;cohortYear:number;subject:string;aliases:readonly string[];url:string;catalogUrl:string;sha256?:string;pages?:number;pageStart?:number;pageEnd?:number;checkedAt:string;bundle:boolean;reviewNote?:string;}\n';
const plans=reviewed.plans.map(({review,...plan})=>plan);
const outputs=[['src/data/topicSources.ts','/** Generated from the official catalogue; a PDF link does not certify a date-to-topic match. */\n'+sourceType+'export const TOPIC_SOURCES:readonly TopicSource[]='+JSON.stringify(catalog.sources,null,2)+';\n'],['src/data/expandedLessonTopics.ts',"/** Generated only from reviewed plans. OCR candidates are never imported. */\nimport type {LessonTopicPlan} from './lessonTopics.js';\nexport const EXPANDED_LESSON_TOPIC_PLANS:readonly LessonTopicPlan[]="+JSON.stringify(plans,null,2)+';\n']];
for(const [path,content] of outputs){
  const file=new URL(path,root),before=await readFile(file,'utf8').catch(()=>'');
  if(process.argv.includes('--check'))assert.equal(before.replaceAll('\r\n','\n').replace(/^\uFEFF/,''),content,`${path} is out of date`);
  else if(before!==content)await writeFile(file,content);
}
console.log(`Topic catalogue: ${catalog.sources.length} documents, ${plans.length} additional reviewed plans, ${plans.reduce((sum,p)=>sum+p.topics.length,0)} topics.`);
