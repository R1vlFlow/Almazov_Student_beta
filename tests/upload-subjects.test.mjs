import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_TASK_FILE_SIZE,MAX_MATERIAL_FILE_SIZE,MAX_SCHEDULE_FILE_SIZE} from '../dist/core/uploadLimits.js';
import {isAllowedMaterialFile} from '../dist/services/materialStore.js';
import {subjectDisplayName,subjectSuggestions} from '../dist/ui/subjectCombobox.js';
import {cleanSubject} from '../dist/core/normalize.js';

test('file limits cover large student documents and enforce the upper boundary',()=>{
 assert.equal(MAX_TASK_FILE_SIZE,100*1024*1024);assert.equal(MAX_MATERIAL_FILE_SIZE,250*1024*1024);assert.equal(MAX_SCHEDULE_FILE_SIZE,50*1024*1024);
 for(const name of ['book.pdf','slides.pptx','notes.doc','archive.zip','book.epub','lecture.mp4']){assert.equal(isAllowedMaterialFile({name,size:30*1024*1024}),true);assert.equal(isAllowedMaterialFile({name,size:MAX_MATERIAL_FILE_SIZE+1}),false);}
 assert.equal(isAllowedMaterialFile({name:'empty.pdf',size:0}),false);
});
test('broken Latin labels become one human-readable subject without rewriting unrelated names',()=>{
 for(const value of ['атынь','Латынь',' латынь ']){assert.equal(subjectDisplayName(value),'Латинский язык');assert.equal(cleanSubject(value),'Латинский язык');}
 assert.equal(subjectDisplayName('Анатомия человека'),'Анатомия человека');assert.equal(subjectDisplayName('Свой предмет'),'Свой предмет');
 assert.deepEqual(subjectSuggestions(['атынь','Латинский язык','ЛАТИНСКИЙ ЯЗЫК','  Химия ','химия','']),['Латинский язык','Химия']);
});
test('correcting a Latin alias retains saved teachers, colors and gradients without rewriting notes',async()=>{
 const original=globalThis.localStorage,memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v))};
 try{localStorage.setItem('almazov.personalization.v1',JSON.stringify({version:2,subjectTeachers:{'латинский язык':'Проверенный преподаватель',атынь:'Старый вариант'},subjectColors:{атынь:'#7892bf'},subjectGradients:{атынь:'blue-purple'},tasks:[{id:'legacy',subject:'атынь',text:'Моя старая запись',program:'31.05.01',course:1,group:'123',done:false,createdAt:'2026-11-26'}],materials:[]}));const {readPersonalization}=await import('../dist/services/personalizationStore.js?latin-alias-check');const value=readPersonalization();assert.equal(value.subjectTeachers['латинский язык'],'Проверенный преподаватель');assert.equal(value.subjectColors['латинский язык'],'#7892bf');assert.equal(value.subjectGradients['латинский язык'],'blue-purple');assert.equal(value.tasks[0].text,'Моя старая запись');}finally{globalThis.localStorage=original;}
});
