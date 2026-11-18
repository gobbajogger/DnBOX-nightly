import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../../web/product-site/remote/envelope-observations.mjs').catch(()=>({}));
const pin={firmware:'a'.repeat(40),kernel:'b'.repeat(64),session:'instance-1'};
const juno={slot:0,engine:'JUNO',role:'amp-filter',available:true,snapshot:{adsr:[.01,.2,.6,.3],level:.5,selected_voice:2,stage:2,gate:1,active:1,shared_amp_filter:1}};
const packet=(sequence=1,voices=[juno])=>({type:'envelopes',...pin,sequence,timeMs:100,voices:structuredClone(voices)});
function store(){assert.equal(typeof api.EnvelopeObservations,'function');return new api.EnvelopeObservations(pin);}
test('only pinned ordered actual observations are retained, copied and expired',()=>{
 const s=store(),p=packet();assert.equal(s.accept(p,100),true);p.voices[0].snapshot.level=.8;
 const value=s.get('JUNO',0,'amp-filter',110);assert.equal(value.snapshot.level,.5);
 value.snapshot.level=.1;assert.equal(s.get('JUNO',0,'amp-filter',120).snapshot.level,.5);
 assert.equal(s.get('JUNO',0,'amp-filter',1101),null);
});
test('wrong source/session, duplicate order and disconnect clear markers',()=>{
 for(const bad of [{firmware:'c'.repeat(40)},{kernel:'d'.repeat(64)},{session:'other'},{}]){
  const s=store();s.accept(packet(),0);assert.equal(s.accept({...packet(),...bad},1),false);assert.equal(s.get('JUNO',0,'amp-filter',2),null);
 }
 const s=store();s.accept(packet(),0);s.close();assert.equal(s.accept(packet(2),1),false);
});
test('unavailable roles and changed engines clear old observations atomically',()=>{
 const s=store();s.accept(packet(),0);
 assert.equal(s.accept(packet(2,[{engine:'CHICAGO',slot:0,role:'amp',available:false}]),1),true);
 assert.equal(s.get('JUNO',0,'amp-filter',2),null);
 assert.equal(s.get('CHICAGO',0,'amp',2),null);
});
test('native stage/voice semantics are checked, never synthesized',()=>{
 for(const patch of [{selected_voice:6},{stage:5},{shared_amp_filter:0},{level:NaN},{active:0,gate:1,selected_voice:-1,stage:0}]){
  const s=store();const v={...juno,snapshot:{...juno.snapshot,...patch}};
  assert.equal(s.accept(packet(1,[v]),0),false);
 }
 const s=store(),v={engine:'CHICAGO',slot:1,role:'amp',available:true,snapshot:{adsr:[0,.4,0,.5],level:-.451,state:1}};
 assert.equal(s.accept(packet(1,[v]),0),true);
 assert.equal(s.get('CHICAGO',1,'amp',1).snapshot.level,-.451);
 assert.equal(s.get('CHICAGO',1,'amp',1).snapshot.state,1);
 assert.equal(s.get('CHICAGO',1,'filter',1),null);
});
test('unsupported 909 voices cannot manufacture an available amp snapshot',()=>{
 const s=store();const snapshot={raw_level:0,target_decay_ms:100,target_hold_ms:0,ramp_start:0,ramp_end:0,ramp_samples:0,ramp_ratio:0,hold_left:0,ramp_left:0,ramp_ticks:0,active:0,hold_active:0,ramp_valid:0};
 assert.equal(s.accept(packet(1,[{engine:'909',slot:2,role:'amp',available:true,snapshot}]),0),false);
 assert.equal(s.accept(packet(2,[{engine:'909',slot:0,role:'amp',available:true,snapshot}]),1),true);
});
test('pins are primitive strings captured exactly once, not coercible mutable identities',()=>{
 assert.throws(()=>new api.EnvelopeObservations({...pin,firmware:{toString:()=>pin.firmware}}));
 assert.throws(()=>new api.EnvelopeObservations({...pin,kernel:{toString:()=>pin.kernel}}));
 const count={firmware:0,kernel:0,session:0};
 const input=Object.fromEntries(Object.keys(pin).map(k=>[k,pin[k]]));
 for(const k of Object.keys(pin))Object.defineProperty(input,k,{get(){count[k]++;return count[k]===1?pin[k]:'changed';}});
 const s=new api.EnvelopeObservations(input);
 assert.deepEqual(count,{firmware:1,kernel:1,session:1});
 assert.equal(s.accept(packet(),0),true);
});
