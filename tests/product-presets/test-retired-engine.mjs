// SPDX-License-Identifier: GPL-3.0-only
import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
const fixture=JSON.parse(readFileSync(new URL('../visual/fixtures/site-retired-engine4.json',import.meta.url))),bytes=new Uint8Array(Buffer.from(fixture.base64,'base64'));
for(const path of['codec.mjs','legacy/codec.mjs'])test(path+' preserves engine4 bytes without exposing creation or falsely relabeling SynthOne',async()=>{
 const c=await import('../../web/product-site/presets/'+path);assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.sha256);assert.equal(c.DNPR_ENGINES[4].retired,true);
 const r=c.parseDnpr(bytes,{expectedEngine:'4'});assert.equal(r.engineId,4);assert.equal(r.engine,'drone');assert.equal(r.retiredEngine,true);assert.match(c.recordEngineLabel(r),/Retired engine 4.*read-only/);assert.doesNotMatch(c.recordEngineLabel(r),/SynthOne|Drone/);assert.deepEqual(c.ensureExportable(r),bytes);assert.match(c.fileNameFor(r),/\.drone\.dnpr$/);
 assert.throws(()=>c.encodeDnpr({engineId:4,name:'New',params:new Uint8Array(8)}),/RETIRED ENGINE/);assert.throws(()=>c.encodeDnpr({engine:'synthone',name:'Wrong',params:new Uint8Array(8)}),/WRONG ENGINE/);
});
