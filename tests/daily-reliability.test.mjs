import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compareSchedules} from '../dist/services/scheduleHistory.js';
import {validatePersonalBackup,restorePersonalBackup,createPersonalBackup,mergeBackupRecords,validBackupFileEncoding,decodeBackupFile} from '../dist/services/personalBackup.js';
import {matchCourseAddresses} from '../dist/core/courseAddresses.js';
const event={program:'31.05.01',course:4,group:'423',subject:'Терапия',date:'2026-10-19',start:'09:00',end:'12:30',location:'КПК'};
const snapshot=(events,weeklyBlocks=[])=>({status:'live',events,weeklyBlocks});
test('schedule differences ignore ordering and source IDs but retain duplicate lessons',()=>{
 assert.deepEqual(compareSchedules(snapshot([{...event,id:'a'}]),snapshot([{...event,id:'b'}])),{added:0,removed:0});
 assert.deepEqual(compareSchedules(snapshot([event]),snapshot([event,event])),{added:1,removed:0});
 assert.deepEqual(compareSchedules(snapshot([event]),snapshot([{...event,start:'11:00'}])),{added:1,removed:1});
 assert.deepEqual(compareSchedules(snapshot([], [{...event,weekNumber:3}]),snapshot([], [{...event,weekNumber:4}])),{added:1,removed:1});
});
const blank=()=>({format:'almazov-personal-backup',version:1,createdAt:new Date().toISOString(),personalization:{version:2,tasks:[],materials:[],subjectTeachers:{},subjectColors:{}},local:{},stores:{files:[],'practice-events':[],tickets:[]}});
test('backup validates format, local keys and corrupt file data before writing',()=>{
 assert.equal(validatePersonalBackup(blank()).version,1);
 assert.throws(()=>validatePersonalBackup({...blank(),version:2}));
 assert.throws(()=>validatePersonalBackup({...blank(),local:{'almazov.client.id':'not-importable'}}));
 const b=blank();b.stores.files=[{id:'a'}];assert.throws(()=>validatePersonalBackup(b));
 b.stores.files=[];b.personalization.tasks=[null];assert.throws(()=>validatePersonalBackup(b));
});
class Tx{constructor(rows){this.rows=rows;this.pending=0;queueMicrotask(()=>{if(!this.pending)this.oncomplete?.();});}objectStore(){const tx=this;const request=fn=>{tx.pending++;const r={};queueMicrotask(()=>{try{r.result=fn();r.onsuccess?.();}catch(e){r.error=e;r.onerror?.();tx.onerror?.();}finally{tx.pending--;queueMicrotask(()=>{if(!tx.pending)tx.oncomplete?.();});}});return r;};return {get:id=>request(()=>this.rows.get(id)),getAll:()=>request(()=>[...this.rows.values()]),add:row=>request(()=>{if(this.rows.has(row.id))throw Error('duplicate');this.rows.set(row.id,structuredClone(row));})};}}
class DB{constructor(name){this.name=name;}createObjectStore(){Fake.stores.set(this.name,new Map());return {createIndex(){}};}transaction(){return new Tx(Fake.stores.get(this.name));}close(){}}
class Fake{static stores=new Map();open(name){const r={};queueMicrotask(()=>{r.result=new DB(name);if(!Fake.stores.has(name))r.onupgradeneeded?.();r.onsuccess?.();});return r;}}
test('restore is additive and repeated restore does not duplicate notes or overwrite files',async()=>{
 const old={indexedDB:globalThis.indexedDB,localStorage:globalThis.localStorage,FileReader:globalThis.FileReader};const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};globalThis.indexedDB=new Fake();globalThis.FileReader=class{async readAsDataURL(blob){this.result='data:'+blob.type+';base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64');this.onload();}};
 try{const b=blank();b.stores.files=[{id:'file-a',title:'Конспект',subject:'Терапия',category:'lecture',description:'',tags:[],fileName:'notes.pdf',mimeType:'application/pdf',size:5,createdAt:b.createdAt,program:'31.05.01',course:4,group:'423',scope:'31.05.01:4:423',fileBase64:'JVBERi0='}];await restorePersonalBackup(b);await restorePersonalBackup(b);const exported=await createPersonalBackup();assert.equal(exported.stores.files.length,1);assert.equal(exported.stores.files[0].fileBase64,'JVBERi0=');const altered=structuredClone(b);altered.stores.files[0].title='Чужая версия';await restorePersonalBackup(altered);assert.equal((await createPersonalBackup()).stores.files[0].title,'Конспект');}finally{Object.assign(globalThis,old);}
});
test('maps only resolve an unambiguous official address',()=>{const one={name:'Клинико-поликлинический комплекс',address:'ул. Аккуратова, д. 2',sourceUrl:'https://example.org',category:'test'};assert.equal(matchCourseAddresses([one],['КПК']).addresses.length,1);assert.equal(matchCourseAddresses([one,{...one,address:'другое'}],['КПК']).addresses.length,0);assert.equal(matchCourseAddresses([one],['ауд. 2']).addresses.length,0);});
test('updates require explicit acceptance and never navigate clients from service worker',async()=>{const boot=await readFile('public/boot.js','utf8'),sw=await readFile('public/sw.js','utf8');assert.ok(boot.includes('window.confirm'));assert.ok(boot.includes('release.buildId===BUILD_ID&&!waitingWorker'));assert.ok(boot.includes("button.addEventListener('click',async()=>"));assert.ok(!sw.includes('client.navigate'));assert.ok(sw.includes("event.data?.type==='SKIP_WAITING'"));});

test('Android release metadata is shipped with the web build',async()=>{const source=JSON.parse(await readFile('public/android-release.json','utf8'));const built=JSON.parse(await readFile('dist/android-release.json','utf8'));assert.deepEqual(built,source);assert.equal(source.versionCode,34);assert.equal(source.version,'3.2.1');assert.ok(source.apkUrl.endsWith('/v3.2.1/Almazov-Student-3.2.1.apk'));assert.match(source.apkUrl,/^https:\/\/github\.com\/R1vlFlow\/Almazov_Student_beta\/releases\/download\//);});

test('offline initial HTML is cached only when it matches the worker build',async()=>{const sw=await readFile('public/sw.js','utf8');assert.ok(sw.includes('data-build-id="${BUILD_ID}"'));assert.ok(sw.includes('await cache.put(indexUrl,response)'));});

test('versioned schedule JSON still checks network and marks offline fallback',async()=>{
 const {runInNewContext}=await import('node:vm');const handlers={};let calls=0;const cached=new Response('{"events":[]}',{headers:{'content-type':'application/json'}});
 const source=(await readFile('public/sw.js','utf8')).replaceAll('__BUILD_ID__','test-build').replace('__VERSIONED_SHELL__','[]');
 runInNewContext(source,{self:{registration:{scope:'https://example.org/app/'},location:{origin:'https://example.org'},addEventListener:(name,fn)=>handlers[name]=fn},caches:{open:async()=>({match:async()=>cached.clone(),put:async()=>{}})},fetch:async()=>{calls++;throw Error('offline');},URL,Request,Response,Headers,AbortController,setTimeout,clearTimeout});
 let pending;handlers.fetch({request:new Request('https://example.org/app/data/schedules/31.05.01/4.json?v=test-build'),respondWith:p=>pending=p});const response=await pending;assert.equal(calls,1);assert.equal(response.headers.get('X-Almazov-Cache'),'offline');assert.equal(response.status,200);
});

test('backup merge preserves existing data and deduplicates repeated incoming IDs',()=>{
 const current=[{id:'a',title:'Текущее'}];const incoming=[{id:'a',title:'Из копии'},{id:'b',title:'Первое'},{id:'b',title:'Повтор'}];
 assert.deepEqual(mergeBackupRecords(current,incoming),[current[0],incoming[1]]);
 const many=Array.from({length:30000},(_,i)=>({id:String(i)}));assert.equal(mergeBackupRecords(many,many).length,30000);
});
test('backup rejects impossible cycle dates, reversed times and wrong group scope',()=>{
 const row={id:'pz',program:'31.05.01',course:6,group:'601',scope:'31.05.01:6:601',date:'2026-10-19',start:'09:00',end:'12:30',subject:'Терапия',location:'',teacher:'',sourceFile:'test.pdf',createdAt:new Date().toISOString()};
 const make=patch=>{const b=blank();b.stores['practice-events']=[{...row,...patch}];return b;};
 validatePersonalBackup(make({}));
 for(const patch of [{date:'2026-02-30'},{start:'25:00'},{end:'08:00'},{scope:'31.05.01:6:602'}])assert.throws(()=>validatePersonalBackup(make(patch)));
});

test('backup validates a 25 MB file without regexp stack overflow or redundant decoding',()=>{
 const size=25*1024*1024;const encoded='A'.repeat(Math.ceil(size/3)*4-2)+'==';
 assert.equal(validBackupFileEncoding(encoded,size),true);
 for(const [text,length] of [['AA=A',2],['AAAA=',3],['!AAA',3],['AAA',2],['AA==',2]])assert.equal(validBackupFileEncoding(text,length),false);
 assert.equal(validBackupFileEncoding('JVBERi0=',5),true);
});

test('chunked attachment restore preserves every byte and yields to the interface',async()=>{
 const bytes=Buffer.alloc(1024*1024+7);for(let i=0;i<bytes.length;i++)bytes[i]=i%251;
 let yielded=false;setTimeout(()=>yielded=true,0);
 const blob=await decodeBackupFile(bytes.toString('base64'),bytes.length,'application/pdf');
 assert.equal(yielded,true);assert.equal(blob.type,'application/pdf');assert.deepEqual(Buffer.from(await blob.arrayBuffer()),bytes);
 await assert.rejects(decodeBackupFile('!!!!',3,'application/pdf'));
});
