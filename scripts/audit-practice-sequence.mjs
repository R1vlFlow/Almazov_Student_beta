import {readFileSync,writeFileSync} from 'node:fs';
import {groupsFor,streamForGroup} from '../dist/data/roster.js';
import {eventAppliesToGroup} from '../dist/core/filter.js';
import {expandPracticeCycles} from '../dist/core/practiceCycles.js';
import {displayScheduleParts,scheduleToCalendarEvent} from '../dist/core/calendar.js';
import {numberLessons} from '../dist/core/lessonSequence.js';
const report={checkedAt:new Date().toISOString(),groups:0,rows:0,doubleSessions:0,errors:[],warnings:[],subjects:[],examples:[]};
for(const program of ['31.05.01','31.05.02','37.05.01'])for(let course=1;course<=6;course++){
 const data=JSON.parse(readFileSync(`dist/data/schedules/${program}/${course}.json`,'utf8'));
 for(const group of groupsFor(program,course)){
  const rows=[...(data.events||[]),...expandPracticeCycles((data.weeklyBlocks||[]).filter(x=>x.group===group))].filter(e=>eventAppliesToGroup(e,{program,course,group,stream:streamForGroup(program,group)})).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
  if(!rows.length){report.warnings.push({program,course,group,issue:'no-events'});continue;}report.groups++;
  const display=rows.flatMap(displayScheduleParts).map(e=>scheduleToCalendarEvent(e,'Europe/Moscow'));
  const numbered=numberLessons(display,group);report.rows+=numbered.length;
  const byId=new Map(numbered.map(e=>[e.id,e]));
  const counts=new Map();
  for(const event of numbered)if(event.type!=='practice'&&event.lessonNumber!==undefined)report.errors.push({group,id:event.id,issue:'number-on-non-practice'});
  for(const row of rows.filter(x=>x.type==='practice')){
   const key=JSON.stringify([row.subject.normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s+/g,' ').trim(),row.type]);const set=counts.get(key)||new Set();
   set.add(row.doubleOf?JSON.stringify([row.date,row.doubleOf]):JSON.stringify([row.date,row.start,row.end,row.location]));counts.set(key,set);
   const parts=displayScheduleParts(row).map(p=>byId.get(p.id));
   if(parts.length===2){report.doubleSessions++;if(parts[0].lessonNumber!==parts[1].lessonNumber)report.errors.push({group,id:row.id,issue:'split-number-mismatch'});}
   if(row.doublePart&&!row.doubleOf)report.warnings.push({program,course,group,id:row.id,issue:'orphan-double-part'});
   for(const part of parts)if(part.lessonNumber!==set.size)report.errors.push({program,course,group,id:row.id,expected:set.size,actual:part.lessonNumber});
  }
  for(const [key,sessions] of counts){const [subject,type]=JSON.parse(key);report.subjects.push({program,course,group,subject,type,lessons:sessions.size,topicStatus:'not-verified',reason:'No verified date-to-topic mapping loaded'});}
  if(group==='124')report.examples=numbered.filter(e=>e.startAt.startsWith('2026-10-19')||e.startAt.startsWith('2026-10-24')).map(e=>({title:e.title,type:e.type,start:e.startAt,number:e.lessonNumber,part:e.doublePart}));
 }
}
writeFileSync('reports/practice-sequence-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,subjects:report.subjects.length,errors:report.errors.slice(0,10),warnings:report.warnings.slice(0,10)},null,2));

if(report.errors.length)process.exitCode=1;
