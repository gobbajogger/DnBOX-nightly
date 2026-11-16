import test from'node:test';import assert from'node:assert/strict';import{idleBody}from'./body.mjs';
test('float32 scale underflow and invalid identities produce no geometry',()=>{for(const scale of[1e-300,0,-1,NaN,Infinity,5])assert.throws(()=>idleBody(0,0,{scale}));for(const args of[[2,0],[0,11],[0,.5]])assert.throws(()=>idleBody(...args));assert.throws(()=>idleBody(0,0,{x:.5}));});
