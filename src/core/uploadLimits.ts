export const MAX_TASK_FILE_SIZE=100*1024*1024;
export const MAX_MATERIAL_FILE_SIZE=250*1024*1024;
export const MAX_SCHEDULE_FILE_SIZE=50*1024*1024;
export const MAX_AVATAR_FILE_SIZE=20*1024*1024;
export const MAX_SUPPORT_FILE_SIZE=10*1024*1024;
export const MAX_SUPPORT_TOTAL_SIZE=20*1024*1024;
export const MAX_BACKUP_FILE_SIZE=2*1024*1024*1024;
export const MAX_JSON_BACKUP_SIZE=400*1024*1024;
export function fileStorageError(error:unknown):Error{
 if(error&&typeof error==='object'&&'name' in error&&error.name==='QuotaExceededError')return new Error('Недостаточно свободного места для файла. Освободите место на устройстве и повторите.');
 return error instanceof Error?error:new Error('Не удалось сохранить файл на устройстве.');
}

export async function ensureFileSpace(bytes:number):Promise<void>{
 let available:number|undefined;
 try{const estimate=await globalThis.navigator?.storage?.estimate();if(estimate?.quota!==undefined&&estimate.usage!==undefined)available=estimate.quota-estimate.usage;}catch{/* The database remains the authority when estimates are unavailable. */}
 if(available!==undefined&&available<bytes+1024*1024)throw new Error('Недостаточно свободного места на устройстве для этого файла.');
}
