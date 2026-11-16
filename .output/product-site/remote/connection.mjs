const bounded=(promise,ms,message)=>new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error(message)),ms);Promise.resolve(promise).then(x=>{clearTimeout(t);resolve(x)},()=>{clearTimeout(t);reject(Error(message))});});
export class PortConnection{
 constructor({make,deadlineMs=8000,closeMs=2500}={}){this.make=make;this.deadlineMs=deadlineMs;this.closeMs=closeMs;this.generation=0;this.current=null;this.unavailable=new WeakSet;}
 async connect(input,output){
  if(this.current)throw Error('Disconnect the previous connection first.');if(input?.type!=='input'||output?.type!=='output'||input.state!=='connected'||output.state!=='connected')throw Error('Choose the instrument input and output.');if(this.unavailable.has(input)||this.unavailable.has(output))throw Error('The previous ports are still closing. Wait or choose another pair.');
  const own=++this.generation,a={input,output,opens:new Map(),bundle:null,closePromise:null};this.current=a;this.unavailable.add(input);this.unavailable.add(output);let reject;const cancellation=new Promise((_,r)=>reject=r);a.cancel=reject;
  const work=async()=>{for(const p of [input,output]){if(own!==this.generation)throw Error('Connection canceled.');const opening=Promise.resolve().then(()=>p.open());a.opens.set(p,opening);await opening;if(own!==this.generation)throw Error('Connection canceled.');}if(own!==this.generation)throw Error('Connection canceled.');a.bundle=this.make(input,output);await a.bundle.session.connect(a.bundle.broker);if(own!==this.generation)throw Error('Connection canceled.');return a.bundle.session;};
  try{return await bounded(Promise.race([work(),cancellation]),this.deadlineMs,'Connection was not confirmed. Check the selected ports and reconnect.');}catch{if(this.current===a)await this.close();throw Error('Connection was not confirmed. Check the selected ports and reconnect.');}
 }
 close(){const a=this.current;if(!a)return Promise.resolve({released:true});if(a.closePromise)return a.closePromise;++this.generation;a.cancel(Error('Connection canceled.'));
  a.closePromise=(async()=>{let released=true;try{if(a.bundle){const r=await bounded(a.bundle.session.close(),this.closeMs,'Release unconfirmed');released=r.released===true;}}catch{released=false;}finally{a.bundle?.broker.dispose();}
   for(const p of [a.input,a.output]){const close=()=>Promise.resolve().then(()=>p.close());const cleanup=Promise.allSettled([a.opens.get(p),close()]).then(async()=>{await close();this.unavailable.delete(p);});cleanup.catch(()=>{});try{await bounded(cleanup,this.closeMs,'Port close unconfirmed');}catch{released=false;}}
   if(this.current===a)this.current=null;return{released};})();return a.closePromise;
 }
}
