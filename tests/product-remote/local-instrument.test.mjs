import test from 'node:test';import assert from 'node:assert/strict';
const api=await import('../../web/product-site/remote/local-instrument.mjs').catch(()=>({}));
test('local runtime starts only on request and attaches after native ready before activating',async()=>{
 assert.equal(typeof api.createLocalInstrument,'function');const calls=[];
 const session={node:{port:{}},observerPin:{},activate:()=>calls.push('activate'),close:async()=>calls.push('close')};
 const x=api.createLocalInstrument({load:async()=>{calls.push('ready');return session},attach:()=>{calls.push('attach');return{close:()=>calls.push('detach')}},status:()=>{}});
 assert.deepEqual(calls,[]);await x.start();assert.deepEqual(calls,['ready','attach','activate']);
 await x.start();assert.equal(calls.length,3);await x.stop();assert.deepEqual(calls.slice(3),['detach','close']);
});
test('stop during boot aborts candidate and cannot resurrect or attach a late result',async()=>{
 assert.equal(typeof api.createLocalInstrument,'function');let resolve,signal;const calls=[];
 const x=api.createLocalInstrument({load:o=>(signal=o.signal,new Promise(r=>resolve=r)),attach:()=>{calls.push('attach');return{close(){}}},status:()=>{}});
 const start=x.start();await x.stop();assert.equal(signal.aborted,true);
 resolve({node:{port:{}},observerPin:{},activate:()=>calls.push('activate'),close:async()=>calls.push('close')});
 await start;assert.deepEqual(calls,['close']);
});
test('runtime errors close observer immediately and never request MIDI',async()=>{
 assert.equal(typeof api.createLocalInstrument,'function');let error;const calls=[];
 const x=api.createLocalInstrument({load:async o=>(error=o.onError,{node:{port:{}},observerPin:{},activate(){},close:async()=>calls.push('close')}),attach:()=>({close:()=>calls.push('detach')}),status:()=>{}});
 await x.start();error(Error('processor failed'));await new Promise(r=>setTimeout(r,0));assert.deepEqual(calls,['detach','close']);
});
test('runtime lifecycle publishes persistent phase independently of transient status prose',async()=>{
 const phases=[];const x=api.createLocalInstrument({load:async()=>({node:{port:{}},observerPin:{},activate(){},close:async()=>{}}),attach:()=>({close(){}}),onState:p=>phases.push(p)});
 await x.start();await x.stop();assert.deepEqual(phases,['starting','running','stopped']);
});
