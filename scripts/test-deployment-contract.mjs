import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const read=p=>readFile(join(root,p),'utf8');
const [pages,sync,guide,readme,specialistProducer,copyPublic,pipeline,packageJson]=await Promise.all([
  read('.github/workflows/pages.yml'),
  read('.github/workflows/sync-official-schedules.yml'),
  read('README_FIRST.md'),
  read('README.md'),
  read('scripts/build_specialist_program_schedules.py'),
  read('scripts/copy-public.mjs'),
  read('server/pipeline.mjs'),
  read('package.json')
]);
const checks=[];
const check=(name,condition)=>checks.push([name,Boolean(condition)]);
check('normal deploy handles main and master',/branches:\s*\[\s*main,\s*master\s*\]/.test(pages));
check('normal deploy supports manual runs',/^\s*workflow_dispatch:\s*$/m.test(pages));
check('source and schedule workflows serialize without cancellation',pages.includes('group: pages')&&sync.includes('group: pages')&&pages.includes('cancel-in-progress: false')&&sync.includes('cancel-in-progress: false'));
check('scheduled sync does not compete on every code push',!/^\s*push:\s*$/m.test(sync));
check('both workflows publish dist artifacts',pages.includes('path: dist')&&sync.includes('path: dist'));
check('both workflows use official Pages deployment',pages.includes('actions/deploy-pages@v4')&&sync.includes('actions/deploy-pages@v4'));
check('docs link the canonical Pages URL',guide.includes('URL Pages')&&guide.includes('без `/dist/`')&&readme.includes('https://r1vlflow.github.io/Almazov_Student_beta/')&&!readme.includes('https://r1vlflow.github.io/Almazov_Student_beta/dist/'));
check('official data refresh remains scheduled and manually available',/^\s*workflow_dispatch:\s*$/m.test(sync)&&/^\s*schedule:\s*$/m.test(sync));
check('both deploy paths run the full official snapshot builder without stale fallback',pages.includes('run: npm run sync:official')&&sync.includes('run: npm run sync:official')&&packageJson.includes('scripts/build_official_schedule.py')&&packageJson.includes('scripts/build_specialist_program_schedules.py')&&!pages.includes('--use-last-good')&&!sync.includes('--use-last-good'));
check('official Pages build requires live specialist snapshots and the strict release audit',/REQUIRE_SPECIALIST_SNAPSHOT:\s*["']?1/.test(pages)&&/REQUIRE_SPECIALIST_SNAPSHOT:\s*["']?1/.test(sync)&&packageJson.includes('scripts/validate_production_release.py'));
check('specialist producer discovers official page, verifies document identity and keeps last-good',specialistProducer.includes('page_candidates')&&specialistProducer.includes('SOURCE_FACULTY_MISMATCH')&&specialistProducer.includes('keep_last_good'));
check('specialist JSON is bundled into per-program static snapshots',copyPublic.includes("'data','program-schedules.json'")&&copyPublic.includes("'data','schedules',program")&&copyPublic.includes('REQUIRE_SPECIALIST_SNAPSHOT'));
check('server checks generated specialist snapshot before memory/redis/disk cache',pipeline.indexOf('loadGeneratedSpecialistSnapshot(program,course)')<pipeline.indexOf('const mem=memory.get(key)'));

const legacyEntry=await read('dist/dist/index.html');
const legacyWorker=await read('dist/dist/sw.js');
check('old installed PWA entry keeps query and fragment and redirects to root',legacyEntry.includes("new URL('../',location.href)")&&legacyEntry.includes('destination.search=location.search')&&legacyEntry.includes('destination.hash=location.hash'));
check('old PWA worker redirects navigation without deleting personal storage',legacyWorker.includes('Response.redirect(target.href,302)')&&!legacyWorker.includes('deleteDatabase')&&!legacyWorker.includes('localStorage.clear'));

const failures=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks) console.log(`${ok?'PASS':'FAIL'} — ${name}`);
console.log(`DEPLOYMENT CONTRACT: ${checks.length-failures.length}/${checks.length} passed`);
if(failures.length)process.exit(1);
