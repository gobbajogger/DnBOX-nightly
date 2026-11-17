import test from 'node:test';
import assert from 'node:assert/strict';
import {drawText,textWidth} from './font.mjs';
test('unsupported numeric-only text fails before any pixel changes',()=>{
 const canvas=new Uint16Array(64*40).fill(0x18e3),before=canvas.slice();
 assert.throws(()=>drawText(canvas,{width:64,height:40,x:0,y:0,role:'L',text:'12X',color:65535}),/unsupported character/);
 assert.deepEqual(canvas,before);assert.throws(()=>textWidth('L','12X'),/unsupported character/);
});
test('native ASCII fallback/folding and bounded inputs remain explicit',()=>{
 assert.equal(textWidth('T','tune'),textWidth('T','TUNE'));
 assert.equal(textWidth('S','\x7f'),textWidth('S','?'));
 const canvas=new Uint16Array(64*40).fill(123),before=canvas.slice();
 for(const change of [{width:0},{height:481},{y0:-1},{y1:41},{x:NaN},{color:65536},{text:'x'.repeat(1025)}]){
  assert.throws(()=>drawText(canvas,{width:64,height:40,x:0,y:0,role:'T',text:'TUNE',color:65535,...change}));assert.deepEqual(canvas,before);
 }
});
