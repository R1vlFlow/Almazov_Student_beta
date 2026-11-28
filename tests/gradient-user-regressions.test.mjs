import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {APPEARANCE_PALETTES,GRADIENT_PALETTES,gradientBackground,gradientForeground,validGradientId} from '../dist/core/appearance.js';
import {appearancePickerMarkup} from '../dist/ui/profileAppearance.js';
import {avatarIcon,icon} from '../dist/ui/icons.js';
import {AVATAR_PRESETS} from '../dist/core/avatar.js';
import {AVATAR_ICON_PATHS} from '../dist/ui/iconAssets.js';
import {preparationMarkup} from '../dist/ui/studyPlanner.js';

test('subject picker offers 24 real, distinct two-color gradients independently from 24 solids',()=>{
 assert.equal(APPEARANCE_PALETTES.length,24);assert.equal(GRADIENT_PALETTES.length,24);
 assert.equal(new Set(GRADIENT_PALETTES.map(p=>gradientBackground(p.id))).size,24);
 for(const p of GRADIENT_PALETTES){assert.notEqual(p.from,p.to);assert.match(gradientBackground(p.id),/^linear-gradient\(120deg, #[\da-f]{6} 0%, #[\da-f]{6} 100%\)$/);assert.ok(['#ffffff','#172033'].includes(gradientForeground(p.id)));assert.equal(validGradientId(p.id),true);}
 const html=appearancePickerMarkup('#315fce','gradient','blue-purple');assert.equal((html.match(/data-gradient-id=/g)||[]).length,24);assert.equal((html.match(/linear-gradient/g)||[]).length,24);
 assert.equal(gradientBackground('url(javascript:alert(1))'),'');assert.equal(validGradientId('linear-gradient(red,blue)'),false);
});
test('gradient choices round trip without changing names, teacher notes, tasks or legacy colors',async()=>{
 const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v))};
 localStorage.setItem('almazov.personalization.v1',JSON.stringify({displayName:'Илья',accentColor:'#315fce',subjectColors:{Химия:'#7892bf'},subjectTeachers:{Химия:'Иванов'},tasks:[{id:'t',subject:'Химия',text:'Мой текст',program:'31.05.01',course:1,group:'123',done:false,createdAt:'2026-11-26'}],materials:[]}));
 const {readPersonalization,updatePersonalization}=await import('../dist/services/personalizationStore.js?gradient-regression');const old=readPersonalization();
 const next=updatePersonalization({subjectGradients:{Химия:'blue-purple'},accentStyle:'gradient',accentGradient:'pastel-pink',double1Gradient:'teal-blue'});
 assert.equal(next.subjectGradients['химия'],'blue-purple');assert.equal(next.subjectColors['химия'],'#7892bf');assert.deepEqual(next.tasks,old.tasks);assert.deepEqual(next.subjectTeachers,old.subjectTeachers);assert.equal(next.displayName,'Илья');
 const saved=JSON.parse(localStorage.getItem('almazov.personalization.v1'));assert.equal(saved.accentGradient,'pastel-pink');assert.equal(saved.double1Gradient,'teal-blue');
 const rejected=updatePersonalization({subjectGradients:{Химия:'url(https://evil.test)'},accentGradient:'bad',double1Gradient:'<script>'});assert.deepEqual(rejected.subjectGradients,{});assert.equal(rejected.accentGradient,undefined);assert.equal(rejected.double1Gradient,undefined);
});
test('profile uses original filled Phosphor SVGs, not the old stroked handcrafted symbols',async()=>{
 assert.equal(Object.keys(AVATAR_ICON_PATHS).length,20);assert.equal(new Set(AVATAR_PRESETS.map(p=>avatarIcon(p.id))).size,20);
 for(const p of AVATAR_PRESETS){const html=avatarIcon(p.id);assert.ok(html.includes('viewBox="0 0 256 256"'));assert.ok(html.includes('stroke="none"'));assert.ok(html.includes(AVATAR_ICON_PATHS[p.id]));assert.notEqual(html,icon(p.id));}
 const license=await readFile('dist/assets/licenses/phosphor-icons-LICENSE.txt','utf8');assert.match(license,/MIT License/);assert.match(license,/Copyright.*Phosphor Icons/);
});
test('preparation description has no repeated inline book links while materials remain reachable',()=>{
 const event={id:'e',kind:'schedule',subject:'Латинский язык',title:'Латинский язык',startAt:'2026-11-27T06:00:00Z',endAt:'2026-11-27T07:35:00Z',type:'practice',readOnly:true,timeZone:'Europe/Moscow'};
 const books=[1,2].map(n=>({id:String(n),subject:'Латинский язык',title:'Латинский язык — учебник',url:'https://example.org/'+n,fileMaterial:false}));
 const view=preparationMarkup({profile:{program:'31.05.01',course:1,group:'123'},date:'2026-11-27',timeZone:'Europe/Moscow',events:[event],tasks:[],materials:books,status:'live'}).html;
 assert.ok(!view.includes('учебник'));assert.ok(!view.includes('class="planner-materials"'));assert.ok(view.includes('data-action="planner-materials"'));assert.ok(view.includes('Материалы предмета'));
});
