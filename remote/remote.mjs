// Source: firmware/src/app/editor.c at83fc6d60289869116f93352cf845a9a7e271cdba.
// Identity-only. This protocol explicitly exposes no engine/parameter controls.
export function parseInfo(data){
 const a=Array.from(data);if(a.length<13||a[0]!==240||a.at(-1)!==247||a.slice(1,-1).some(v=>!Number.isInteger(v)||v<0||v>127)||a.slice(1,5).join(',')!=='125,70,76,1')throw Error('Invalid INFO reply');
 const end=a.indexOf(0,5);if(end<5||end>29||a.length!==end+8)throw Error('Invalid INFO shape');
 const version=String.fromCharCode(...a.slice(5,end));if(!/^X0X [\x20-\x7e]+$/.test(version)||a.slice(end+1,end+4).some(v=>v!==0)||a[end+5]!==0||a[end+6]!==0)throw Error('Unsupported INFO schema');
 return Object.freeze({version,steps:a[end+4],remoteControl:false,authority:'uncorrelated identity reply'});
}
export function permissionMessage(error){
 return error?.name==='NotAllowedError'?'MIDI permission was not granted.':error?.name==='NotSupportedError'?'Use a browser with Web MIDI support.':'Unable to access MIDI. Check browser permissions and try again.';
}
export class RemoteConnection{
 constructor({timeoutMs=1500,onState=()=>{}}={}){this.timeoutMs=timeoutMs;this.onState=onState;this.state=Object.freeze({phase:'disconnected',remoteControl:false});this.epoch=0;this.disposed=false;this.input=null;this.output=null;this.attempt=null;this.unavailable=new WeakSet();}
 set(phase,extra={}){this.state=Object.freeze({phase,remoteControl:false,...extra});this.onState(this.state);}
 command(){throw Error('This firmware does not expose acknowledged remote controls');}
 // Closing is best effort and never blocks cancellation or a different pair.
 // A pair remains unavailable until its old opens and closes really settle.
 cleanup(attempt){
  if(!attempt||attempt.cleaned)return;attempt.cleaned=true;clearTimeout(attempt.timer);attempt.reject(Error('Connection canceled'));
  attempt.input.onmidimessage=null;
  for(const port of [attempt.input,attempt.output]){
   const close=()=>Promise.resolve().then(()=>port.close()).then(()=>true,()=>false);
   const first=close();const opened=attempt.opens.get(port);
   Promise.allSettled([first,opened]).then(async results=>{const confirmed=opened?await close():results[0].value;if(confirmed)this.unavailable.delete(port);});
  }
 }
 async connect(input,output){
  if(this.disposed)throw Error('Connection disposed');if(this.attempt)throw Error('Disconnect before choosing another connection');
  if(input?.type!=='input'||output?.type!=='output'||input.state!=='connected'||output.state!=='connected')throw Error('Choose connected input and output ports');
  if(this.unavailable.has(input)||this.unavailable.has(output))throw Error('Previous MIDI connection is still closing');
  const epoch=++this.epoch;this.input=input;this.output=output;this.unavailable.add(input);this.unavailable.add(output);
  let reject;const canceled=new Promise((_,r)=>reject=r);const a={input,output,opens:new Map(),reject,cleaned:false,timer:null};this.attempt=a;
  a.timer=setTimeout(()=>reject(Error('No firmware identity reply')),this.timeoutMs);this.set('connecting');
  const work=async()=>{
   for(const port of [input,output]){
    if(epoch!==this.epoch)throw Error('Connection canceled');
    const opening=Promise.resolve().then(()=>port.open());a.opens.set(port,opening);await opening;
    if(epoch!==this.epoch)throw Error('Connection canceled');
   }
   return new Promise((resolve,reject)=>{
    input.onmidimessage=event=>{if(epoch!==this.epoch)return;let info;try{info=parseInfo(event.data);}catch{return;}input.onmidimessage=null;resolve(info);};
    try{output.send([240,125,70,76,1,247]);}catch{reject(Error('Unable to send identity request'));}
   });
  };
  try{
   const info=await Promise.race([work(),canceled]);if(epoch!==this.epoch)throw Error('Connection canceled');clearTimeout(a.timer);this.set('identified',{info});return info;
  }catch(error){
   const canceledAttempt=epoch!==this.epoch;
   const message=canceledAttempt?'Connection canceled':error.message==='No firmware identity reply'?'No firmware identity reply':'Unable to check firmware connection. Check the selected ports and try again.';
   if(!canceledAttempt){++this.epoch;this.input=this.output=null;this.attempt=null;this.cleanup(a);this.set('error',{message});}
   throw Error(message);
  }
 }
 async disconnect(){++this.epoch;const a=this.attempt;this.attempt=null;this.input=this.output=null;this.cleanup(a);this.set('disconnected');}
 async dispose(){if(this.disposed)return;this.disposed=true;await this.disconnect();}
}
