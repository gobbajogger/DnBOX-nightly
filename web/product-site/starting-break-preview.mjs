// SPDX-License-Identifier: GPL-3.0-only
// Contract-verified public preview transport and preference normalization; no device writes.
const SIZES=Object.freeze({'personal-br1-zone1':69644,'personal-br1-zone2':83620,'personal-br1-zone3':85768,'personal-br2-zone1':92412,'personal-br2-zone2':105870});
// Browser preference recovery only; the picker still verifies the pinned contract.
export function normalizeStartingBreakSelection(value){
 if(!Array.isArray(value))return undefined;
 return [...new Set(value.filter(id=>typeof id==='string'&&Object.hasOwn(SIZES,id)))];
}
export function createStartingBreakPreview({baseURL=import.meta.url,fetchImpl=globalThis.fetch}={}){
 const urls=new Map(Object.entries(SIZES).map(([id,size])=>[new URL(`./assets/starting-breaks/${id}.wav`,baseURL).href,{id,size}]));
 return Object.freeze({
  // Legacy picker callback name retained; resolved resources are public contract assets.
  resolvePrivateUrl(id){if(!Object.hasOwn(SIZES,id))throw Error('Unknown starting break');return new URL(`./assets/starting-breaks/${id}.wav`,baseURL).href;},
  async fetchBytes(url,{signal}={}){
   const asset=urls.get(url);if(!asset)throw Error('Unapproved preview URL');
   const response=await fetchImpl(url,{credentials:'omit',cache:'force-cache',...(signal?{signal}:{})});
   if(!response.ok)throw Error('Preview unavailable');
   const length=response.headers?.get('content-length');
   if(length!==null&&length!==undefined&&Number(length)!==asset.size)throw Error('Preview size mismatch');
   if(!response.body?.getReader)throw Error('Bounded preview stream unavailable');
   const reader=response.body.getReader(),parts=[];let size=0;
   try{
    for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>asset.size)throw Error('Preview exceeds expected size');parts.push(value);}
    if(size!==asset.size)throw Error('Preview size mismatch');
    const bytes=new Uint8Array(size);let at=0;for(const part of parts){bytes.set(part,at);at+=part.byteLength;}return bytes;
   }catch(error){await reader.cancel().catch(()=>{});throw error;}
   finally{reader.releaseLock();}
  }
 });
}
