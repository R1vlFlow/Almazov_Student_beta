export interface ViewportRegion {x:number;y:number;width:number;height:number;}
export interface ViewportLayout {mode:'single'|'horizontal'|'vertical';content:ViewportRegion;navigation:ViewportRegion|null;}
/** Ignore malformed/overlapping browser segments; never guess a hinge from a device name. */
export function viewportLayout(width:number,height:number,segments:readonly ViewportRegion[]=[]):ViewportLayout {
 const full={x:0,y:0,width:Math.max(1,Number.isFinite(width)?width:1),height:Math.max(1,Number.isFinite(height)?height:1)};
 const single:ViewportLayout={mode:'single',content:full,navigation:null};
 if(segments.length!==2||segments.some(r=>!r||![r.x,r.y,r.width,r.height].every(Number.isFinite)||r.x<0||r.y<0||r.width<=0||r.height<=0))return single;
 const [a,b]=[...segments].sort((x,y)=>x.x-y.x||x.y-y.y) as [ViewportRegion,ViewportRegion];
 const horizontal=a.x+a.width<=b.x+1&&Math.abs(a.y-b.y)<2;
 const vertical=!horizontal&&(a.y+a.height<=b.y+1||b.y+b.height<=a.y+1)&&Math.abs(a.x-b.x)<2;
 if(!horizontal&&!vertical)return single;
 const clipped=segments.map(r=>({x:r.x,y:r.y,width:Math.min(r.x+r.width,full.width)-r.x,height:Math.min(r.y+r.height,full.height)-r.y})).filter(r=>r.width>0&&r.height>0);
 if(!clipped.length)return single;
 // Prefer the right pane on a book-style display, and the top pane in tabletop mode.
 clipped.sort((x,y)=>{
  const equivalent=Math.abs(x.width-y.width)<=2&&Math.abs(x.height-y.height)<=2;
  return (equivalent?0:y.width*y.height-x.width*x.height)||(horizontal?y.x-x.x:x.y-y.y);
 });
 const content=clipped[0]!,other=clipped[1];
 return {mode:horizontal?'horizontal':'vertical',content,navigation:other&&other.width>=240&&other.height>=250?other:null};
}
