// SPDX-License-Identifier: GPL-3.0-only
// This is an exact-runtime emulator session, not a keyboard project/sample backup.
const MAX=131072;
export function createSessionCodec(input,{crypto=globalThis.crypto}={}){
 const {firmwareSource,runtimeSha256}=input??{};
 if(typeof firmwareSource!=='string'||!/^[a-f0-9]{40}$/.test(firmwareSource)||typeof runtimeSha256!=='string'||!/^[a-f0-9]{64}$/.test(runtimeSha256))throw Error('Invalid session identity');
 const sha=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
 return Object.freeze({
  async encode(inputBytes){
   if(!(inputBytes instanceof Uint8Array)||inputBytes.length<8||inputBytes.length>MAX)throw Error('Invalid session size');
   const bytes=inputBytes.slice();let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
   return JSON.stringify({kind:'dnbox-host-session',version:1,firmwareSource,runtimeSha256,bytes:bytes.length,sha256:await sha(bytes),payload:btoa(binary)});
  },
  async decode(text){
   if(typeof text!=='string'||text.length>200000)throw Error('Invalid session size');const r=JSON.parse(text);
   if(!r||r.kind!=='dnbox-host-session'||r.version!==1||r.firmwareSource!==firmwareSource||r.runtimeSha256!==runtimeSha256)throw Error('Session identity mismatch');
   if(!Number.isSafeInteger(r.bytes)||r.bytes<8||r.bytes>MAX||typeof r.payload!=='string'||r.payload.length!==4*Math.ceil(r.bytes/3)||!/^[A-Za-z0-9+/]*={0,2}$/.test(r.payload))throw Error('Invalid session size or encoding');
   if(typeof r.sha256!=='string'||!/^[a-f0-9]{64}$/.test(r.sha256))throw Error('Session hash mismatch');
   const binary=atob(r.payload);if(binary.length!==r.bytes||btoa(binary)!==r.payload)throw Error('Session payload size mismatch');const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
   if(await sha(bytes)!==r.sha256)throw Error('Session hash mismatch');return bytes;
  }
 });
}
