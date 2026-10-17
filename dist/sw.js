/* Build-time values are injected by scripts/copy-public.mjs. */
const BUILD_ID='dd4c935bb52e50ea';
const CACHE_NAME=`almazov-hub-${BUILD_ID}`;
const VERSIONED_SHELL=["./styles.css?v=dd4c935bb52e50ea","./splash.css?v=dd4c935bb52e50ea","./boot.js?v=dd4c935bb52e50ea","./manifest.webmanifest?v=dd4c935bb52e50ea","./offline.html?v=dd4c935bb52e50ea","./app.js?v=dd4c935bb52e50ea","./core/calendar.js?v=dd4c935bb52e50ea","./core/date.js?v=dd4c935bb52e50ea","./core/excelParser.js?v=dd4c935bb52e50ea","./core/filter.js?v=dd4c935bb52e50ea","./core/htmlTableParser.js?v=dd4c935bb52e50ea","./core/normalize.js?v=dd4c935bb52e50ea","./core/practiceCycles.js?v=dd4c935bb52e50ea","./core/time.js?v=dd4c935bb52e50ea","./core/types.js?v=dd4c935bb52e50ea","./core/validate.js?v=dd4c935bb52e50ea","./data/addresses.js?v=dd4c935bb52e50ea","./data/catalog.js?v=dd4c935bb52e50ea","./data/roster.js?v=dd4c935bb52e50ea","./main.js?v=dd4c935bb52e50ea","./runtime-config.js?v=dd4c935bb52e50ea","./services/cache.js?v=dd4c935bb52e50ea","./services/eventService.js?v=dd4c935bb52e50ea","./services/materialStore.js?v=dd4c935bb52e50ea","./services/personalizationStore.js?v=dd4c935bb52e50ea","./services/practiceScheduleImport.js?v=dd4c935bb52e50ea","./services/scheduleService.js?v=dd4c935bb52e50ea","./services/supportService.js?v=dd4c935bb52e50ea","./services/taskService.js?v=dd4c935bb52e50ea","./telemetry.js?v=dd4c935bb52e50ea","./ui/customControls.js?v=dd4c935bb52e50ea","./ui/faq.js?v=dd4c935bb52e50ea","./ui/theme.js?v=dd4c935bb52e50ea"];
const OFFLINE_URL=new URL(`./offline.html?v=${BUILD_ID}`,self.registration.scope).href;

self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE_NAME);
  // Only content-versioned files are pre-cached. Never install a potentially
  // stale index.html through the currently active worker.
  await cache.addAll(VERSIONED_SHELL);
  await self.skipWaiting();
})()));

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key!==CACHE_NAME&&(
    key.startsWith('almazov-hub-')||key.startsWith('almazov-schedule-')
  )).map(key=>caches.delete(key)));
  await self.clients.claim();
  // Reload existing tabs too; users may still be running an older boot.js
  // that has no client-side update listener.
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  // Start navigation without waiting on it inside activate; waiting here can
  // deadlock activation on browsers that dispatch navigation after activation.
  for(const client of windows)client.navigate(client.url).catch(()=>null);
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
    const offline=await cache.match(OFFLINE_URL);
    if(offline)return offline;
    throw new Error('offline');
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
