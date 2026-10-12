import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const read=path=>readFile(join(root,path),'utf8');
const [boot,worker,workerSource,html,rootIndex,rootWorker,version,cacheSource,scheduleSource,serverSource,sourceBoot,sourceHTML]=await Promise.all([
  read('dist/boot.js'),read('dist/sw.js'),read('public/sw.js'),read('dist/index.html'),read('index.html'),read('sw.js'),read('dist/version.json').then(JSON.parse),read('src/services/cache.ts'),read('src/services/scheduleService.ts'),read('server/server.mjs'),read('public/boot.js'),read('public/index.html')
]);
const check=(condition,message)=>{if(!condition)throw new Error(message);};
check(sourceBoot.includes('registration.update()')&&boot.includes('.update('),'boot must explicitly ask the browser to check for a worker update before and after minification');
check(sourceBoot.includes("window.addEventListener('app:check-update'")&&sourceHTML.includes('data-action="check-updates"'),'settings must expose a real manual update check before minification');
check(workerSource.includes("url.pathname.endsWith('/version.json')"),'version metadata must not accumulate stale cache entries');
check(sourceBoot.includes("updateViaCache:'none'")&&boot.includes('updateViaCache'),'service-worker script must bypass the HTTP cache before and after minification');
check(sourceBoot.includes("fetch(url,{cache:'no-store'")&&boot.includes('no-store'),'boot must verify the current deployed build before and after minification');
check(sourceBoot.includes("location.replace(pageUrl.href)")&&boot.includes('location.replace'),'old builds must trigger a cache-busting navigation before and after minification');
check(workerSource.includes("request.mode==='navigate'")&&workerSource.includes('networkFirst(request)'),'navigation must be network-first');
check(workerSource.includes("url.searchParams.get('v')===BUILD_ID"),'cache-first must be limited to versioned resources');
check(workerSource.includes("url.pathname.includes('/api/')")&&workerSource.includes('fetchFresh(request)'),'API responses must bypass cached user data');
check(worker.includes(version.buildId),'service worker cache version must match this build');
check(!worker.includes('__BUILD_ID__')&&!worker.includes('__VERSIONED_SHELL__'),'generated service worker must not contain build placeholders');
check(cacheSource.includes('ensureScheduleCacheVersion')&&cacheSource.includes('snapshot:')&&cacheSource.includes('raw:'),'build changes must invalidate only schedule/parser snapshots');
check(!cacheSource.includes('localStorage.clear('),'build changes must never wipe user-owned localStorage');
check(scheduleSource.includes("url.searchParams.set('v',buildId)")&&scheduleSource.includes("cache:'no-store'"),'static schedule fetch must be build-stamped and bypass HTTP cache');
check(serverSource.includes('no-cache, no-store, must-revalidate')&&serverSource.includes('application/manifest+json'),'server JSON schedules and manifest must be no-store');
check(html.includes(`?v=${version.buildId}`),'built HTML must version its assets');
check(rootIndex.includes("current.pathname+='dist/'"),'branch-root index must route to canonical dist app');
check(rootWorker.includes("cache:'no-store'"),'legacy root worker must check network before cache');
console.log(`PASS cache invalidation: build ${version.buildId}; selective schedule-cache purge; versioned schedule fetch; no-store JSON/manifest; network-first navigation`);
