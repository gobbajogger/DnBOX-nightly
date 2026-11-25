import test from 'node:test';
import assert from 'node:assert/strict';
import {Dnr3Client} from "../../web/product-site/remote/dnr3-client.mjs";
import {CAP,KEEP,NOTIFY_KIND,STATUS,OP,encodeRequest,decodeRequest,encodeReply,decodeReply,decodeFrame} from '../../web/product-site/remote/dnr3.mjs';
import {createSynthSession,synthAddress} from '../../web/product-site/remote/dnr3-typed-synth.mjs';
function device({typed=true,bank=2,slot=0,confirm=true,ownerGuard=true}={}){
 let preset=0,settled=1,valid=true,token=17;
 const writes=[],gets=[],desc=[];
 const map=new Map();
 const add=(id,flags=96,value=5,max=100)=>{
  const key=synthAddress(bank,slot,id,typed);
  map.set(JSON.stringify(key),{key,unit:flags,value,max,name:'id'+id});
 };
 const client={
  has(c){return [CAP.PARAM,CAP.WATCH,CAP.BASS_BANK_GUARD,...typed?[CAP.TYPED_SYNTH,...ownerGuard?[CAP.SYNTH_OWNER]:[]]:[]].includes(c);},
  async synthOwner(b){return {slot:b,bank,preset,settled,owner_generation:token};},
  async paramGet(a){
   gets.push(a);
   return a.map(x=>{
    let y=map.get(JSON.stringify(x));
    if(x.kind===41)return {...x,value:bank,max:3};
    if(x.kind===42)return {...x,value:preset,max:127};
    if(x.kind===43)return {...x,value:settled,max:1};
    return {...x,max:y?.max??0,value:y?.value??KEEP};
   });
  },
  async describe(key){
   desc.push(key);
   const y=map.get(JSON.stringify(key));
   if(!y)throw Object.assign(Error('UNSUPPORTED'),{status:STATUS.UNSUPPORTED});
   return {name:y.name,max:y.max,def:0,unit:y.unit};
  },
  async paramSet(key,value,expect,guard){
   const y=map.get(JSON.stringify(key));
   assert.equal(guard.bank,bank);
   if(typed)assert.equal(guard.ownerGeneration,token);
   assert.equal(expect,y.value);
   writes.push({key,value,expect,guard});
   if(confirm)y.value=value;
   return {fields:{...key,value}};
  }
 };
 return {add,client,gets,desc,writes,session:createSynthSession(client,slot,()=>valid),
   reopen(){preset++;token++;},
   replace(){token++;},
   unset(){settled=0;},
   disconnect(){valid=false;},
   set(id,field,value){map.get(JSON.stringify(synthAddress(bank,slot,id,typed)))[field]=value;}};
}
test('typed addressing 112/113, stable bank/slot, per-descriptor writable marker',async()=>{
 assert.deepEqual(synthAddress(3,1,202),{kind:113,a:3,b:1,c:74});
 assert.deepEqual(synthAddress(2,0,127),{kind:112,a:2,b:0,c:127});
 const f=device({bank:3,slot:1});
 f.add(6);f.add(128);f.add(202,32,0,0);f.add(90,64);
 const s=await f.session.read();
 assert.deepEqual(s.rows.map(r=>[r.id,r.writable]),[[6,true],[128,true],[202,false]]);
 await assert.rejects(f.session.write(202,1));
 await assert.rejects(f.session.write(90,3));
 assert.equal(f.writes.length,0);
 const edited=await f.session.write(128,21);
 assert.equal(edited.rows[1].value,21);
 assert.deepEqual(f.writes,[{key:{kind:113,a:3,b:1,c:0},value:21,expect:5,guard:{bank:3,ownerGeneration:17,retry:false}}]);
 assert.ok(!f.gets.flat().some(x=>x.kind===1));
});
test('old capability uses only guarded R_ENG, verified device-supported subset',async()=>{
 const f=device({typed:false});
 f.add(2,0);
 assert.deepEqual((await f.session.read()).rows.map(x=>x.address),[{kind:1,a:2,b:0,c:2}]);
 await f.session.write(2,9);
 assert.equal(f.writes[0].guard.bank,2);
 assert.ok(!f.gets.flat().some(x=>x.kind>=112));
});
test('readback mismatch, descriptor change, current-value change, bank/preset epoch and detach refuse',async()=>{
 const f=device({confirm:false});f.add(2);
 await f.session.read();
 await assert.rejects(f.session.write(2,8),/readback/);
 assert.equal((await f.session.read()).rows[0].value,5);
 f.set(2,'unit',32);
 await assert.rejects(f.session.write(2,8),/descriptor/);
 f.set(2,'unit',96);f.set(2,'value',11);
 await assert.rejects(f.session.write(2,8),/value changed/);
 assert.equal(f.writes.length,1);
 await f.session.read();f.reopen();
 await assert.rejects(f.session.write(2,8),/owner changed/);
 f.unset();assert.equal((await f.session.read()).rows.length,0);
 f.disconnect();await assert.rejects(f.session.read(),/connection changed/);
});
test('unmarked descriptor, failed discovery, active Chicago and incompatible firmware are not typed editors',async()=>{
 const f=device();f.add(13,0);
 assert.deepEqual((await f.session.read()).rows,[]);
 const chicago=device({bank:0});
 assert.deepEqual(await chicago.session.read(),{owner:{bank:0,preset:0,token:17},rows:[]});
 assert.equal(createSynthSession({has:()=>false},0,()=>true),null);
 assert.equal(f.session.observes({kind:NOTIFY_KIND.PARAM,fields:{kind:113,b:0}}),true);
 assert.equal(f.session.observes({kind:NOTIFY_KIND.PARAM,fields:{kind:113,b:1}}),false);
});

test('QUEUED is an echo, polls and confirms only committed value without a second write',async()=>{
 const f=device();f.add(12);
 const base=f.client.paramGet;
 let attempts=0,writes=0;
 f.client.paramGet=async a=>{if(writes&&a[0]?.kind===112&&++attempts===3)f.set(12,'value',9);return base(a);};
 f.client.paramSet=async (key,value,_old,options)=>{
  writes++;assert.equal(options.retry,false);
  return {status:STATUS.QUEUED,fields:{...key,value}};
 };
 const s=createSynthSession(f.client,0,()=>true,{pause:async()=>{}});
 await s.read();
 const result=await s.write(12,9);
 assert.equal(result.rows[0].value,9);
 assert.equal(writes,1); assert.equal(attempts,3);
});

test('QUEUED timeout or owner transition never paints an edit or retries a write',async()=>{
 const f=device();f.add(12);
 let writes=0;
 f.client.paramSet=async (key,value)=>{writes++;return {status:STATUS.QUEUED,fields:{...key,value}};};
 const s=createSynthSession(f.client,0,()=>true,{pause:async()=>{}});
 await s.read();
 await assert.rejects(s.write(12,9),/readback/); assert.equal(writes,1);
 assert.equal((await s.read()).rows[0].value,5);
 const g=createSynthSession(f.client,0,()=>true,{pause:async()=>{f.reopen();}});
 await g.read();await assert.rejects(g.write(12,9),/owner changed/);
 assert.equal(writes,2);
});

test('typed PARAM_SET codec requires explicit guard, transports wrong bank for native rejection',()=>{
 const key={kind:113,a:3,b:1,c:74}, fields={epoch:23,...key,expect:4,value:77,expect_bank:2};
 assert.deepEqual(decodeRequest(encodeRequest(OP.PARAM_SET,4,fields)).fields,fields);
 assert.throws(()=>encodeRequest(OP.PARAM_SET,4,{...fields,expect_bank:undefined}),/requires a bank guard/);
 assert.throws(()=>encodeRequest(OP.PARAM_SET,4,{...fields,expect_bank:4}),/unknown synth bank/);
 assert.throws(()=>encodeRequest(OP.PARAM_SET,4,{...fields,b:2}),/requires a bass engine address/);
});

test('audited original labels disambiguate 6-character display names; unknown ids stay explicit',async()=>{
 const f=device({bank:2});f.add(22);f.add(26);f.add(190);
 f.set(22,'name','Attack');f.set(26,'name','Attack');
 const s=await f.session.read();
 assert.deepEqual(s.rows.map(x=>x.label),['Filter Attack','Amp Attack','id190 · ID 190']);
 await f.session.write(22,6);
});

test('actual client writes typed only once on cable timeout; legacy transport retry remains',async()=>{
 const packets=[],client=new Dnr3Client({transport:{onSysex(){return ()=>{};},sendSysex(x){packets.push(decodeRequest(x));}},timeoutMs:8});
 client.hello={caps:CAP.BASS_BANK_GUARD|CAP.TYPED_SYNTH|CAP.SYNTH_OWNER};
 client.epoch=41;
 await assert.rejects(client.paramSet(synthAddress(2,0,16),7,0,{bank:2,ownerGeneration:17,retry:true}),/timeout/);
 assert.equal(packets.length,1);assert.equal(packets[0].fields.kind,112);
 await assert.rejects(client.paramSet(synthAddress(2,0,2,false),7,0,{bank:2}),/timeout/);
 assert.equal(packets.length,3);assert.equal(packets[1].fields.kind,1);assert.equal(packets[1].seq,packets[2].seq);
});

test('owner wire uses 5-byte leased read, 10-byte tuple, and exact 18-byte SET',()=>{
 const read=encodeRequest(OP.SYNTH_OWNER,41,{epoch:1234,slot:1});
 assert.equal(decodeFrame(read).payload.length,5);
 assert.deepEqual(decodeRequest(read).fields,{epoch:1234,slot:1});
 for(const owner_generation of [0,0x80000000,0xffffffff]){
  const fields={slot:1,bank:3,preset:0,settled:1,owner_generation};
  const reply=encodeReply(OP.SYNTH_OWNER,41,STATUS.OK,0,fields);
  assert.equal(decodeFrame(reply).payload.length,15); // status/rev + tuple
  assert.deepEqual(decodeReply(reply).fields,fields);
  const set=encodeRequest(OP.PARAM_SET,42,{epoch:1234,kind:113,a:3,b:1,c:25,expect:5,value:6,expect_bank:3,owner_generation});
  assert.equal(decodeFrame(set).payload.length,18);
  assert.equal(decodeRequest(set).fields.owner_generation,owner_generation);
 }
});
test('same-preset same-value replacement immediately before fresh GET sends no SET',async()=>{
 const f=device();f.add(12);await f.session.read();
 const get=f.client.paramGet;
 f.client.paramGet=async a=>{if(a.length===1)f.replace();return get(a);};
 await assert.rejects(f.session.write(12,8),/owner changed/);
 assert.equal(f.writes.length,0);
});
test('same-bank same-preset replacement during discovery yields no editable snapshot',async()=>{
 const f=device();f.add(12);
 const get=f.client.paramGet;let once=true;
 f.client.paramGet=async a=>{if(once){once=false;f.replace();}return get(a);};
 assert.deepEqual((await f.session.read()).rows,[]);
 await assert.rejects(f.session.write(12,8),/unavailable/);
 assert.equal(f.writes.length,0);
});
test('same-value replacement after ACK cannot confirm edit; no retry',async()=>{
 const f=device();f.add(12);await f.session.read();
 const set=f.client.paramSet;
 f.client.paramSet=async (...args)=>{const r=await set(...args);f.replace();return r;};
 await assert.rejects(f.session.write(12,8),/owner changed|readback/);
 assert.equal(f.writes.length,1);
 assert.equal(f.writes[0].guard.ownerGeneration,17);
});
test('typed firmware without owner epoch remains read-only and low-level client sends no SET',async()=>{
 const f=device({ownerGuard:false});f.add(12);
 assert.deepEqual((await f.session.read()).rows.map(r=>[r.value,r.writable]),[[5,false]]);
 await assert.rejects(f.session.write(12,8),/unavailable/);assert.equal(f.writes.length,0);
 const client=new Dnr3Client({transport:{onSysex(){return ()=>{};},sendSysex(){assert.fail('sent a typed write');}}});
 client.hello={caps:CAP.BASS_BANK_GUARD|CAP.TYPED_SYNTH};
 await assert.rejects(client.paramSet(synthAddress(2,0,12),8,5,{bank:2,ownerGeneration:17}),/cannot guard/);
});
