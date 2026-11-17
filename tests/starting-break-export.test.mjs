import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash,webcrypto} from 'node:crypto';
globalThis.crypto??=webcrypto;
const root=new URL('../web/product-site/',import.meta.url);
let mod={};try{mod=await import(new URL('starting-break-export.mjs',root));}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const contract=JSON.parse(await readFile(new URL('sample-contract.json',root)));
const ids=contract.assets.map(a=>a.id);
const importer=await import('../web/x0x_breaks.js');
const fetchImpl=async url=>new Response(await readFile(new URL(url)));
const digest=b=>createHash('sha256').update(b).digest('hex');
test('selected samples produce importer-compatible archives with exact original bytes and zone metadata',async()=>{
 assert.equal(typeof mod.exportStartingBreaks,'function','native sample export is missing');
 const provenance=JSON.parse(await readFile(new URL('assets/starting-breaks/provenance.json',root)));
 for(let mask=1;mask<32;mask++){
  const selectedIds=ids.filter((_,i)=>mask&(1<<i));
  const out=await mod.exportStartingBreaks(selectedIds,{baseURL:new URL('starting-break-export.mjs',root),fetchImpl});
  const {meta,images}=importer.readArchive(out.bytes);
  assert.equal(meta.count,images.length);assert.ok(images.every(Boolean));
  const expected=contract.assets.filter(a=>selectedIds.includes(a.id));let index=0;
  for(const image of images){const h=importer.parseHeader(image);assert.ok(image.length<=81920);
   for(let i=0;i<h.nz;i++){
    const a=expected[index++],z=h.zones[i];assert.equal(z.rate,22050);assert.equal(z.n,a.frames);
    assert.equal(digest(image.subarray(512+z.off,512+z.off+a.adpcm_bytes)),a.adpcm_sha256);
    assert.deepEqual(image.subarray(36+28*i,60+28*i),Uint8Array.from(Buffer.from(provenance.assets.find(p=>p.id===a.id).source_zone_header_hex,'hex').subarray(4)));
   }
  }
  assert.equal(index,selectedIds.length);assert.equal(out.filename,'DnBOX-starting-breaks.x0xslots');
 }
});
test('none, duplicates and unknown IDs cannot export',async()=>{
 assert.equal(typeof mod.exportStartingBreaks,'function');
 for(const selected of [[],[ids[0],ids[0]],['evil'],null])await assert.rejects(()=>mod.exportStartingBreaks(selected,{baseURL:root,fetchImpl}));
});
test('tampered metadata or any selected sample and oversized streams are rejected',async()=>{
 assert.equal(typeof mod.exportStartingBreaks,'function');
 for(const suffix of ['sample-contract.json','provenance.json',...ids.map(id=>id+'.adpcm')]){
  const bad=async url=>{const b=await readFile(new URL(url));if(String(url).endsWith(suffix)){const changed=Buffer.from(b);changed[changed.length-1]^=1;return new Response(changed);}return new Response(b);};
  await assert.rejects(()=>mod.exportStartingBreaks(ids,{baseURL:new URL('starting-break-export.mjs',root),fetchImpl:bad}),/identity|hash/);
 }
 await assert.rejects(()=>mod.exportStartingBreaks(ids,{baseURL:root,fetchImpl:async()=>new Response(new Uint8Array(100000))}),/size/);
});

test('selection is snapshotted and aborted preparation never returns a file',async()=>{
 const selected=[ids[0]];
 let first=true;
 const changing=async url=>{if(first){first=false;selected.push(ids[1]);}return fetchImpl(url);};
 const out=await mod.exportStartingBreaks(selected,{baseURL:new URL('starting-break-export.mjs',root),fetchImpl:changing});
 assert.deepEqual(out.selectedIds,[ids[0]]);
 const controller=new AbortController();controller.abort();
 await assert.rejects(()=>mod.exportStartingBreaks(ids,{baseURL:root,fetchImpl,signal:controller.signal}),{name:'AbortError'});
});
test('download control cancels stale selections and does not save after destroy',async()=>{
 assert.equal(typeof mod.bindStartingBreakExport,'function','download binding missing');
 const button=new EventTarget();button.disabled=false;const status={textContent:''};let idsNow=[ids[0]],resolve,saved=[];
 const binding=mod.bindStartingBreakExport(button,{status,getSelectedIds:()=>idsNow,exportImpl:()=>new Promise(r=>resolve=r),save:x=>saved.push(x)});
 button.dispatchEvent(new Event('click'));assert.equal(button.disabled,true);
 idsNow=[ids[1]];binding.refresh();resolve({bytes:new Uint8Array([1])});await new Promise(r=>setTimeout(r,0));assert.equal(saved.length,0);assert.equal(button.disabled,false);
 button.dispatchEvent(new Event('click'));binding.destroy();resolve({bytes:new Uint8Array([2])});await new Promise(r=>setTimeout(r,0));assert.equal(saved.length,0);
});
test('download control saves current choice and enables retry after rejection',async()=>{
 assert.equal(typeof mod.bindStartingBreakExport,'function');
 const button=new EventTarget(),status={textContent:''};let fail=true,saved=[];
 const binding=mod.bindStartingBreakExport(button,{status,getSelectedIds:()=>ids.slice(0,2),exportImpl:async selected=>{if(fail)throw Error('network');return {selectedIds:selected,bytes:new Uint8Array([1]),slotBytes:[12]};},save:x=>saved.push(x)});
 button.dispatchEvent(new Event('click'));await new Promise(r=>setTimeout(r,0));assert.equal(saved.length,0);assert.equal(button.disabled,false);assert.match(status.textContent,/could not/);
 fail=false;button.dispatchEvent(new Event('click'));await new Promise(r=>setTimeout(r,0));assert.equal(saved.length,1);assert.deepEqual(saved[0].selectedIds,ids.slice(0,2));binding.destroy();
});
test('product test entrypoint includes selected-break export regression',async()=>{
 const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url)));
 assert.match(pkg.scripts['test:product'],/\btests\/starting-break-export\.test\.mjs\b/);
});
