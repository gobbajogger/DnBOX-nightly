// SPDX-License-Identifier: GPL-3.0-only
// Bounded stdin-only test transport, not MIDI/browser/device transport.
import{spawn}from'node:child_process';import{createInterface}from'node:readline';
import{encodeCommand,decodeReply}from'../../../web/product-site/remote/device/vendor/codec.mjs';
export function createHostTransport({binary,args=['--serve'],timeoutMs=15000}){
 if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw Error('Finite host timeout required');
 const p=spawn(binary,args,{stdio:['pipe','pipe','pipe']}),lines=createInterface({input:p.stdout}),pending=[];let ended=false,stderr='';
 const rejectAll=error=>{for(const q of pending.splice(0)){clearTimeout(q.timer);q.reject(error);}};
 const stop=error=>{if(!ended){ended=true;rejectAll(error);lines.close();p.kill();}};
 p.stderr.on('data',b=>stderr=(stderr+b).slice(-4096));p.on('error',e=>stop(e));p.stdin.on('error',e=>stop(e));
 const closed=new Promise(resolve=>p.once('close',(code,signal)=>{ended=true;rejectAll(Error('Actual host exited '+code+' '+stderr));lines.close();resolve({code,signal});}));
 lines.on('line',line=>{const q=pending.shift();if(!q)return stop(Error('Unrequested host output'));clearTimeout(q.timer);try{q.resolve(JSON.parse(line));}catch(e){q.reject(e);stop(e);}});
 return{ops:[],closed,
  line(line){if(ended)return Promise.reject(Error('Actual host closed'));return new Promise((resolve,reject)=>{const q={resolve,reject,timer:null};q.timer=setTimeout(()=>stop(Error('Actual-host exchange timed out')),timeoutMs);pending.push(q);p.stdin.write(line+'\n');});},
  async exchange(c){this.ops.push({...c,unitHigh:[...c.unitHigh]});const r=await this.line(Buffer.from(encodeCommand(c)).toString('hex'));return decodeReply(Buffer.from(r.hex,'hex'));},
  close(){stop(Error('Actual host test closed'));return closed;}
 };
}
