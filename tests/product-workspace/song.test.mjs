import test from 'node:test';
import assert from 'node:assert/strict';
import {Arrangement} from '../../web/product-site/remote/sequence.mjs';
const make=()=>{const a=new Arrangement();a.add([0,1,2,3,4],2);a.add([5,6,7,8,9],3);a.add([10,11,12,13,14],4);return a;};
test('Song changes one part pattern and preserves other cells through Undo/Redo',()=>{
 const a=make(),before=structuredClone(a.rows);a.setPattern(1,3,31);
 assert.deepEqual(a.rows,[before[0],{patterns:[5,6,7,31,9],repeats:3},before[2]]);
 a.undo();assert.deepEqual(a.rows,before);a.redo();assert.equal(a.rows[1].patterns[3],31);
});
test('Song moves a complete row once, keeps boundary no-ops out of history',()=>{
 const a=make(),before=structuredClone(a.rows),count=a.history.length;
 assert.equal(a.move(0,-1),false);assert.equal(a.move(2,1),false);assert.equal(a.history.length,count);
 assert.equal(a.move(1,-1),true);assert.deepEqual(a.rows,[before[1],before[0],before[2]]);assert.equal(a.history.length,count+1);
 a.undo();assert.deepEqual(a.rows,before);a.redo();assert.deepEqual(a.rows,[before[1],before[0],before[2]]);
});
test('Song removes middle, last and only rows without mutating saved snapshots',()=>{
 const a=make(),before=structuredClone(a.rows);a.remove(1);assert.deepEqual(a.rows,[before[0],before[2]]);a.undo();assert.deepEqual(a.rows,before);
 a.remove(2);assert.deepEqual(a.rows,before.slice(0,2));a.remove(1);a.remove(0);assert.deepEqual(a.rows,[]);a.undo();assert.deepEqual(a.rows,[before[0]]);
});
test('Song invalid operations are atomic for rows and history',()=>{
 const a=make(),before=structuredClone(a.rows),history=structuredClone(a.history);
 for(const run of [()=>a.setPattern(1,5,0),()=>a.setPattern(1,0,32),()=>a.setPattern(1,-1,0),()=>a.setPattern(.5,0,0),()=>a.move(-1,1),()=>a.move(0,2),()=>a.move(3,-1),()=>a.remove(3),()=>a.remove('0'),()=>a.update(1,{repeats:9})]){
  assert.throws(run);assert.deepEqual(a.rows,before);assert.deepEqual(a.history,history);assert.deepEqual(a.future,[]);
 }
});
