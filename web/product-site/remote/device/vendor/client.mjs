// SPDX-License-Identifier: GPL-3.0-only
import {OP,STATUS,KIND,encodeCommand,decodeReply,floatToBits,bitsToFloat} from './codec.mjs';
const MAX=0x0fffffff;
const validHigh=a=>Array.isArray(a)&&a.length===3&&a.every(x=>Number.isInteger(x)&&x>=0&&x<=0xffffffff);
const sameHigh=(a,b)=>validHigh(a)&&validHigh(b)&&a.every((x,i)=>x===b[i]);
export class MidiBroker{
 constructor({input,output,timeoutMs=250,attempts=2,now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout}){
  if(!input?.addEventListener||!output?.send||!Number.isInteger(attempts)||attempts<1||attempts>2||!Number.isFinite(timeoutMs)||timeoutMs<=0||![now,setTimer,clearTimer].every(f=>typeof f==='function'))throw Error('Invalid remote transport');
  Object.assign(this,{input,output,timeoutMs,attempts,now,setTimer,clearTimer});this.pending=new Map;this.closed=false;this.listener=e=>this.receive(e.data);input.addEventListener('midimessage',this.listener);
 }
 clock(){try{return this.now()}catch{return NaN}}
 receive(bytes){
  let r;try{r=decodeReply(bytes)}catch{return}if(r.status>STATUS.EXHAUSTED||r.kind>KIND.HELD)return;
  const p=this.pending.get(r.request);if(!p)return;const c=p.command;
  if(r.op!==c.op||r.client!==c.client||r.request!==c.request||!r.unit||(c.op!==OP.HELLO&&(r.unit!==c.unit||!sameHigh(r.unitHigh,c.unitHigh)))||(c.op!==OP.OPEN&&r.epoch!==c.epoch)||(c.op!==OP.HELLO&&r.control!==c.control))return;
  const now=this.clock();if(!Number.isFinite(now)||now<p.started)return p.finish(Error('Transport clock changed'));
  if(now>=p.deadline)return p.finish(Error('Firmware reply timed out'));
  p.finish(null,r);
 }
 exchange(command){
  if(this.closed)return Promise.reject(Error('Remote transport closed'));
  let packet,copy,started,deadline;
  try{packet=encodeCommand(command);copy={...command,unitHigh:[...command.unitHigh]};started=this.clock();deadline=started+this.timeoutMs*this.attempts;if(!Number.isFinite(started)||!Number.isFinite(deadline))throw Error('Invalid transport clock');}catch(e){return Promise.reject(e)}
  const request=copy.request;if(this.pending.has(request))return Promise.reject(Error('Duplicate outstanding request'));
  return new Promise((resolve,reject)=>{
   let timer=null,count=0,done=false;
   const finish=(error,result)=>{if(done)return;done=true;this.clearTimer(timer);this.pending.delete(request);error?reject(error):resolve(result)};
   this.pending.set(request,{command:copy,started,deadline,finish});
   const send=()=>{if(done)return;if(this.closed)return finish(Error('Remote transport closed'));const now=this.clock();if(!Number.isFinite(now)||now<started)return finish(Error('Transport clock changed'));if(now>=deadline||count++>=this.attempts)return finish(Error('Firmware reply timed out'));timer=this.setTimer(send,Math.min(this.timeoutMs,deadline-now));try{this.output.send(packet)}catch{finish(Error('MIDI send failed'))}};
   send();
  });
 }
 dispose(){if(this.closed)return;this.closed=true;this.input.removeEventListener('midimessage',this.listener);for(const p of [...this.pending.values()])p.finish(Error('Remote transport closed'));}
}
export class RemoteClient{
 constructor({transport,pin,client,onState=()=>{},now=()=>performance.now(),wait=ms=>new Promise(r=>setTimeout(r,ms)),releaseTimeoutMs=1500}){
  if(!Number.isInteger(client)||client<1||client>MAX||!pin||!Array.isArray(pin.controls)||pin.count!==pin.controls.length||!Number.isInteger(pin.crc)||pin.crc<1||pin.crc>0xffffffff||typeof now!=='function'||typeof wait!=='function'||!Number.isFinite(releaseTimeoutMs)||releaseTimeoutMs<1||releaseTimeoutMs>5000)throw Error('Invalid pinned source catalog or clock');
  this.catalog=new Map;for(const d of pin.controls){if(!Number.isInteger(d.id)||d.id<0||d.id>16383||this.catalog.has(d.id)||![1,2,3].includes(d.kind)||!Number.isFinite(d.min)||!Number.isFinite(d.max)||d.min>d.max)throw Error('Invalid control descriptor');this.catalog.set(d.id,Object.freeze({...d}));}
  Object.assign(this,{transport,client,onState,now,wait,releaseTimeoutMs});this.pin=Object.freeze({...pin,controls:undefined});this.request=0;this.token=0;this.unit=0;this.unitHigh=[0,0,0];this.epoch=0;this.revision=0;this.observedRevision=0;this.needsRefresh=true;this.lastHeartbeat=0;this.identified=false;this.closing=false;this.closed=false;this.held=new Map;this.tail=Promise.resolve();this.closePromise=null;this.timer=null;this.openAttempted=false;this.leaseMayExist=false;
 }
 enqueue(fn){const p=this.tail.then(fn);this.tail=p.catch(()=>{});return p;}
 changed(){this.needsRefresh=true;this.onState({phase:'refresh-required'});}
 async send(op,{control=0,token=0,value=0,allowUnsupported=false}={}){
  if(this.request>=MAX)throw Error('Remote request sequence exhausted');
  const c={version:2,op,unit:op===OP.HELLO?0:this.unit,unitHigh:op===OP.HELLO?[0,0,0]:[...this.unitHigh],client:this.client,epoch:op===OP.HELLO||op===OP.OPEN?0:this.epoch,request:++this.request,revision:op===OP.HELLO||op===OP.OPEN?0:this.revision,control,token,value};
  const cleanup=op===OP.UP||op===OP.CLOSE,deadline=this.now()+this.releaseTimeoutMs;let polls=0;
  for(;;){const r=await this.transport.exchange(c);
   if(r.op!==op||r.client!==this.client||r.request!==c.request||!Number.isInteger(r.status)||r.status<0||r.status>8||!Number.isInteger(r.kind)||r.kind<0||r.kind>3||!Number.isInteger(r.revision)||r.revision<0||r.revision>MAX||!r.unit||!validHigh(r.unitHigh)||(op!==OP.HELLO&&(r.unit!==this.unit||!sameHigh(r.unitHigh,this.unitHigh)))||(op!==OP.OPEN&&r.epoch!==c.epoch)||(op!==OP.HELLO&&r.control!==control))throw Error('Uncorrelated firmware response');
   this.observedRevision=r.revision;
   if(op===OP.OPEN&&r.status!==STATUS.OK&&r.status!==STATUS.QUEUED)this.leaseMayExist=false;
   if(op===OP.CLOSE&&r.status===STATUS.OK)this.leaseMayExist=false;
   if(r.status===STATUS.CONFLICT){this.changed();throw Error('The instrument changed. Refresh before editing.');}
   if(r.status===STATUS.STALE||r.status===STATUS.EXHAUSTED){clearInterval(this.timer);this.timer=null;this.onState({phase:'connection-lost'});}
   if(r.status===STATUS.UNSUPPORTED&&op===OP.READ&&allowUnsupported)return r;
   if(r.status===STATUS.QUEUED&&cleanup){if(this.now()>=deadline||++polls>100)throw Error('Release completion was not confirmed');await this.wait(Math.min(20,Math.max(1,deadline-this.now())));continue;}
   if(r.status===STATUS.QUEUED&&op!==OP.SET)throw Error('Unexpected queued firmware response');
   if(r.status!==STATUS.OK&&r.status!==STATUS.QUEUED)throw Error(({3:'Another remote is using the instrument.',4:'Remote lease expired. Reconnect.',6:'Control not supported by this firmware.'})[r.status]||'Firmware did not accept the action.');
   if(op===OP.KEEPALIVE){this.lastHeartbeat=this.now();if(r.revision!==this.revision)this.changed();}
   if((op===OP.UP||op===OP.DOWN)&&r.revision!==this.revision)this.changed();
   return r;
  }
 }
 identify(){return this.enqueue(async()=>{if(this.closed||this.closing)throw Error('Remote closed');const r=await this.send(OP.HELLO);if(r.value!==this.pin.crc||r.control!==this.pin.count)throw Error('Firmware control catalog does not match this page.');this.unit=r.unit;this.unitHigh=[...r.unitHigh];this.identified=true;this.onState({phase:'identified',unit:this.unit});return r;});}
 open(){return this.enqueue(async()=>{if(!this.identified||this.closed||this.closing||this.pin.admitted!==true)throw Error('A qualified firmware binding is required.');if(this.openAttempted)throw Error('Reconnect before another lease attempt.');this.openAttempted=true;this.leaseMayExist=true;const r=await this.send(OP.OPEN);if(!r.epoch)throw Error('Missing firmware lease');this.epoch=r.epoch;this.revision=r.revision;this.needsRefresh=true;this.lastHeartbeat=this.now();this.onState({phase:'opened'});return r;});}
 writable(){if(!this.epoch||this.closed||this.closing||this.needsRefresh)throw Error('Refresh before editing the instrument.');}
 descriptor(id,held=false){const d=this.catalog.get(id);if(!d||(held?d.kind!==KIND.HELD:d.kind===KIND.HELD))throw Error('Unknown control type');return d;}
 set(id,value){return this.enqueue(async()=>{this.writable();const d=this.descriptor(id);if(!Number.isFinite(value)||value<d.min||value>d.max||(d.kind===KIND.U32&&!Number.isInteger(value)))throw Error('Value outside source control range');const previous=this.revision,r=await this.send(OP.SET,{control:id,value:d.kind===KIND.F32_BITS?floatToBits(value):value});if(r.kind!==d.kind){this.changed();throw Error('Firmware control type changed');}const actual=d.kind===KIND.F32_BITS?bitsToFloat(r.value):r.value;if(!Number.isFinite(actual)||actual<d.min||actual>d.max){this.changed();throw Error('Invalid returned source value');}this.revision=r.revision;if(r.revision!==previous+1)this.changed();return{value:actual,queued:r.status===STATUS.QUEUED,revision:r.revision};});}
 down(owner,id,value=100){return this.enqueue(async()=>{this.writable();const d=this.descriptor(id,true);if(owner===null||owner===undefined||this.held.has(owner))throw Error('Invalid held owner');if(!Number.isInteger(value)||value<d.min||value>d.max||this.token>=16383)throw Error('Held value/token out of range');const h={control:id,token:++this.token};this.held.set(owner,h);try{return await this.send(OP.DOWN,{...h,value});}catch(error){try{await this.send(OP.UP,h);this.held.delete(owner);}catch{}throw error;}});}
 up(owner){return this.enqueue(async()=>{const h=this.held.get(owner);if(!h)return;if(this.closed)throw Error('Remote closed before release');const r=await this.send(OP.UP,h);this.held.delete(owner);return r;});}
 snapshot(ids,{attempts=2}={}){return this.enqueue(async()=>{if(!this.identified||this.closed||this.closing||!Array.isArray(ids)||!ids.length||!Number.isInteger(attempts)||attempts<1||attempts>3)throw Error('Remote not ready for read');const unique=[...new Set(ids)];for(const id of unique)if(!this.catalog.has(id))throw Error('Unknown control');for(let n=0;n<attempts;n++){let revision=null,consistent=true;const values=[];
   for(const id of unique){if(this.epoch&&this.now()-this.lastHeartbeat>=500)await this.send(OP.KEEPALIVE);const d=this.catalog.get(id),r=await this.send(OP.READ,{control:id,allowUnsupported:true});if(revision!==null&&revision!==r.revision)consistent=false;revision=r.revision;
    if(r.status===STATUS.UNSUPPORTED){values.push({id,kind:d.kind,available:false});continue;}
    if(r.kind!==d.kind)throw Error('Firmware control type changed');const value=d.kind===KIND.F32_BITS?bitsToFloat(r.value):r.value;if(!Number.isFinite(value)||value<(d.readMin??(d.kind===KIND.HELD?0:d.min))||value>(d.readMax??d.max))throw Error('Invalid returned source value');values.push({id,value,kind:r.kind,available:true});
   }
   if(consistent){this.revision=revision;this.observedRevision=revision;this.needsRefresh=false;return{revision,values};}
  }this.changed();throw Error('The instrument is moving. Try refreshing again.');});}
 keepalive(){return this.enqueue(async()=>{if(!this.epoch||this.closed||this.closing)throw Error('Remote lease unavailable');return this.send(OP.KEEPALIVE);});}
 startKeepalive(intervalMs=650){if(!Number.isFinite(intervalMs)||intervalMs<100||intervalMs>1000)throw Error('Invalid keepalive interval');clearInterval(this.timer);this.timer=setInterval(()=>{if(!this.closed&&!this.closing)this.keepalive().catch(()=>{clearInterval(this.timer);this.timer=null;this.onState({phase:'connection-lost'});this.close();});},intervalMs);}
 close(){if(this.closePromise)return this.closePromise;this.closing=true;clearInterval(this.timer);this.timer=null;this.closePromise=this.enqueue(async()=>{const errors=[];if(this.epoch){try{await this.send(OP.CLOSE);this.held.clear();}catch(e){errors.push(e);}}else if(this.leaseMayExist||this.held.size)errors.push(Error('Lease cleanup could not be confirmed'));const released=!this.leaseMayExist&&this.held.size===0;this.closed=true;this.epoch=0;this.onState({phase:released?'closed':'release-unconfirmed'});return{released,errors:errors.length};});return this.closePromise;}
}
