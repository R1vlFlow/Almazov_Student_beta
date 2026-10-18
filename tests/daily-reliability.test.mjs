import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compareSchedules} from '../dist/services/scheduleHistory.js';
import {validatePersonalBackup,restorePersonalBackup,createPersonalBackup} from '../dist/services/personalBackup.js';
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
test('updates require explicit acceptance and never navigate clients from service worker',async()=>{const boot=await readFile('public/boot.js','utf8'),sw=await readFile('public/sw.js','utf8');assert.ok(boot.includes('window.confirm'));assert.ok(boot.includes("button.addEventListener('click',async()=>"));assert.ok(!sw.includes('client.navigate'));assert.ok(sw.includes("event.data?.type==='SKIP_WAITING'"));});

test('Android release metadata is shipped with the web build',async()=>{const source=JSON.parse(await readFile('public/android-release.json','utf8'));const built=JSON.parse(await readFile('dist/android-release.json','utf8'));assert.deepEqual(built,source);assert.equal(source.versionCode,33);assert.match(source.apkUrl,/^https:\/\/github\.com\/R1vlFlow\/Almazov_Student_beta\/releases\/download\//);});

test('offline initial HTML is cached only when it matches the worker build',async()=>{const sw=await readFile('public/sw.js','utf8');assert.ok(sw.includes('data-build-id="${BUILD_ID}"'));assert.ok(sw.includes('await cache.put(indexUrl,response)'));});
