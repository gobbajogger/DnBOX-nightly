import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
assert.ok(process.env.DNR3_WEB,'set DNR3_WEB to the exact PR dnr3.mjs file');
const d=await import(pathToFileURL(resolve(process.env.DNR3_WEB)));
const mode=process.argv[2];
const sj6=process.env.TYPED_ENGINE==='sj6';
const owner=sj6?1:0, engine=sj6?3:2, originalId=255;
const enc=(t,op,seq,f)=>t+':'+Buffer.from(d.encodeRequest(op,seq,f)).toString('hex');
const open=enc(1500,d.OP.OPEN,8,{client_id:1121});
const hello=enc(1300,d.OP.HELLO,7,{client_proto:3});
const decode=p=>fs.readFileSync(p,'utf8').split('\n').filter(l=>/\] usb in:/.test(l)).flatMap(l=>{
 const b=Uint8Array.from(Buffer.from(l.split('usb in:')[1].replace(/\s/g,''),'hex'));
 if(b[0]!==240 || b[1]!==125 || b[2]!==68 || b[3]!==78)return [];
 return [d.decodeFrame(b).op===d.OP.NOTIFY?d.decodeNotify(b):d.decodeReply(b)];
});
if(mode==='open')console.log([hello,open].join(';'));
const s1cut={kind:113,a:engine,b:owner,c:127};
const bank={kind:41,a:0,b:owner,c:0};
const status={kind:43,a:0,b:owner,c:0};
const scan=(p,seq)=>decode(p).find(x=>x.seq===seq);
function base(p) {
 const epoch=scan(p,8)?.fields?.epoch;assert.ok(epoch);
 return {epoch,seq:[hello,open,enc(1800,d.OP.PARAM_SET,9,{epoch,...bank,expect:d.KEEP,value:engine}),
  enc(2100,d.OP.WATCH,16,{epoch,mask:d.WATCH.VOICE}),enc(2350,d.OP.PARAM_GET,10,{params:[bank,status]})]};
}
if(mode==='adopt'){
 const {seq}=base(process.argv[3]);
 console.log([...seq,enc(2450,d.OP.PARAM_GET,11,{params:[s1cut]}),
  enc(2550,d.OP.DESCRIBE,12,s1cut)].join(';'));
}
if(mode==='edit'){
 const {epoch,seq}=base(process.argv[3]);
 const r=scan(process.argv[4],11)?.fields?.params?.[0];
 assert.ok(r&&r.max===1&&r.value!==d.KEEP);
 const n=1-r.value;
 console.log([...seq,enc(2450,d.OP.PARAM_GET,11,{params:[s1cut]}),
  enc(2550,d.OP.DESCRIBE,12,s1cut),(sj6?'2600:923c64':'2600:913c64'),enc(2670,d.OP.PARAM_SET,13,{epoch,...s1cut,expect:r.value,value:n,expect_bank:engine}),
  enc(2840,d.OP.PARAM_GET,14,{params:[s1cut]}),(sj6?'3120:823c00':'3120:813c00')].join(';'));
}
if(mode==='receipt'){
 const rows=decode(process.argv[3]);const r=i=>rows.find(x=>x.seq===i);
 assert.equal(r(7).fields.board,+process.argv[4]);assert.equal(r(7).fields.caps,8191);
 assert.equal(r(10).fields.params[0].value,engine);assert.equal(r(10).fields.params[1].value,1);
 assert.equal(r(12).fields.unit,0x60);assert.equal(r(12).fields.name,'LINK');assert.equal(r(12).fields.max,1);
 assert.equal(r(13).status,sj6?d.STATUS.OK:d.STATUS.QUEUED);
 assert.notEqual(r(11).fields.params[0].value,r(13).fields.value);
 assert.equal(r(14).fields.params[0].value,r(13).fields.value);
 assert.ok(rows.some(x=>x.kind===d.NOTIFY_KIND.VOICE&&x.fields.part===2+owner&&x.fields.note===60&&x.fields.velocity===100));
 console.log(JSON.stringify({voiceNoteConfirmed:true,board:r(7).fields.board,engine,originalId,
    before:r(11).fields.params[0].value,ack:r(13).status,after:r(14).fields.params[0].value,type:r(12).fields.unit}));
}
