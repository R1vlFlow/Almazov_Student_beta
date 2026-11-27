import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GUIDE_ROOT,GUIDE_CHAPTERS,GUIDE_CAMPUSES,GUIDE_SECTIONS,GUIDE_PDF_BYTES,GUIDE_PAGE_COUNT,GUIDE_CORRECTIONS,guidePageUrl,findGuideChapters,findGuideSections,guideSectionForPage} from '../dist/data/firstYearGuide.js';
import {guideIntroMarkup} from '../dist/ui/firstYearGuide.js';
import {addressPlacesMarkup} from '../dist/ui/addressCards.js';
import {groupAddressPlaces} from '../dist/core/courseAddresses.js';
import {ALMAZOV_ADDRESSES} from '../dist/data/addresses.js';

test('guide chapters cover all 71 original pages exactly once and campus routes remain in range',()=>{
 assert.deepEqual(GUIDE_CHAPTERS.flatMap(c=>c.pages),Array.from({length:71},(_,i)=>i+1));assert.equal(GUIDE_PAGE_COUNT,71);
 for(const c of GUIDE_CAMPUSES){assert.ok(c.pages.length);assert.equal(new Set(c.pages).size,c.pages.length);for(const page of c.pages)assert.ok(page>=1&&page<=71);}
 assert.throws(()=>guidePageUrl(0));assert.throws(()=>guidePageUrl(72));assert.throws(()=>guidePageUrl(1.5));assert.match(GUIDE_CORRECTIONS[30],/Аккуратова, 2/);
 assert.ok(GUIDE_CAMPUSES.find(c=>c.id==='school').pages.includes(29));assert.deepEqual(GUIDE_CAMPUSES.find(c=>c.id==='tower').pages,[16,30]);assert.equal(GUIDE_CORRECTIONS[29],undefined);
});
test('guide search finds useful topics and first-year entry is absent for unrelated senior courses',()=>{
 assert.ok(findGuideChapters('пропуск').some(c=>c.id==='campus'));assert.ok(findGuideChapters('воинский учет').some(c=>c.id==='questions'));assert.deepEqual(findGuideChapters('несуществующее'),[]);
 assert.ok(guideIntroMarkup(1).includes('data-guide-open'));assert.equal(guideIntroMarkup(4),'');assert.ok(!guideIntroMarkup(1).includes('guide.pdf'));
});
test('all page images and complete PDF are shipped, but bulk guide assets are not startup precache dependencies',async()=>{
 for(let n=1;n<=71;n++){const bytes=await readFile('dist/'+guidePageUrl(n).slice(2));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');}
 for(const c of GUIDE_CAMPUSES)await readFile('dist/'+GUIDE_ROOT.slice(2)+c.id+'.webp');
 const pdf=await readFile('dist/'+GUIDE_ROOT.slice(2)+'guide.pdf');assert.equal(pdf.length,GUIDE_PDF_BYTES);assert.equal(pdf.toString('ascii',0,4),'%PDF');
 const manifest=JSON.parse(await readFile('dist/'+GUIDE_ROOT.slice(2)+'manifest.json','utf8'));assert.equal(manifest.pages,71);assert.equal(manifest.authors.length,3);assert.equal(manifest.linksPreserved,7);
 const sw=await readFile('dist/sw.js','utf8');const paths=JSON.parse(sw.match(/const VERSIONED_SHELL=(\[[^\n]*\]);/)[1]);assert.ok(paths.every(p=>!p.includes('/assets/guides/')));
});

test('specific questions have a unique destination, searchable independently of broad chapter names',()=>{
 const covered=[];
 for(const section of GUIDE_SECTIONS){assert.ok(section.first<=section.last);const chapter=GUIDE_CHAPTERS.find(c=>c.id===section.chapter);assert.ok(chapter);for(let n=section.first;n<=section.last;n++){covered.push(n);assert.ok(chapter.pages.includes(n));assert.equal(guideSectionForPage(n).id,section.id);}}
 assert.deepEqual(covered,Array.from({length:71},(_,i)=>i+1));
 assert.deepEqual(findGuideSections('билет пропуск').map(s=>s.id),['pass']);assert.deepEqual(findGuideSections('ВОИНСКИЙ УЧЕТ').map(s=>s.id),['military']);assert.equal(guideSectionForPage(3).id,'leadership');assert.equal(guideSectionForPage(0),undefined);assert.equal(findGuideSections('несуществующее').length,0);
});

test('address cards pair the right campus photo, map and entrance without mutating or splitting the directory',()=>{
 const grouped=groupAddressPlaces(ALMAZOV_ADDRESSES,[{subject:'Биология',location:'ШКОЛА, ауд. 1'},{subject:'Химия',location:'ШКОЛА, ауд. 2'}]).places;
 const before=JSON.stringify(grouped),html=addressPlacesMarkup(grouped);
 assert.equal(JSON.stringify(grouped),before);assert.equal((html.match(/class="address-card card"/g)||[]).length,grouped.length);assert.equal((html.match(/class="address-photo"/g)||[]).length,6);
 const campuses=[...html.matchAll(/data-address-campus="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(campuses,GUIDE_CAMPUSES.map(c=>c.id));
 for(const campus of GUIDE_CAMPUSES){assert.ok(html.includes(`src="${GUIDE_ROOT+campus.id}.webp"`));assert.ok(html.includes(`data-guide-campus="${campus.id}"`));const place=grouped.find(p=>p.members.some(m=>m.guideId===campus.id));assert.ok(html.includes('https://yandex.ru/maps/?text='+encodeURIComponent(place.address)));}
 assert.ok(html.includes('ШКОЛА, ауд. 1'));assert.ok(html.includes('ШКОЛА, ауд. 2'));
});
