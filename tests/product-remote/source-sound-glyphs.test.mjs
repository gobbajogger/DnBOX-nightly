// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {originalSoundGlyphPrimitives,originalSoundGlyphRole,miamiDraftDisplay} from '../../web/product-site/remote/source-sound-glyphs.mjs';
import {renderSvg} from '../../web/product-site/remote/glyph-render.mjs';
import {paintPixels} from '../../web/product-site/remote/glyph-live.mjs';
const fixture=JSON.parse(readFileSync(new URL('fixtures/source-sound-glyphs-f178.json',import.meta.url)));
const contexts=[[32,95,127,127,83],[64,0,0,42,48],[95,64,127,84,127]];
test('bank-qualified glyphs match pinned f178 idle path calls at every raw position',()=>{
 const native=inflateSync(Buffer.from(fixture.values,'base64'));
 assert.equal(createHash('sha256').update(native).digest('hex'),fixture.nativeSha256);
 const rows=native.toString().trim().split('\n');
 assert.equal(rows.length,9636);
 const roles=new Set();
 for(const row of rows){
  const [b,p,c,r,...trace]=row.trim().split(/\s+/);
  const [bank,parameter,context,raw]=[b,p,c,r].map(Number),[cut,peak,arp,wave,depth]=contexts[context];
  const item={kind:1,target:2,voice:0,sourceBank:bank,parameter};
  const role=originalSoundGlyphRole(item);
  assert.equal(originalSoundGlyphRole({...item,voice:1}),role);
  roles.add(role);
  const pots=(bank===0?{3:[cut],4:[cut,peak],14:[arp],15:[arp],16:[arp]}:{12:[wave],13:[wave,depth]})[parameter]??[];
  const actual=originalSoundGlyphPrimitives(role,raw,pots).primitives.map(x=>[...x.slice(0,5),+x[5]].join(','));
  assert.deepEqual(actual,trace,row);
 }
 assert.equal(roles.size,26);
 assert.equal(originalSoundGlyphRole({kind:1,target:2,voice:0,sourceBank:0,parameter:0}),null);
 assert.equal(originalSoundGlyphRole({kind:1,target:2,voice:0,sourceBank:1,parameter:11}),null);
});
test('owned dependencies and inactive arpeggiator affect SVG and live canvas',()=>{
 assert.equal(originalSoundGlyphPrimitives('SOURCE CHICAGO 15',64,[0]).muted,true);
 assert.equal(originalSoundGlyphPrimitives('SOURCE CHICAGO 15',64,[127]).muted,false);
 assert.deepEqual(originalSoundGlyphPrimitives('SOURCE CHICAGO 3',95,[null]).primitives,[]);
 const peak='SOURCE CHICAGO 3',a=renderSvg(peak,95/127,'chicago',{sourceSoundPots:[32]}),b=renderSvg(peak,95/127,'chicago',{sourceSoundPots:[95]});
 assert.match(a,/<rect x=.*fill="currentColor"/);
 assert.notEqual(a,b);
 const rgbaA=new Uint8ClampedArray(40*24*4),rgbaB=new Uint8ClampedArray(rgbaA.length);
 paintPixels(rgbaA,40,24,peak,95/127,'chicago',{sourceSoundPots:[32]});
 paintPixels(rgbaB,40,24,peak,95/127,'chicago',{sourceSoundPots:[95]});
 assert.notDeepEqual(rgbaA,rgbaB);
});
test('Miami carrier pitch, XMOD bipolar modulation and Wobble clock display match native conversions',()=>{
 assert.equal(fixture.formats.length,384);
 const clock=['1/2','1/4','1/8','1/16','1/3','1/6','1/12','1/24'];
 for(const [parameter,raw,value] of fixture.formats){
  const sign=value>0?'+':'';
  const expected=parameter===3?sign+value+' st':parameter===7?sign+(value/10).toFixed(1)+' %':clock[value];
  assert.equal(miamiDraftDisplay(parameter,raw),expected);
 }
});
