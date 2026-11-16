import test from'node:test';import assert from'node:assert/strict';
import t0 from'../native-drum-binding-work/target-0.json' with{type:'json'};
import t1 from'../native-drum-binding-work/target-1.json' with{type:'json'};
import{projectDrum}from'../native-drum-binding-work/drum.mjs';
import{projectPresentedDrum}from'./presentation.mjs';
const rows=[...t0.controls,...t1.controls],key=c=>[c.kind,c.target,c.voice,c.slot].join(':'),state=Object.freeze(Object.fromEntries(rows.map(c=>[key(c),c.storedRaw]))),id=c=>({...c,source:t0.source});
test('settled presentation preserves all7434 integer source projections',()=>{let n=0;for(const c of rows)for(let raw=0;raw<=c.maximumRaw;raw++){const s=Object.freeze({...state,[key(c)]:raw});assert.deepEqual(projectPresentedDrum(id(c),s,raw),projectDrum(id(c),s));n++;}assert.equal(n,7434);});
test('fractional glyph state never replaces committed state',()=>{
 for(const c of rows){const raw=Math.min(c.maximumRaw-.25,c.storedRaw+.25);assert.ok(projectPresentedDrum(id(c),state,raw).flat(2).every(Number.isFinite));assert.equal(state[key(c)],c.storedRaw);for(const bad of[NaN,-1,c.maximumRaw+1,Infinity])assert.throws(()=>projectPresentedDrum(id(c),state,bad));}
});
test('native timed SI uses selected rounded presentation while dependencies remain committed',()=>{
 const decay=rows.find(c=>key(c)==='1:0:0:2'),depth=rows.find(c=>key(c)==='1:0:0:4');
 assert.deepEqual(projectPresentedDrum(id(decay),state,80.49),projectDrum(id(decay),{...state,'1:0:0:2':80}));
 assert.deepEqual(projectPresentedDrum(id(decay),state,80.51),projectDrum(id(decay),{...state,'1:0:0:2':81}));
 assert.deepEqual(projectPresentedDrum(id(depth),state,63.51),projectDrum(id(depth),{...state,'1:0:0:4':64}));
 assert.throws(()=>projectPresentedDrum(id(depth),{...state,'1:0:0:5':.5},64));
});
