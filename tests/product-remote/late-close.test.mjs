import test from'node:test';import assert from'node:assert/strict';import{PortConnection}from'../../web/product-site/remote/device/connection.mjs';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}};const tick=()=>new Promise(r=>setImmediate(r));
test('late-open stale close must stay owned until it settles before same-port reconnect',async()=>{
 const open=deferred(),lateClose=deferred();let opens=0,closes=0,made=0;
 const input={type:'input',state:'connected',open(){return++opens===1?open.promise:Promise.resolve()},close(){closes++;return closes===2?lateClose.promise:Promise.resolve()}};
 const output={type:'output',state:'connected',open:async()=>{},close:async()=>{}};
 const link=new PortConnection({deadlineMs:200,closeMs:80,make:()=>{made++;return{broker:{dispose(){}},session:{connect:async()=>{},close:async()=>({released:true})}}}});
 const first=link.connect(input,output).catch(e=>e);await tick();const closing=link.close();await tick();open.resolve();await tick();await tick();
 // The canceled work's second close is deliberately still outstanding.
 assert.equal(closes>=2,true);const result=await Promise.race([closing,Promise.resolve('not-yet')]);
 let admitted=false;try{await link.connect(input,output);admitted=true}catch{}
 lateClose.resolve();await closing;await first;await link.close();assert.equal(admitted,false,'a new session was admitted while a stale close promise still owned the same port');assert.equal(made,0);
});
