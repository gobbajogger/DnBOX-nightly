// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {createTraceReader} from '../web/product-site/projects/exchange/trace-reader.mjs';
import {exportTrace} from '../web/product-site/projects/exchange/smf.mjs';

const firmware = 'a'.repeat(40), project = Uint8Array.of(1, 2, 3);
function peer(events, terminal = []) {
 const memory = new WebAssembly.Memory({initial:1}), bytes = new Uint8Array(memory.buffer);
 const view = new DataView(memory.buffer); let count = 0, position = 0, ended = false, primed = false;
 return {memory, web_boot: () => 0, web_trace_io: () => 0,
  web_trace_io_capacity: () => 2048, web_trace_slot: () => 0,
  web_trace_start(n) {
   assert.equal(n, project.length);
   assert.deepEqual(bytes.slice(0, n), project);
   primed = true; return 500000;
  },
  web_trace_render(n) {
   assert.ok(primed && !ended && n >= 0 && n <= 256);
   assert.equal(count, 0);
   if (!n) ended = true;
   const source = ended ? terminal : events.filter(e => e[0] > position - (position === 0 ? 1 : 0) && e[0] <= position+n);
   for (let i=0;i<source.length;i++) {
    const [sample, packet] = source[i];
    view.setUint32(4096+i*8, sample, true);view.setUint32(4100+i*8, packet, true);
   }
   position+=n; count=source.length; return count;
  },
  web_trace_events() { count=0; return 4096; },
 };
}
const note=(status,pitch,vel)=>status|pitch<<8|vel<<16;
test('maps source-owned notes to separate SMF1 tracks, stops at the exact range, no extra note onsets', async()=>{
 const source=peer([[0,note(0x90,36,88)],[0,note(0x80,36,0)],[17,note(0x92,60,110)]],[[512,note(0x82,60,0)]]);
 const t=await createTraceReader(source,firmware).render({project,endSample:512,sampleRate:44100,seed:0});
 assert.deepEqual(t.events.map(e=>[e.sample,e.track,e.type,e.channel,e.note,e.velocity]),[
  [0,'drum909','noteOn',9,36,88],[0,'drum909','noteOff',9,36,0],
  [17,'synth-a','noteOn',1,60,110],[512,'synth-a','noteOff',1,60,0],
 ]);
 const result=exportTrace(t);
 assert.equal(Buffer.from(result.midi).subarray(0,14).toString('hex'),'4d54686400000006000100062580');
 assert.equal(result.clips.length,5);
 assert.equal(result.metadata.sameSampleNotes.length,1);
});
test('fails closed for unmatched releases and invalid export inputs', async()=>{
 await assert.rejects(createTraceReader(peer([[7,note(0x82,60,0)]]),firmware).render({project,endSample:42,sampleRate:44100,seed:0}),/release/i);
 await assert.rejects(createTraceReader(peer([]),firmware).render({project,endSample:0,sampleRate:44100,seed:0}),/range/i);
});
