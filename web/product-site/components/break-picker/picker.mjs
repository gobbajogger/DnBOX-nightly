// Pure model. No network, audio playback, device writes or package construction.
export const CONFIRMED_CONTRACT_SHA256 = '7c87970ea454e06c935d782cc93ad99b056e5502eb2462ccc2f35d2be0b7c259';
const IDS = Object.freeze(['personal-br1-zone1','personal-br1-zone2','personal-br1-zone3','personal-br2-zone1','personal-br2-zone2']);
const HASH = /^[0-9a-f]{64}$/;
const integer = n => Number.isSafeInteger(n) && n > 0;
const check = (condition, message) => { if (!condition) throw new Error(message); };
async function digest(bytes) {
 return [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
function validateContract(c) {
 check(c?.schema === 'dnbox-owner-confirmed-break-set/1' && c.rate === 22050 && Array.isArray(c.assets) && c.assets.length === 5, 'unsupported contract');
 check(Array.isArray(c.default_selected_ids) && c.default_selected_ids.length === 5 && IDS.every((id,i)=>c.default_selected_ids[i]===id), 'invalid contract defaults');
 for (const [i,a] of c.assets.entries()) {
  check(a.id===IDS[i] && typeof a.name==='string' && a.name.length>0 && a.sample_rate===22050 && a.channels===1 && a.codec==='IMA_ADPCM4_LOW_NIBBLE_FIRST' && a.whole_original_encoded_zone===true, 'unsupported contract asset');
  check(integer(a.frames) && integer(a.adpcm_bytes) && integer(a.preview_bytes) && a.adpcm_bytes===Math.ceil(a.frames/2) && a.initial_predictor===0 && a.initial_index===0, 'invalid contract metadata');
  check(['adpcm_sha256','decoded_pcm_sha256','preview_sha256'].every(k=>typeof a[k]==='string' && HASH.test(a[k])), 'invalid contract hash metadata');
 }
}
function validateWav(bytes, asset) {
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const tag=p=>String.fromCharCode(...bytes.subarray(p,p+4));
 check(bytes.length>=12 && tag(0)==='RIFF' && tag(8)==='WAVE' && v.getUint32(4,true)+8===bytes.length, 'invalid WAV container');
 let fmt=null,data=null;
 for(let pos=12;pos<bytes.length;) {
  check(pos+8<=bytes.length,'truncated WAV chunk');
  const name=tag(pos),n=v.getUint32(pos+4,true),start=pos+8;
  check(start+n<=bytes.length,'truncated WAV payload');
  if(name==='fmt ') { check(fmt===null && n>=16,'invalid WAV format chunk');fmt=start; }
  if(name==='data') { check(data===null,'duplicate WAV data');data={start,length:n}; }
  pos=start+n+(n&1);check(pos<=bytes.length,'truncated WAV padding');
 }
 check(fmt!==null && data!==null,'missing WAV format/data');
 check(v.getUint16(fmt,true)===1 && v.getUint16(fmt+2,true)===1 && v.getUint32(fmt+4,true)===22050 && v.getUint32(fmt+8,true)===44100 && v.getUint16(fmt+12,true)===2 && v.getUint16(fmt+14,true)===16 && data.length===asset.frames*2,'unsupported WAV rate/format/frames');
 return bytes.subarray(data.start,data.start+data.length);
}
/** expectedSha256 is a trusted deployment pin, never input from the downloaded contract.
 * The optional pin permits separately reviewed future contracts and synthetic tests.
 */
export async function createPicker(contractBytes, expectedSha256=CONFIRMED_CONTRACT_SHA256) {
 check(contractBytes instanceof Uint8Array && HASH.test(expectedSha256),'invalid contract hash/input');
 const raw=Uint8Array.from(contractBytes);
 check(await digest(raw)===expectedSha256,'contract hash mismatch');
 const c=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));validateContract(c);
 let selected=new Set(IDS);
 const assetFor=id=>{const i=IDS.indexOf(id);check(i!==-1,'unknown asset ID');return c.assets[i];};
 const selectedIds=()=>IDS.filter(id=>selected.has(id));
 const summary=()=>({selectedIds:selectedIds(),count:selected.size,sampleRate:22050,encodedPayloadBytes:c.assets.filter(a=>selected.has(a.id)).reduce((n,a)=>n+a.adpcm_bytes,0),packageBytes:null,action:selected.size?'prepare-selected-assets':'leave-base-unchanged',eraseUserStorage:false});
 return Object.freeze({
  selectedIds,
  select(ids) {
   check(Array.isArray(ids),'selection must be an array');
   for(const id of ids) assetFor(id);
   check(new Set(ids).size===ids.length,'duplicate selection');selected=new Set(ids);
  },
  all(){selected=new Set(IDS);},
  none(){selected=new Set();},
  summary,
  assessCapacity(availableBytes) {
   check(availableBytes===undefined || Number.isSafeInteger(availableBytes) && availableBytes>=0,'invalid capacity');
   const s=summary();
   const status=!s.count?'unchanged-base-required':availableBytes===undefined?'capacity-unknown':s.encodedPayloadBytes>availableBytes?'insufficient-capacity':'package-validation-required';
   return {...s,status,availableBytes:availableBytes??null,canInstall:false};
  },
  async preview(id,{resolvePrivateUrl,fetchBytes}={}) {
   const a=assetFor(id);check(typeof resolvePrivateUrl==='function' && typeof fetchBytes==='function','private preview resolver required');
   const url=await resolvePrivateUrl(id);check(typeof url==='string' && url.length>0,'private preview unavailable');
   const response=await fetchBytes(url);check(response instanceof Uint8Array,'preview bytes required');
   const bytes=Uint8Array.from(response);
   check(bytes.length===a.preview_bytes && await digest(bytes)===a.preview_sha256,'preview hash/size mismatch');
   const pcm=validateWav(bytes,a);check(await digest(pcm)===a.decoded_pcm_sha256,'preview PCM hash mismatch');
   return {id,bytes,mimeType:'audio/wav',sampleRate:a.sample_rate,channels:a.channels,frames:a.frames,playbackRate:1};
  }
 });
}
