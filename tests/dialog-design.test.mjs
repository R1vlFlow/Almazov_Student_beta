import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {APPEARANCE_PALETTES,appearanceBackground} from '../dist/core/appearance.js';
import {AVATAR_PRESETS,normalizeAvatarPreset} from '../dist/core/avatar.js';
import {icon} from '../dist/ui/icons.js';
import {appearancePickerMarkup} from '../dist/ui/profileAppearance.js';
import {lessonDetailMarkup,lessonDetailActions} from '../dist/ui/lessonDetail.js';
import {lessonChangeRefs,changesForLesson,departuresOnDate} from '../dist/core/lessonChanges.js';
import {recordGroupScheduleCheck,readGroupHistory,markLessonChangeSeen,unreadGroupChanges} from '../dist/services/groupScheduleHistory.js';
import {lessonChangeBadge} from '../dist/ui/scheduleChanges.js';

const profile={program:'31.05.01',course:1,group:'123',stream:'A'};
const event={id:'e',kind:'schedule',title:'Химия',subject:'Химия',type:'practice',lessonNumber:5,group:'123',stream:'A',startAt:'2026-11-27T06:00:00Z',endAt:'2026-11-27T07:35:00Z',timeZone:'Europe/Moscow',readOnly:true,location:'КПК'};
const row={id:'e',...profile,subject:'Химия',type:'practice',date:'2026-11-27',start:'09:00',end:'10:35',location:'КПК',teacher:''};
const snapshot=(events,weeklyBlocks=[])=>({status:'live',events,weeklyBlocks,issues:[],message:'',generatedAt:'2026-11-26T15:00:00Z'});
class MemoryStorage {values=new Map();getItem(k){return this.values.get(k)??null;}setItem(k,v){this.values.set(k,String(v));}}
function luminance(hex){return hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);}
test('curated palettes use safe colors and both gradient endpoints support white icons',()=>{
 assert.equal(APPEARANCE_PALETTES.length,24);assert.equal(new Set(APPEARANCE_PALETTES.map(p=>p.id)).size,24);
 for(const p of APPEARANCE_PALETTES){assert.match(p.color,/^#[\da-f]{6}$/i);assert.match(appearanceBackground(p.color,'gradient'),/^linear-gradient/);for(const color of [p.color,p.end])assert.ok(1.05/(luminance(color)+.05)>=4.5,`${p.name}: ${color}`);}
 assert.equal(appearanceBackground('url(https://evil.test/)','gradient'),'linear-gradient(135deg, #4059c7, #7252b5)');assert.equal(appearanceBackground('#315fce','gradient'),'#315fce');
 assert.ok(appearancePickerMarkup('#315fce','solid').includes('Ваш цвет'));
});
test('twenty distinct vector profile icons preserve old selections and reject arbitrary names',()=>{
 assert.equal(AVATAR_PRESETS.length,20);assert.equal(new Set(AVATAR_PRESETS.map(p=>p.id)).size,20);
 assert.equal(new Set(AVATAR_PRESETS.map(p=>icon(p.id))).size,20);
 for(const p of AVATAR_PRESETS)assert.equal(normalizeAvatarPreset(p.id),p.id);
 assert.equal(normalizeAvatarPreset('🩺'),'medicine');assert.equal(normalizeAvatarPreset('<svg>'),'profile');
});
test('lesson detail gives practice its number, never numbers lectures, and omits empty descriptions',()=>{
 const context={timeZone:'Europe/Moscow',mapHtml:'',updatesHtml:'',errorDraft:''};
 const practice=lessonDetailMarkup(event,context);assert.match(practice,/Практика №5/);assert.match(practice,/lesson-time-card/);assert.match(practice,/lesson-place-card/);assert.ok(!practice.includes('<h3>О занятии</h3>'));assert.ok(!practice.includes('Как считается номер практики'));
 const lecture=lessonDetailMarkup({...event,type:'lecture'},context);assert.ok(!lecture.includes('№5'));assert.ok(!lecture.includes('Как считается номер практики'));
 assert.match(lessonDetailActions(event),/data-homework-from-event/);assert.match(lessonDetailActions(event),/data-materials-subject/);
});
test('lesson details escape source titles, personal text and error report contents',()=>{
 const bad='<img src=x onerror=alert(1)>';
 const html=lessonDetailMarkup({...event,title:bad,location:bad,teacher:bad,description:bad,topic:{titles:[bad],sourceUrl:'javascript:alert(1)',pages:[1],cohortYear:2026,teachingSemester:1}},{timeZone:'Europe/Moscow',mapHtml:'',updatesHtml:'',errorDraft:bad});
 assert.ok(!html.includes('<img'));assert.ok(!html.includes('href="javascript:'));assert.match(html,/&lt;img/);
});
test('viewing one changed lesson keeps other lessons unread and does not repeat notifications on identical reload',()=>{
 globalThis.localStorage=new MemoryStorage();const second={...row,id:'two',subject:'Биология',start:'11:00',end:'12:35'};
 recordGroupScheduleCheck(profile,snapshot([row,second]));recordGroupScheduleCheck(profile,snapshot([{...row,location:'Солнечное'},{...second,teacher:'Петров'}]));
 assert.equal(unreadGroupChanges(profile),2);let refs=lessonChangeRefs(readGroupHistory(profile));const first=changesForLesson(event,refs);assert.equal(first.length,1);
 assert.equal(markLessonChangeSeen(profile,first[0].batchId,first[0].index),true);assert.equal(unreadGroupChanges(profile),1);
 refs=lessonChangeRefs(readGroupHistory(profile));assert.equal(lessonChangeBadge(event,refs),'');assert.ok(lessonChangeBadge({...event,title:'Биология',subject:'Биология',startAt:'2026-11-27T08:00:00Z',endAt:'2026-11-27T09:35:00Z'},refs));
 recordGroupScheduleCheck(profile,snapshot([{...row,location:'Солнечное'},{...second,teacher:'Петров'}]));assert.equal(unreadGroupChanges(profile),1);
 assert.equal(markLessonChangeSeen(profile,first[0].batchId,99),false);
});
test('inline changes distinguish lecture/practice and match both halves of a double practice',()=>{
 globalThis.localStorage=new MemoryStorage();const long={...row,end:'12:25'};recordGroupScheduleCheck(profile,snapshot([long]));recordGroupScheduleCheck(profile,snapshot([{...long,location:'Солнечное'}]));const refs=lessonChangeRefs(readGroupHistory(profile));
 assert.equal(changesForLesson({...event,doubleOf:'d'},refs).length,1);assert.equal(changesForLesson({...event,doubleOf:'d',startAt:'2026-11-27T07:50:00Z',endAt:'2026-11-27T09:25:00Z'},refs).length,1);
 assert.equal(changesForLesson({...event,type:'lecture'},refs).length,0);assert.equal(changesForLesson({...event,group:'124'},refs).length,0);
});
test('moved and removed lessons leave notices on old dates and do not invent new daily cycle dates',()=>{
 globalThis.localStorage=new MemoryStorage();recordGroupScheduleCheck(profile,snapshot([row]));recordGroupScheduleCheck(profile,snapshot([{...row,date:'2026-11-28'}]));let refs=lessonChangeRefs(readGroupHistory(profile));assert.equal(departuresOnDate(refs,'2026-11-27').length,1);assert.equal(departuresOnDate(refs,'2026-11-28').length,0);
 globalThis.localStorage=new MemoryStorage();const block={...row,weekNumber:13,weekRangeStart:'2026-11-23',weekRangeEnd:'2026-11-28',cycleDateStatus:'unresolved'};
 recordGroupScheduleCheck(profile,snapshot([],[block]));recordGroupScheduleCheck(profile,snapshot([],[{...block,location:'Новое место'}]));refs=lessonChangeRefs(readGroupHistory(profile));assert.equal(departuresOnDate(refs,'2026-11-23').length,0);assert.equal(changesForLesson(event,refs).length,0);
});
test('changes navigation is removed while profile and task controls remain accessible',async()=>{
 const html=await readFile('public/index.html','utf8');assert.ok(!html.includes('data-page="changes"'));assert.ok(!html.includes('id="page-changes"'));assert.ok(!html.includes('type="color"'));
 for(const id of ['profileAccent','avatarPresets','profilePalette','taskSubject','taskText','taskDate','taskPriority','taskLink','taskAttachment','taskExtras','detailActions'])assert.ok(html.includes(`id="${id}"`),id);
});
