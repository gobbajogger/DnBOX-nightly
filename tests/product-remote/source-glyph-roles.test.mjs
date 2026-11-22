// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {paintDrumGlyph} from '../../web/product-site/remote/drum-strip.mjs';
import {render,renderSvg} from '../../web/product-site/remote/glyph-render.mjs';
import {paintPixels,polylines} from '../../web/product-site/remote/glyph-live.mjs';

const oracle = process.env.DNBOX_NATIVE_GLYPH_ROWS ?? new URL('./fixtures/f178-source-glyphs.txt',import.meta.url);
const expected = readFileSync(oracle,'utf8').trim().split('\n').map(line=>line.trim().split(/\s+/).map(Number));
function drumPath(identity) {
 let d;
 const glyph={querySelector:()=>({setAttribute:(name,value)=>{assert.equal(name,'d');d=value;}}),setAttribute(){}};
 const root={querySelectorAll:selector=>{
  assert.ok(selector.includes('[data-drum-editor]')&&selector.includes('[data-drum-sound-strip]'));
  assert.ok(selector.includes(identity));return [glyph];
 }};
 return value=>{
  paintDrumGlyph(root,{identity,context:{name:'Tone'}},value,127);
  return polylines(d);
 };
}
function near(got,want){
 assert.equal(got.length,want.length);
 for(const [index,value] of got.entries())
  assert.ok(Math.abs(value-want[index])<.0002,`${index}: ${value} vs ${want[index]}`);
}

test('909 Snare Tone draws the source noise decay for all 128 positions',()=>{
 const draw=drumPath('1:0:1:1');
 const rows=expected.filter(([role])=>role===0);
 assert.equal(rows.length,128);
 for(let raw=0;raw<128;raw++){
  const [points]=draw(raw);
  assert.equal(points.length,17);
  assert.deepEqual(points[0],[1,0]);
  assert.equal(points.at(-1)[0],31);
  near(points.flat(),rows[raw].slice(3));
 }
 assert.ok(draw(0)[0][1][1]>draw(127)[0][1][1]);
});

test('808 Snare Tone balances the two source shell peaks across all 128 positions',()=>{
 const draw=drumPath('1:1:1:1');
 const rows=expected.filter(([role])=>role===1);
 assert.equal(rows.length,128);
 for(let raw=0;raw<128;raw++){
  const [one,two]=draw(raw);
  assert.deepEqual([one[0],one[2],two[0],two[2]],[[7,12],[15,12],[17,12],[25,12]]);
  near([one[0],one[1],one[1],one[2],two[0],two[1],two[1],two[2]].flat(),rows[raw].slice(2));
 }
 assert.deepEqual([draw(0)[0][1][1],draw(0)[1][1][1]],[0,12]);
 assert.ok(Math.abs(draw(64)[0][1][1]-draw(64)[1][1][1])<.001);
});

test('BREAK Pitch centers the marker at zero and follows all 25 source positions',()=>{
 const role='BREAK PITCH',engine='break';
 const rows=expected.filter(([kind])=>kind===2);
 assert.equal(rows.length,25);
 for(let raw=0;raw<=24;raw++){
  const draw=render(role,raw/24,engine);
  assert.equal(draw.fn,role);
  const guides=polylines(draw.guide),marker=polylines(draw.d);
  assert.deepEqual(guides,[[[2.5,10.5],[38.5,10.5]],[[20.5,4.5],[20.5,16.5]],[[2.5,7.5],[2.5,13.5]],[[38.5,7.5],[38.5,13.5]]]);
  {
   const [x,y,w,h,col]=rows[raw].slice(-5);
   assert.equal(col,2);
   assert.deepEqual(marker,Array.from({length:w},(_,i)=>[[x+i+.5,y-27.5],[x+i+.5,y+h-28.5]]));
  }
 }
 assert.deepEqual(polylines(render(role,.5,engine).d)[1],[[20.5,6.5],[20.5,14.5]]);
 const a=new Uint8ClampedArray(40*24*4),b=new Uint8ClampedArray(a.length);
 assert.equal(paintPixels(a,40,24,role,0,engine),role);
 assert.equal(paintPixels(b,40,24,role,.5,engine),role);
 assert.notDeepEqual(a,b);
 assert.match(renderSvg(role,.5,engine),/data-fn="BREAK PITCH"/);
 assert.equal(render('Pitch',.5,'chicago').fn,'TUNE');
});
