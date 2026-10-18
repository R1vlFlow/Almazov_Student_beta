/* Build-time values are injected by scripts/copy-public.mjs. */
const BUILD_ID='2381f69750024cff';
const CACHE_NAME=`almazov-hub-${BUILD_ID}`;
const VERSIONED_SHELL=["./styles.css?v=2381f69750024cff","./splash.css?v=2381f69750024cff","./boot.js?v=2381f69750024cff","./manifest.webmanifest?v=2381f69750024cff","./offline.html?v=2381f69750024cff","./app.js?v=2381f69750024cff","./core/calendar.js?v=2381f69750024cff","./core/courseAddresses.js?v=2381f69750024cff","./core/date.js?v=2381f69750024cff","./core/excelParser.js?v=2381f69750024cff","./core/filter.js?v=2381f69750024cff","./core/htmlTableParser.js?v=2381f69750024cff","./core/normalize.js?v=2381f69750024cff","./core/practiceCycles.js?v=2381f69750024cff","./core/time.js?v=2381f69750024cff","./core/types.js?v=2381f69750024cff","./core/validate.js?v=2381f69750024cff","./data/addresses.js?v=2381f69750024cff","./data/catalog.js?v=2381f69750024cff","./data/roster.js?v=2381f69750024cff","./main.js?v=2381f69750024cff","./runtime-config.js?v=2381f69750024cff","./services/cache.js?v=2381f69750024cff","./services/eventService.js?v=2381f69750024cff","./services/materialStore.js?v=2381f69750024cff","./services/personalBackup.js?v=2381f69750024cff","./services/personalizationStore.js?v=2381f69750024cff","./services/practiceScheduleImport.js?v=2381f69750024cff","./services/scheduleHistory.js?v=2381f69750024cff","./services/scheduleService.js?v=2381f69750024cff","./services/supportService.js?v=2381f69750024cff","./services/taskService.js?v=2381f69750024cff","./telemetry.js?v=2381f69750024cff","./ui/customControls.js?v=2381f69750024cff","./ui/faq.js?v=2381f69750024cff","./ui/theme.js?v=2381f69750024cff"];
const OFFLINE_URL=new URL(`./offline.html?v=${BUILD_ID}`,self.registration.scope).href;

self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE_NAME);
  // Only content-versioned files are pre-cached. Never install a potentially
  // stale index.html through the currently active worker.
  await cache.addAll(VERSIONED_SHELL);
  // Offline first reopen: only save HTML whose fingerprint matches this worker.
  const indexUrl=new URL('./index.html',self.registration.scope).href;
  try{const response=await fetchFresh(new Request(indexUrl,{cache:'no-store'}));if(response.ok&&(await response.clone().text()).includes(`data-build-id="${BUILD_ID}"`))await cache.put(indexUrl,response);}catch{/* The explicit offline page remains available. */}
  // Wait for explicit acceptance or for all previous tabs to close.
})()));

self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting());});

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key!==CACHE_NAME&&(
    key.startsWith('almazov-hub-')||key.startsWith('almazov-schedule-')
  )).map(key=>caches.delete(key)));
  await self.clients.claim();
  // The page offers an update; never discard an open form by navigating it.
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of windows)client.postMessage({type:'APP_UPDATE_AVAILABLE',buildId:BUILD_ID});
})()));

async function fetchFresh(request){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  try{return await fetch(new Request(request,{cache:'no-store',signal:controller.signal}));}
  finally{clearTimeout(timer);}
}

async function cacheVersioned(request){
  const cache=await caches.open(CACHE_NAME);
  const hit=await cache.match(request);
  if(hit)return hit;
  try{
    const response=await fetchFresh(request);
    if(response.ok)await cache.put(request,response.clone());
    return response;
  }catch{
    return new Response('Ресурс недоступен офлайн.',{status:503,headers:{'content-type':'text/plain;charset=utf-8'}});
  }
}

async function networkFirst(request){
  const cache=await caches.open(CACHE_NAME);
  try{
    const response=await fetchFresh(request);
    if(response.ok){
      await cache.put(request,response.clone());
      // Save a canonical entry so offline navigation to the site root can work.
      if(request.mode==='navigate'){
        const canonical=new URL('./index.html',self.registration.scope).href;
        await cache.put(canonical,response.clone());
      }
    }
    return response;
  }catch{
    const hit=await cache.match(request)||((request.mode==='navigate'||request.destination==='document')?await cache.match(new URL('./index.html',self.registration.scope).href):null);
    if(hit)return hit;
    const offline=(request.mode==='navigate'||request.destination==='document')?await cache.match(OFFLINE_URL):null;
    if(offline)return offline;
    return new Response('Офлайн: приложение пока не было сохранено на этом устройстве.',{
      status:503,headers:{'content-type':'text/plain;charset=utf-8'}
    });
  }
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  // Version metadata must remain fresh and must not create one cache entry per visit.
  if(url.pathname.endsWith('/version.json')){
    event.respondWith(fetchFresh(request));
    return;
  }

  // Never cache user-specific API responses in Cache Storage.
  if(url.pathname.includes('/api/')){
    event.respondWith(fetchFresh(request).catch(()=>new Response(JSON.stringify({
      status:'error',events:[],issues:['OFFLINE'],message:'API недоступен: проверьте соединение.'
    }),{status:503,headers:{'content-type':'application/json;charset=utf-8','cache-control':'no-store'}})));
    return;
  }

  if(request.mode==='navigate'||request.destination==='document'){
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first is safe only for files whose URL carries this exact build ID.
  if(url.searchParams.get('v')===BUILD_ID){
    event.respondWith(cacheVersioned(request));
    return;
  }

  // JSON schedules and any unversioned static asset always try the network first.
  event.respondWith(networkFirst(request));
});
