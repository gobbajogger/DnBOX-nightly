import http from 'node:http';
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import readline from 'node:readline';
import path from 'node:path';
import * as d from '../remote206-typed/remote/dnr3.mjs';
const site=path.resolve('../remote206-audit/web/web/product-site');
const overlay=path.resolve('../remote206-typed/remote');
const proc=spawn(process.env.CABLE_BIN||'../remote206-typed/typed-cable',[],{stdio:['pipe','pipe','inherit']});
const lines=readline.createInterface({input:proc.stdout})[Symbol.asyncIterator]();
const journal=[];
let txn=Promise.resolve();
function exchange(command){
  const x=txn.then(async()=>{proc.stdin.write(command+'\n'); const raw=[];
    for (;;) {const {done,value}=await lines.next(); if(done)throw Error('host exited'); if(value==='END')return raw; if(!/^(?:[0-9a-f]{2})+$/.test(value))throw Error('bad host reply'); raw.push(value);}
  });
  txn=x;
  return x;
}
const prelude=`(()=>{const input=new EventTarget(),output=new EventTarget();
Object.assign(input,{name:'DnBOX',state:'connected'}); Object.assign(output,{name:'DnBOX',state:'connected'});
let q=Promise.resolve();
output.send=bytes=>{const raw=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
q=q.then(async()=>{const r=await fetch('/__cable',{method:'POST',body:raw});if(!r.ok)throw Error('loopback error');
for(const hex of await r.json()){const e=new Event('midimessage');
Object.defineProperty(e,'data',{value:Uint8Array.from(hex.match(/../g),v=>parseInt(v,16))});input.dispatchEvent(e);}});};
Object.defineProperty(navigator,'requestMIDIAccess',{value:async opts=>{if(!opts?.sysex)throw Error('expected SysEx');return {inputs:new Map([[1,input]]),outputs:new Map([[2,output]])};}});})();`;
const types={'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer(async(req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname;
  try {
    if(req.method==='POST'&&p==='/__cable'){
      let raw='';for await(const c of req){raw+=c; if(raw.length>4096)throw Error('long frame');}
      if(!/^(?:[0-9a-f]{2})+$/.test(raw))throw Error('invalid frame');
      const bytes=Buffer.from(raw,'hex'); const request=d.decodeRequest(bytes);
      const replies=await exchange('M '+raw);
      if(request.op===d.OP.PARAM_SET)console.log('PARAM_SET',JSON.stringify(request.fields));
      journal.push({request,replies:replies.map(r=>{try{return d.decodeReply(Buffer.from(r,'hex'));}catch{return null;}})});
      res.setHeader('content-type','application/json'); res.end(JSON.stringify(replies)); return;
    }
    if(p==='/__journal'){res.setHeader('content-type','application/json');res.end(JSON.stringify(journal));return;}
    if(p==='/__prelude.js'){res.setHeader('content-type','text/javascript');res.end((process.env.LEGACY_SYNTAX==='1'?`if(!globalThis.structuredClone)globalThis.structuredClone=function copy(x){if(!x||typeof x!=='object')return x;if(Array.isArray(x))return x.map(copy);if(x instanceof Map)return new Map(Array.from(x,([k,v])=>[copy(k),copy(v)]));if(x instanceof Set)return new Set(Array.from(x,copy));if(ArrayBuffer.isView(x))return x.slice();if(Object.getPrototypeOf(x)!==Object.prototype)throw Error('Unsupported diagnostic clone');return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,copy(v)]));};if(!Element.prototype.replaceChildren)Element.prototype.replaceChildren=function(...nodes){while(this.firstChild)this.firstChild.remove();this.append(...nodes);};if(!Object.hasOwn)Object.hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);if(!Array.prototype.at)Object.defineProperty(Array.prototype,'at',{value:function(i){return this[i<0?this.length+i:i]}});`:'')+prelude);return;}
    let file=path.resolve(site,'.'+p), body;
    if(!file.startsWith(site+'/'))throw Error('bad path');
    if(p.startsWith('/remote/'))body=await fs.readFile(path.join(overlay,p.slice(8))).catch(()=>null);
    if(!body)body=await fs.readFile(file);
    if(process.env.LEGACY_SYNTAX==='1'&&p.startsWith('/remote/')&&p.endsWith('.mjs')) {
      body=body.toString();
      const substitutions={
        'app.mjs':[['target??=','target=target??'],['accentsFor.s??=','accentsFor.s=accentsFor.s??'],['drumSeq.s??=','drumSeq.s=drumSeq.s??'],['drumSeq.s[kit]??=','drumSeq.s[kit]=drumSeq.s[kit]??'],['seqShared.s??=','seqShared.s=seqShared.s??'],['bassValues.s??=','bassValues.s=bassValues.s??'],['fwRows??=','fwRows=fwRows??']],
        'dnr3-bass-roll.mjs':[['serial??=','serial=serial??']],
        'live-drum-pages.mjs':[['a.dirty ||=','a.dirty = a.dirty ||']],
        'mixer-format.mjs':[["import mixerFormatTable from './mixer-format.json' with {type:'json'};","const mixerFormatTable=await (await fetch('./mixer-format.json')).json();"]],
        'dnr3-motion.mjs':[['editing??=','editing=editing??']],
      };
      for(const [a,b] of substitutions[path.basename(p)]??[]){if(body.split(a).length!==2)throw Error('expected one token: '+a);body=body.replace(a,b);}
    }
    if(p==='/remote/index.html')body=body.toString().replace('<head>','<head><script src="/__prelude.js"></script>');
    res.setHeader('content-type',types[path.extname(file)]||'application/octet-stream');res.end(body);
  } catch (e) {console.error(p,e.message);res.statusCode=404;res.end('unavailable');}
});
server.listen(9224,'127.0.0.1');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{proc.kill();server.close();});
