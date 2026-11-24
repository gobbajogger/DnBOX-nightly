// SPDX-License-Identifier: GPL-3.0-only
// Host boundary for a fresh pinned firmware reactor. No user data leaves it.
const PARTS = [
 ['drum909','909',9], ['drum808','808',10], ['synth-a','Synth A',1],
 ['synth-b','Synth B',2], ['break','BREAK',3],
];
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join('');
export const traceExports = ['web_boot','web_trace_io','web_trace_io_capacity','web_trace_slot',
 'web_trace_start','web_trace_render','web_trace_events'];
export function createTraceReader(ex, source) {
 if (!/^[a-f0-9]{40}$/.test(source) || !traceExports.every(k => typeof ex[k]==='function') ||
     !(ex.memory instanceof WebAssembly.Memory)) throw Error('MIDI renderer unavailable');
 return {async render({project,images=null,seed,endSample,sampleRate}) {
  if (!(project instanceof Uint8Array) || !project.length || !Number.isSafeInteger(endSample) ||
      endSample < 1 || endSample > 44100*86400 || sampleRate !== 44100 || seed !== 0)
   throw Error('Invalid MIDI export range or project');
  if (ex.web_boot() !== 0) throw Error('MIDI renderer already used');
  const io=ex.web_trace_io(), size=ex.web_trace_io_capacity();
  const put=bytes=>{
   if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > size) throw Error('Invalid native project or sample range');
   new Uint8Array(ex.memory.buffer,io,bytes.length).set(bytes);
  };
  if (images !== null) {
   if (!Array.isArray(images) || images.length > 3) throw Error('Unsupported sample layout');
   for (let i=0;i<images.length;i++) if (images[i] !== null) {
    put(images[i]); if (ex.web_trace_slot(i,images[i].length) !== 0) throw Error('Native sample validation failed');
   }
  }
  put(project);
  const tempo=ex.web_trace_start(project.length);
  if (!(tempo > 0 && tempo <= 0xffffff)) throw Error('This project does not match the MIDI renderer firmware');
  const events=[], held=new Set();
  function collect(frames,previous,end) {
   const n=ex.web_trace_render(frames);
   if (!Number.isInteger(n) || n<0 || n>512 || events.length+n>100000) throw Error('MIDI event capacity exceeded');
   if (!n) return;
   const data=new DataView(ex.memory.buffer,ex.web_trace_events(),n*8);
   for (let i=0;i<n;i++) {
    const sample=data.getUint32(i*8,true), packet=data.getUint32(i*8+4,true);
    const status=packet&0xff, pitch=packet>>>8&0xff, velocity=packet>>>16&0xff;
    const kind=status>>>4, part=PARTS[status&15];
    if (sample<previous || sample>end || (events.length && sample<events.at(-1).sample) ||
        !part || (kind!==8 && kind!==9) || pitch>127 || velocity>127) throw Error('Invalid source MIDI event');
    const type=kind===9 && velocity>0?'noteOn':'noteOff', key=part[0]+':'+pitch;
    if (type==='noteOn') {
     if (held.has(key)) throw Error('Overlapping source notes cannot be represented unambiguously');
     held.add(key);
    } else if (!held.delete(key)) throw Error('Source release has no onset');
    events.push({sample,order:events.length,track:part[0],type,channel:part[2],note:pitch,velocity});
   }
  }
  for (let pos=0;pos<endSample;) {
   const frames=Math.min(256,endSample-pos); collect(frames,pos,pos+frames); pos+=frames;
  }
  collect(0,endSample,endSample);
  if (held.size) throw Error('The native stop did not release every note');
  return {
   schema:'dnbox-midi-trace/1',
   authority:{kind:'source-executed',source,projectSha256:hex(await crypto.subtle.digest('SHA-256',project)),seed},
   sampleRate,endSample,tracks:PARTS.map(([id,name])=>({id,name})),
   tempos:[{sample:0,microsecondsPerQuarter:tempo}],timeSignatures:[],markers:[],annotations:[],events,
  };
 }};
}
