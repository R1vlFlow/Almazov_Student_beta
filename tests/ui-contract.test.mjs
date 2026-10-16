import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const css=await readFile(new URL('../public/styles.css',import.meta.url),'utf8');
const boot=await readFile(new URL('../public/boot.js',import.meta.url),'utf8');

const app=await readFile(new URL('../src/app.ts',import.meta.url),'utf8');
const validator=await readFile(new URL('../scripts/validate-dist.mjs',import.meta.url),'utf8');
const awaitSource=async(path)=>readFile(new URL(path,import.meta.url),'utf8');

test('schedule boot tolerates a not-yet-created empty state and always exits loading',()=>{
 assert.match(app,/document\.getElementById\('emptyState'\)\?\.remove\(\)/);
 assert.doesNotMatch(app,/\$\('emptyState'\)\?\.remove\(\)/);
 assert.match(app,/async function reloadEvents\(\)[\s\S]*?catch\(error\)[\s\S]*?state\.status='error'/);
 assert.match(app,/state\.status==='loading'&&state\.scheduleMode!=='kug'[\s\S]*?renderSkeleton\(\)/);
 assert.match(app,/state\.scheduleMode==='kug'&&state\.kugStatus==='loading'[\s\S]*?renderSkeleton\(\)/);
});

test('modals stay outside document flow unless explicitly opened',()=>{
 assert.match(css,/\.modal-backdrop\{[^}]*display:none/s);
 assert.match(css,/\.modal-backdrop\.open\{display:flex\}/);
 assert.match(css,/\.modal\{[^}]*max-height:[^}]*overflow:hidden/s);
 assert.match(css,/\.modal-body\{[^}]*overflow:auto/s);
 assert.match(html,/id="eventModal" aria-hidden="true"/);
 assert.match(app,/function closeAllModals\(\)/);
 assert.match(app,/if\(action==='close-modal'\)\{closeAllModals\(\)/);
});

test('routing rejects missing pages and clears modal state during navigation',()=>{
 assert.match(app,/const destination=document\.getElementById\(`page-\$\{page\}`\)/);
 assert.match(app,/closeAllModals\(\);state\.page=page/);
 assert.match(app,/if\(e\.key==='Escape'\)\{closeAllModals\(\);return;\}/);
});

test('production validation protects the modal CSS contract',()=>{
 assert.match(validator,/Required modal\/layout CSS missing/);
});

for(const page of ['home','schedule','homework','kug','resources','faculties','faq','settings','profilePage']){
 test(`page ${page} has a real section`,()=>assert.match(html,new RegExp(`id="page-${page}"`)));
}

test('navigation keeps FAQ and direct Telegram contact without a support tab',()=>{
 assert.match(html,/data-page="faq"/); assert.match(html,/FAQ/);
 assert.doesNotMatch(html,/data-page="support"|id="page-support"|id="ticketList"/);
 assert.match(html,/href="https:\/\/t\.me\/R1vlFlow_GY"/);
 assert.match(html,/id="faqList"/);
});

test('calendar exposes all required views',()=>{
 for(const view of ['day','workweek','week','month','agenda','list']) assert.match(html,new RegExp(`data-view="${view}"`));
 assert.match(html,/id="eventTitle"/); assert.match(html,/id="eventTimezone"/); assert.match(html,/id="eventRepeat"/); assert.match(html,/id="eventEditScope"/);
});

test('theme contract has semantic tokens and system bootstrap',()=>{
 for(const token of ['--bg:','--surface:','--text:','--border:','--accent:','--success:','--warning:','--danger:','--focus:','--shadow-sm:','--shadow-md:']) assert.ok(css.includes(token),`missing ${token}`);
 assert.match(css,/html\[data-theme=dark\]/);
 assert.match(boot,/prefers-color-scheme/);
 assert.match(boot,/dataset\.themePreference/);
});

test('settings use theme choice cards and compact paired-color controls',()=>{
 assert.match(html,/data-theme-choice="light"/); assert.match(html,/data-theme-choice="dark"/); assert.match(html,/data-theme-choice="system"/);
 assert.match(css,/\.settings-card\{align-content:start/);
 assert.match(css,/\.theme-choice\.active/);
 assert.match(css,/\.settings-card input\[type=color\]/);
});

test('responsive and accessibility contract is present',()=>{
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(css,/min-height:44px/);
 assert.match(html,/class="skip"/);
 assert.match(html,/aria-label=/);
 assert.match(html,/aria-live="polite"/);
});

test('built static schedule exposes 4K practice blocks by official week without inventing dates',async()=>{
 const snapshot=JSON.parse(await readFile(new URL('../dist/data/schedules/31.05.01/4.json',import.meta.url),'utf8'));
 assert.ok(snapshot.events.length+snapshot.weeklyBlocks.length>500);
 const rows=snapshot.weeklyBlocks.filter(e=>e.group==='413'&&e.weekNumber===5&&e.type==='practice'&&e.start==='13:30');
 assert.deepEqual(rows.map(e=>[e.weekRangeStart,e.weekRangeEnd,e.start,e.end,e.stream,e.type]),[['2026-09-28','2026-10-03','13:30','16:55','B','practice']]);
 assert.equal('weekday' in rows[0]||'date' in rows[0],false);
});

test('unpublished courses are labelled as unpublished rather than as load failures',()=>{
 assert.match(app,/Нет опубликованных данных/);
 assert.match(app,/healthMessage\.includes\('нет опубликован'\)/);
});


test('double lesson labels render in every calendar view',()=>{
 assert.match(app,/function eventHalfLabel\(e:CalendarEvent\)/);
 assert.match(app,/if\(e\.doublePart===1\)return '1\/2'/);
 assert.match(app,/if\(e\.doublePart===2\)return '2\/2'/);
 assert.match(app,/function eventHalfMarkup\(/);
 for(const fn of ['renderCardSchedule','renderMobile','renderMonth','renderAgenda','renderList']){
   const start=app.indexOf(`function ${fn}(`);
   assert.notEqual(start,-1,`missing ${fn}`);
   const next=app.indexOf('\nfunction ',start+10);
   const body=app.slice(start,next<0?undefined:next);
   assert.match(body,/eventHalfMarkup\(/,`${fn} omits split-part labels`);
 }
 assert.match(css,/\.event-half\.part-2/);
 assert.match(app,/reloadSequence/);
});

test('network loading has bounded timeouts',async()=>{
 const scheduleService=await readFile(new URL('../src/services/scheduleService.ts',import.meta.url),'utf8');
 const eventService=await readFile(new URL('../src/services/eventService.ts',import.meta.url),'utf8');
 assert.match(scheduleService,/AbortSignal\.timeout\(/);
 assert.match(eventService,/AbortSignal\.timeout\(/);
});

test('day/week schedule uses compact cards instead of the legacy vertical time grid',()=>{
 assert.match(app,/function renderCardSchedule\(/);
 assert.match(app,/renderList\(events\):renderCardSchedule\(events,dates\)/);
 assert.doesNotMatch(app,/function renderTimeGrid\(/);
 assert.doesNotMatch(app,/function currentTimeLine\(/);
 assert.match(css,/\.schedule-card-grid/);
 assert.match(app,/class=\"schedule-event-head\"><span class=\"event-time\">/);
});

test('course changes capture the new selection before render and reset the old group',()=>{
 assert.match(app,/await applySelectProfile\(id!=='groupSelect'\)/);
 assert.match(app,/async function applySelectProfile\(resetGroup=false\)/);
 assert.match(app,/group:resetGroup\?'':g.value\|\|''/);
 assert.doesNotMatch(app,/if\(id==='programSelect'\|\|id==='courseSelect'\)renderProfileOptions\(\)/);
});

test('phone period navigation stays beside lessons and announces the selected dates',()=>{
 assert.match(html,/class="mobile-period-nav" aria-label="Переключение периода"/);
 assert.match(html,/id="mobilePeriodLabel" role="status" aria-live="polite"/);
 assert.match(css,/#page-schedule\.active \.mobile-period-nav\{[^}]*position:fixed;bottom:0/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(app,/\$\('mobilePeriodLabel'\)\.textContent=\$\('weekLabel'\)\.textContent/);
 assert.match(app,/target\.hasAttribute\('data-mobile-period'\).*scrollIntoView/);
});
test('phone lesson cards explicitly distinguish practice and lectures',()=>{
 assert.match(app,/mobile-lesson-kind[\s\S]*?e\.type==='practice'\?'ПЗ':e\.type==='lecture'\?'Лекция'/);
});

test('month day selection opens a day instead of remaining on the month',()=>{
 assert.match(app,/if\(target.dataset.jumpDate\)\{[^}]*state.view='day';await reloadEvents\(\)/);
 assert.doesNotMatch(app,/if\(state.view==='month'\)\{\}/);
});
test('view changes do not render every hidden page or pre-render the whole calendar',()=>{
 assert.match(app,/if\(state.page==='home'\)renderHome\(\)/);
 assert.match(app,/state.view=target.dataset.view as ViewMode;await reloadEvents\(\);return/);
});
