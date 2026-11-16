// Actual audition/provider cancellation contract; no browser/audio/device claim.
import test from 'node:test';import assert from 'node:assert/strict';
import {createAudition} from '../web/product-site/components/break-audition/audition.mjs';
import {createStartingBreakPreview} from '../web/product-site/starting-break-preview.mjs';
const tick=()=>new Promise(r=>setImmediate(r));
for(const action of ['stop','destroy'])test(`${action} aborts in-flight preview transport without creating media`,async()=>{
 let received,aborted=0,media=0;
 const picker={preview:async(id,{fetchBytes})=>{await fetchBytes('https://example.invalid/a.wav');throw Error('unreachable');}};
 const audition=createAudition(picker,{resolvePrivateUrl:()=>'',fetchBytes:(url,options)=>{received=options?.signal;return new Promise((resolve,reject)=>{received?.addEventListener('abort',()=>{aborted++;reject(new DOMException('aborted','AbortError'));},{once:true});});},createAudio:()=>{media++;}});
 const pending=audition.play('a');await tick();assert.ok(received instanceof AbortSignal);audition[action]();assert.equal(await pending,false);assert.equal(aborted,1);assert.equal(media,0);assert.equal(audition.state().status,'idle');
});
test('public provider forwards explicit cancellation signal while still omitting credentials',async()=>{
 const controller=new AbortController();let options;
 const provider=createStartingBreakPreview({fetchImpl:async(url,o)=>{options=o;throw new DOMException('aborted','AbortError');}});
 await assert.rejects(provider.fetchBytes(provider.resolvePrivateUrl('personal-br1-zone1'),{signal:controller.signal}),e=>e.name==='AbortError');
 assert.equal(options.signal,controller.signal);assert.equal(options.credentials,'omit');assert.equal(options.cache,'force-cache');
});
test('replacement aborts old request without letting its completion detach the current cancellation',async()=>{
 const signals=[];
 const picker={preview:async(id,{fetchBytes})=>{await fetchBytes(id);throw Error('unreachable');}};
 const audition=createAudition(picker,{resolvePrivateUrl:()=>'',fetchBytes:(url,{signal})=>new Promise((resolve,reject)=>{signals.push(signal);signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true});})});
 const first=audition.play('a');await tick();const second=audition.play('b');await tick();assert.equal(await first,false);assert.equal(signals[0].aborted,true);assert.equal(signals[1].aborted,false);
 audition.stop();assert.equal(await second,false);assert.equal(signals[1].aborted,true);assert.equal(audition.state().status,'idle');audition.destroy();
});
