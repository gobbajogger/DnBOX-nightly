// SPDX-License-Identifier: GPL-3.0-only
import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{createHash}from'node:crypto';let source;try{source=await import('../../web/product-site/remote/chicago-wave-projection.mjs')}catch{}
const bytes=fs.readFileSync(new URL('./fixtures/chicago-native-primitives.json',import.meta.url)),fixture=JSON.parse(bytes),bits=x=>{const a=new DataView(new ArrayBuffer(4));a.setFloat32(0,x);return a.getUint32(0).toString(16).padStart(8,'0')};
test('actualC nativeprimitiveand affectedonly samples match Float32 exactly at65declaredphases and5rawstates',()=>{assert.ok(source,'source-bound Chicago projection missing');assert.equal(createHash('sha256').update(bytes).digest('hex'),'2bbff9b1d5a59eacd426423068e4c4a1b9039dfb592c933af2f4e4cc6c7ba998');for(const s of fixture.samples){assert.equal(bits(source.nativeSaw(s.phase)),s.sawBits);assert.equal(bits(source.nativeSquare(s.phase)),s.squareBits);for(const p of s.projected)assert.equal(bits(source.chicagoAffectedSample(p.raw,s.phase)),p.bits);}});
test('mapping retains128nativegainpairs, no rawfraction-as-gainratio or fullprogramclaim',()=>{assert.ok(source);assert.equal(source.GAINS.length,128);assert.equal(source.GAINS[127][1],.423999995);assert.match(source.PROJECTION_SCOPE,/affected.*not full/);assert.notEqual(source.chicagoAffectedSample(64,-.5),(.5*.5)+(.5*1));});

test('Chicago WAVE renderer uses native affected-layer path at every raw value',async()=>{
 const {render}=await import('../../web/product-site/remote/glyph-render.mjs');
 for(let raw=0;raw<128;raw++){
  const drawn=render('WAVE',raw/127,'chicago');
  assert.equal(drawn.d,source.chicagoAffectedPath(raw/127));
  assert.equal(drawn.cell,'102x26');
 }
});
