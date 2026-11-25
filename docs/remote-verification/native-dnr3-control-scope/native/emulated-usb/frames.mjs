import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
assert.ok(process.env.DNR3_WEB,'set DNR3_WEB to the exact PR dnr3.mjs file');
const d=await import(pathToFileURL(resolve(process.env.DNR3_WEB)));
const mode=process.argv[2];
const enc=(t,op,seq,f)=>t+':'+Buffer.from(d.encodeRequest(op,seq,f)).toString('hex');
const open=enc(1500,d.OP.OPEN,8,{client_id:1121});
const hello=enc(1300,d.OP.HELLO,7,{client_proto:3});
const decode=p=>fs.readFileSync(p,'utf8').split('\n').filter(l=>/\] usb in:/.test(l)).flatMap(l=>{
 const b=Uint8Array.from(Buffer.from(l.split('usb in:')[1].replace(/\s/g,''),'hex'));
 if(b[0]!==240 || b[1]!==125 || b[2]!==68 || b[3]!==78)return [];
 return [d.decodeFrame(b).op===d.OP.NOTIFY?d.decodeNotify(b):d.decodeReply(b)];
});
if(mode==='open')console.log([hello,open].join(';'));
if(mode==='commands'){
 const replies=decode(process.argv[3]);
 const epoch=replies.find(x=>x.seq===8)?.fields?.epoch; assert.ok(epoch);
 console.log([hello,open,enc(1750,d.OP.WATCH,9,{epoch,mask:d.WATCH.VOICE|d.WATCH.POSITION|d.WATCH.TRANSPORT}),
    enc(2050,d.OP.TEMPO,10,{epoch,bpm_x10:1045}),enc(2250,d.OP.STATE,11,{}),
    '2350:99246b','2460:892400','2500:fa','3160:fc'].join(';'));
}
if(mode==='receipt'){
 const a=decode(process.argv[3]);const r=seq=>a.find(x=>x.seq===seq);
 assert.equal(r(7).fields.proto,3);assert.equal(r(7).fields.board,+process.argv[4]);assert.equal(r(7).fields.caps,4095);
 assert.ok(r(8).fields.epoch);assert.equal(r(9).fields.mask,d.WATCH.VOICE|d.WATCH.POSITION|d.WATCH.TRANSPORT);
 assert.equal(r(10).fields.bpm_x10,1045);assert.equal(r(11).fields.bpm_x10,1045);
 const events=a.filter(x=>x.kind!==undefined);
 assert.ok(events.some(e=>e.kind===d.NOTIFY_KIND.VOICE&&e.fields.part===0&&e.fields.note===36&&e.fields.velocity===107));
 const positions=events.filter(e=>e.kind===d.NOTIFY_KIND.POSITION).map(e=>e.fields.step_pos);
 assert.deepEqual(positions.map(p=>p[0]),[0,1,2,3,4,127]);
 assert.ok(positions.at(-1).every(s=>s===127));
 console.log(JSON.stringify({stateChannels:r(11).fields.ch,hello:r(7).fields.board,capabilities:r(7).fields.caps,watch:r(9).fields.mask,bpmAcknowledged:r(10).fields.bpm_x10,bpmState:r(11).fields.bpm_x10,totalDecoded:a.length,events:events.map(v=>({kind:v.kind,...v.fields}))}));
}
