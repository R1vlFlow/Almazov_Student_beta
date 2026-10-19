import test from 'node:test';
import assert from 'node:assert/strict';
import {groupAddressPlaces,matchCourseAddresses} from '../dist/core/courseAddresses.js';
import {ALMAZOV_ADDRESSES} from '../dist/data/addresses.js';
test('campus directory combines Solnechnoe rooms and letters without changing precise routes',()=>{
 const rows=['Солнечное, лит. С, ауд. 3.24','Солнечное, лит. П, ауд. 1.1','Солнечное, лит. П, лит. С, ауд. 2'].map(location=>({location,subject:'Анатомия'}));
 const result=groupAddressPlaces(ALMAZOV_ADDRESSES,rows);const sunny=result.places.filter(x=>x.name==='Солнечное');
 assert.equal(sunny.length,1);assert.equal(sunny[0].locations.length,3);assert.equal(sunny[0].subjects.length,1);assert.equal(result.unresolved.length,0);
 assert.ok(!sunny[0].address.includes('лит.'));assert.ok(sunny[0].members.length>=2);
 assert.equal(matchCourseAddresses(ALMAZOV_ADDRESSES,[rows[2].location]).addresses.length,0);
});
test('unknown rooms group together without inventing their campus',()=>{
 const result=groupAddressPlaces(ALMAZOV_ADDRESSES,['Башня, ауд. 1','Башня, ауд. 2','ауд. 123','ауд. 124'].map(location=>({location,subject:'Предмет'})));
 assert.equal(result.unresolved.length,2);assert.equal(result.places.filter(x=>x.locations.length).length,0);assert.equal(result.unresolved[0].details.length,2);
});
test('distinct house numbers remain separate',()=>{
 const entry={name:'Клиника',category:'Базы',sourceUrl:'https://example.org'};
 const result=groupAddressPlaces([{...entry,address:'ул. Тестовая, д. 1, лит. А'},{...entry,address:'ул. Тестовая, д. 1, лит. Б'},{...entry,address:'ул. Тестовая, д. 2'}],[]);
 assert.equal(result.places.length,2);assert.equal(result.places[0].members.length,2);
});
