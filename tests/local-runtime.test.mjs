import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

class MemoryStorage{
  values=new Map();
  getItem(key){return this.values.get(key)??null;}
  setItem(key,value){this.values.set(key,String(value));}
  removeItem(key){this.values.delete(key);}
}

test('static schedule loading reads the bundled snapshot and never calls an API',async()=>{
  const oldDocument=globalThis.document,oldFetch=globalThis.fetch;
  globalThis.document={baseURI:'https://local.zalma.invalid/',documentElement:{dataset:{runtimeMode:'static'}}};
  let apiCalls=0,staticCalls=0;
  globalThis.fetch=async input=>{
    const url=new URL(String(input));
    if(url.pathname.includes('/api/')){apiCalls++;throw new Error('the static app must not call an API');}
    assert.match(url.pathname,/\/data\/schedules\/31\.05\.01\/4\.json$/);
    staticCalls++;
    const body=await readFile('dist/data/schedules/31.05.01/4.json','utf8');
    return new Response(body,{status:200,headers:{'content-type':'application/json'}});
  };
  try{
    const service=await import('../dist/services/scheduleService.js?local-runtime');
    service.clearScheduleMemory();
    const result=await service.loadSchedule('31.05.01',4);
    assert.equal(result.status,JSON.parse(await readFile('dist/data/schedules/31.05.01/4.json','utf8')).status);
    assert.ok(result.events.length>0);
    assert.ok(result.weeklyBlocks.length>0);
    assert.equal(staticCalls,1);
    assert.equal(apiCalls,0);
  }finally{globalThis.document=oldDocument;globalThis.fetch=oldFetch;}
});

test('personal events create, update, list and delete entirely in local storage',async()=>{
  const oldDocument=globalThis.document,oldStorage=globalThis.localStorage,oldFetch=globalThis.fetch;
  globalThis.document={documentElement:{dataset:{runtimeMode:'static'}}};
  globalThis.localStorage=new MemoryStorage();
  let apiCalls=0;
  globalThis.fetch=async()=>{apiCalls++;throw new Error('the static app must not call an API');};
  try{
    const events=await import('../dist/services/eventService.js?local-runtime');
    const input={title:'Локальная заметка',description:'',category:'study',status:'planned',startAt:'2026-10-11T08:00:00.000Z',endAt:'2026-10-11T09:00:00.000Z',timeZone:'Europe/Moscow'};
    const created=await events.createPersonalEvent(input);
    assert.equal(created.title,input.title);
    const updated=await events.updatePersonalEvent(created.id,{...input,title:'Изменено локально'});
    assert.equal(updated.title,'Изменено локально');
    assert.equal((await events.listPersonalEvents('2026-10-11T00:00:00.000Z','2026-10-12T00:00:00.000Z')).length,1);
    await events.deletePersonalEvent(created.id);
    assert.equal((await events.listPersonalEvents('2026-10-11T00:00:00.000Z','2026-10-12T00:00:00.000Z')).length,0);
    assert.equal(apiCalls,0);
  }finally{globalThis.document=oldDocument;globalThis.localStorage=oldStorage;globalThis.fetch=oldFetch;}
});
