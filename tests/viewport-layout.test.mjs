import test from 'node:test';
import assert from 'node:assert/strict';
import {viewportLayout} from '../dist/core/viewportLayout.js';

const rect=(x,y,width,height)=>({x,y,width,height});
const duo=[rect(0,0,540,720),rect(574,0,540,720)];

test('two equal book panes put content on the right and navigation on the left, away from the hinge',()=>{
 const layout=viewportLayout(1114,720,duo);
 assert.equal(layout.mode,'horizontal');
 assert.deepEqual(layout.content,duo[1]);assert.deepEqual(layout.navigation,duo[0]);
 assert.deepEqual(viewportLayout(1114,720,[...duo].reverse()),layout);
});
test('tabletop layout uses the top pane and places navigation below the fold',()=>{
 for(const gap of [0,34]){
  const top=rect(0,0,720,540),bottom=rect(0,540+gap,720,540);
  assert.deepEqual(viewportLayout(720,1080+gap,[bottom,top]),{mode:'vertical',content:top,navigation:bottom});
 }
 assert.equal(viewportLayout(412,915,[rect(0,0,412,457),rect(0,457,412,458)]).content.y,0,'rounding must not move the app to the bottom half');
});
test('content uses the larger pane, and undersized secondary panes do not become navigation',()=>{
 const left=rect(0,0,700,720),right=rect(730,0,300,720);
 assert.deepEqual(viewportLayout(1030,720,[left,right]),{mode:'horizontal',content:left,navigation:right});
 assert.equal(viewportLayout(930,720,[left,rect(730,0,200,720)]).navigation,null);
 assert.equal(viewportLayout(1114,240,duo).navigation,null);
});
test('keyboard clipping keeps content and navigation inside the remaining visible screen',()=>{
 const layout=viewportLayout(1114,390,duo);
 assert.equal(layout.content.height,390);assert.equal(layout.navigation.height,390);
 const tabletop=viewportLayout(720,320,[rect(0,0,720,540),rect(0,574,720,540)]);
 assert.deepEqual(tabletop,{mode:'vertical',content:rect(0,0,720,320),navigation:null});
});
test('ordinary phones, unsupported APIs, malformed or overlapping segments fall back safely',()=>{
 for(const segments of [[],[duo[0]],[...duo,duo[0]],[rect(0,0,600,720),rect(500,0,600,720)],[rect(-1,0,540,720),duo[1]],[rect(0,0,NaN,720),duo[1]],[rect(0,0,0,720),duo[1]],[null,duo[1]]]){
  assert.deepEqual(viewportLayout(375,800,segments),{mode:'single',content:rect(0,0,375,800),navigation:null});
 }
 assert.deepEqual(viewportLayout(NaN,0).content,rect(0,0,1,1));
});
