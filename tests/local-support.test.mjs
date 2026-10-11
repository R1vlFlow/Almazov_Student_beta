import test from 'node:test';
import assert from 'node:assert/strict';

class FakeTransaction{
  oncomplete=null;onerror=null;onabort=null;
  objectStore(name){return new FakeStore(this,FakeIndexedDB.stores.get(name));}
  complete(){queueMicrotask(()=>this.oncomplete?.());}
}
class FakeStore{
  constructor(tx,rows){this.tx=tx;this.rows=rows;}
  request(value,write){const request={result:undefined,error:null,onsuccess:null,onerror:null};queueMicrotask(()=>{try{request.result=write?write():value;request.onsuccess?.({target:request});this.tx.complete();}catch(error){request.error=error;request.onerror?.({target:request});this.tx.onerror?.({target:this.tx});}});return request;}
  add(value){return this.request(undefined,()=>{if(this.rows.has(value.id))throw new Error('duplicate');this.rows.set(value.id,structuredClone(value));return value.id;});}
  put(value){return this.request(undefined,()=>{this.rows.set(value.id,structuredClone(value));return value.id;});}
  get(id){return this.request(undefined,()=>structuredClone(this.rows.get(id)));}
  getAll(){return this.request(undefined,()=>[...this.rows.values()].map(value=>structuredClone(value)));}
}
class FakeDatabase{
  constructor(){this.objectStoreNames={contains:name=>FakeIndexedDB.stores.has(name)};}
  createObjectStore(name){FakeIndexedDB.stores.set(name,new Map());return {};}
  transaction(){return new FakeTransaction();}
  close(){}
}
class FakeIndexedDB{
  static stores=new Map();
  open(){const request={result:null,onupgradeneeded:null,onsuccess:null,onerror:null,onblocked:null};queueMicrotask(()=>{request.result=new FakeDatabase();if(!FakeIndexedDB.stores.has('tickets'))request.onupgradeneeded?.({target:request});request.onsuccess?.({target:request});});return request;}
}

test('local support records and notes persist in IndexedDB without being sent',async()=>{
  const oldIndexedDB=globalThis.indexedDB;globalThis.indexedDB=new FakeIndexedDB();FakeIndexedDB.stores=new Map();
  try{
    const support=await import('../dist/services/supportService.js?local-support');
    const ticket=await support.createTicket({subject:'Проверка локального режима',description:'Эта запись остаётся на устройстве.',category:'schedule',priority:'medium',attachments:[{name:'plan.pdf',type:'application/pdf',size:5,dataBase64:'JVBERg=='}]});
    assert.equal(ticket.localOnly,true);
    assert.match(ticket.number,/^ЛОК-/);
    assert.equal((await support.listTickets()).length,1);
    assert.equal((await support.getTicket(ticket.id)).attachments[0].name,'plan.pdf');
    const noted=await support.addTicketMessage(ticket.id,'Моя личная заметка');
    assert.equal(noted.messages.length,2);
    assert.equal((await support.getTicket(ticket.id)).messages[1].body,'Моя личная заметка');
  }finally{globalThis.indexedDB=oldIndexedDB;}
});
