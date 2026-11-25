// SPDX-License-Identifier: GPL-3.0-only
import {CAP} from './dnr3.mjs';
import {firmwareParam,firmwareValue} from './firmware-labels.mjs';

const UNSET=255;
const voiceFor=part=>part==='chicago'?0:part==='miami'?1:-1;
const raw=value=>Number.isInteger(value)&&value>=0&&value<=127;
const point=value=>value===UNSET||raw(value);
export function renderLiveMotion(part,caps) {
  const title='<h2>Motion · MIAMI Carrier waveform · Firmware</h2>';
  if (!(caps&CAP.MOTION_MIAMI_CARRIER))
    return title+'<p>Motion is not available on this firmware. Disconnect to edit the Draft.</p>';
  if (voiceFor(part)<0)
    return title+'<p>Select Bass A or Bass B with a MIAMI preset to edit this lane.</p>';
  const ref='1:2:'+voiceFor(part)+':0';
  const descriptor=firmwareParam(ref,'MIAMI');
  if(!descriptor?.values)return title+'<p>Verified firmware value names are unavailable.</p>';
  // The native parameter has 128 encoded values but only three audible choices.
  const labels=[...new Set(descriptor.values)];
  const choices=labels.map(label=>{const indices=descriptor.values.flatMap((v,i)=>v===label?[i]:[]);
      const canonical=indices[Math.floor(indices.length/2)];
      return '<option value="'+canonical+'">'+label+'</option>';
  }).join('');
  return title+'<section id="firmware-motion" aria-label="MIAMI Carrier waveform">'+
    '<p id="motion-live-status" role="status">Reading firmware…</p>'+
    '<div id="motion-grid-live" class="motion-live-grid" aria-label="Firmware motion steps">'+
    Array.from({length:16},(_,i)=>`<button type="button" data-live-motion-step="${i}" disabled>${i+1} · —</button>`).join('')+
    '</div><form id="motion-live-edit"><label>Carrier waveform <select name="value" required disabled><option value="">Choose waveform</option>'+choices+'</select></label>'+
    '<button type="submit" disabled>Set point</button><button type="button" id="motion-live-clear" disabled>Clear point</button></form></section>';
}

export function bindLiveMotion(root,link,part) {
  const voice=voiceFor(part);
  const buttons=[...root.querySelectorAll('[data-live-motion-step]')];
  const form=root.querySelector('form'), input=form.elements.namedItem('value');
  const ref='1:2:'+voice+':0';
  const valueName=v=>firmwareValue(ref,v,'MIAMI');
  const submit=form.querySelector('[type=submit]'),clear=root.querySelector('#motion-live-clear');
  const status=root.querySelector('[role=status]');
  let lane=null,selected=0,working=false,timer=null,editing=null;
  const alive=()=>root.isConnected&&link.connected();
  function paint(message) {
    if (!alive()) return;
    if(message)status.textContent=message;
    else if(lane)status.textContent='Pattern '+(lane.pat+1)+' · Point '+(selected+1);
    const value=lane?.points[selected];
    buttons.forEach((button,i)=>{
      const p=lane?.points[i];
      button.disabled=!lane||working;
      button.textContent=(i+1)+' · '+(raw(p)?valueName(p):'—');
      button.setAttribute('aria-pressed',String(selected===i));
    });
    input.disabled=submit.disabled=!lane||working;
    clear.disabled=!lane||working||value===UNSET;
    if(!editing||!lane)input.value=raw(value)?[...input.options].find(o=>o.textContent===valueName(value))?.value??'':'';
  }
  function pause(){clearTimeout(timer);}
  function later(){if(alive()){pause();timer=setTimeout(()=>void refresh(),450);}}
  async function fetchLane(){
    const result=await link.readMotion(voice);
    if(!Array.isArray(result.points)||result.points.length!==16||!result.points.every(point))
      throw Error('Invalid firmware Motion reply');
    if(editing&&(editing.pat!==result.pat||editing.value!==result.points[selected]))editing=null;
    return result;
  }
  async function refresh(){
    if(!alive()||working)return;
    working=true;
    let message;
    try{lane=await fetchLane();}
    catch{lane=null;editing=null;message='Motion unavailable. Stop playback, turn Record off, and select an active MIAMI preset.';}
    finally{working=false;paint(message);later();}
  }
  async function apply(value){
    if(!lane||working||!point(value)||!alive())return;
    const step=selected,{pat,points}=lane,expect=points[step];
    if(value===expect)return;
    pause();working=true;editing=null;paint('Confirming point…');
    let message;
    try{
      await link.writeMotion(voice,pat,step,expect,value);
      const readback=await fetchLane();
      if(readback.pat!==pat||readback.points[step]!==value)throw Error('Motion readback changed');
      lane=readback;
    } catch {
      lane=null;
      message='Point not confirmed. The device may have changed; reloading its lane.';
    } finally{
      working=false;paint(message);later();
    }
  }
  for(const [i,button] of buttons.entries())button.onclick=()=>{selected=i;editing=null;paint();};
  input.oninput=()=>{if(lane)editing??={pat:lane.pat,value:lane.points[selected]};};
  form.onsubmit=event=>{event.preventDefault();if(input.value!==''&&raw(Number(input.value))){const next=Number(input.value),old=lane?.points[selected];if(!raw(old)||valueName(old)!==valueName(next))void apply(next);}};
  clear.onclick=()=>void apply(UNSET);
  void refresh();
}
