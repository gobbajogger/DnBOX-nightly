import test from 'node:test';
import assert from 'node:assert/strict';
import {liveBody} from './body-live.mjs';
test('explicit envelope and integer RGB565 boundaries fail closed',()=>{
 for(const envelope of [undefined,NaN,Infinity,-.001,1.001])assert.throws(()=>liveBody(0,0,{envelope,ink:64677}));
 for(const ink of [undefined,-1,65536,.5,NaN])assert.throws(()=>liveBody(0,0,{envelope:.5,ink}));
 for(const scale of [1e-300,0,-1,Infinity,4.01])assert.throws(()=>liveBody(0,0,{envelope:.5,ink:64677,scale}));
});
test('native threshold, endpoint color and input state preserved',()=>{
 const context={envelope:.02,ink:64677,scale:1};const saved=structuredClone(context);
 assert.equal(liveBody(0,0,context).color,64677);assert.deepEqual(context,saved);
 const zero=liveBody(0,0,{...context,envelope:0});const high=liveBody(0,0,{...context,envelope:1});
 assert.notDeepEqual(high.paths,zero.paths);assert.notEqual(high.color,zero.color);
 assert.equal(high.width,zero.width);
});
