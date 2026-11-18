// SPDX-License-Identifier: GPL-3.0-only
// File preparation only. Native Restore checks destination capacity and asks before replacing slots.
import {SAMPLE_CONTRACT_SHA256} from './sample-pin.mjs';
import {composeGroup,crc32,sha} from './components/installer-consumer-v2/composer.mjs';
const PROVENANCE_SHA256='7030582de5624bf6608050ec8643df081a798dfb657cbe99aced89958353f983';
const IDS=['personal-br1-zone1','personal-br1-zone2','personal-br1-zone3','personal-br2-zone1','personal-br2-zone2'];
async function exact(url,size,hash,fetchImpl,signal){
 signal?.throwIfAborted();
 const response=await fetchImpl(url,{credentials:'omit',signal});
 if(!response.ok||!response.body?.getReader)throw Error('Sample unavailable');
 const reader=response.body.getReader(),bytes=new Uint8Array(size);let at=0;
 try{
  for(;;){signal?.throwIfAborted();const {value,done}=await reader.read();if(done)break;if(at+value.length>size)throw Error('Sample size mismatch');bytes.set(value,at);at+=value.length;}
  if(at!==size)throw Error('Sample size mismatch');
  if(await sha(bytes)!==hash)throw Error('Sample identity/hash mismatch');
  signal?.throwIfAborted();return bytes;
 }catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
}
export async function exportStartingBreaks(selectedIds,{baseURL=import.meta.url,fetchImpl=globalThis.fetch,signal}={}){
 if(!Array.isArray(selectedIds)||!selectedIds.length||new Set(selectedIds).size!==selectedIds.length||selectedIds.some(id=>!IDS.includes(id)))throw Error('Choose known starting breaks');
 const selected=new Set(selectedIds); // Snapshot selection before any network await.
 const contract=JSON.parse(new TextDecoder().decode(await exact(new URL('./sample-contract.json',baseURL),2702,SAMPLE_CONTRACT_SHA256,fetchImpl,signal)));
 const provenance=JSON.parse(new TextDecoder().decode(await exact(new URL('./assets/starting-breaks/provenance.json',baseURL),7454,PROVENANCE_SHA256,fetchImpl,signal)));
 const groups=[];
 for(const asset of contract.assets){
  if(!selected.has(asset.id))continue;
  const source=provenance.assets.find(a=>a.id===asset.id);
  const data=await exact(new URL(`./assets/starting-breaks/${asset.id}.adpcm`,baseURL),asset.adpcm_bytes,asset.adpcm_sha256,fetchImpl,signal);
  const zone=Uint8Array.from(source.source_zone_header_hex.match(/../g),h=>parseInt(h,16));
  if(await sha(zone)!==source.source_zone_header_sha256)throw Error('Zone identity mismatch');
  if(!groups.length||groups.at(-1)[0].group!==source.source_group)groups.push([]);
  groups.at(-1).push({id:asset.id,group:source.source_group,zone,data,frames:asset.frames});
 }
 const images=groups.map(composeGroup),entries=[];let offset=0;
 images.forEach((image,i)=>{
  // This is a source-file envelope, not a claim about any connected device's layout.
  if(image.length>81920)throw Error('Starting group exceeds stock source slot size');
  // SMP_END commits the first 480 bytes on a freshly erased slot. Preserve
  // the erased gap before the payload so byte-for-byte Restore can verify it.
  image.fill(0xff,480,512);
  const group=groups[i],payload=image.subarray(512);
  entries.push({slot:i+1,size:81920,empty:false,name:group[0].group,zones:group.length,samples:group.map(r=>r.frames),rates:group.map(()=>22050),data_len:payload.length,data_crc32:crc32(payload),offset,length:image.length,crc32:crc32(image)});offset+=image.length;
 });
 const json=new TextEncoder().encode(JSON.stringify({format:'x0xslots',version:1,created:'prepared starting breaks (not a device backup)',count:images.length,size:81920,slots:entries}));
 const bytes=new Uint8Array(20+json.length+offset),view=new DataView(bytes.buffer);
 bytes.set(new TextEncoder().encode('X0XSLOTS'));view.setUint16(8,1,true);view.setUint32(12,json.length,true);bytes.set(json,16);
 let at=16+json.length;for(const image of images){bytes.set(image,at);at+=image.length;}view.setUint32(at,crc32(bytes.subarray(0,at)),true);
 signal?.throwIfAborted();
 return Object.freeze({bytes,filename:'DnBOX-starting-breaks.x0xslots',selectedIds:IDS.filter(id=>selected.has(id)),slotBytes:images.map(i=>i.length)});
}
function saveDownload(file){
 const url=URL.createObjectURL(new Blob([file.bytes],{type:'application/octet-stream'}));
 try{const a=document.createElement('a');a.href=url;a.download=file.filename;a.click();}
 finally{setTimeout(()=>URL.revokeObjectURL(url),10000);}
}
export function bindStartingBreakExport(button,{status,getSelectedIds,exportImpl=exportStartingBreaks,save=saveDownload}){
 let generation=0,disposed=false,controller=null;
 function refresh(){generation++;controller?.abort();controller=null;button.disabled=disposed||!getSelectedIds().length;status.textContent='';}
 async function click(){
  if(disposed||button.disabled)return;
  const own=++generation,selection=[...getSelectedIds()];controller?.abort();controller=new AbortController();button.disabled=true;status.textContent='Preparing your breaks…';
  try{
   const file=await exportImpl(selection,{signal:controller.signal});
   if(disposed||own!==generation||JSON.stringify(selection)!==JSON.stringify(getSelectedIds()))return;
   save(file);status.textContent='File prepared. Back up your samples, then use Restore in Samples. Restore replaces the listed slots.';
  }catch{if(!disposed&&own===generation)status.textContent='Your breaks could not be prepared. Try again.';}
  finally{if(!disposed&&own===generation){controller=null;button.disabled=!getSelectedIds().length;}}
 }
 button.addEventListener('click',click);refresh();
 return Object.freeze({refresh,destroy(){if(disposed)return;disposed=true;refresh();button.removeEventListener('click',click);}});
}
