// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync}from'node:fs';
import {createStartingBreakPreview}from'../web/product-site/starting-break-preview.mjs';
const contract=JSON.parse(readFileSync(new URL('../web/product-site/sample-contract.json',import.meta.url)));
function response(chunks,{ok=true,length=null}={}){let at=0,canceled=false,released=false;return{ok,headers:{get:()=>length},body:{getReader:()=>({async read(){return at<chunks.length?{value:chunks[at++],done:false}:{done:true};},async cancel(){canceled=true;},releaseLock(){released=true;}})},state:()=>({canceled,released})};}
test('all five contract previews resolve beneath module-relative public asset directory',()=>{
 const p=createStartingBreakPreview({baseURL:'https://example.test/nested/repo/starting-break-preview.mjs'});
 for(const a of contract.assets)assert.equal(p.resolvePrivateUrl(a.id),`https://example.test/nested/repo/assets/starting-breaks/${a.id}.wav`);
 for(const id of ['../private-audio/x','__proto__','personal-br1-zone9'])assert.throws(()=>p.resolvePrivateUrl(id));
});
test('each exact contract size is bounded and returned without changing bytes',async()=>{
 for(const a of contract.assets){const bytes=new Uint8Array(a.preview_bytes).fill(7),r=response([bytes.subarray(0,40),bytes.subarray(40)]);let options;
 const p=createStartingBreakPreview({fetchImpl:async(url,o)=>{options=o;return r;}});assert.deepEqual(await p.fetchBytes(p.resolvePrivateUrl(a.id)),bytes);assert.deepEqual(options,{credentials:'omit',cache:'force-cache'});assert.deepEqual(r.state(),{canceled:false,released:true});}
});
test('oversize and truncated streams cancel and release without returning unverified bytes',async()=>{
 for(const size of [1,69645]){const r=response([new Uint8Array(size)]),p=createStartingBreakPreview({fetchImpl:async()=>r});await assert.rejects(p.fetchBytes(p.resolvePrivateUrl('personal-br1-zone1')),/size/);assert.deepEqual(r.state(),{canceled:true,released:true});}
});
test('unknown URLs never fetch; failed HTTP, forged lengths and missing streaming fail closed',async()=>{
 let calls=0;const p=createStartingBreakPreview({fetchImpl:async()=>{calls++;return response([]);}});await assert.rejects(p.fetchBytes('https://example.test/private-audio/a.wav'));assert.equal(calls,0);
 for(const r of [response([],{ok:false}),response([],{length:'1'}),{ok:true,headers:{get:()=>null}}]){const q=createStartingBreakPreview({fetchImpl:async()=>r});await assert.rejects(q.fetchBytes(q.resolvePrivateUrl('personal-br1-zone1')));}
});

test('all five admitted previews validate original PCM before choosing any break',async()=>{
 const {createPicker}=await import('../web/product-site/components/break-picker/picker.mjs');
 const {SAMPLE_CONTRACT_SHA256}=await import('../web/product-site/sample-pin.mjs');
 const picker=await createPicker(new Uint8Array(readFileSync(new URL('../web/product-site/sample-contract.json',import.meta.url))),SAMPLE_CONTRACT_SHA256);picker.none();
 const provider=createStartingBreakPreview({fetchImpl:async url=>response([new Uint8Array(readFileSync(new URL(url)))])});
 for(const asset of contract.assets){const preview=await picker.preview(asset.id,provider);assert.equal(preview.frames,asset.frames);assert.equal(preview.sampleRate,22050);assert.equal(preview.playbackRate,1);assert.deepEqual(picker.selectedIds(),[]);}
 const corrupt=createStartingBreakPreview({fetchImpl:async url=>{const bytes=new Uint8Array(readFileSync(new URL(url)));bytes[bytes.length-1]^=1;return response([bytes]);}});
 await assert.rejects(picker.preview(contract.assets[0].id,corrupt),/hash\/size mismatch/);assert.deepEqual(picker.selectedIds(),[]);
});
test('stored selection normalization retains only known unique IDs without adding choices',async()=>{
 const {normalizeStartingBreakSelection:n}=await import('../web/product-site/starting-break-preview.mjs');
 assert.deepEqual(n([]),[]);assert.equal(n(null),undefined);assert.equal(n({}),undefined);
 assert.deepEqual(n(['old-id',null,{},'__proto__']),[]);
 assert.deepEqual(n(['personal-br2-zone2','personal-br2-zone2','personal-br1-zone1']),['personal-br2-zone2','personal-br1-zone1']);
});
