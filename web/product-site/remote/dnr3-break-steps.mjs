// SPDX-License-Identifier: GPL-3.0-only
import {CAP, KEEP, STATUS} from './dnr3.mjs';
const PART=4, STEPS=16;
const valid=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;
export function createBreakSteps(currentClient, changed) {
  let timer=null, running=false, working=false, generation=0, owner=null, snapshot=null;
  const connected=c=>c?.has(CAP.STEP)&&c.epoch;
  const mode=()=>connected(currentClient())?'firmware':'draft';
  const emit=()=>changed();
  function stop(){running=false;generation++;owner=null;snapshot=null;working=false;clearInterval(timer);timer=null;}
  const check=(c,g)=>running&&generation===g&&c===owner&&c===currentClient()&&connected(c);
  async function identity(c){
    const s=await c.state(), pat=s.ppat?.[PART], crc=s.pattern_crc?.[pat];
    if(!valid(pat,31)||!valid(crc,KEEP))throw Error('Invalid BREAK pattern readback');
    return {pat,crc,playing:!!s.playing};
  }
  function record(reply,pat,step){
    const r=reply.record;
    if(reply.part!==PART||reply.pat!==pat||reply.step!==step||
       !r||!valid(r.on,1)||!valid(r.slice,32))throw Error('Invalid BREAK step readback');
    return {on:r.on,slice:r.slice};
  }
  async function read(c,g){
    const a=await identity(c);
    if(!check(c,g))return;
    if(snapshot?.pat===a.pat&&snapshot.crc===a.crc&&snapshot.rows){
      snapshot={...snapshot,playing:a.playing,error:null};return;
    }
    snapshot={...a,rows:null};emit();
    const rows=[];
    for(let step=0;step<STEPS;step++){
      rows.push(record(await c.stepGet(PART,a.pat,step),a.pat,step));
      if(!check(c,g))return;
    }
    const b=await identity(c);
    if(!check(c,g))return;
    snapshot=b.pat===a.pat&&b.crc===a.crc?{...b,rows}:{...b,rows:null};
  }
  async function refresh(){
    const c=currentClient();
    if(!running)return;
    if(c!==owner){generation++;owner=c;snapshot=null;working=false;emit();}
    if(working||!connected(c))return;
    const g=generation;working=true;
    try{await read(c,g);}catch{if(check(c,g))snapshot={rows:null,error:'Could not confirm firmware BREAK steps.'};}
    finally{if(check(c,g)){working=false;emit();}}
  }
  function start(){if(running)return;running=true;void refresh();timer=setInterval(refresh,450);}
  async function edit(step, transform){
    const c=currentClient(), source=snapshot, g=generation;
    if(!valid(step,15)||working||!check(c,g)||!source?.rows||source.playing)return;
    if(source.crc===KEEP){snapshot={...source,error:'Firmware pattern cannot provide a guarded edit; change it on the device first.'};emit();return;}
    working=true;emit();
    try{
      const a=await identity(c);
      if(!check(c,g))return;
      if(a.playing||a.pat!==source.pat||a.crc!==source.crc)throw Error('BREAK pattern changed. No edit sent.');
      const before=source.rows[step], next=transform({...before});
      if(!valid(next?.on,1)||!valid(next?.slice,32))return;
      if(next.on===before.on&&next.slice===before.slice)return;
      const reply=await c.stepSet(PART,a.pat,step,next,a.crc);
      if(!check(c,g))return;
      if(reply.status!==STATUS.OK||!valid(reply.fields?.pattern_crc,KEEP))throw Error('Firmware did not confirm the BREAK edit.');
      const echo=record(reply.fields,a.pat,step);
      if(echo.on!==next.on||echo.slice!==next.slice)throw Error('Firmware returned a different BREAK step.');
      snapshot=null;await read(c,g);
    } catch(error){
      if(check(c,g))snapshot={rows:null,error:error?.message||'BREAK edit not confirmed.'};
    } finally {if(check(c,g)){working=false;emit();}}
  }
  return {mode,start,stop,refresh,edit, state:()=>({snapshot,working})};
}
