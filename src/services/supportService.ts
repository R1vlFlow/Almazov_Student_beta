export type TicketStatus='new'|'in_progress'|'waiting_user'|'resolved'|'closed';
export interface SupportAttachment{name:string;type:string;size:number;dataBase64:string;}
export interface SupportTicket{
  id:string;number:string;subject:string;category:string;priority:string;status:TicketStatus;
  createdAt:string;updatedAt:string;localOnly:true;
  messages:{id:string;authorType:'user'|'support';body:string;createdAt:string}[];
  attachments:SupportAttachment[];
}

// The local release has no ticket API. Keep private support notes and uploaded
// attachments in this browser's IndexedDB; never suggest they were sent.
const DB_NAME='almazov-local-support';
const DB_VERSION=1;
const STORE='tickets';

function openDb():Promise<IDBDatabase>{
  if(!('indexedDB' in globalThis))return Promise.reject(new Error('Локальная база обращений недоступна в этом браузере.'));
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error??new Error('Не удалось открыть локальную базу обращений.'));
    request.onblocked=()=>reject(new Error('Локальная база обращений занята другой вкладкой. Закройте старые вкладки и повторите.'));
  });
}

function transaction<T>(mode:IDBTransactionMode,action:(store:IDBObjectStore,resolve:(value:T)=>void,reject:(reason?:unknown)=>void)=>void):Promise<T>{
  return openDb().then(db=>new Promise<T>((resolve,reject)=>{
    const tx=db.transaction(STORE,mode);
    tx.oncomplete=()=>db.close();
    tx.onerror=()=>{db.close();reject(tx.error??new Error('Ошибка локальной базы обращений.'));};
    tx.onabort=()=>{db.close();reject(tx.error??new Error('Операция с обращением отменена.'));};
    action(tx.objectStore(STORE),resolve,reject);
  }));
}

function ordered(tickets:SupportTicket[]){return tickets.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
export function listTickets():Promise<SupportTicket[]>{return transaction('readonly',(store,resolve,reject)=>{const request=store.getAll();request.onsuccess=()=>resolve(ordered(request.result as SupportTicket[]));request.onerror=()=>reject(request.error);});}
export function getTicket(id:string):Promise<SupportTicket>{return transaction('readonly',(store,resolve,reject)=>{const request=store.get(id);request.onsuccess=()=>request.result?resolve(request.result as SupportTicket):reject(new Error('Локальное обращение не найдено.'));request.onerror=()=>reject(request.error);});}

export function createTicket(input:{subject:string;category:string;priority:string;description:string;attachments?:SupportAttachment[]}):Promise<SupportTicket>{
  const now=new Date().toISOString();
  const id=crypto.randomUUID();
  const ticket:SupportTicket={
    id,number:`ЛОК-${now.slice(0,10).replaceAll('-','')}-${id.slice(0,6).toUpperCase()}`,
    subject:input.subject.trim(),category:input.category,priority:input.priority,status:'new',
    createdAt:now,updatedAt:now,localOnly:true,attachments:input.attachments??[],
    messages:[{id:crypto.randomUUID(),authorType:'user',body:input.description.trim(),createdAt:now}]
  };
  return transaction('readwrite',(store,resolve,reject)=>{const request=store.add(ticket);request.onsuccess=()=>resolve(ticket);request.onerror=()=>reject(request.error);});
}

export function addTicketMessage(id:string,body:string):Promise<SupportTicket>{
  return getTicket(id).then(ticket=>{
    const now=new Date().toISOString();
    const updated:SupportTicket={...ticket,updatedAt:now,messages:[...ticket.messages,{id:crypto.randomUUID(),authorType:'user',body:body.trim(),createdAt:now}]};
    return transaction('readwrite',(store,resolve,reject)=>{const request=store.put(updated);request.onsuccess=()=>resolve(updated);request.onerror=()=>reject(request.error);});
  });
}

export async function fileToAttachment(file:File):Promise<SupportAttachment>{
  if(file.size>3*1024*1024)throw new Error('Размер одного файла не должен превышать 3 МБ.');
  const data=await file.arrayBuffer();const bytes=new Uint8Array(data);let binary='';const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
  return{name:file.name.slice(0,180),type:/^[\w.+-]+\/[\w.+-]+$/.test(file.type)?file.type:'application/octet-stream',size:file.size,dataBase64:btoa(binary)};
}
