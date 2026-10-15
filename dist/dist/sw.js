// Compatibility worker for PWAs previously installed at /dist/.
// Personal storage is origin-scoped and is deliberately left intact.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 await self.clients.claim();
 const windows=await self.clients.matchAll({type:'window'});
 for(const client of windows){
  const old=new URL(client.url),target=new URL('../',self.registration.scope);
  target.search=old.search;target.hash=old.hash;
  void client.navigate(target.href).catch(()=>{});
 }
})()));
self.addEventListener('fetch',event=>{
 if(event.request.mode!=='navigate')return;
 const old=new URL(event.request.url),target=new URL('../',self.registration.scope);
 target.search=old.search;target.hash=old.hash;
 event.respondWith(Promise.resolve(Response.redirect(target.href,302)));
});
