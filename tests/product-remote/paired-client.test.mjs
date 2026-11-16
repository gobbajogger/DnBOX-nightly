import test from'node:test';import assert from'node:assert/strict';import{RemoteClient,MidiBroker}from'../../web/product-site/remote/device/vendor/client.mjs';import{OP,STATUS,KIND,encodeReply}from'../../web/product-site/remote/device/vendor/codec.mjs';
const high=[0xffffffff,0x80000000,0x12345678],pin={admitted:true,crc:123,count:3,controls:[{id:1,kind:1,min:0,max:127},{id:2,kind:1,min:0,max:127},{id:5000,kind:3,min:1,max:127,readMin:0,readMax:1}]};
function model(){let revision=1,time=0,unsupported=new Set([2]),queued=0,hold=0;const calls=[];
 const exchange=async c=>{calls.push(structuredClone(c));assert.equal(c.version,2);assert.deepEqual(c.unitHigh,c.op===0?[0,0,0]:high);
 let status=0,kind=0,value=0,control=c.control;if(c.op===0){value=123;control=3;}else if(c.op===2){if(unsupported.has(c.control))status=6;else{kind=c.control===5000?3:1;value=c.control===5000?hold:40;}}
 else if(c.op===3){if(c.revision!==revision)status=5;else{revision++;kind=1;value=c.value;}}
 else if(c.op===4){if(c.revision!==revision)status=5;else{hold=1;kind=3;}}
 else if(c.op===5||c.op===7){if(queued-->0)status=1;else hold=0;}
 return{op:c.op,status,kind,unit:42,unitHigh:[...high],client:c.client,epoch:c.op===1?1:c.epoch,request:c.request,revision,control,value};};
 const client=new RemoteClient({transport:{exchange},pin,client:9,now:()=>time,wait:async n=>{time+=n},releaseTimeoutMs:100});
 return{client,calls,setRevision:v=>revision=v,setTime:v=>time=v,setQueued:v=>queued=v,get hold(){return hold},setUnsupported:x=>unsupported=x};
}
async function ready(m){await m.client.identify();await m.client.open();return m.client.snapshot([1,2,5000]);}
test('DNR2 full incarnation and inactive-bank UNSUPPORTED survive one coherent snapshot',async()=>{const m=model(),s=await ready(m);assert.equal(s.values[0].value,40);assert.deepEqual(s.values[1],{id:2,kind:1,available:false});assert.equal(s.values[2].value,0);assert.equal(s.revision,1);assert.equal(m.client.needsRefresh,false);await m.client.close();});
test('heartbeat and conflict do not acknowledge unseen revision for subsequent CAS',async()=>{const m=model();await ready(m);m.setRevision(2);await m.client.keepalive();assert.equal(m.client.revision,1);assert.equal(m.client.needsRefresh,true);const before=m.calls.length;await assert.rejects(m.client.set(1,50));assert.equal(m.calls.length,before);await m.client.snapshot([1,2,5000]);await m.client.set(1,50);assert.equal(m.client.revision,3);m.setRevision(4);await assert.rejects(m.client.set(1,60));assert.equal(m.client.revision,3);await assert.rejects(m.client.set(1,60));await m.client.close();});
test('queued UP/CLOSE retain exact command/request until OK and never release ownership early',async()=>{const m=model();await ready(m);await m.client.down('a',5000,100);m.setQueued(2);await m.client.up('a');const ups=m.calls.filter(x=>x.op===5);assert.equal(ups.length,3);assert.deepEqual(ups[0],ups[1]);assert.deepEqual(ups[1],ups[2]);assert.equal(m.hold,0);m.setQueued(2);const r=await m.client.close();assert.equal(r.released,true);const closes=m.calls.filter(x=>x.op===7);assert.equal(closes.length,3);assert.deepEqual(closes[0],closes[2]);});
test('bounded queued cleanup remains unconfirmed instead of falsely reporting released',async()=>{const m=model();await ready(m);await m.client.down('a',5000,100);m.setQueued(1000);const r=await m.client.close();assert.equal(r.released,false);assert.equal(m.client.timer,null);assert.equal(m.hold,1);});
test('owning snapshots renew lease inline but readers do not',async()=>{const m=model();await ready(m);m.calls.length=0;const original=m.client.transport.exchange;m.client.transport.exchange=async c=>{const r=await original(c);if(c.op===2)m.setTime((m.calls.filter(x=>x.op===2).length)*600);return r;};await m.client.snapshot([1,2,5000]);assert.ok(m.calls.some(x=>x.op===6));await m.client.close();const reader=model();await reader.client.identify();reader.setTime(1000);await reader.client.snapshot([1,2,5000]);assert.equal(reader.calls.filter(x=>x.op===6).length,0);});
test('reply with matching low unit but different incarnation word is not correlated',async()=>{const m=model(),real=m.client.transport.exchange;await m.client.identify();m.client.transport.exchange=async c=>({...await real(c),unitHigh:[...high.slice(0,2),high[2]^1]});await assert.rejects(m.client.open(),/correlat/);assert.equal((await m.client.close()).released,false);});
test('aggregate owner CLOSE bounds cleanup once instead of multiplying per-held-token timeouts',async()=>{const m=model();await ready(m);await m.client.down('a',5000,99);await m.client.down('b',5000,100);m.calls.length=0;m.setQueued(1000);const start=m.client.now(),r=await m.client.close();assert.equal(r.released,false);assert.equal(m.calls[0].op,7);assert.equal(m.calls.filter(x=>x.op===5).length,0);assert.ok(m.client.now()-start<=100);});
test('MIDI broker rejects elapsed deadline even when timeout task has not run',async()=>{
 const input={addEventListener(){},removeEventListener(){}},broker=new MidiBroker({input,output:{send(){}},timeoutMs:5,attempts:1});
 const command={version:2,op:OP.HELLO,unit:0,unitHigh:[0,0,0],client:9,epoch:0,request:1,revision:0,control:0,token:0,value:0};
 try{const pending=broker.exchange(command);Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,25);broker.receive(encodeReply({op:OP.HELLO,status:0,kind:0,unit:42,unitHigh:high,client:9,epoch:0,request:1,revision:1,control:3,value:123}));await assert.rejects(pending,/timed out/);}finally{broker.dispose();}
});
function brokerFixture({attempts=1,timeoutMs=100}={}){
 let time=0,serial=0;const timers=new Map(),sent=[];
 const broker=new MidiBroker({input:{addEventListener(){},removeEventListener(){}},output:{send:b=>sent.push([...b])},timeoutMs,attempts,now:()=>{if(time==='throw')throw Error('clock unavailable');return time;},setTimer:(fn,ms)=>{timers.set(++serial,{fn,ms});return serial;},clearTimer:id=>timers.delete(id)});
 const command=request=>({version:2,op:OP.HELLO,unit:0,unitHigh:[0,0,0],client:9,epoch:0,request,revision:0,control:0,token:0,value:0});
 const reply=request=>encodeReply({op:OP.HELLO,status:0,kind:0,unit:42,unitHigh:high,client:9,epoch:0,request,revision:1,control:3,value:123});
 return{broker,timers,sent,command,reply,setTime:v=>time=v};
}
test('MIDI broker receive enforces exact deadline, rollback and invalid clocks without timer delivery',async()=>{
 for(const when of[99,100,101,-1,NaN,'throw']){
  const f=brokerFixture(),p=f.broker.exchange(f.command(1));f.setTime(when);f.broker.receive(f.reply(1));
  if(when===99)assert.equal((await p).unit,42);else await assert.rejects(p,/clock|timed out/);
  assert.equal(f.broker.pending.size,0);assert.equal(f.timers.size,0);f.broker.dispose();
 }
});
test('MIDI broker retry keeps identical bytes inside absolute total budget and cannot send after deadline',async()=>{
 const f=brokerFixture({attempts:2,timeoutMs:50}),p=f.broker.exchange(f.command(1));
 const first=[...f.timers.values()][0].fn;f.setTime(50);first();assert.equal(f.sent.length,2);assert.deepEqual(f.sent[0],f.sent[1]);f.setTime(100);[...f.timers.values()].at(-1).fn();await assert.rejects(p,/timed out/);assert.equal(f.sent.length,2);f.broker.dispose();
 const late=brokerFixture({attempts:2,timeoutMs:50}),pending=late.broker.exchange(late.command(1));late.setTime(101);[...late.timers.values()][0].fn();await assert.rejects(pending,/timed out/);assert.equal(late.sent.length,1);late.broker.dispose();
});
test('MIDI broker captures request ownership and stale retry cannot disturb a later request',async()=>{
 const f=brokerFixture(),command=f.command(1),p=f.broker.exchange(command),old=[...f.timers.values()][0].fn;command.request=99;command.unitHigh[0]=99;f.broker.receive(f.reply(1));await p;assert.equal(f.broker.pending.size,0);
 const next=f.broker.exchange(f.command(2));old();assert.equal(f.sent.length,2);assert.equal(f.broker.pending.size,1);f.broker.receive(f.reply(2));await next;assert.equal(f.broker.pending.size,0);f.broker.dispose();
});
