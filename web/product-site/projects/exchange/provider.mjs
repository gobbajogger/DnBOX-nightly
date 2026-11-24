// SPDX-License-Identifier: GPL-3.0-only
// This pin is generated only after the site builder admits the immutable
// firmware runtime. An uploaded project cannot assert its own authority.
export async function loadTraceProvider(fetchPin=globalThis.fetch){
 try {
  const response=await fetchPin(new URL('runtime-pin.json',import.meta.url),{credentials:'same-origin',redirect:'error'});
  if (!response.ok) throw Error('No MIDI renderer for this site');
  const pin=await response.json();
  if (pin.schema!==1 || !/^[a-f0-9]{40}$/.test(pin.source) || !/^[a-f0-9]{64}$/.test(pin.sha256) ||
      !Number.isSafeInteger(pin.bytes) || pin.bytes<1 || pin.bytes>16*1024*1024)
   throw Error('Invalid MIDI renderer pin');
  return {approvedSources:[pin.source],provider:{render(request){
   return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./trace-worker.mjs',import.meta.url),{type:'module'});
    function finish(error,trace){worker.terminate();if(error)reject(Error(error));else resolve(trace);}
    worker.onmessage=({data})=>finish(data.error,data.trace);
    worker.onerror=()=>finish('MIDI renderer failed');
    worker.postMessage({pin,request});
   });
  }}};
 } catch { return {provider:null,approvedSources:[]}; }
}
