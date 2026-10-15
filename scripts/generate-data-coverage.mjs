import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=async rel=>JSON.parse(await readFile(join(root,rel),'utf8'));
const ld=await read('data/official-schedules.json');
const specialist=await read('data/program-schedules.json');
const manifest=await read('data/kug-source-manifest.json');
const kugData=await read('data/kug.json');
const sources=[];
for(const [course,data] of Object.entries(ld.courses??{}))for(const row of data.sources??[])sources.push({area:`Лечебное дело · ${course} курс · ${row.stream||'общий'} · ${row.kind}`,url:row.url,sha256:row.sha256,checkedAt:row.checkedAt,contentBytes:row.contentBytes,academicYearInDocument:row.academicYearInDocument,dateResolution:row.dateResolution});
for(const row of manifest.sources??[])sources.push({area:`КУГ · ${row.program} · ${row.course} курс`,url:row.url,sha256:row.sha256,checkedAt:row.checkedAt,contentBytes:row.contentBytes,academicYearInDocument:row.academicYearInDocument});
const sourceFailures=sources.filter(s=>! /^[a-f0-9]{64}$/.test(String(s.sha256??''))||!Number.isInteger(s.contentBytes)||s.contentBytes<500||s.academicYearInDocument!=='2026/2027');
const snapshots=[];
for(const course of ['1','2','3','4','5','6']){
 const data=ld.courses?.[course]??{};const coverage=ld.coverage?.[course]??{};
 snapshots.push({program:'31.05.01',course:Number(course),status:coverage.status==='full'?'full':'partial',sourceState:ld.dataState,events:data.events?.length??0,expectedGroups:coverage.expectedGroups??0,coveredGroups:coverage.coveredGroups??0,missing:coverage.missingGroups??[]});
}
for(const [program,pdata] of Object.entries(specialist.programs??{}))for(const [course,cdata] of Object.entries(pdata.courses??{}))snapshots.push({program,course:Number(course),status:cdata.status==='unpublished'||!cdata.events?.length?'unpublished':specialist.dataState==='live-generated'?'full':'partial',sourceState:specialist.dataState,events:cdata.events?.length??0,missing:cdata.status==='unpublished'?['На официальном сайте не опубликовано']:specialist.dataState==='live-generated'?[]:['Нет локально проверенного live snapshot']});
const integrity={duplicates:[],conflicts:[],conflictsByCourse:{},missingRequired:[],missingTeacher:0,missingLocation:0};
const parserAnomalies=Object.entries(ld.courses??{}).flatMap(([course,cdata])=>(cdata.quarantinedEvents??[]).map(e=>({course,group:String(e.group??''),date:e.date??null,weekNumber:e.weekNumber??null,start:e.start??null,subject:e.subject,sourceUrl:e.sourceUrl??null,reason:e.quarantineReason??'PDF row quarantined by parser validation'})));
const locationOnlySubject=/^(?:СПБ\b|КПК\b|ЦДТИ\b|АСЦ\b|ШКОЛА\b|Солнечное\b|База\b|Пархоменко\b|ПЦ\b|МНТК\b|КВД\b|ИМО\b|ДЛРК\b|РНХИ\b|НМИЦ\b|НИИ\b|ФГБНУ\b|ауд\.?\s|каб\.?\s)/i;
for(const [course,cdata] of Object.entries(ld.courses??{})){
 const seen=new Set(),slots=new Map();
 for(const e of cdata.events??[]){
  if(!String(e.location??'').trim()&&locationOnlySubject.test(String(e.subject??'')))parserAnomalies.push({course,group:String(e.group??''),date:e.date??null,weekNumber:e.weekNumber??null,start:e.start??null,subject:e.subject,sourceUrl:e.sourceUrl??null,reason:'В поле предмета попал адрес/аудитория; исходная ячейка не разделена надёжно'});
  const weekly=e.scheduleMode==='weekly-block';
  const group=String(e.group??'');
  const dateKey=weekly?`week:${e.weekNumber}:${e.weekday??'?'}`:`date:${e.date??''}`;
  if(!group||!e.type||!e.start||!e.end||(!weekly&&!/^\d{4}-\d{2}-\d{2}$/.test(String(e.date??''))))integrity.missingRequired.push(`${course}/${group||'без группы'}: ${e.id??e.subject??'строка'} без обязательного поля или даты`);
  const signature=[course,e.stream??'',e.type,group,dateKey,e.start,e.end,e.subject??'',e.location??''].join('|');
  if(seen.has(signature))integrity.duplicates.push(`${course}/${group}/${dateKey}/${e.start}`);seen.add(signature);
  if((!weekly||e.weekday!=null)&&!e.sourceNoticeId){const slot=[course,e.stream??'',group,dateKey,e.start].join('|');const prior=slots.get(slot);if(prior&&prior!==`${e.type}|${e.subject??''}|${e.location??''}`){integrity.conflicts.push(`${course}/${group}/${dateKey}/${e.start}`);integrity.conflictsByCourse[course]=(integrity.conflictsByCourse[course]??0)+1;}else slots.set(slot,`${e.type}|${e.subject??''}|${e.location??''}`);}
  if(!e.teacher)integrity.missingTeacher++;if(!e.location)integrity.missingLocation++;
 }
}
for(const snapshot of snapshots){const conflicts=integrity.conflictsByCourse[String(snapshot.course)]??0;const anomalies=parserAnomalies.filter(x=>x.course===String(snapshot.course));if(snapshot.program==='31.05.01'&&(conflicts||anomalies.length)){snapshot.status='partial';if(conflicts){snapshot.integrityConflictCount=conflicts;snapshot.missing.push(`Расписание содержит ${conflicts} назначений в совпадающие дату и время; требуется сверка групп/подгрупп`);}if(anomalies.length){snapshot.parserAnomalyCount=anomalies.length;snapshot.missing.push(`${anomalies.length} занятий помещены на проверку из-за неразобранных ячеек PDF`);}}}
const full=snapshots.filter(x=>x.status==='full').length,partial=snapshots.filter(x=>x.status==='partial').length,unpublished=snapshots.filter(x=>x.status==='unpublished').length;
const missingAssignmentCount=snapshots.reduce((n,x)=>n+(Array.isArray(x.missing)?x.missing.filter(y=>typeof y==='object'&&y.missingKinds?.includes('practice')).length:0),0);
const blockers=[];
for(const snap of snapshots.filter(x=>x.status==='partial'))if(snap.program==='31.05.01')for(const gap of snap.missing.filter(x=>x&&typeof x==='object'&&x.group))blockers.push({code:'MISSING_GROUP_ASSIGNMENT',program:snap.program,course:snap.course,stream:gap.stream,group:gap.group,missingKinds:gap.missingKinds});
for(const snap of snapshots.filter(x=>x.integrityConflictCount))blockers.push({code:'UNRESOLVED_TIME_CONFLICTS',program:snap.program,course:snap.course,count:snap.integrityConflictCount});
for(const snap of snapshots.filter(x=>x.parserAnomalyCount))blockers.push({code:'QUARANTINED_PDF_ROWS',program:snap.program,course:snap.course,count:snap.parserAnomalyCount,groups:snap.missing});
for(const snap of snapshots.filter(x=>x.status==='partial'&&x.program!=='31.05.01'))blockers.push({code:'UNVERIFIED_LOCAL_SNAPSHOT',program:snap.program,course:snap.course});
// Courses not yet published by the institute are explicitly unavailable, not invented release blockers.
if(sourceFailures.length)blockers.push({code:'SOURCE_VALIDATION_FAILURE',count:sourceFailures.length});
if(integrity.duplicates.length||integrity.conflicts.length||integrity.missingRequired.length)blockers.push({code:'DATA_INTEGRITY_FAILURE',duplicates:integrity.duplicates.length,conflicts:integrity.conflicts.length,missingRequired:integrity.missingRequired.length});
if(parserAnomalies.length)blockers.push({code:'PDF_PARSE_ANOMALIES',count:parserAnomalies.length,items:parserAnomalies});
const status=(integrity.duplicates.length||integrity.conflicts.length||integrity.missingRequired.length||sourceFailures.length||parserAnomalies.length)?'not-ready':blockers.length?'partially-ready':'ready';
for(const [course,count] of Object.entries(integrity.conflictsByCourse)){
 const snapshot=JSON.parse(await readFile(join(root,'dist','data','schedules','31.05.01',`${course}.json`),'utf8'));
 snapshot.status='partial';snapshot.issues=[...new Set([...(snapshot.issues??[]),'SCHEDULE_SLOT_CONFLICT_REVIEW_REQUIRED'])];
 snapshot.message=`${snapshot.message} Предупреждение: ${count} назначений совпадают по группе, дате и времени; до сверки с PDF данные курса считаются частичными.`;
 snapshot.coverage={...(snapshot.coverage??{}),integrityConflicts:count};
 await writeFile(join(root,'dist','data','schedules','31.05.01',`${course}.json`),JSON.stringify(snapshot));
}
const anomalyKeys=new Set(parserAnomalies.map(e=>[e.course,e.group,e.weekNumber??'',e.date??'',e.start??'',e.subject??''].join('|')));
if(anomalyKeys.size){const path=join(root,'dist','data','schedules','31.05.01','6.json');const snapshot=JSON.parse(await readFile(path,'utf8'));const isBad=e=>anomalyKeys.has(['6',String(e.group??''),e.weekNumber??'',e.date??'',e.start??'',e.subject??''].join('|'))&&!String(e.location??'').trim();const quarantine=[...(snapshot.events??[]),...(snapshot.weeklyBlocks??[])].filter(isBad).map(e=>({group:e.group,date:e.date??null,weekNumber:e.weekNumber??null,start:e.start,end:e.end,subject:e.subject,sourceUrl:e.sourceUrl,reason:'PDF extraction mixed location text into the subject; excluded until source cell is resolved'}));snapshot.events=(snapshot.events??[]).filter(e=>!isBad(e));snapshot.weeklyBlocks=(snapshot.weeklyBlocks??[]).filter(e=>!isBad(e));snapshot.quarantinedEvents=quarantine;snapshot.status='partial';snapshot.issues=[...new Set([...(snapshot.issues??[]),'PDF_CELL_PARSE_ANOMALIES'])];snapshot.message=`${snapshot.message} ${quarantine.length} строк с неразобранным адресом в поле предмета скрыты и перечислены в отчёте покрытия.`;await writeFile(path,JSON.stringify(snapshot));}
const parsedKugPeriodCount=Object.values(kugData).reduce((n,courses)=>n+Object.values(courses??{}).reduce((m,periods)=>m+(Array.isArray(periods)?periods.length:0),0),0);
const report={sourceNotices:ld.sourceNotices??[],schemaVersion:1,generatedAt:new Date().toISOString(),sourceGeneratedAt:ld.generatedAt,status,academicYear:'2026/2027',counts:{snapshots:snapshots.length,full,partial,unpublished,missingGroupPracticeAssignments:missingAssignmentCount,sourceRecords:sources.length,sourceValidationFailures:sourceFailures.length,officialKugPdfs:manifest.sources?.length??0,parsedKugPeriods:parsedKugPeriodCount,integrityErrors:integrity.duplicates.length+integrity.conflicts.length+integrity.missingRequired.length,quarantinedPdfRows:parserAnomalies.length},resolvedPriorRejections:[{program:'31.05.01',course:2,reason:'PDF Identity-H glyph map produced replacement characters; parser now uses text-trace glyphs and spatial date/label pairing.',status:'resolved'}, {program:'31.05.01',course:3,reason:'PDF Identity-H glyph map produced replacement characters; parser now uses text-trace glyphs and spatial date/label pairing.',status:'resolved'}, {program:'31.05.01',course:6,reason:'PDF Identity-H glyph map produced replacement characters; parser now uses text-trace glyphs and spatial date/label pairing.',status:'resolved'}, {program:'31.05.02',course:2,reason:'Study category was shadowed by the generic practice keyword; classifier now prioritizes theoretical study with discrete practice.',status:'resolved'}],snapshots,sources:{failures:sourceFailures,validated:sources.length-sourceFailures.length},integrity,parserAnomalies,specialistSourceState:specialist.dataState,blockers};
const distData=join(root,'dist','data');await mkdir(distData,{recursive:true});await mkdir(join(root,'reports'),{recursive:true});
await writeFile(join(root,'reports','data-coverage-latest.json'),JSON.stringify(report,null,2)+'\n');
await writeFile(join(root,'reports','data-coverage-latest.md'),`# Покрытие расписания · ${report.academicYear}\n\n- Статус: **${status}**\n- Снимки: ${full} полных, ${partial} частичных, ${unpublished} без публикации (${snapshots.length} всего)\n- Недостающих назначений практик групп: ${missingAssignmentCount}\n- Проверка источников: ${sources.length-sourceFailures.length}/${sources.length} прошли; отклонённых сейчас: ${sourceFailures.length}\n- Календарные графики КУГ: ${manifest.sources?.length??0}/${manifest.sources?.length??0} подтверждены; распознано периодов: ${parsedKugPeriodCount}\n- Дубликаты: ${integrity.duplicates.length}; конфликты: ${integrity.conflicts.length}; строки с обязательными полями: ${integrity.missingRequired.length}; карантинных строк PDF: ${parserAnomalies.length}\n- Строки без преподавателя: ${integrity.missingTeacher} (официальные расписания не содержат поля преподавателя в этих записях)\n- Строки без аудитории: ${integrity.missingLocation}\n\n## Блокеры\n\n${blockers.length?blockers.map(b=>`- \`${b.code}\`: ${JSON.stringify(b)}`).join('\n'):'- Нет'}\n`, 'utf8');
await writeFile(join(distData,'coverage.json'),JSON.stringify(report));
console.log(`DATA COVERAGE: ${status} · full=${full}, partial=${partial}, unpublished=${unpublished}, missingPractice=${missingAssignmentCount}, sourceFailures=${sourceFailures.length}`);
