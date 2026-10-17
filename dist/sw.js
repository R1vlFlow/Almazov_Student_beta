/* Build-time values are injected by scripts/copy-public.mjs. */
const BUILD_ID='ab61dd9a651715ca';
const CACHE_NAME=`almazov-hub-${BUILD_ID}`;
const VERSIONED_SHELL=["./styles.css?v=ab61dd9a651715ca","./splash.css?v=ab61dd9a651715ca","./boot.js?v=ab61dd9a651715ca","./manifest.webmanifest?v=ab61dd9a651715ca","./offline.html?v=ab61dd9a651715ca","./app.js?v=ab61dd9a651715ca","./core/calendar.js?v=ab61dd9a651715ca","./core/date.js?v=ab61dd9a651715ca","./core/excelParser.js?v=ab61dd9a651715ca","./core/filter.js?v=ab61dd9a651715ca","./core/htmlTableParser.js?v=ab61dd9a651715ca","./core/normalize.js?v=ab61dd9a651715ca","./core/practiceCycles.js?v=ab61dd9a651715ca","./core/time.js?v=ab61dd9a651715ca","./core/types.js?v=ab61dd9a651715ca","./core/validate.js?v=ab61dd9a651715ca","./data/addresses.js?v=ab61dd9a651715ca","./data/catalog.js?v=ab61dd9a651715ca","./data/roster.js?v=ab61dd9a651715ca","./main.js?v=ab61dd9a651715ca","./runtime-config.js?v=ab61dd9a651715ca","./services/cache.js?v=ab61dd9a651715ca","./services/eventService.js?v=ab61dd9a651715ca","./services/materialStore.js?v=ab61dd9a651715ca","./services/personalizationStore.js?v=ab61dd9a651715ca","./services/practiceScheduleImport.js?v=ab61dd9a651715ca","./services/scheduleService.js?v=ab61dd9a651715ca","./services/supportService.js?v=ab61dd9a651715ca","./services/taskService.js?v=ab61dd9a651715ca","./telemetry.js?v=ab61dd9a651715ca","./ui/customControls.js?v=ab61dd9a651715ca","./ui/faq.js?v=ab61dd9a651715ca","./ui/theme.js?v=ab61dd9a651715ca"];
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
