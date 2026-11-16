// SPDX-License-Identifier: MIT
// Adapted from pepperonas/funkybeats app.js addLongPress at809e1e78407f7bf315eee8655387eca8b7ac465b.
// Copyright (c) 2026 FunkyBeats Contributors. Full notice: FUNKYBEATS-MIT-NOTICE.md.
// Keeps the upstream600ms/10px long-press contract while adding pointer ownership,
// cancellation, multitouch exclusion, teardown and deterministic timer injection.
export function bindLongPress(element,callback,{delay=600,slop=10,accept=()=>true,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 if(!element?.addEventListener||typeof callback!=='function'||!Number.isFinite(delay)||delay<=0||!Number.isFinite(slop)||slop<0)throw Error('Invalid long-press binding');
 const pointers=new Set();let timer=null,owner=null,start=null,disposed=false;
 const cancel=()=>{if(timer!==null)clearTimer(timer);timer=null;owner=null;start=null;};
 const release=e=>{pointers.delete(e.pointerId);if(e.pointerId===owner)cancel();};
 const handlers={
  pointerdown(e){pointers.add(e.pointerId);if(pointers.size!==1){cancel();return;}if(e.button!==0||!accept(e))return;cancel();owner=e.pointerId;start=e;timer=setTimer(()=>{timer=null;const event=start;owner=null;start=null;if(!disposed&&pointers.size===1&&event&&pointers.has(event.pointerId))callback(event);},delay);},
  pointermove(e){if(e.pointerId===owner&&start&&(Math.abs(e.clientX-start.clientX)>slop||Math.abs(e.clientY-start.clientY)>slop))cancel();},
  pointerup:release,pointercancel:release,lostpointercapture:release,pointerleave:release
 };
 for(const[key,fn]of Object.entries(handlers))element.addEventListener(key,fn,true);
 return()=>{disposed=true;cancel();pointers.clear();for(const[key,fn]of Object.entries(handlers))element.removeEventListener(key,fn,true);};
}
