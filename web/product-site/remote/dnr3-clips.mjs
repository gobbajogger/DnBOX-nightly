// SPDX-License-Identifier: GPL-3.0-only
import {CAP,NOTIFY_KIND} from './dnr3.mjs';

const activePattern=v=>Number.isInteger(v)&&v>=0&&v<32;
function cues(state){
 const valid=(array)=>Array.isArray(array)&&array.length===5&&array.every(v=>activePattern(v)||v===127);
 if(!valid(state?.ppat)||!valid(state?.pcue))throw Error('Invalid pattern state');
 return {ppat:state.ppat,pcue:state.pcue};
}
export function createLiveClips({link,onChange}){
 let session=0,visible=false,snapshot=null,source='draft',inFlight=false,revision=0,lastMessage;
 function show(next,fields,message){
  source=next;snapshot=fields;lastMessage=message;onChange({source,firmware:snapshot,message,busy:inFlight});
 }
 function current(mine,transport){return visible&&mine===session&&transport===link();}
 async function read(mine,transport){
  if(!current(mine,transport)||!transport?.connected())return;
  const seen=revision;
  try{
   const state=await transport.readClips();
   if(!current(mine,transport))return;
   if(!state)throw Error('Connection changed');
   if(state.clip_mode){show('unsupported',null,'Turn off controller clip mode to launch patterns here. These are Draft selections.');return;}
   if(seen===revision||!snapshot)show('firmware',cues(state));
  }catch{
   if(current(mine,transport))show('unavailable',null,'Firmware pattern state unavailable. These are Draft selections.');
  }
 }
 function activate(){
  visible=true;const mine=++session;revision=0;inFlight=false;
  const transport=link();
  if(!transport?.connected()){show('draft',null);return;}
  const caps=transport.hello()?.caps??0;
  if((caps&(CAP.CUE|CAP.WATCH))!==(CAP.CUE|CAP.WATCH)) {
   show('unsupported',null,'This firmware does not offer live pattern launch. These are Draft selections.');return;
  }
  show('loading',null);void read(mine,transport);
 }
 async function cue(part,pat){
  if(!visible||!Number.isInteger(part)||part<0||part>4||!activePattern(pat))return false;
  if(source!=='firmware')return false;
  if(inFlight)return true;
  inFlight=true;
  const mine=session,transport=link();
  show('firmware',snapshot,'Confirming pattern…');
  let message;
  try{
   const state=await transport.confirmClip(part,pat);
   if(!current(mine,transport))return true;
   if(state?.blocked){show('unsupported',null,'Turn off controller clip mode to launch patterns here. These are Draft selections.');return true;}
   const confirmed=cues(state);
   const active=confirmed.ppat[part]===pat,queued=confirmed.pcue[part]===pat;
   if(!active&&!queued)throw Error('Device did not select the requested pattern');
   snapshot=confirmed;
   message='Pattern '+(pat+1)+(queued?' queued.':' active.');
  }catch{
   if(current(mine,transport)){await read(mine,transport);message='Pattern was not confirmed.';}
  }finally{
   if(mine===session){
    inFlight=false;
    show(source,snapshot,source==='firmware'?message:lastMessage);
   }
  }
  return true;
 }
 function notify(event){
  const transport=link();
  if(!visible||!transport?.connected()||!['firmware','loading'].includes(source))return;
  if(event.type==='resync'){void read(session,transport);return;}
  if([NOTIFY_KIND.CUE,NOTIFY_KIND.PATTERN].includes(event.kind)&&source==='firmware'){
   try{const state=cues(event.fields);++revision;show('firmware',state);}catch{void read(session,transport);}
  }
 }
 return {activate,cue,notify,close(){visible=false;++session;inFlight=false;source='draft';snapshot=null;}};
}
