// SPDX-License-Identifier: GPL-3.0-only
// Copied observations from the pinned native worklet, never a device protocol
// or a source of synthetic envelope timing. A dedicated trusted port owns input.
const finite=Number.isFinite, bit=n=>n===0||n===1;
const floats=(v,keys)=>keys.every(k=>finite(v?.[k]));
const adsr=v=>Array.isArray(v)&&v.length===4&&v.every(n=>finite(n)&&n>=0);
function validVoice(v){
 if(!v||typeof v.available!=='boolean'||!Number.isInteger(v.slot))return false;
 const bass=['CHICAGO','JUNO'].includes(v.engine);
 if(bass?(v.slot<0||v.slot>1):(v.engine!=='909'||v.slot<0||v.slot>10))return false;
 if(v.engine==='CHICAGO'?!['amp','filter'].includes(v.role):v.engine==='JUNO'?v.role!=='amp-filter':v.role!=='amp')return false;
 if(!v.available)return v.snapshot===undefined;
 const s=v.snapshot;
 if(v.engine==='CHICAGO')return v.role==='filter'
  ? floats(s,['eg','depth'])
  : adsr(s?.adsr)&&floats(s,['level'])&&s.level>=-1&&s.level<=1&&[0,1,3,6].includes(s.state);
 if(v.engine==='JUNO')return adsr(s?.adsr)&&floats(s,['level'])&&s.level>=0&&s.level<=1&&
  bit(s.active)&&bit(s.gate)&&s.shared_amp_filter===1&&
  (s.active?Number.isInteger(s.selected_voice)&&s.selected_voice>=0&&s.selected_voice<6&&[1,2,3,4].includes(s.stage):s.selected_voice===-1&&s.stage===0&&s.gate===0&&s.level===0);
 return [0,1].includes(v.slot)&&floats(s,['raw_level','target_decay_ms','target_hold_ms','ramp_start','ramp_end','ramp_samples','ramp_ratio'])&&
  ['hold_left','ramp_left','ramp_ticks'].every(k=>Number.isInteger(s[k]))&&
  ['active','hold_active','ramp_valid'].every(k=>bit(s[k]))&&
  s.target_decay_ms>=0&&s.target_hold_ms>=0&&(!s.ramp_valid||(s.ramp_samples>0&&s.ramp_left>0));
}
export class EnvelopeObservations {
 #pin;#sequence=0;#received=-1;#voices=new Map();#closed=false;
 constructor(pin){
  const {firmware,kernel,session}=pin??{};
  if(typeof firmware!=='string'||typeof kernel!=='string'||typeof session!=='string'||
   !/^[a-f0-9]{40}$/.test(firmware)||!/^[a-f0-9]{64}$/.test(kernel)||!session||session.length>128)
   throw Error('Pinned native observer identity required');
  this.#pin={firmware,kernel,session};
 }
 accept(packet,receivedAt){
  const reject=()=>{this.#voices.clear();return false;};
  if(this.#closed||!finite(receivedAt)||receivedAt<0||receivedAt<this.#received||packet?.type!=='envelopes'||
   Object.keys(this.#pin).some(k=>packet[k]!==this.#pin[k])||!Number.isSafeInteger(packet.sequence)||packet.sequence<=this.#sequence||
   !Number.isInteger(packet.timeMs)||packet.timeMs<0||packet.timeMs>0xffffffff||!Array.isArray(packet.voices)||packet.voices.length>32)return reject();
  const next=new Map();
  for(const v of packet.voices){
   if(!validVoice(v))return reject();
   const key=[v.engine,v.slot,v.role].join(':');if(next.has(key))return reject();
   if(v.available)next.set(key,structuredClone(v));else next.set(key,null);
  }
  this.#sequence=packet.sequence;this.#received=receivedAt;this.#voices=next;return true;
 }
 get(engine,slot,role,now){
  if(this.#closed||!finite(now)||now<this.#received||now-this.#received>1000)return null;
  return structuredClone(this.#voices.get([engine,slot,role].join(':'))??null);
 }
 close(){this.#closed=true;this.#voices.clear();}
}
