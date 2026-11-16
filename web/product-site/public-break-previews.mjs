// SPDX-License-Identifier: GPL-3.0-only
// Public owner-designated previews only. Picker retains contract/PCM/hash admission.
const IDS=Object.freeze(['personal-br1-zone1','personal-br1-zone2','personal-br1-zone3','personal-br2-zone1','personal-br2-zone2']);
export function createPublicBreakPreviews(moduleUrl=import.meta.url){
 const base=new URL(moduleUrl);
 if(!['http:','https:'].includes(base.protocol)||base.username||base.password)throw Error('Public preview origin required');
 const urls=new Map(IDS.map(id=>[id,new URL('./assets/stock-breaks/'+id+'.wav',base).href]));
 const allowed=new Set(urls.values());
 return Object.freeze({
  // Compatibility option name; these bytes no longer require a private route.
  resolvePrivateUrl(id){if(!urls.has(id))throw Error('Unknown starting break');return urls.get(id);},
  async fetchBytes(url){
   if(typeof url!=='string'||!allowed.has(url))throw Error('Unknown public preview URL');
   const response=await fetch(url,{cache:'no-store',mode:'same-origin',credentials:'same-origin',redirect:'error'});
   if(!response.ok||response.redirected)throw Error('Preview unavailable');
   return new Uint8Array(await response.arrayBuffer());
  }
 });
}
