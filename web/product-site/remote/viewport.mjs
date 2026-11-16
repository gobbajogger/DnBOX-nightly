// SPDX-License-Identifier: GPL-3.0-only
// Viewport only. Never changes pattern length, notes, meter or native state.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function anchoredZoom({width,left,anchor,nextWidth,minWidth,maxWidth,viewport}){
 const next=Number.isFinite(nextWidth)?clamp(nextWidth,minWidth,maxWidth):width;
 return{width:next,left:clamp((left+anchor)/width*next-anchor,0,Math.max(0,next-viewport))};
}
export function snapZoom(scale){return[.125,.25,.5,1,2,4,8].reduce((best,v)=>Math.abs(Math.log2(v/scale))<Math.abs(Math.log2(best/scale))?v:best,1);}
export function bindViewportGestures(el,{getWidth,setWidth,basis,cancel,getRow,setRow}){
 const pointers=new Map();let navigating=false,start=null;
 const block=e=>{e.preventDefault();e.stopImmediatePropagation();};
 const pair=()=>{const[a,b]=[...pointers.values()];return{x:(a.x+b.x)/2,y:(a.y+b.y)/2,gap:Math.max(16,Math.abs(a.x-b.x)),gapY:Math.max(16,Math.abs(a.y-b.y))};};
 function zoom(next,anchor,left=el.scrollLeft,width=getWidth()){
  const v=anchoredZoom({width,left,anchor,nextWidth:next,minWidth:basis()/8,maxWidth:basis()*8,viewport:el.clientWidth});
  setWidth(v.width);el.scrollLeft=v.left;
 }
 const h={
  wheel(e){e.preventDefault();if(e.ctrlKey||e.metaKey){cancel();zoom(getWidth()*Math.exp(-e.deltaY*.002),e.clientX-el.getBoundingClientRect().left);}else if(e.shiftKey)el.scrollLeft+=e.deltaY+e.deltaX;else{el.scrollTop+=e.deltaY;el.scrollLeft+=e.deltaX;}},
  pointerdown(e){if(e.button!==0)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size>=2){if(!navigating)cancel();navigating=true;const p=pair();start={...p,width:getWidth(),left:el.scrollLeft,top:el.scrollTop,rectLeft:el.getBoundingClientRect().left,rectTop:el.getBoundingClientRect().top,row:getRow?.(),axis:getRow&&setRow&&p.gapY>p.gap*1.5?'pitch':'time'};el.setPointerCapture(e.pointerId);block(e);}},
  pointermove(e){if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!navigating)return;block(e);if(pointers.size<2||!start)return;const p=pair();if(start.axis==='pitch'){setRow(start.row*p.gapY/start.gapY);const anchor=start.y-start.rectTop;el.scrollTop=(start.top+anchor)*getRow()/start.row-anchor+start.y-p.y;el.scrollLeft=start.left+start.x-p.x;}else{const next=start.width*p.gap/start.gap;zoom(next,start.x-start.rectLeft,start.left,start.width);el.scrollLeft+=start.x-p.x;el.scrollTop=start.top+start.y-p.y;}},
  pointerup(e){if(navigating){block(e);if(pointers.size>=2){const p=pair();if(start.axis==='pitch'){const old=getRow(),anchor=p.y-el.getBoundingClientRect().top;setRow(start.row*snapZoom(old/start.row));el.scrollTop=(el.scrollTop+anchor)*getRow()/old-anchor;}else{const anchor=p.x-el.getBoundingClientRect().left;zoom(basis()*snapZoom(getWidth()/basis()),anchor);}}if(el.hasPointerCapture?.(e.pointerId))el.releasePointerCapture(e.pointerId);}pointers.delete(e.pointerId);if(!pointers.size){navigating=false;start=null;}},
  pointercancel(e){if(navigating)block(e);pointers.delete(e.pointerId);if(!pointers.size){navigating=false;start=null;}},
  lostpointercapture(e){pointers.delete(e.pointerId);if(!pointers.size){navigating=false;start=null;}}
 };
 for(const[t,f]of Object.entries(h))el.addEventListener(t,f,{capture:t!=='wheel',passive:false});
 return()=>{cancel();for(const[t,f]of Object.entries(h))el.removeEventListener(t,f,{capture:t!=='wheel'});};
}
