// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import native from './fixtures/break-slice-native-f178.json' with {type:'json'};
import {render} from '../../web/product-site/remote/glyph-render.mjs';

test('BREAK A/B Slices use the four named native selector positions',()=>{
 for(const row of native.rows){
  const shape=render('BREAK SLICES',row.raw/3,'break');
  assert.equal(shape.fn,'BREAK SLICES');
  assert.equal(shape.live,false);
  assert.equal(shape.d,'');
  assert.deepEqual(shape.rects,row.nativeBoxes.map(([x,y,w,h,radius,ink])=>({
   x:x+native.projection.translateX,y:y+native.projection.translateY,w,h,radius,ink:ink?'primary':'guide'
  })));
  assert.equal(shape.rects.filter(rect=>rect.ink==='primary').length,1);
  assert.equal(shape.rects[row.raw].ink,'primary');
  assert.equal(row.label,String(4*2**row.raw));
 }
});

test('BREAK selector role stays scoped away from other engines and unknown labels',()=>{
 assert.equal(render('BREAK SLICES',1/3,'chicago').rects,undefined);
 for(const role of ['A SLICES','B SLICES','LEVEL','CHANCE'])assert.equal(render(role,1/3,'break').rects,undefined);
});

test('BREAK role and native names require the exact qualified slice identities',async()=>{
 const {isBreakSliceControl,breakSliceRole,breakSliceText}=await import('../../web/product-site/remote/break-slice-glyph.mjs');
 for(const target of [0,1]){
  const row={id:'source-sound/BREAK/-1|11:'+target+':0:0:-1',kind:11,target,voice:0,parameter:0,sourceBank:-1};
  assert.equal(isBreakSliceControl(row),true);assert.equal(breakSliceRole(row),'BREAK SLICES');
  assert.deepEqual([0,1,2,3].map(raw=>breakSliceText(row,raw)),['4','8','16','32']);
  for(const raw of [-1,.5,4,NaN])assert.equal(breakSliceText(row,raw),null);
  for(const patch of [{kind:1},{target:2},{voice:1},{parameter:1},{sourceBank:0},{id:row.id+'/other'}]){
   const other={...row,...patch};assert.equal(isBreakSliceControl(other),false);assert.equal(breakSliceRole(other),null);assert.equal(breakSliceText(other,1),null);
  }
 }
});
