/* Build-time values are injected by scripts/copy-public.mjs. */
const BUILD_ID='390d0bc0e716898d';
const CACHE_NAME=`almazov-hub-${BUILD_ID}`;
const VERSIONED_SHELL=["./styles.css?v=390d0bc0e716898d","./splash.css?v=390d0bc0e716898d","./boot.js?v=390d0bc0e716898d","./manifest.webmanifest?v=390d0bc0e716898d","./offline.html?v=390d0bc0e716898d","./app.js?v=390d0bc0e716898d","./core/calendar.js?v=390d0bc0e716898d","./core/courseAddresses.js?v=390d0bc0e716898d","./core/date.js?v=390d0bc0e716898d","./core/excelParser.js?v=390d0bc0e716898d","./core/filter.js?v=390d0bc0e716898d","./core/htmlTableParser.js?v=390d0bc0e716898d","./core/normalize.js?v=390d0bc0e716898d","./core/practiceCycles.js?v=390d0bc0e716898d","./core/time.js?v=390d0bc0e716898d","./core/types.js?v=390d0bc0e716898d","./core/validate.js?v=390d0bc0e716898d","./data/addresses.js?v=390d0bc0e716898d","./data/catalog.js?v=390d0bc0e716898d","./data/roster.js?v=390d0bc0e716898d","./main.js?v=390d0bc0e716898d","./runtime-config.js?v=390d0bc0e716898d","./services/cache.js?v=390d0bc0e716898d","./services/eventService.js?v=390d0bc0e716898d","./services/materialStore.js?v=390d0bc0e716898d","./services/personalBackup.js?v=390d0bc0e716898d","./services/personalizationStore.js?v=390d0bc0e716898d","./services/practiceScheduleImport.js?v=390d0bc0e716898d","./services/scheduleHistory.js?v=390d0bc0e716898d","./services/scheduleService.js?v=390d0bc0e716898d","./services/supportService.js?v=390d0bc0e716898d","./services/taskService.js?v=390d0bc0e716898d","./telemetry.js?v=390d0bc0e716898d","./ui/customControls.js?v=390d0bc0e716898d","./ui/faq.js?v=390d0bc0e716898d","./ui/theme.js?v=390d0bc0e716898d"];
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
    if(hit){const headers=new Headers(hit.headers);headers.set('X-Almazov-Cache','offline');return new Response(hit.body,{status:hit.status,statusText:hit.statusText,headers});}
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

  // Schedule refresh must reach the network even while an app update is deferred.
  if(url.pathname.includes('/data/')&&url.pathname.endsWith('.json')){event.respondWith(networkFirst(request));return;}

  // Cache-first is safe only for files whose URL carries this exact build ID.
  if(url.searchParams.get('v')===BUILD_ID){
    event.respondWith(cacheVersioned(request));
    return;
  }

  // JSON schedules and any unversioned static asset always try the network first.
  event.respondWith(networkFirst(request));
});
