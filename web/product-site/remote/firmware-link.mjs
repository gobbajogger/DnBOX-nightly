// SPDX-License-Identifier: GPL-3.0-only
// DNR2 session for the browser Remote.
// Wire: tests/product-remote/tests/c-reference/remote_wire.c lines 6-23.
//   Frame is 51 bytes, header F0 7D 44 4E 02 (bytes 240,125,68,78,2), end F7.
// Ops, statuses and kinds: remote_core.h lines 8-10.
//   HELLO 0, OPEN 1, READ 2, SET 3, DOWN 4, UP 5, KEEPALIVE 6, CLOSE 7.
//   OK 0, QUEUED 1, BAD 2, BUSY 3, STALE 4, CONFLICT 5, UNSUPPORTED 6, FULL 7, EXHAUSTED 8.
//   U32 1, F32_BITS 2, HELD 3.
// Handling: remote_core.c dnr2_handle. HELLO returns catalog crc and count and does not
// open a lease. OPEN creates the lease. READ does not renew it. SET/DOWN/UP/KEEPALIVE/CLOSE
// require the lease. A revision mismatch returns CONFLICT and does not apply the value.
// The older 36-byte header F0 7D 44 4E 01 in remote/vendor/codec.mjs is not this core.
// Firmware repository main usb.c dispatches other SysEx and does not dispatch 7D 44 4E.
// This module therefore sends nothing until the user clicks Connect, and it sends SET
// only from Apply for a control the latest READ marked available.
import {MidiBroker,RemoteClient} from './device/vendor/client.mjs';
import {OP} from './device/vendor/codec.mjs';
import {validateBundle,friendly} from './device/session.mjs';

const SAFETY_OFF='No reviewed firmware catalog. Apply stays off.';
const SAFETY_ON='Apply sends only a control this connection confirmed. Pattern edits stay on this page.';

export function mountFirmwareLink({document:doc=globalThis.document,navigator:nav=globalThis.navigator,bundle=globalThis.__DNBOX_FIRMWARE_BUNDLE??null}={}){
 const $ =id=>doc.getElementById(id);
 const connect=$('connect'),apply=$('apply'),state=$('conn-state'),safety=$('firmware-safety'),list=$('firmware-controls');
 if(!connect||!apply||!state)return {destroy(){}};
 let admitted=null,client=null,broker=null,confirmed=new Map(),pending=null,busy=false;
 apply.disabled=true;
 if(safety)safety.textContent=bundle?SAFETY_ON:SAFETY_OFF;
 const result=$('connection-result'),message=$('connection-message');
 const say=text=>{state.textContent=text;if(message)message.textContent=text;};
 $('close-connection')?.addEventListener('click',()=>{if(result)result.hidden=true;connect.focus?.();});
 function stage(descriptor,input){
  const value=Number(input.value);
  const known=confirmed.get(descriptor.id);
  const ok=known&&known.available!==false&&Number.isFinite(value)&&value>=descriptor.min&&value<=descriptor.max&&(descriptor.kind!==1||Number.isInteger(value))&&value!==known.value;
  pending=ok?{id:descriptor.id,value}:null;
  apply.disabled=!ok;
 }
 function renderControls(){
  if(!list?.replaceChildren||!doc.createElement)return;
  list.replaceChildren();
  for(const descriptor of admitted.catalog.controls){
   const reading=confirmed.get(descriptor.id);
   if(!reading||reading.available===false){
    const row=doc.createElement('p');row.dataset.control=String(descriptor.id);row.textContent=`${descriptor.label} Not confirmed`;list.append(row);continue;
   }
   if(descriptor.kind===3){
    const row=doc.createElement('p');row.dataset.control=String(descriptor.id);row.textContent=`${descriptor.label} ${reading.value}`;list.append(row);continue;
   }
   const label=doc.createElement('label');label.textContent=descriptor.label;
   const input=doc.createElement('input');
   input.type='number';input.id=`fw-${descriptor.id}`;input.dataset.fw=String(descriptor.id);
   input.min=String(descriptor.min);input.max=String(descriptor.max);input.step=descriptor.kind===1?'1':'any';input.value=String(reading.value);
   input.addEventListener('input',()=>stage(descriptor,input));
   label.append(input);list.append(label);
  }
 }
 async function shutdown(announce){
  busy=true;apply.disabled=true;pending=null;confirmed=new Map();admitted=null;
  if(list?.replaceChildren)list.replaceChildren();
  const current=client,link=broker;client=null;broker=null;
  let released=true;
  try{if(current)released=(await current.close()).released===true;}catch{released=false;}
  link?.dispose();
  connect.textContent='Connect';
  if(announce)say(released?'Disconnected':'Release was not confirmed.');
  if(safety)safety.textContent=bundle?SAFETY_ON:SAFETY_OFF;
  busy=false;return released;
 }
 async function onConnect(){
  if(busy||client)return;busy=true;apply.disabled=true;pending=null;say('Connecting');
  try{
   let parsed=null;
   if(bundle){try{parsed=validateBundle(bundle);}catch{parsed=null;}}
   if(!parsed){say(SAFETY_OFF);if(safety)safety.textContent=SAFETY_OFF;return;}
   const request=nav?.requestMIDIAccess;
   if(typeof request!=='function')throw Error('MIDI access is unavailable in this browser.');
   const access=await request.call(nav,{sysex:true});
   const input=[...access.inputs.values()].find(port=>port.state==='connected');
   const output=[...access.outputs.values()].find(port=>port.state==='connected');
   if(!input||!output){say('No MIDI input and output pair is connected. Connect your instrument and try again.');return;}
   await input.open?.();await output.open?.();
   const timeoutMs=Number.isFinite(globalThis.__DNBOX_MIDI_TIMEOUT)?globalThis.__DNBOX_MIDI_TIMEOUT:400;
   broker=new MidiBroker({input,output,timeoutMs});
   const pin={crc:parsed.catalog.crc,count:parsed.catalog.count,admitted:true,controls:parsed.catalog.controls.map(descriptor=>({id:descriptor.id,kind:descriptor.kind,min:descriptor.min,max:descriptor.max,...(descriptor.readMin!==undefined?{readMin:descriptor.readMin}:{}),...(descriptor.readMax!==undefined?{readMax:descriptor.readMax}:{})}))};
   client=new RemoteClient({transport:broker,pin,client:91,onState:note=>{if(note.phase==='connection-lost'){say('Connection lost. Apply stays off.');apply.disabled=true;}}});
   await client.identify();
   await client.open();
   const snapshot=await client.snapshot(parsed.catalog.controls.map(descriptor=>descriptor.id));
   if(!parsed.admission.testOnly)client.startKeepalive();
   admitted=parsed;confirmed=new Map(snapshot.values.map(reading=>[reading.id,reading]));pending=null;
   renderControls();apply.disabled=true;
   const count=snapshot.values.filter(reading=>reading.available!==false).length;
   say(`Connected. ${count} controls confirmed.`);if(result)result.hidden=true;
   if(safety)safety.textContent=`${parsed.admission.testOnly?'Simulator catalog. Not a device. ':''}${SAFETY_ON}`;
   connect.textContent='Disconnect';
  }catch(error){
   say(friendly(error));apply.disabled=true;await shutdown(false);say(friendly(error));
  }finally{busy=false;}
 }
 async function onApply(){
  if(busy||!client||!pending)return;
  const job=pending;pending=null;apply.disabled=true;busy=true;
  try{
   const result=await client.set(job.id,job.value);
   const prior=confirmed.get(job.id);
   confirmed.set(job.id,{...prior,value:result.value,available:true});
   const input=doc.getElementById(`fw-${job.id}`);if(input)input.value=String(result.value);
   say(`Firmware confirmed ${result.value}.`);
  }catch(error){say(friendly(error));apply.disabled=true;}
  finally{busy=false;}
 }
 connect.addEventListener('click',event=>{event.preventDefault?.();if(result)result.hidden=false;if(busy)return;void (client?shutdown(true):onConnect());});
 apply.addEventListener('click',()=>{void onApply();});
 return {destroy(){return shutdown(false);},op:OP};
}
