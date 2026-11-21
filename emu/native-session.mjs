// SPDX-License-Identifier: GPL-3.0-only
import {createSessionCodec} from './session-codec.mjs';
import {createObserverIdentity} from './observer.mjs';
export function waitWithAbort(promise,signal){
 if(signal.aborted)return Promise.reject(signal.reason);
 return new Promise((resolve,reject)=>{const abort=()=>reject(signal.reason);signal.addEventListener('abort',abort,{once:true});Promise.resolve(promise).then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));});
}
export async function boundedBytes(response,max,exact,signal){
 if(!response.ok)throw Error('Local build input HTTP '+response.status);const declared=response.headers.get('content-length');
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>max||(exact!==undefined&&Number(declared)!==exact)))throw Error('Local build input size mismatch');
 if(!response.body?.getReader)throw Error('Bounded response stream unavailable');const reader=response.body.getReader(),chunks=[];let length=0,complete=false;
 try{while(true){const part=await waitWithAbort(reader.read(),signal);if(part.done){complete=true;break;}length+=part.value.length;if(length>max)throw Error('Local build input size mismatch');chunks.push(part.value);}}
 finally{if(!complete)reader.cancel().catch(()=>{});reader.releaseLock();}
 if(exact!==undefined&&length!==exact)throw Error('Local build input size mismatch');const bytes=new Uint8Array(length);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}return bytes;
}
// User-started, local-only candidate. Resolves muted; caller commits by activate().
// Failed replacement cannot affect another session: this owns only its objects.
export async function loadNativeSession({baseURL,signal,snapshotText,confirmRestore=()=>false,onMessage=()=>{},onError=()=>{}}={}){
 const base=new URL(baseURL,location.href);
 if(base.origin!==location.origin||!['http:','https:'].includes(base.protocol)||base.username||base.password)throw Error('Native runtime must be same-origin');
 if(!base.pathname.endsWith('/'))base.pathname+='/';base.search='';base.hash='';
 const controller=new AbortController();let context,node,gain,closed=false,closing,ready=false,receive;
 const check=()=>{if(controller.signal.aborted)throw controller.signal.reason;};
 const close=()=>{
  if(closing)return closing;closed=true;controller.abort(Error('Native session closed'));
  signal?.removeEventListener('abort',abort);
  if(node){node.port.removeEventListener('message',receive);node.port.postMessage({type:'stop'});node.disconnect();}
  closing=Promise.resolve(context&&context.state!=='closed'?context.close():undefined);return closing;
 };
 const abort=()=>{controller.abort(signal.reason??Error('Load canceled'));if(ready)void close().catch(onError);};
 if(signal?.aborted)throw signal.reason??Error('Load canceled');signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>controller.abort(Error('Loading deadline exceeded')),15000);
 try{
  context=new AudioContext({sampleRate:44100});await waitWithAbort(context.resume(),controller.signal);check();
  if(context.sampleRate!==44100)throw Error('44100 Hz audio is unavailable.');
  const options={signal:controller.signal,redirect:'error',credentials:'omit'};
  const response=await waitWithAbort(fetch(new URL('runtime.json',base),options),controller.signal);
  const metadata=JSON.parse(new TextDecoder().decode(await boundedBytes(response,4096,undefined,controller.signal)));check();
  if(typeof metadata.kernel_source!=='string'||!/^[a-f0-9]{40}$/.test(metadata.kernel_source)||!Number.isSafeInteger(metadata.wasm_bytes)||metadata.wasm_bytes<1||metadata.wasm_bytes>16*1024*1024)throw Error('Build metadata is invalid.');
  const observerPin=createObserverIdentity(metadata);
  let snapshot;
  if(snapshotText!==undefined){
   snapshot=await waitWithAbort(createSessionCodec({firmwareSource:observerPin.firmware,runtimeSha256:observerPin.kernel}).decode(snapshotText),controller.signal);check();
   if(!await waitWithAbort(Promise.resolve(confirmRestore()),controller.signal))throw Error('Restore canceled; current project kept.');
  }
  const binary=await waitWithAbort(fetch(new URL('kernel.wasm',base),options),controller.signal);
  const bytes=(await boundedBytes(binary,metadata.wasm_bytes,metadata.wasm_bytes,controller.signal)).buffer;check();
  const digest=[...new Uint8Array(await waitWithAbort(crypto.subtle.digest('SHA-256',bytes),controller.signal))].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(digest!==observerPin.kernel)throw Error('Runtime bytes do not match this build.');
  await waitWithAbort(context.audioWorklet.addModule(new URL('worklet.mjs',base).href),controller.signal);check();
  node=new AudioWorkletNode(context,'dnbox-native-kernel',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
  gain=context.createGain();gain.gain.value=0;node.connect(gain);gain.connect(context.destination);
  let resolveBoot,rejectBoot;const boot=new Promise((resolve,reject)=>{resolveBoot=resolve;rejectBoot=reject;});
  receive=({data:m})=>{
   if(closed)return;if(m?.type==='ready'){resolveBoot();return;}
   if(m?.type==='error'){const error=Error(m.message);if(!ready)rejectBoot(error);else{void close().catch(onError);onError(error);}return;}
   onMessage(m);
  };
  node.port.addEventListener('message',receive);node.port.start();
  node.onprocessorerror=()=>{if(closed)return;const error=Error('Native audio processor failed');if(!ready)rejectBoot(error);else{void close().catch(onError);onError(error);}};
  const message={type:'load',bytes,observer:observerPin},transfer=[bytes];
  if(snapshot){message.snapshot=snapshot.buffer;transfer.push(snapshot.buffer);}node.port.postMessage(message,transfer);
  await waitWithAbort(boot,controller.signal);check();ready=true;
  return {context,node,gain,metadata,observerPin,close,activate(){if(closed)throw Error('Native session closed');gain.gain.setValueAtTime(1,context.currentTime);}};
 }catch(error){await close();throw error;}finally{clearTimeout(timer);}
}

// Owns request/listener state only. The caller still owns the audio session.
const controlRequestSerials=new WeakMap();
export function createNativeControlProvider({port,pin}={}){
 const firmware=pin?.firmware,kernel=pin?.kernel,session=pin?.session;
 if(typeof firmware!=='string'||! /^[a-f0-9]{40}$/.test(firmware)||typeof kernel!=='string'||! /^[a-f0-9]{64}$/.test(kernel)||typeof session!=='string'||!session.length||session.length>128)throw Error('Invalid native control identity');
 if(!port?.addEventListener||!port?.removeEventListener||!port?.postMessage)throw Error('Invalid owning port');
 const identity={firmware,kernel,session};let closed=false,pending;
 const close=(error=Error('Control provider closed'))=>{if(closed)return;closed=true;port.removeEventListener('message',receive);if(pending){clearTimeout(pending.timer);pending.reject(error);pending=undefined;}};
 const receive=({data:m})=>{
  if(closed||!pending||!['controls-result','controls-error'].includes(m?.type)||m.request!==pending.request)return;
  try{
   if(m.firmware!==firmware||m.kernel!==kernel||m.session!==session)throw Error('Native control identity mismatch');
   if(m.type==='controls-error')throw Error(String(m.message??'Native control request refused'));
   if(!Array.isArray(m.controls)||m.controls.length<1||m.controls.length>64)throw Error('Invalid native control snapshot');
   const seen=new Set(),controls=m.controls.map(c=>{
    const {target,voice,parameter,value,min,max,kind}=c??{};
    if(![target,voice,parameter,value,min,max].every(Number.isSafeInteger)||target<4||target>6||voice<0||voice>4||parameter<0||parameter>31||min!==0||max<0||max>127||value<min||value>max||kind!=='u32')throw Error('Invalid native control snapshot');
    const key=[target,voice,parameter].join('/');if(seen.has(key))throw Error('Duplicate native control');seen.add(key);return {target,voice,parameter,value,min,max,kind};
   });
   const undoToken=m.undoToken??null;if(undoToken!==null&&(typeof undoToken!=='string'||!undoToken.length||undoToken.length>256))throw Error('Invalid native undo token');
   const done=pending;pending=undefined;clearTimeout(done.timer);done.resolve({controls,undoToken});
  }catch(error){close(error);}
 };
 port.addEventListener('message',receive);port.start?.();
 const request=(op,fields={})=>new Promise((resolve,reject)=>{
  if(closed){reject(Error('Control provider closed'));return;}if(pending){reject(Error('Native control request busy'));return;}
  const serial=controlRequestSerials.get(port)??0;
  if(serial>=Number.MAX_SAFE_INTEGER){close();reject(Error('Control request counter exhausted'));return;}
  const request=serial+1;controlRequestSerials.set(port,request);const timer=setTimeout(()=>close(Error('Native control deadline exceeded')),5000);pending={request,timer,resolve,reject};
  try{port.postMessage({type:'controls',op,request,...identity,...fields});}catch(error){close(error);}
 });
 return {read:()=>request('read'),set(change){
  const {target,voice,parameter,expected,value}=change??{};
  if(![target,voice,parameter,expected,value].every(Number.isSafeInteger)||target<4||target>6||voice<0||voice>4||parameter<0||parameter>31||expected<0||expected>127||value<0||value>127)return Promise.reject(Error('Invalid control change'));
  return request('set',{target,voice,parameter,expected,value});
 },undo({token}={}){if(typeof token!=='string'||!token.length||token.length>256)return Promise.reject(Error('Invalid undo token'));return request('undo',{token});},close};
}

// Engine-qualified Sound facade. Busy means native admission proved no writes;
// uncertain adoption closes the listener rather than pretending to roll back.
export function createNativeSoundProvider({port,pin,voice}={}){
 const firmware=pin?.firmware,kernel=pin?.kernel,session=pin?.session;
 if(typeof firmware!=='string'||! /^[a-f0-9]{40}$/.test(firmware)||typeof kernel!=='string'||! /^[a-f0-9]{64}$/.test(kernel)||typeof session!=='string'||!session.length||session.length>128||!Number.isInteger(voice)||voice<0||voice>1)throw Error('Invalid native sound identity');
 if(!port?.addEventListener||!port?.removeEventListener||!port?.postMessage)throw Error('Invalid owning port');
 const identity={firmware,kernel,session},prefix=session+':sound:'+voice+':';let closed=false,pending;
 const tokenValid=s=>typeof s==='string'&&s.startsWith(prefix)&&/^[1-9][0-9]{0,9}$/.test(s.slice(prefix.length))&&Number(s.slice(prefix.length))<=0xffffffff;
 const close=(error=Error('Sound provider closed'))=>{if(closed)return;closed=true;port.removeEventListener('message',receive);if(pending){clearTimeout(pending.timer);pending.reject(error);pending=undefined;}};
 const receive=({data:m})=>{
  if(closed||!pending||!['sound-result','sound-error'].includes(m?.type)||m.request!==pending.request)return;
  try{
   if(m.firmware!==firmware||m.kernel!==kernel||m.session!==session)throw Error('Native sound identity mismatch');
   if(m.type==='sound-error'){
    const error=Error(String(m.message??'Native sound refused'));
    if(m.code==='busy'&&m.noWrite===true){error.code='busy';error.noWrite=true;const done=pending;pending=undefined;clearTimeout(done.timer);done.reject(error);return;}
    throw error;
   }
   const {engine,voice:slot,sourceBank,choiceSerial,revision}=m;
   if(engine!=='CHICAGO'||slot!==voice||sourceBank!==0||!Number.isSafeInteger(choiceSerial)||choiceSerial<0||choiceSerial>0xffffffff||!tokenValid(revision)||!Array.isArray(m.controls)||m.controls.length!==20)throw Error('Invalid Chicago snapshot');
   const seen=new Set(),controls=m.controls.map(c=>{
    const {target,voice:slot,parameter,value,min,max,kind,display,unit}=c??{};
    if(target!==2||slot!==voice||!Number.isSafeInteger(parameter)||parameter<0||parameter>19||seen.has(parameter)||!Number.isSafeInteger(value)||min!==0||max!==(parameter===17?11:127)||value<0||value>max||kind!=='u32')throw Error('Invalid Chicago control');
    if(typeof display!=='string'||display.length>63||typeof unit!=='string'||unit.length>31||/[\u0000-\u001f]/.test(display+unit))throw Error('Invalid native display');
    seen.add(parameter);return {target,voice:slot,parameter,value,min,max,kind,display,unit};
   });
   const undoToken=m.undoToken??null;if(undoToken!==null&&!tokenValid(undoToken))throw Error('Invalid sound Undo token');
   const done=pending;pending=undefined;clearTimeout(done.timer);done.resolve({engine,voice,sourceBank,choiceSerial,revision,controls,undoToken});
  }catch(error){close(error);}
 };
 port.addEventListener('message',receive);port.start?.();
 const request=(op,fields={})=>new Promise((resolve,reject)=>{
  if(closed){reject(Error('Sound provider closed'));return;}if(pending){reject(Error('Native sound request busy'));return;}
  const serial=controlRequestSerials.get(port)??0;if(serial>=Number.MAX_SAFE_INTEGER){close();reject(Error('Request counter exhausted'));return;}
  const request=serial+1;controlRequestSerials.set(port,request);const timer=setTimeout(()=>close(Error('Native sound deadline exceeded')),5000);pending={request,timer,resolve,reject};
  try{port.postMessage({type:'sound-controls',op,request,...identity,voice,...fields});}catch(error){close(error);}
 });
 return {read:()=>request('read'),set(change){
  const {revision,target,voice:slot,parameter,expected,value}=change??{};
  if(!tokenValid(revision)||target!==2||slot!==voice||![parameter,expected,value].every(Number.isSafeInteger)||parameter<0||parameter>19||expected<0||expected>(parameter===17?11:127)||value<0||value>(parameter===17?11:127))return Promise.reject(Error('Invalid Chicago change'));
  return request('set',{revision,parameter,expected,value});
 },undo({token}={}){if(!tokenValid(token))return Promise.reject(Error('Invalid sound Undo token'));return request('undo',{token});},close};
}
