// SPDX-License-Identifier: GPL-3.0-only
// Browser test adapter only. The ports carry raw bytes, never create DNR3
// replies, and cannot open a physical port. No public AudioWorklet/Remote UX.
export async function installWasmWebMidi(base, expected) {
  const {createKernelWasi} = await import(new URL('wasi.mjs', base));
  const get = async name => {
    const response = await fetch(new URL(name, base), {cache:'no-store'});
    if (!response.ok) throw Error('Firmware fixture '+name+': '+response.status);
    return response;
  };
  const meta = await (await get('runtime.json')).json();
  const binary = await (await get('kernel.wasm')).arrayBuffer();
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256',binary))]
    .map(x=>x.toString(16).padStart(2,'0')).join('');
  if (meta.firmware_source !== expected.firmware || meta.kernel_source !== expected.kernel ||
      meta.wasm_bytes !== binary.byteLength || meta.wasm_sha256 !== digest || expected.wasm !== digest)
    throw Error('Exact firmware fixture identity did not match');

  let memory, nanos=0n;
  const wasi = createKernelWasi(()=>memory,{clockNanoseconds:()=>nanos});
  const {instance:{exports:ex}} = await WebAssembly.instantiate(binary,{wasi_snapshot_preview1:wasi});
  memory=ex.memory;
  ex._initialize?.();
  if (ex.web_boot() !== 0 || !(ex.web_remote_caps()&2)) throw Error('No real DNR3 firmware');

  class Port extends EventTarget {
    constructor(type) { super(); this.type=type; this.id='fixture-'+type;
      this.name='DnBOX'; this.manufacturer='DnBOX'; this.state='connected'; this.connection='closed'; }
    async open() { this.connection='open'; return this; }
    async close() { this.connection='closed'; return this; }
  }
  const input=new Port('input'), output=new Port('output');
  const out=[], inbound=[], refusals=[], permissions=[];
  function receive() {
    for (let count; (count=ex.web_sysex_out_take())>0;) {
      const data=new Uint8Array(memory.buffer,ex.web_sysex_out(),count).slice();
      inbound.push(Array.from(data));
      const event=new Event('midimessage');
      Object.defineProperty(event,'data',{value:data});
      input.dispatchEvent(event);
    }
  }
  function render(blocks) {
    for(let i=0;i<blocks;i++) {
      if (ex.web_render(128)!==0) throw Error('Real firmware render failed');
      nanos+=2902494n;
      receive();
    }
  }
  function deviceReceive(frame) {
    const bytes=Uint8Array.from(frame);
    if (!bytes.length || bytes.length > 256) throw Error('Fixture MIDI frame out of bounds');
    let status;
    if (bytes[0]===0xf0) {
      new Uint8Array(memory.buffer,ex.web_sysex_buffer(),bytes.length).set(bytes);
      status=ex.web_sysex_in(bytes.length);
    } else {
      status=ex.web_midi(bytes[0],bytes[1]??0,bytes[2]??0);
    }
    if (status<0) refusals.push({bytes:Array.from(bytes),status});
    receive();
  }
  output.send=bytes=>{
    if(output.connection!=='open') throw Error('MIDI output is closed');
    out.push(Array.from(bytes)); deviceReceive(bytes);
  };
  const access=new EventTarget();
  access.sysexEnabled=true;
  access.inputs=new Map([[input.id,input]]);
  access.outputs=new Map([[output.id,output]]);
  Object.defineProperty(navigator,'requestMIDIAccess',{configurable:true,value:async options=>{
    permissions.push(options);
    if (options?.sysex!==true) throw Error('The fixture requires SysEx');
    return access;
  }});
  render(70);
  const timer=setInterval(()=>render(5),15);
  return {out,inbound,refusals,permissions,meta,deviceReceive,
    onInput(listener) { input.addEventListener('midimessage',listener); return ()=>input.removeEventListener('midimessage',listener); },
    // An independent firmware panel stimulus, not routed through Remote.
    panel(bits) { if(ex.web_buttons(bits)!==0) throw Error('Invalid panel bits'); render(45); },
    render,
    close() { clearInterval(timer); void input.close(); void output.close(); delete navigator.requestMIDIAccess; }};
}
