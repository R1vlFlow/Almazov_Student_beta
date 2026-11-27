import {MAX_TASK_FILE_SIZE,ensureFileSpace,fileStorageError} from '../core/uploadLimits.js';
export interface TaskFile {id:string;name:string;type:string;size:number;createdAt:string;blob:Blob;}
function open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open('almazov-task-files',1);r.onupgradeneeded=()=>r.result.createObjectStore('task-files',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(new Error('Закройте старые вкладки приложения и повторите.'));});}
async function transact<T>(mode:IDBTransactionMode,action:(s:IDBObjectStore)=>IDBRequest<T>):Promise<T>{const db=await open();try{return await new Promise<T>((resolve,reject)=>{const tx=db.transaction('task-files',mode),r=action(tx.objectStore('task-files'));tx.oncomplete=()=>resolve(r.result);tx.onabort=tx.onerror=()=>reject(fileStorageError(tx.error??r.error));});}finally{db.close();}}
export async function saveTaskFile(file:File):Promise<TaskFile>{
 if(!file.size||file.size>MAX_TASK_FILE_SIZE)throw new Error('Выберите непустой файл размером до 100 МБ.');
 await ensureFileSpace(file.size);const row:TaskFile={id:crypto.randomUUID(),name:file.name.slice(0,240),type:file.type||'application/octet-stream',size:file.size,createdAt:new Date().toISOString(),blob:file.slice()};
 await transact('readwrite',s=>s.add(row));return row;
}
export async function getTaskFile(id:string):Promise<TaskFile|null>{return (await transact<TaskFile|undefined>('readonly',s=>s.get(id)))??null;}
export async function deleteTaskFile(id:string):Promise<void>{await transact('readwrite',s=>s.delete(id));}
