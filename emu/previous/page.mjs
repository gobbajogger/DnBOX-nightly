import {createSessionCodec} from './session-codec.mjs';
import {loadNativeSession} from './native-session.mjs';
// SPDX-License-Identifier: GPL-3.0-only
const $=id=>document.getElementById(id),canvas=$('lcd'),painter=canvas.getContext('2d'),image=painter.createImageData(240,240);
let context,node,gain,manifest,pending,currentSession,epoch=0,buttons=0,keys=0,ready=false,requestId=0;const active=new Map(),snapshots=new Map();
const names=['FX','SEL','ENV','LFO','EDIT','GLOBE','HOME','SAVE','ARP','SEQ','PLAY','REC','OCT−','OCT+'];
function send(type,data){if(ready)node.port.postMessage({type,...data});}
function setHeld(type,bit,on){if(type==='buttons'){buttons=on?buttons|1<<bit:buttons&~(1<<bit);send(type,{bits:buttons});}else{keys=on?keys|1<<bit:keys&~(1<<bit);send(type,{bits:keys});}}
function releaseAll(){for(const entry of active.values())clearTimeout(entry.timer);active.clear();buttons=keys=0;send('buttons',{bits:0});send('keys',{bits:0});document.querySelectorAll('.held').forEach(x=>{x.classList.remove('held');x.setAttribute('aria-pressed','false');});}
function bindHold(button,type,bit){
 function down(){if(!ready)return;const id=type+bit;clearTimeout(active.get(id)?.timer);active.set(id,{at:performance.now(),timer:null});setHeld(type,bit,true);button.classList.add('held');button.setAttribute('aria-pressed','true');}
 function up(immediate=false){const id=type+bit,entry=active.get(id);if(!entry)return;clearTimeout(entry.timer);const finish=()=>{if(active.get(id)!==entry)return;active.delete(id);setHeld(type,bit,false);button.classList.remove('held');button.setAttribute('aria-pressed','false');};if(immediate)finish();else entry.timer=setTimeout(finish,Math.max(0,45-(performance.now()-entry.at)));}
 button.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();button.focus();button.setPointerCapture(e.pointerId);down();});button.addEventListener('pointerup',()=>up());button.addEventListener('pointercancel',()=>up(true));button.addEventListener('lostpointercapture',()=>up());
 button.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat)down();}});button.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();up();}});
}
for(const [bit,name] of names.entries()){const b=document.createElement('button');b.textContent=name;b.dataset.button=bit;b.disabled=true;bindHold(b,'buttons',bit);$('buttons').append(b);}
for(let bit=0;bit<27;bit++){const b=document.createElement('button');b.textContent=String(bit+1);b.setAttribute('aria-label','Logical key '+(bit+1));b.disabled=true;bindHold(b,'keys',bit);$('keys').append(b);}
for(const [role,name] of ['Select','Algorithm','Preset','K1','K2','K3','K4'].entries()){const group=document.createElement('div');group.className='encoder';const label=document.createElement('span');label.textContent=name;group.append(label);for(const delta of [-1,1]){const b=document.createElement('button');b.textContent=delta<0?'−':'+';b.setAttribute('aria-label',name+(delta<0?' down':' up'));b.disabled=true;b.onclick=()=>send('turn',{role,delta});group.append(b);}$('encoders').append(group);}
function controls(){
 document.querySelectorAll('section button').forEach(b=>b.disabled=!ready||!!pending);
 $('start').disabled=ready||!!pending;$('stop').disabled=!ready&&!pending;$('export').disabled=!ready||!!pending;$('restore').disabled=!!pending;
}
function settleSnapshots(error){for(const p of snapshots.values()){clearTimeout(p.timer);p.reject(error);}snapshots.clear();}
async function closeSession(s){if(!s)return;if(s.close)return s.close();if(s.closing)return s.closing;s.closing=(async()=>{s.controller?.abort(Error('Load canceled'));s.node?.port.postMessage({type:'stop'});s.node?.disconnect();if(s.context&&s.context.state!=='closed')await s.context.close();})();return s.closing;}
async function stop(message='Audio is off. Unsaved local changes have ended.'){
 const mine=++epoch;releaseAll();settleSnapshots(Error('Session ended'));const old=currentSession,loading=pending;currentSession=null;pending=null;ready=false;node=context=gain=manifest=null;controls();
 await Promise.all([closeSession(old),closeSession(loading)]);if(mine!==epoch)return;$('status').textContent=message;$('transport').textContent='Stopped';
}
function draw(m){
 const pixels=m.framebuffer;for(let i=0;i<pixels.length;i++){const c=((pixels[i]&255)<<8)|(pixels[i]>>8);image.data[i*4]=(c>>11)*255/31;image.data[i*4+1]=((c>>5)&63)*255/63;image.data[i*4+2]=(c&31)*255/31;image.data[i*4+3]=255;}painter.putImageData(image,0,0);
 $('transport').textContent=m.playing?'Playing':'Stopped';canvas.dataset.peak=m.peak;canvas.dataset.time=m.time;
 $('buttons').querySelectorAll('button').forEach((b,i)=>b.classList.toggle('lit',Boolean(m.buttons&(1<<i))));$('keys').querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('lit',Boolean(m.keys&(1<<i)));b.classList.toggle('dim',Boolean(m.dim&(1<<i)));});
}
async function start(snapshotText){
 const restoring=snapshotText!==undefined,mine=++epoch;releaseAll();const previousPending=pending;pending=null;await closeSession(previousPending);if(mine!==epoch)return;
 const controller=new AbortController(),candidate={controller,context:null,node:null,gain:null};pending=candidate;controls();
 $('status').textContent=restoring?'Validating local project session…':'Loading current native firmware…';
 const check=()=>{if(mine!==epoch||pending!==candidate)throw Error('Load canceled');if(controller.signal.aborted)throw controller.signal.reason;};
 try{
  const session=await loadNativeSession({baseURL:new URL('./',import.meta.url).href,signal:controller.signal,snapshotText,
   confirmRestore:()=>!ready||confirm('Restore this local project session? Current edits will be replaced. Export them first to keep them.'),
   onError:error=>{if(candidate.node===node)stop('Playback stopped: '+error.message);},
   onMessage:m=>{
    if(candidate.node!==node)return;
    if(m.type==='frame')draw(m);
    else if(m.type==='snapshot'||m.type==='snapshot-error'){const p=snapshots.get(m.request);if(!p||p.node!==node)return;snapshots.delete(m.request);clearTimeout(p.timer);if(m.type==='snapshot')p.resolve(new Uint8Array(m.bytes));else p.reject(Error(m.message));}
    else if(m.type==='input-refused'){$('status').textContent='Input was not applied. Release the controls and try again.';releaseAll();}
   }});
  Object.assign(candidate,session);check();const nextManifest=session.metadata;
  // Commit only after the new native instance has admitted the actual project.
  const old=currentSession;gain?.gain.setValueAtTime(0,context.currentTime);settleSnapshots(Error('Session replaced'));
  currentSession=candidate;context=candidate.context;node=candidate.node;gain=candidate.gain;manifest=nextManifest;pending=null;ready=true;candidate.activate();controls();
  canvas.dataset.time='0';canvas.dataset.peak='0';$('status').textContent=restoring?'Local project restored. Press PLAY to resume.':'Current native host running. Local audio only.';$('source').textContent='Firmware source '+manifest.firmware_source+' · kernel '+manifest.kernel_source;
  await closeSession(old);
 }catch(error){
  await closeSession(candidate);if(mine===epoch&&pending===candidate){pending=null;controls();$('status').textContent=(ready?'Current project kept: ':'Not started: ')+error.message;}
 }
}
function takeSnapshot(){
 if(!ready||pending)return Promise.reject(Error('Start a project first.'));const id=++requestId,owner=node;
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{snapshots.delete(id);reject(Error('Project export timed out'));},3000);snapshots.set(id,{node:owner,resolve,reject,timer});owner.port.postMessage({type:'snapshot',request:id});});
}
$('start').onclick=()=>start();$('stop').onclick=()=>stop();
$('export').onclick=async()=>{
 try{const owner=node,identity=manifest;const bytes=await takeSnapshot();if(node!==owner)throw Error('Session changed before export');const text=await createSessionCodec({firmwareSource:identity.firmware_source,runtimeSha256:identity.wasm_sha256}).encode(bytes);if(node!==owner)throw Error('Session changed before export');
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='dnbox-local-project.dnbox-host-session';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('status').textContent='Local project session download requested. Keep this file to restore the project.';
 }catch(error){$('status').textContent='Not exported: '+error.message;}
};
$('restore').onchange=async()=>{
 const file=$('restore').files[0];$('restore').value='';if(!file)return;const mine=epoch;
 try{if(file.size>200000)throw Error('Session file is too large');const text=await file.text();if(mine!==epoch)return;await start(text);}catch(error){$('status').textContent='Current project kept: '+error.message;}
};
addEventListener('blur',releaseAll);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});addEventListener('pagehide',()=>stop());document.addEventListener('keydown',e=>{if(e.key==='Tab')releaseAll();});controls();
