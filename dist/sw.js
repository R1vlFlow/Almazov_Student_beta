/* Build-time values are injected by scripts/copy-public.mjs. */
const BUILD_ID='df2a77035cc6be39';
const CACHE_NAME=`almazov-hub-${BUILD_ID}`;
const VERSIONED_SHELL=["./styles.css?v=df2a77035cc6be39","./splash.css?v=df2a77035cc6be39","./boot.js?v=df2a77035cc6be39","./manifest.webmanifest?v=df2a77035cc6be39","./offline.html?v=df2a77035cc6be39","./app.js?v=df2a77035cc6be39","./core/calendar.js?v=df2a77035cc6be39","./core/date.js?v=df2a77035cc6be39","./core/excelParser.js?v=df2a77035cc6be39","./core/filter.js?v=df2a77035cc6be39","./core/htmlTableParser.js?v=df2a77035cc6be39","./core/normalize.js?v=df2a77035cc6be39","./core/time.js?v=df2a77035cc6be39","./core/types.js?v=df2a77035cc6be39","./core/validate.js?v=df2a77035cc6be39","./data/addresses.js?v=df2a77035cc6be39","./data/catalog.js?v=df2a77035cc6be39","./data/roster.js?v=df2a77035cc6be39","./main.js?v=df2a77035cc6be39","./runtime-config.js?v=df2a77035cc6be39","./services/cache.js?v=df2a77035cc6be39","./services/eventService.js?v=df2a77035cc6be39","./services/materialStore.js?v=df2a77035cc6be39","./services/personalizationStore.js?v=df2a77035cc6be39","./services/practiceScheduleImport.js?v=df2a77035cc6be39","./services/scheduleService.js?v=df2a77035cc6be39","./services/supportService.js?v=df2a77035cc6be39","./services/taskService.js?v=df2a77035cc6be39","./telemetry.js?v=df2a77035cc6be39","./ui/customControls.js?v=df2a77035cc6be39","./ui/faq.js?v=df2a77035cc6be39","./ui/theme.js?v=df2a77035cc6be39"];
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
  return fetch(new Request(request,{cache:'no-store'}));
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
    const hit=await caches.match(request)||await caches.match(new URL('./index.html',self.registration.scope).href);
    if(hit)return hit;
    const offline=await caches.match(OFFLINE_URL);
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
