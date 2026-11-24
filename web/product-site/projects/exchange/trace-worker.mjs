// SPDX-License-Identifier: GPL-3.0-only
import {createTraceReader} from './trace-reader.mjs';
const runtime=new URL('../../emu/',import.meta.url);
self.onmessage=async ({data:{pin,request}}) => {
 try {
  const response=await fetch(new URL('kernel.wasm',runtime),{credentials:'same-origin',redirect:'error'});
  if (!response.ok) throw Error('MIDI renderer unavailable');
  const bytes=await response.arrayBuffer();
  if (bytes.byteLength!==pin.bytes) throw Error('MIDI renderer size mismatch');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if (digest!==pin.sha256) throw Error('MIDI renderer hash mismatch');
  const {createKernelWasi,assertKernelImports}=await import(new URL('wasi.mjs',runtime));
  let memory;
  const module=await WebAssembly.compile(bytes), wasi=createKernelWasi(()=>memory);
  assertKernelImports(module,wasi);
  const kernel=await WebAssembly.instantiate(module,{wasi_snapshot_preview1:wasi});
  memory=kernel.exports.memory;kernel.exports._initialize?.();
  self.postMessage({trace:await createTraceReader(kernel.exports,pin.source).render(request)});
 } catch (error) { self.postMessage({error:String(error?.message??error)}); }
};
