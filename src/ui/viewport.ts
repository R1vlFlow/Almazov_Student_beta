import {viewportLayout,type ViewportRegion} from '../core/viewportLayout.js';

interface SegmentWindow extends Window {viewport?:{segments?:readonly DOMRect[]};}
let installed=false;
export function initViewport(){
 if(installed)return;installed=true;
 const root=document.documentElement;let pending=false,last='',wasSegmented=false;
 const readSegments=():ViewportRegion[]=>{
  try{const current=(window as SegmentWindow).viewport?.segments;
   const legacy=(window.visualViewport as (VisualViewport&{segments?:readonly DOMRect[]})|null)?.segments;
   return Array.from(current??legacy??[]).map(r=>({x:r.x??r.left,y:r.y??r.top,width:r.width,height:r.height}));
  }catch{return [];}
 };
 const update=()=>{
  pending=false;const visual=window.visualViewport,unzoomed=!visual||Math.abs(visual.scale-1)<.01;
  const width=window.innerWidth,height=unzoomed&&visual?Math.min(window.innerHeight,visual.height):window.innerHeight;
  const layout=viewportLayout(width,height,readSegments()),segmented=layout.mode!=='single';
  const top=unzoomed&&visual?visual.offsetTop:0,left=unzoomed&&visual?visual.offsetLeft:0;
  const content=segmented?layout.content:{x:left,y:top,width,height};
  const active=document.activeElement,editable=active instanceof HTMLTextAreaElement||(active instanceof HTMLInputElement&&!['button','checkbox','radio','submit','file','hidden'].includes(active.type))||(active instanceof HTMLElement&&active.isContentEditable);
  const keyboard=!!(unzoomed&&visual&&editable&&window.innerHeight-visual.height>100);
  const fingerprint=JSON.stringify([layout.mode,content,layout.navigation,keyboard,window.innerHeight]);if(last===fingerprint)return;last=fingerprint;
  const main=document.getElementById('main'),scroll=segmented!==wasSegmented?(wasSegmented?main?.scrollTop??0:window.scrollY):null;
  root.style.setProperty('--layout-viewport-height',window.innerHeight+'px');root.dataset.viewportLayout=layout.mode;root.dataset.dualNavigation=String(!!layout.navigation);root.dataset.compactLayout=String(content.width<=680);root.dataset.shortViewport=String(content.height<=500);root.dataset.keyboardOpen=String(keyboard);
  for(const [key,value] of Object.entries({left:content.x,top:content.y,width:content.width,height:content.height}))root.style.setProperty('--content-'+key,value+'px');
  if(layout.navigation)for(const [key,value] of Object.entries(layout.navigation))root.style.setProperty('--navigation-'+({x:'left',y:'top'}[key as 'x'|'y']??key),value+'px');
  if(scroll!==null){if(segmented){window.scrollTo(0,0);if(main)main.scrollTop=scroll;}else{if(main)main.scrollTop=0;window.scrollTo(0,scroll);}}
  wasSegmented=segmented;
  if(keyboard&&editable&&document.querySelector('.modal-backdrop.open'))requestAnimationFrame(()=>active?.scrollIntoView({block:'nearest',behavior:'instant'}));
 };
 const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(update);}};
 update();window.addEventListener('resize',schedule,{passive:true});window.addEventListener('orientationchange',schedule,{passive:true});
 window.visualViewport?.addEventListener('resize',schedule,{passive:true});window.visualViewport?.addEventListener('scroll',schedule,{passive:true});
 document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);
 for(const query of ['(horizontal-viewport-segments: 2)','(vertical-viewport-segments: 2)']){
  const media=window.matchMedia(query);if(media.addEventListener)media.addEventListener('change',schedule);
 }
}
