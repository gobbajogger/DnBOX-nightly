// SPDX-License-Identifier: GPL-3.0-only
// Called only in the serialized native render/read owner. This copies native
// snapshot fields; it does not advance audio or invent stage/elapsed values.
// The app invokes this only after its existing bounded SHA-256 validation.
// This function checks identity shape, not the authenticity of arbitrary bytes.
export function createObserverIdentity(metadata){
 const {firmware_source:firmware,wasm_sha256:kernel}=metadata??{};
 if(typeof firmware!=='string'||!/^[a-f0-9]{40}$/.test(firmware)||typeof kernel!=='string'||!/^[a-f0-9]{64}$/.test(kernel))throw Error('Invalid verified runtime identity');
 return Object.freeze({firmware,kernel,session:crypto.randomUUID()});
}
export function createEnvelopeObserver(ex,pin){
 const {firmware,kernel,session}=pin??{};
 if(typeof firmware!=='string'||!/^[a-f0-9]{40}$/.test(firmware)||typeof kernel!=='string'||!/^[a-f0-9]{64}$/.test(kernel)||typeof session!=='string'||!session||session.length>128)throw Error('Invalid observer identity');
 for(const name of ['web_envelope_read','web_envelope_data','web_time'])if(typeof ex?.[name]!=='function')throw Error('Native observer export missing');
 let sequence=0;
 return ()=>{
  if(sequence===Number.MAX_SAFE_INTEGER)throw Error('Observer sequence exhausted');
  const voices=[];
  function read(kind,slot,role,engine,roleName){
   const available=ex.web_envelope_read(kind,slot,role)===1;
   const voice={slot,engine,role:roleName,available};
   if(available){
    const ptr=ex.web_envelope_data(),buffer=ex.memory.buffer;
    if(!Number.isInteger(ptr)||ptr<0||ptr>buffer.byteLength-64)throw Error('Invalid native observer memory');
    const d=new DataView(buffer,ptr,64),f=i=>d.getFloat32(i*4,true),s=i=>d.getInt32(i*4,true),u=i=>d.getUint32(i*4,true);
    if(kind===1)voice.snapshot=role===1?{adsr:[f(0),f(1),f(2),f(3)],level:f(4),state:s(5)}:{eg:f(0),depth:f(1)};
    else if(kind===2)voice.snapshot={adsr:[f(0),f(1),f(2),f(3)],level:f(4),selected_voice:s(5),stage:u(6),gate:u(7),active:u(8),shared_amp_filter:u(9)};
    else voice.snapshot={raw_level:f(0),target_decay_ms:f(1),target_hold_ms:f(2),ramp_start:f(3),ramp_end:f(4),ramp_samples:f(5),ramp_ratio:f(6),hold_left:s(7),ramp_left:s(8),ramp_ticks:s(9),active:u(10),hold_active:u(11),ramp_valid:u(12)};
   }
   voices.push(voice);
  }
  for(let slot=0;slot<2;slot++){read(1,slot,1,'CHICAGO','amp');read(1,slot,2,'CHICAGO','filter');read(2,slot,3,'JUNO','amp-filter');}
  for(let slot=0;slot<11;slot++)read(3,slot,1,'909','amp');
  return {type:'envelopes',firmware,kernel,session,sequence:++sequence,timeMs:ex.web_time(),voices};
 };
}
