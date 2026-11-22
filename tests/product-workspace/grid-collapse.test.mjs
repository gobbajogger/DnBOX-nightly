// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import test from 'node:test';
import {verticalGrid} from '../../web/product-site/remote/grid.mjs';

function parseGrid(width) {
 const uri=verticalGrid(width);
 assert.match(uri,/^url\("data:image\/svg\+xml,/);
 const svg=decodeURIComponent(uri.split(',')[1].slice(0,-2));
 const svgWidth=Number(svg.match(/<svg[^>]+width="(\d+)"/)[1]);
 const marks=[...svg.matchAll(/<path d="M(\d+) 0V1" stroke="([^"]+)"\/>/g)]
   .map(([,x,color])=>({x:Number(x),color}));
 return {svgWidth,marks};
}

test('zoomed-out time grid paints each physical pixel at most once',()=>{
 for(const width of [0.1,0.49,0.5,1,2,3.5,7,8,12,15]){
  const {svgWidth,marks}=parseGrid(width);
  assert.ok(svgWidth>=1,'zero-width SVG for '+width);
  assert.equal(new Set(marks.map(m=>m.x)).size,marks.length,
    'duplicate strokes darken the small-width grid at '+width);
  assert.ok(marks.every(m=>m.x>=0&&m.x<svgWidth),'out-of-bounds stroke at '+width);
  assert.equal(marks.filter(m=>m.color==='#415052').length,1,'bar was lost at '+width);
 }
});

test('normal viewport bar/beat/subdivision hierarchy is unchanged',()=>{
 for(const width of [16,316,762,1342]){
  const {svgWidth,marks}=parseGrid(width);
  assert.equal(svgWidth,width);
  assert.equal(marks.length,16);
  assert.deepEqual(marks.map(m=>m.x),Array.from({length:16},(_,i)=>Math.round(i*width/16)));
  assert.equal(marks.filter(m=>m.color==='#415052').length,1);
  assert.equal(marks.filter(m=>m.color==='#293d43').length,3);
  assert.equal(marks.filter(m=>m.color==='#19262b').length,12);
 }
});
