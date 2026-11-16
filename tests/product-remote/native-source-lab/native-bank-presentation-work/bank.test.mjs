import test from'node:test';import assert from'node:assert/strict';
import{activeBdBank}from'./bank.mjs';import{activeBdBank as settled}from'../native-bank-work/bank.mjs';import{NativeEaseCache}from'../native-cache-work/cache.mjs';
const state={'1:0:0:0':34,'1:0:0:1':13,'1:0:0:2':80,'1:0:0:4':0,'1:0:0:5':45};
test('settled bank pixels remain identical with separate presentation domain',()=>assert.deepEqual(activeBdBank(state).pixels,settled(state).pixels));
test('committed values change immediately while source cache glyph state eases independently',()=>{
 const cache=new NativeEaseCache();cache.reset(0);const ids=[0,1,2,4],get=(s,frame)=>Object.fromEntries(ids.map(slot=>[`1:0:0:${slot}`,cache.value({kind:1,a:0,b:0,c:slot},s[`1:0:0:${slot}`],frame)]));
 get(state,0);const next=Object.freeze({...state,'1:0:0:1':127});let presentation=get(next,1),frame=activeBdBank(next,presentation);
 assert.equal(frame.controls[1].value,'100%');assert.equal(presentation['1:0:0:1'],13);
 cache.tick(16);presentation=get(next,2);assert.ok(presentation['1:0:0:1']>13&&presentation['1:0:0:1']<127);
 const animated=activeBdBank(next,presentation);assert.equal(animated.controls[1].value,'100%');assert.notDeepEqual(animated.pixels,frame.pixels);
 cache.tick(1016);presentation=get(next,3);assert.equal(presentation['1:0:0:1'],127);assert.deepEqual(activeBdBank(next,presentation).pixels,settled(next).pixels);
 assert.equal(next['1:0:0:1'],127);assert.equal(state['1:0:0:1'],13);
});
