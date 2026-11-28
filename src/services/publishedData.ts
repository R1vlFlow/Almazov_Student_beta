const PUBLISHED_BASE='https://r1vlflow.github.io/Almazov_Student_beta/';

function nativeRuntime():boolean{
  try{return typeof window!=='undefined'&&(window as Window & {Capacitor?:{isNativePlatform?:()=>boolean}}).Capacitor?.isNativePlatform?.()===true;}
  catch{return false;}
}

/** Native builds refresh public data independently of the installed APK. */
export async function fetchPublishedData<T>(localUrl:string,valid:(value:unknown)=>value is T,timeoutMs=6000):Promise<{payload:T;offline:boolean}>{
  const base=typeof document!=='undefined'?document.baseURI:'https://example.invalid/';
  const local=new URL(localUrl,base);
  const native=nativeRuntime();
  const path=local.pathname.match(/(?:^|\/)(data\/(?:kug\.json|schedules\/[\d.]+\/[1-6]\.json))$/)?.[1];
  async function read(url:string,remote:boolean){
    const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(remote?Math.min(timeoutMs,4000):timeoutMs),...(remote?{credentials:'omit' as const,referrerPolicy:'no-referrer' as const}:{})});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const payload:unknown=await response.json();
    if(!valid(payload))throw new Error('Invalid published data');
    return {payload,offline:response.headers.get('X-Almazov-Cache')==='offline'};
  }
  if(native&&path){
    const remote=new URL(path,PUBLISHED_BASE);
    const build=local.searchParams.get('v');if(build)remote.searchParams.set('v',build);
    try{return await read(remote.toString(),true);}catch{/* Keep the bundled timetable usable without a network. */}
  }
  const result=await read(local.toString(),false);
  return {...result,offline:result.offline||(native&&Boolean(path))};
}
