import assert from 'node:assert/strict';
import {OP,STATUS} from '../remote206-typed/remote/dnr3.mjs';
const targets=await (await fetch('http://127.0.0.1:9223/json/list')).json();
const version=await (await fetch('http://127.0.0.1:9223/json/version')).json();
const ws=new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl);
await new Promise((ok,no)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',no,{once:true});});
let id=0;
const calls=new Map(),events=[];
ws.onmessage=({data})=>{const x=JSON.parse(data);if(x.id){if(!calls.has(x.id))return;const [ok,no]=calls.get(x.id);calls.delete(x.id);if(x.error)no(Error(JSON.stringify(x.error)));else ok(x.result);}else events.push(x);};
const c=(method,params={})=>new Promise((ok,no)=>{const seq=++id;const timer=setTimeout(()=>{calls.delete(seq);no(Error('DevTools did not answer '+method));},5500);calls.set(seq,[x=>{clearTimeout(timer);ok(x)},x=>{clearTimeout(timer);no(x)}]);ws.send(JSON.stringify({id:seq,method,params}));});
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
const e=async expression=>{const r=await c('Runtime.evaluate',{expression,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception.description);return r.result.value;};
async function wait(expression,timeout=10000){for(let start=Date.now();;){try{const x=await e(expression);if(x)return x;}catch{} if(Date.now()-start>timeout)throw Error(expression+' timed out; '+JSON.stringify(events.filter(x=>x.method==='Runtime.exceptionThrown'||x.method==='Log.entryAdded').slice(-12)));await sleep(50);}}
const q=s=>`document.querySelector(${JSON.stringify(s)})`;
async function click(sel){const [x,y]=await wait(`(()=>{const el=${q(sel)};if(!el||el.disabled)return null;el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return r.width&&r.height?[r.left+r.width/2,r.top+r.height/2]:null;})()`);
 for(const type of ['mousePressed','mouseReleased'])await c('Input.dispatchMouseEvent',{type,x,y,button:'left',clickCount:1});
}
async function key(k,modifiers=0){const virtual={Tab:9,a:65}[k];for(const type of ['rawKeyDown','keyUp'])await c('Input.dispatchKeyEvent',{type,key:k,code:k==='a'?'KeyA':k,windowsVirtualKeyCode:virtual,modifiers});}
const journal=async()=>JSON.parse(await (await fetch('http://127.0.0.1:9224/__journal')).text());
try{
await c('Debugger.enable');await c('Runtime.enable');await c('Log.enable');await c('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
await c('Page.navigate',{url:'http://127.0.0.1:9224/remote/index.html'});
await wait("document.readyState==='complete'");await sleep(800);
console.log('PAGE',await e('JSON.stringify({href:location.href,title:document.title,body:document.body?.textContent?.slice(0,120),button:document.querySelector("#connect")?.outerHTML})')); 
console.log(events.filter(x=>x.method==='Debugger.scriptFailedToParse').map(x=>x.params));console.log('DIAG', await e('document.querySelector("#workspace-error").hidden')); if(!(await e('document.querySelector("#workspace-error").hidden'))){console.log(await c('Runtime.evaluate',{expression:"import('/remote/app.mjs').then(()=>'ok',e=>e.stack)",returnByValue:true,awaitPromise:true}));}
await click('#connect');
await wait("document.querySelector('#conn-state')?.textContent==='Connected'");
console.log('Connected DOM; wire requests', (await journal()).length);
await click('[data-view=sound]');
let records=[];
for(const [keyName,bank,slot,ids,edit] of [['chicago',2,0,[2,5,16,17,19,22,23,24,25,26,27,28,29],16],['miami',3,1,[7],7]]){
 await click('[data-engine='+keyName+']');
 const sel='[data-live-typed-synth="'+edit+'"]';
 await wait(q(sel)+' && !'+q(sel)+'.disabled');
 assert.deepEqual(await e("Array.from(document.querySelectorAll('[data-live-typed-synth]'),x=>Number(x.dataset.liveTypedSynth))"),ids);
 const old=Number(await e(q(sel)+'.value')), next=(old+1)%(Number(await e(q(sel)+'.max'))+1);
 const marks=await journal();
 console.log('Owner ready',bank,slot,'initial',old,'target',next);
 for(const [from,to] of [[old,next],[next,old]]){
  await click(sel);await key('a',2);await c('Input.insertText',{text:String(to)});await key('Tab');
  await wait(q(sel)+' && !'+q(sel)+'.disabled && '+q(sel)+'.defaultValue==='+JSON.stringify(String(to)));
  console.log("DOM confirmed",bank,from,to);
 }
 const wire=(await journal()).slice(marks.length);const writes=wire.filter(x=>x.request.op===0x12&&x.request.fields.kind===112);
 assert.deepEqual(writes.map(x=>[x.request.fields.a,x.request.fields.b,x.request.fields.c,x.request.fields.expect_bank,x.request.fields.expect,x.request.fields.value]),[[bank,slot,edit,bank,old,next],[bank,slot,edit,bank,next,old]]);
 const confirmations=[];
 for(const [i,w] of writes.entries()){
  const ack=w.replies.find(r=>r?.op===OP.PARAM_SET);
  const readback=wire.slice(wire.indexOf(w)+1,i+1<writes.length?wire.indexOf(writes[i+1]):wire.length).find(x=>x.request.op===OP.PARAM_GET&&x.replies.some(r=>Object.values(r?.fields??{}).some(rows=>Array.isArray(rows)&&rows.some(y=>y.kind===112&&y.a===bank&&y.b===slot&&y.c===edit&&y.value===w.request.fields.value))));
  assert.equal(ack?.status,bank===2?STATUS.QUEUED:STATUS.OK);assert.ok(readback,'separate firmware readback');
  confirmations.push({status:ack.status,value:ack.fields.value,readback:true});
 }
 records.push({bank,slot,ids,old,next,typedWrites:writes.length,confirmations});
}
console.log(JSON.stringify({browser:version.Browser,result:'actual DOM/loopback',records},null,2));
}finally{ws.close();}
