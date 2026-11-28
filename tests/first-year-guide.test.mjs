import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GUIDE_ROOT,GUIDE_CHAPTERS,GUIDE_CAMPUSES,GUIDE_SECTIONS,GUIDE_PDF_BYTES,GUIDE_PAGE_COUNT,GUIDE_CORRECTIONS,guidePageUrl,findGuideChapters,findGuideSections,guideSectionForPage} from '../dist/data/firstYearGuide.js';
import {guideIntroMarkup} from '../dist/ui/firstYearGuide.js';
import {addressPlacesMarkup} from '../dist/ui/addressCards.js';
import {groupAddressPlaces} from '../dist/core/courseAddresses.js';
import {ALMAZOV_ADDRESSES} from '../dist/data/addresses.js';
import {ADDRESS_PHOTOS,addressPhotoFor} from '../dist/data/addressPhotos.js';
import {HANDBOOK_ARTICLES,HANDBOOK_SLIDE_DECKS,handbookSlideDeck,findHandbookArticles} from '../dist/data/handbookContent.js';
import {CAMPUS_TRANSIT,transitForCampus} from '../dist/data/campusTransit.js';
import {campusTransitMarkup,publicTransportUrl} from '../dist/ui/campusTransit.js';
import {handbookArticleMarkup,handbookContentsMarkup} from '../dist/ui/firstYearGuide.js';
import {CAMPUS_ROUTES} from '../dist/data/campusRoutes.js';
import {campusRouteMarkup} from '../dist/ui/campusRoutes.js';

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
 const sw=await readFile('dist/sw.js','utf8');const paths=JSON.parse(sw.match(/const VERSIONED_SHELL=(\[[^\n]*\]);/)[1]);assert.ok(paths.every(p=>!p.includes('/assets/guides/')&&!p.includes('/assets/campus-routes/')&&!p.includes('/assets/place-photos/')));
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
 assert.equal(JSON.stringify(grouped),before);assert.equal((html.match(/class="address-card card"/g)||[]).length,grouped.length);assert.equal((html.match(/class="address-photo"/g)||[]).length,grouped.filter(p=>addressPhotoFor(p.key)).length);
 const campuses=[...html.matchAll(/data-address-campus="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(campuses,GUIDE_CAMPUSES.map(c=>c.id));
 for(const campus of GUIDE_CAMPUSES){assert.ok(html.includes(`data-guide-campus="${campus.id}"`));const place=grouped.find(p=>p.members.some(m=>m.guideId===campus.id));assert.ok(html.includes(`src="${addressPhotoFor(place.key).src}"`));assert.ok(html.includes('https://yandex.ru/maps/?text='+encodeURIComponent(place.address)));}
 assert.ok(html.includes('ШКОЛА, ауд. 1'));assert.ok(html.includes('ШКОЛА, ауд. 2'));
});

test('handbook is readable article text and excludes the campus directory and route pages from its navigation',()=>{
 const pages=HANDBOOK_ARTICLES.flatMap(a=>a.pages).sort((a,b)=>a-b);
 const expected=Array.from({length:71},(_,i)=>i+1).filter(n=>!(n>=15&&n<=17)&&!(n>=21&&n<=45));
 assert.deepEqual(pages,expected);assert.equal(new Set(pages).size,pages.length);
 for(const article of HANDBOOK_ARTICLES){const html=handbookArticleMarkup(article);assert.ok(html.includes('handbook-prose'));assert.ok(html.includes(article.title));assert.doesNotMatch(html,/data-guide-campus|guide-page-image|guide-page-jump/);}
 const contents=handbookContentsMarkup();assert.doesNotMatch(contents,/Как добраться|Знакомство с корпусами|data-guide-campus/);assert.equal(findHandbookArticles('воинский').length,1);assert.ok(findHandbookArticles('пропуск').some(a=>a.id==='pass'));assert.ok(findHandbookArticles('предложения').some(a=>a.id==='councils'));assert.deepEqual(findHandbookArticles('студсовет').map(a=>a.id),['councils']);assert.ok(findHandbookArticles('общага').some(a=>a.id==='dorm'));
});

test('campus entrance walkthroughs use images and source pages from that exact campus',async()=>{
 assert.deepEqual(CAMPUS_ROUTES.map(r=>r.id),GUIDE_CAMPUSES.map(c=>c.id));
 for(const route of CAMPUS_ROUTES){const campus=GUIDE_CAMPUSES.find(c=>c.id===route.id);for(const [i,step] of route.steps.entries()){assert.ok(campus.pages.includes(step.sourcePage));assert.ok(step.image.split('/').at(-1).startsWith(route.id+'-'));const bytes=await readFile('dist/'+step.image.slice(2));assert.equal(bytes.toString('ascii',8,12),'WEBP');const html=campusRouteMarkup(route,i,'entrance');assert.ok(html.includes(step.title));assert.ok(html.includes(step.image));assert.doesNotMatch(html,/handbook-topic|firstYearGuideSearch|guide-page-image/);}}
 assert.ok(CAMPUS_ROUTES.find(r=>r.id==='nok').note.includes('строительства'));
});

test('presentation introductions remain attached to the complete content, with every retained source page reachable',()=>{
 const pages=HANDBOOK_SLIDE_DECKS.flatMap(d=>d.pages).sort((a,b)=>a-b);
 assert.deepEqual(pages,HANDBOOK_ARTICLES.flatMap(a=>a.pages).sort((a,b)=>a-b));assert.equal(new Set(pages).size,pages.length);
 for(const intro of [8,46,59,65]){const deck=HANDBOOK_SLIDE_DECKS.find(d=>d.pages.includes(intro));assert.ok(deck.pages.includes(intro+1));assert.ok(deck.pages.length>=6);}
 for(const article of HANDBOOK_ARTICLES){const deck=handbookSlideDeck(article);assert.ok(article.pages.every(p=>deck.pages.includes(p)));}
 assert.equal(handbookSlideDeck(HANDBOOK_ARTICLES.find(a=>a.id==='scholarships')).pages.length,7);
 assert.equal(handbookSlideDeck(HANDBOOK_ARTICLES.find(a=>a.id==='canteens')).pages.length,6);
 assert.deepEqual(HANDBOOK_ARTICLES.find(a=>a.id==='curators').pages,[7]);assert.equal(guideSectionForPage(8).id,'terms');
});

test('campus transport preserves full published stop lists, correct vehicle types and exact destination links',()=>{
 assert.deepEqual(CAMPUS_TRANSIT.map(t=>t.id),GUIDE_CAMPUSES.map(c=>c.id));
 for(const data of CAMPUS_TRANSIT){assert.ok(data.metro.length&&data.stops.length);for(const stop of data.stops){assert.ok(stop.name&&stop.routes.length);assert.match(stop.url,/^https:\/\/yandex\./);assert.match(stop.sourceUrl,/^https:\/\//);assert.equal(new Set(stop.routes.map(r=>r.type+':'+r.number)).size,stop.routes.length);for(const r of stop.routes)assert.match(r.number,/^\d+[А-ЯЁ]?$/u);}
  const route=CAMPUS_ROUTES.find(r=>r.id===data.id),html=campusRouteMarkup(route,0);assert.ok(html.includes('Остановки и маршруты'));assert.doesNotMatch(html,/id="campusRouteImage"/);assert.ok(campusTransitMarkup(data,'Адрес & корпус').includes(encodeURIComponent('Адрес & корпус')));
 }
 const cdti=transitForCampus('cdti');assert.ok(cdti.stops.some(s=>s.routes.some(r=>r.type==='bus'&&r.number==='221')));assert.ok(cdti.stops.some(s=>s.routes.some(r=>r.type==='trolleybus'&&r.number==='52')));
 const cdtiPlatforms=cdti.stops.filter(s=>/stop__1006730[01]/.test(s.url));assert.equal(cdtiPlatforms.length,2);
 assert.ok(cdtiPlatforms.every(s=>s.routes.some(r=>r.number==='194')));assert.ok(cdtiPlatforms.every(s=>s.platformNote.includes('221')));
 assert.notEqual(cdtiPlatforms[0].platformNote,cdtiPlatforms[1].platformNote);
 const combinedStop=transitForCampus('imo').stops.find(s=>s.bothDirections);assert.ok(combinedStop.platformNote.includes('обеих сторон'));assert.ok(new URL(combinedStop.url).searchParams.get('text')?.includes('Поликлиника'));
 const imo=transitForCampus('imo');for(const number of ['25','50']){assert.ok(imo.stops.some(s=>s.routes.some(r=>r.type==='trolleybus'&&r.number===number)));assert.ok(imo.stops.every(s=>s.routes.every(r=>r.number!==number||r.type==='trolleybus')));}
 assert.deepEqual(transitForCampus('sunny').stops[0].routes.map(r=>r.number),['211','211Э','680']);assert.ok(transitForCampus('sunny').rail.includes('Солнечное'));
 const link=new URL(publicTransportUrl('Санкт-Петербург, Средняя, 6','Метро Удельная'));assert.equal(link.searchParams.get('rtt'),'mt');assert.equal(link.searchParams.get('rtext'),'Метро Удельная~Санкт-Петербург, Средняя, 6');
});

test('photo records attach to one exact directory address, have provenance and ship locally without third-party image loads',async()=>{
 const places=groupAddressPlaces(ALMAZOV_ADDRESSES,[]).places;
 assert.ok(ADDRESS_PHOTOS.length>=10);assert.equal(new Set(ADDRESS_PHOTOS.map(p=>p.placeKey)).size,ADDRESS_PHOTOS.length);
 for(const photo of ADDRESS_PHOTOS){const place=places.find(p=>p.key===photo.placeKey);assert.ok(place);assert.equal(place.address,photo.address);assert.equal(addressPhotoFor(place.key),photo);assert.ok(photo.sourceAddress);assert.ok(photo.credit);assert.ok(photo.sourceUrl.startsWith('https://')||photo.sourceUrl.startsWith(GUIDE_ROOT));assert.ok(photo.src.startsWith('./assets/'));const bytes=await readFile('dist/'+photo.src.slice(2));assert.equal(bytes.toString('ascii',8,12),'WEBP');}
 const html=addressPlacesMarkup(places);assert.ok(html.includes('data-address-photo'));for(const photo of ADDRESS_PHOTOS.filter(p=>p.kind==='project'))assert.ok(html.includes('Визуализация проекта'));
 assert.equal(addressPhotoFor('Несуществующий корпус'),undefined);
});
