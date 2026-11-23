// SPDX-License-Identifier: GPL-3.0-only
// Live roll playhead. One pattern is one bar of 16 sixteenth steps; while the
// transport plays the playhead sweeps the bar at the pattern tempo and loops.
export const STEPS_PER_BAR=16;
export const STEPS_PER_BEAT=4;
export function stepMs(bpm){
 if(!Number.isFinite(bpm)||bpm<=0)throw Error('Positive tempo required');
 return 60000/bpm/STEPS_PER_BEAT;
}
// Where the playhead is after elapsedMs of playback.
export function playheadAt(elapsedMs,bpm){
 const steps=Math.max(0,elapsedMs)/stepMs(bpm),position=steps%STEPS_PER_BAR,step=Math.floor(position);
 return {position,step,beat:Math.floor(step/STEPS_PER_BEAT),bar:Math.floor(steps/STEPS_PER_BAR)};
}
export function tempoFrom(text,fallback=120){
 const bpm=Number(/(\d+(?:\.\d+)?)\s*BPM/i.exec(String(text||''))?.[1]);
 return Number.isFinite(bpm)&&bpm>0?bpm:fallback;
}
// paint(state) receives a playheadAt() result while playing and null when stopped.
export function createPlayhead({bpm,paint,now=()=>performance.now(),frame=f=>requestAnimationFrame(f),cancel=id=>cancelAnimationFrame(id)}){
 let started=null,id=null;
 const tick=()=>{id=null;if(started===null)return;paint(playheadAt(now()-started,bpm()));id=frame(tick);};
 return {
  get playing(){return started!==null;},
  start(){if(started!==null)return;started=now();tick();},
  stop(){if(id!==null)cancel(id);id=null;started=null;paint(null);}
 };
}
