// SPDX-License-Identifier: GPL-3.0-only
import {createKernelWasi,assertKernelImports} from './wasi.mjs';
import {createEnvelopeObserver} from './observer.mjs';
class NativeKernel extends AudioWorkletProcessor{
 constructor(){super();this.closed=false;this.ex=null;this.lastFrame=0;this.peak=0;this.port.onmessage=e=>this.message(e.data).catch(error=>this.fail(error));}
 fail(error){this.closed=true;this.ex=null;this.port.postMessage({type:'error',message:String(error.message??error)});}
 async message(m){
  if(m?.type==='stop'){this.controlPending=null;this.soundPending=null;this.closed=true;this.ex=null;return;}
  if(this.closed)return;
  if(m?.type==='load'){
   if(this.ex||this.loading)throw Error('Kernel already loaded');this.loading=true;
   if(sampleRate!==44100)throw Error('This native kernel requires 44100 Hz');
   const module=await WebAssembly.compile(m.bytes);if(this.closed)return;
   const wasi=createKernelWasi(()=>this.memory,{clockNanoseconds:()=>BigInt(Math.round(currentTime*1e9))});assertKernelImports(module,wasi);
   const instance=await WebAssembly.instantiate(module,{wasi_snapshot_preview1:wasi});if(this.closed)return;
   this.ex=instance.exports;this.memory=this.ex.memory;this.ex._initialize?.();if(this.ex.web_boot()!==0)throw Error('Native boot failed');
   if(m.snapshot!==undefined){if(!(m.snapshot instanceof ArrayBuffer)||m.snapshot.byteLength>this.ex.web_store_capacity())throw Error('Invalid local session size');new Uint8Array(this.memory.buffer,this.ex.web_store_buffer(),m.snapshot.byteLength).set(new Uint8Array(m.snapshot));if(this.ex.web_restore_store(m.snapshot.byteLength)!==0)throw Error('Native project validation refused this session');}
   if(m.observer!==undefined){this.observer=createEnvelopeObserver(this.ex,m.observer);this.controlPin={firmware:m.observer.firmware,kernel:m.observer.kernel,session:m.observer.session};}
   this.port.postMessage({type:'ready'});return;
  }
  if(m?.type==='controls'){this.controlsRequest(m);return;}
  if(m?.type==='sound-controls'){this.soundRequest(m);return;}
  if(m?.type==='snapshot'&&Number.isSafeInteger(m.request)&&m.request>0){
   try{if(!this.ex)throw Error('Kernel is not ready');const n=this.ex.web_snapshot();if(n<=0||n>this.ex.web_store_capacity())throw Error('Native project save refused ('+n+')');const bytes=new Uint8Array(this.memory.buffer,this.ex.web_store_buffer(),n).slice();this.port.postMessage({type:'snapshot',request:m.request,bytes:bytes.buffer},[bytes.buffer]);}
   catch(error){this.port.postMessage({type:'snapshot-error',request:m.request,message:String(error.message??error)});}
   return;
  }
  if(m?.type==='remote-caps'){const caps=this.ex?.web_remote_caps?this.ex.web_remote_caps():0;this.port.postMessage({type:'remote-caps',midi:!!this.ex?.web_midi,realtime:!!(caps&1),dnr3:!!(caps&2)});return;}
  if(m?.type==='midi'){this.midiIn(m.bytes);return;}
  if(m?.type==='sysex'){this.sysexIn(m.bytes);return;}
  if(!this.ex)throw Error('Kernel is not ready');let result;
  if(m?.type==='buttons'&&Number.isInteger(m.bits)&&m.bits>=0&&m.bits<2**14)result=this.ex.web_buttons(m.bits>>>0);
  else if(m?.type==='keys'&&Number.isInteger(m.bits)&&m.bits>=0&&m.bits<2**27)result=this.ex.web_keys(m.bits>>>0);
  else if(m?.type==='turn'&&Number.isInteger(m.role)&&m.role>=0&&m.role<=6&&Number.isInteger(m.delta)&&m.delta>=-64&&m.delta<=64)result=this.ex.web_turn(m.role,m.delta);
  else throw Error('Unknown input');
  if(result!==0)this.port.postMessage({type:'input-refused',result});
 }
 // Plain MIDI from the page: one message, delivered as USB MIDI input. Refusals are reported, never dropped silently.
 midiIn(bytes){
  const b=Array.isArray(bytes)||ArrayBuffer.isView(bytes)?Array.from(bytes):[];
  const ok=this.ex?.web_midi&&b.length>=1&&b.length<=3&&b.every(v=>Number.isInteger(v)&&v>=0&&v<=255)&&b[0]>=0x80&&b.slice(1).every(v=>v<0x80);
  const rc=ok?this.ex.web_midi(b[0],b[1]??0,b[2]??0):-1;
  if(rc!==0)this.port.postMessage({type:'midi-refused',bytes:b,result:rc});
 }
 // DNR3 SysEx: one complete F0..F7 frame. -3 means this firmware build has no DNR3 handler.
 sysexIn(bytes){
  const b=ArrayBuffer.isView(bytes)||Array.isArray(bytes)?Uint8Array.from(bytes):null;
  if(!this.ex?.web_sysex_in||!b||b.length<2||b.length>256){this.port.postMessage({type:'sysex-refused',result:-1});return;}
  new Uint8Array(this.memory.buffer,this.ex.web_sysex_buffer(),b.length).set(b);
  const rc=this.ex.web_sysex_in(b.length);
  if(rc!==0)this.port.postMessage({type:'sysex-refused',result:rc});
  this.sysexOut();
 }
 sysexOut(){
  if(!this.ex?.web_sysex_out_take)return;
  for(let n;(n=this.ex.web_sysex_out_take())>0;){const bytes=new Uint8Array(this.memory.buffer,this.ex.web_sysex_out(),n).slice();this.port.postMessage({type:'sysex-out',bytes},[bytes.buffer]);}
 }
 controlsError(m,message){this.port.postMessage({type:'controls-error',request:m.request,...this.controlPin,message});}
 controlsRequest(m){
  const pin=this.controlPin;
  if(!pin||!Number.isSafeInteger(m.request)||m.request<1)return;
  if(m.firmware!==pin.firmware||m.kernel!==pin.kernel||m.session!==pin.session){this.controlsError(m,'Native control identity mismatch');return;}
  if(!this.ex?.web_mix_set||!this.ex?.web_mix_read){this.controlsError(m,'Native controls unavailable');return;}
  if(m.request<=(this.controlSerial??0)){this.controlsError(m,'Stale control request');return;}this.controlSerial=m.request;
  if(this.controlPending||this.soundPending){this.controlsError(m,'Native controls busy');return;}
  const request={request:m.request,op:m.op};
  if(m.op==='set'){
   const {target,voice,parameter,expected,value}=m;
   if(![target,voice,parameter,expected,value].every(Number.isSafeInteger)||target<4||target>6||voice<0||voice>4||parameter<0||parameter>31||expected<0||expected>127||value<0||value>127){this.controlsError(m,'Invalid control change');return;}
   Object.assign(request,{target,voice,parameter,expected,value});
  }else if(m.op==='undo'){
   if(typeof m.token!=='string'||!m.token.startsWith(pin.session+':')){this.controlsError(m,'Invalid undo token');return;}
   const text=m.token.slice(pin.session.length+1),token=Number(text);
   if(!/^[1-9][0-9]{0,9}$/.test(text)||!Number.isSafeInteger(token)||token>0xffffffff){this.controlsError(m,'Invalid undo token');return;}request.token=token;
  }else if(m.op!=='read'){this.controlsError(m,'Unknown control operation');return;}
  this.controlPending=request;
 }
 controlsBoundary(){
  const m=this.controlPending;if(!m||!this.ex)return;
  try{
   if(!m.started){
    const rc=m.op==='set'?this.ex.web_mix_set(m.target,m.voice,m.parameter,m.expected,m.value):m.op==='undo'?this.ex.web_mix_undo(m.token):0;
    if(rc!==0)throw Error('Native control refused ('+rc+')');m.started=true;
   }
   if(m.op!=='read'){const rc=this.ex.web_mix_poll();if(rc===0)return;if(rc!==1)throw Error('Native control adoption conflict');}
   const n=this.ex.web_mix_read();if(n<1||n>64)throw Error('Native control snapshot unavailable');
   const values=new Int32Array(this.memory.buffer,this.ex.web_mix_data(),n*7),controls=[];
   for(let i=0;i<n;i++){const [target,voice,parameter,value,min,max,kind]=values.slice(i*7,i*7+7);if(kind!==1)throw Error('Unsupported native control kind');controls.push({target,voice,parameter,value,min,max,kind:'u32'});}
   const token=m.op==='set'?this.ex.web_mix_token():0;
   this.port.postMessage({type:'controls-result',request:m.request,...this.controlPin,controls,undoToken:token?this.controlPin.session+':'+token:null});this.controlPending=null;
  }catch(error){this.controlsError(m,String(error.message??error));this.controlPending=null;}
 }
 soundError(m,message,code='unavailable',noWrite=false){this.port.postMessage({type:'sound-error',request:m.request,...this.controlPin,message,code,noWrite});}
 soundRequest(m){
  const pin=this.controlPin;if(!pin||!Number.isSafeInteger(m.request)||m.request<1)return;
  if(m.firmware!==pin.firmware||m.kernel!==pin.kernel||m.session!==pin.session){this.soundError(m,'Native sound identity mismatch');return;}
  if(!this.ex?.web_sound_read||!this.ex?.web_sound_set_voice){this.soundError(m,'Native Chicago controls unavailable');return;}
  if(m.request<=(this.controlSerial??0)){this.soundError(m,'Stale sound request');return;}this.controlSerial=m.request;
  if(this.controlPending||this.soundPending){this.soundError(m,'Native control busy','busy',true);return;}
  if(!Number.isInteger(m.voice)||m.voice<0||m.voice>1){this.soundError(m,'Invalid Chicago slot');return;}
  const prefix=pin.session+':sound:'+m.voice+':';
  const parse=value=>{if(typeof value!=='string'||!value.startsWith(prefix))return 0;const text=value.slice(prefix.length),n=Number(text);return /^[1-9][0-9]{0,9}$/.test(text)&&n<=0xffffffff?n:0;};
  const request={request:m.request,op:m.op,voice:m.voice};
  if(m.op==='set'){
   const revision=parse(m.revision),{parameter,expected,value}=m,max=parameter===17?11:127;
   if(!revision||![parameter,expected,value].every(Number.isSafeInteger)||parameter<0||parameter>19||expected<0||expected>max||value<0||value>max){this.soundError(m,'Invalid Chicago change');return;}
   Object.assign(request,{revision,parameter,expected,value});
  }else if(m.op==='undo'){request.token=parse(m.token);if(!request.token){this.soundError(m,'Invalid sound Undo token');return;}}
  else if(m.op!=='read'){this.soundError(m,'Unknown sound operation');return;}
  this.soundPending=request;
 }
 soundBoundary(){
  const m=this.soundPending;if(!m||!this.ex)return;
  try{
   if(!m.started){
    const rc=m.op==='set'?this.ex.web_sound_set_voice(m.voice,m.revision,m.parameter,m.expected,m.value):m.op==='undo'?this.ex.web_sound_undo_voice(m.voice,m.token):0;
    if(rc===-3){this.soundError(m,'Native sound is busy; release notes or pending input before retrying','busy',true);this.soundPending=null;return;}
    if(rc!==0)throw Error('Native sound refused ('+rc+')');m.started=true;
   }
   if(m.op!=='read'){const rc=this.ex.web_sound_poll();if(rc===0)return;if(rc!==1)throw Error('Native sound adoption conflict');}
   const n=this.ex.web_sound_read(m.voice);if(n!==20)throw Error('Chicago snapshot unavailable');
   const values=new Int32Array(this.memory.buffer,this.ex.web_sound_data(),n*7),controls=[];
   for(let i=0;i<n;i++){const [target,voice,parameter,value,min,max,kind]=values.slice(i*7,i*7+7);if(kind!==1)throw Error('Unsupported sound control');const text=new Uint8Array(this.memory.buffer,this.ex.web_sound_text()+i*96,96);const decode=(a,b)=>{const bytes=text.slice(a,b),end=bytes.indexOf(0);if(end<0)throw Error('Unterminated native display');const chars=bytes.slice(0,end);if(chars.some(c=>c<32||c>126))throw Error('Unsupported native display encoding');return String.fromCharCode(...chars);};controls.push({target,voice,parameter,value,min,max,kind:'u32',display:decode(0,64),unit:decode(64,96)});}
   const prefix=this.controlPin.session+':sound:'+m.voice+':',token=m.op==='set'?this.ex.web_sound_token():0;
   this.port.postMessage({type:'sound-result',request:m.request,...this.controlPin,engine:'CHICAGO',voice:m.voice,sourceBank:0,choiceSerial:this.ex.web_sound_choice(),revision:prefix+this.ex.web_sound_revision(),controls,undoToken:token?prefix+token:null});this.soundPending=null;
  }catch(error){this.soundError(m,String(error.message??error));this.soundPending=null;}
 }
 process(inputs,outputs){
  if(this.closed)return false;if(!this.ex)return true;
  try{
   this.controlsBoundary();this.soundBoundary();
   const channels=outputs[0],count=channels[0].length;
   if(this.ex.web_render(count)!==0)throw Error('Native render refused');
   this.controlsBoundary();this.soundBoundary();this.sysexOut();
   const pcm=new Int32Array(this.memory.buffer,this.ex.web_output(),count*2);
   for(let i=0;i<count;i++){channels[0][i]=pcm[i*2]/8388608;if(channels[1])channels[1][i]=pcm[i*2+1]/8388608;this.peak=Math.max(this.peak,Math.abs(pcm[i*2]),Math.abs(pcm[i*2+1]));}
   if(currentTime-this.lastFrame>=1/30){this.lastFrame=currentTime;if(this.observer)this.port.postMessage(this.observer());const framebuffer=new Uint16Array(this.memory.buffer,this.ex.web_framebuffer(),240*240).slice();this.port.postMessage({type:'frame',framebuffer,playing:this.ex.web_playing(),keys:this.ex.web_keys_lit(),dim:this.ex.web_keys_dim(),buttons:this.ex.web_buttons_lit(),peak:this.peak,time:this.ex.web_time()},[framebuffer.buffer]);}
   return true;
  }catch(error){this.fail(error);return false;}
 }
}
registerProcessor('dnbox-native-kernel',NativeKernel);
