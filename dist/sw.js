/* Build-time values are injected by scripts/copy-public.mjs. */
const BUILD_ID='bd46296c0cf0f1ee';
const CACHE_NAME=`almazov-hub-${BUILD_ID}`;
const VERSIONED_SHELL=["./styles.css?v=bd46296c0cf0f1ee","./splash.css?v=bd46296c0cf0f1ee","./boot.js?v=bd46296c0cf0f1ee","./manifest.webmanifest?v=bd46296c0cf0f1ee","./offline.html?v=bd46296c0cf0f1ee","./app.js?v=bd46296c0cf0f1ee","./core/calendar.js?v=bd46296c0cf0f1ee","./core/courseAddresses.js?v=bd46296c0cf0f1ee","./core/date.js?v=bd46296c0cf0f1ee","./core/excelParser.js?v=bd46296c0cf0f1ee","./core/filter.js?v=bd46296c0cf0f1ee","./core/htmlTableParser.js?v=bd46296c0cf0f1ee","./core/normalize.js?v=bd46296c0cf0f1ee","./core/practiceCycles.js?v=bd46296c0cf0f1ee","./core/time.js?v=bd46296c0cf0f1ee","./core/types.js?v=bd46296c0cf0f1ee","./core/validate.js?v=bd46296c0cf0f1ee","./data/addresses.js?v=bd46296c0cf0f1ee","./data/catalog.js?v=bd46296c0cf0f1ee","./data/roster.js?v=bd46296c0cf0f1ee","./main.js?v=bd46296c0cf0f1ee","./runtime-config.js?v=bd46296c0cf0f1ee","./services/cache.js?v=bd46296c0cf0f1ee","./services/eventService.js?v=bd46296c0cf0f1ee","./services/materialStore.js?v=bd46296c0cf0f1ee","./services/personalBackup.js?v=bd46296c0cf0f1ee","./services/personalizationStore.js?v=bd46296c0cf0f1ee","./services/practiceScheduleImport.js?v=bd46296c0cf0f1ee","./services/scheduleHistory.js?v=bd46296c0cf0f1ee","./services/scheduleService.js?v=bd46296c0cf0f1ee","./services/supportService.js?v=bd46296c0cf0f1ee","./services/taskService.js?v=bd46296c0cf0f1ee","./telemetry.js?v=bd46296c0cf0f1ee","./ui/customControls.js?v=bd46296c0cf0f1ee","./ui/faq.js?v=bd46296c0cf0f1ee","./ui/theme.js?v=bd46296c0cf0f1ee"];
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
