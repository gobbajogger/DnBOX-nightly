// SPDX-License-Identifier: GPL-3.0-only
import {CAP, NOTIFY_KIND} from './dnr3.mjs';

const BANK=0, PARAM=1, ENGINE=2, ACTIVE_BANK=41, PRESET=42, SETTLED=43;
const same=(a,b)=>['kind','a','b','c'].every(k=>a?.[k]===b[k]);
const bankAddress=(kind,slot)=>({kind,a:0,b:slot,c:0});
const addr=g=>({kind:PARAM,a:ENGINE,b:g.slot,c:g.parameter});
const domain=(g,row)=>same(row,addr(g))&&row.max===g.max&&Number.isInteger(row.value)&&row.value>=g.min&&row.value<=g.max;

export function createChicagoSession(client,slot,bindings,isCurrent){
 if(![0,1].includes(slot)||!client?.has(CAP.PARAM)||!client.has(CAP.WATCH)||!client.has(CAP.BASS_BANK_GUARD))return null;
 const groups=[...bindings.values()].filter(g=>g.slot===slot);
 const addresses=groups.map(addr);
 let described=false,closed=false;
 function check(){if(closed||!isCurrent())throw Error('Sound connection changed');}
 async function bank(){
  check();
  const address=[bankAddress(ACTIVE_BANK,slot),bankAddress(SETTLED,slot)];
  const [active,status]=await client.paramGet(address);
  check();
  if(!same(active,address[0])||!same(status,address[1])||!Number.isInteger(active.value)||active.value>3||status.value!==1)
   return null;
  return active.value;
 }
 async function read(){
  const start=await bank();
  if(start!==BANK)return {bank:start,rows:null};
  let list=[];
  for(let i=0;i<addresses.length;i+=16){list.push(...await client.paramGet(addresses.slice(i,i+16)));check();}
  if(list.length!==groups.length||list.some((row,i)=>!domain(groups[i],row)))throw Error('Firmware Chicago control domain changed');
  if(!described){
   for(let i=0;i<addresses.length;i++){
    const descriptor=await client.describe(addresses[i]);check();
    if(descriptor.max!==groups[i].max||!descriptor.name)
     throw Error('Firmware Chicago control description changed');
   }
  }
  const end=await bank();
  if(end!==BANK)return {bank:end,rows:null};
  described=true;
  return {bank:end,rows:list.map((row,i)=>({...groups[i],value:row.value}))};
 }
 async function write(index,before,value){
  const group=groups.find(g=>g.parameter===index);
  if(!group||!domain(group,{...addr(group),value,max:group.max})||!domain(group,{...addr(group),value:before,max:group.max}))
   throw Error('Out of range Chicago control');
  if(await bank()!==BANK)throw Error('The active bass bank changed');
  const a=addr(group);
  const reply=(await client.paramSet(a,value,before,{bank:BANK})).fields;
  check();
  if(!same(reply,a)||reply.value!==value)throw Error('Chicago write was not confirmed');
  const state=await read();
  if(state.rows?.find(row=>row.parameter===index)?.value!==value)throw Error('Chicago readback did not confirm the edit');
  return state;
 }
 const observes=e=>e.type==='resync'||e.kind===NOTIFY_KIND.PARAM&&
  (e.fields.kind===127||e.fields.b===slot&&([ACTIVE_BANK,PRESET,SETTLED].includes(e.fields.kind)||e.fields.kind===PARAM&&e.fields.a===ENGINE));
 return {read,write,observes,close(){closed=true;}};
}

export function createChicagoView({link,bindings,onChange}){
 let own=null;
 function close(){const current=own;own=null;current?.stop?.();current?.api.close();}
 function open(slot){
  close();
  const connection=link(),api=connection?.chicagoSession(slot,bindings);
  if(!api){onChange({phase:'unsupported'});return;}
  const current=own={api,state:null,busy:false,change:false,history:[],historyEpoch:0};
  const match=()=>own===current;
  const value=index=>current.state?.rows?.find(row=>row.parameter===index)?.value;
  const show=(state,message)=>{const last=current.history.at(-1);if(match())onChange(state?.rows?{phase:'ready',rows:state.rows,busy:current.busy,message,
    canUndo:!current.busy&&!!last&&value(last.index)===last.after}:
   {phase:state?.bank===null?'settling':'unsupported',bank:state?.bank,message});};
  async function refresh(){
   if(current.busy){current.change=true;return;}
   current.busy=true;
   try{
    do{current.change=false;current.state=await api.read();}while(match()&&current.change);
    current.busy=false;if(!current.state?.rows)current.history=[];show(current.state);
   }catch{current.busy=false;current.state=null;current.history=[];if(match())onChange({phase:'unavailable'});}
  }
  current.stop=connection.onNotify(e=>{
   if(!match()||!api.observes(e))return;
   if(e.type==='resync'||[ACTIVE_BANK,PRESET,SETTLED,127].includes(e.fields?.kind)){
     ++current.historyEpoch;current.history=[];
   }
   void refresh();
  });
  async function commit(index,before,after,undo){
   if(!match()||current.busy||!Number.isInteger(before)||before===after)return;
   const ownHistory=current.historyEpoch;
   current.busy=true;show(current.state);
   try{
    current.state=await api.write(index,before,after);
    if(ownHistory===current.historyEpoch){
     if(undo)current.history.pop();
     else {current.history.push({index,before,after});if(current.history.length>16)current.history.shift();}
    }
   }catch{
    current.state=null;current.history=[];++current.historyEpoch;
    if(match())onChange({phase:'loading',message:'Edit not confirmed. Reading firmware…'});
    current.change=true;
   }finally{
    current.busy=false;
    if(match()){if(current.change)void refresh();else show(current.state);}
   }
  }
  current.write=(index,after)=>commit(index,value(index),after,false);
  current.undo=()=>{
   const last=current.history.at(-1);
   if(last&&value(last.index)===last.after)return commit(last.index,last.after,last.before,true);
  };
  onChange({phase:'loading'});void refresh();
 }
 return {open,close,write:(index,value)=>own?.write(index,value),undo:()=>own?.undo()};
}
