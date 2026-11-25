import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const d=await import(pathToFileURL(process.env.DNR3_WEB));
const log=process.argv[3]?fs.readFileSync(process.argv[3],'utf8'):'';
const frames=log.split('\n').flatMap(l=>{
 const m=l.match(/\[\s*(\d+) ms\] usb in:\s+(f0 7d 44 4e 03\b.*)/);
 if(!m)return [];
 const f=Uint8Array.from(Buffer.from(m[2].replace(/\s/g,''),'hex'));
 if(d.decodeFrame(f).op===d.OP.NOTIFY)return [];
 return [[+m[1],d.decodeReply(f)]];
});
const bank={kind:41,a:0,b:0,c:0}, status={kind:43,a:0,b:0,c:0};
if(process.argv[2]==='commands'){
 const cut={kind:112,a:2,b:0,c:16};
 const enc=(t,op,s,fields)=>t+':'+Buffer.from(d.encodeRequest(op,s,fields)).toString('hex');
 console.log([enc(1300,d.OP.HELLO,7,{client_proto:3}),...[1900,2900,4100,5650,7800].map((ms,i)=>
  enc(ms,d.OP.PARAM_GET,10+i,{params:[bank,status,cut]}))].join(';'));
}
if(process.argv[2]==='receipt'){
 const owners=frames.filter(([,r])=>r.seq>=10&&r.seq<=14).map(([ms,r])=>({ms,seq:r.seq,bank:r.fields.params?.[0].value,status:r.fields.params?.[1].value,cutoff:r.fields.params?.[2].value}));
 console.log(JSON.stringify({count:owners.length,owners,verifiedOwnerThroughout:owners.length===5&&owners.every(x=>x.bank===2&&x.status===1&&x.cutoff!==d.KEEP)}));
}
