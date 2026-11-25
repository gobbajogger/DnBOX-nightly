// SPDX-License-Identifier: GPL-3.0-only
import {describeOriginalSynth} from './dnr3-synth-catalog.mjs';
import {CAP, KEEP, STATUS, NOTIFY_KIND} from './dnr3.mjs';

export const SYNTH_KIND={LOW:112,HIGH:113};
export const SYNTH_UNIT={TYPED:32,WRITE:64};
const LEGACY=1, T_303=2, BANK=41, PRESET=42, SETTLED=43;
const LEGACY_LAST={2:2,3:17};
const same=(a,b)=>['kind','a','b','c'].every(k=>a?.[k]===b[k]);
const int=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
const native=(kind,slot)=>({kind,a:0,b:slot,c:0});
export function synthAddress(bank,slot,id,typed=true){
 if(!(bank in LEGACY_LAST)||!int(slot,0,1)||!int(id,0,typed?255:LEGACY_LAST[bank]))throw RangeError('Unknown synth control');
 return typed?{kind:id<128?SYNTH_KIND.LOW:SYNTH_KIND.HIGH,a:bank,b:slot,c:id&127}
             :{kind:LEGACY,a:T_303,b:slot,c:id};
}
export function createSynthSession(client,slot,isCurrent,{pause=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 if(!int(slot,0,1)||!client?.has(CAP.PARAM)||!client.has(CAP.WATCH)||!client.has(CAP.BASS_BANK_GUARD))return null;
 let closed=false,owner=null, rows=new Map();
 const typed=client.has(CAP.TYPED_SYNTH);
 const guarded=typed&&client.has(CAP.SYNTH_OWNER);
 function current(){if(closed||!isCurrent())throw Error('Synth connection changed');}
 async function identity(){
  current();
  if(guarded){
   const x=await client.synthOwner(slot);current();
   if(x.slot!==slot||x.settled!==1||!int(x.bank,0,3)||!int(x.preset,0,KEEP-1)||!int(x.owner_generation,0,0xffffffff))return null;
   return {bank:x.bank,preset:x.preset,token:x.owner_generation};
  }
  const a=[native(BANK,slot),native(PRESET,slot),native(SETTLED,slot)];
  const r=await client.paramGet(a);current();
  if(r.length!==3||r.some((x,i)=>!same(x,a[i]))||!int(r[0].value,0,3)||
    !int(r[1].value,0,KEEP-1)||r[2].value!==1)return null;
  return {bank:r[0].value,preset:r[1].value};
 }
 const unchanged=(a,b)=>a!==null&&b!==null&&a.bank===b.bank&&a.preset===b.preset&&a.token===b.token;
 function available(x,a){return same(x,a)&&int(x.max,0,KEEP-1)&&int(x.value,0,x.max);}
 async function read(){
  rows.clear();owner=null;
  const start=await identity();
  if(!start||!(start.bank in LEGACY_LAST))return {owner:start,rows:[]};
  const found=[];
  const width=typed?256:LEGACY_LAST[start.bank]+1;
  for(let base=0;base<width;base+=16){
   const group=Array.from({length:Math.min(16,width-base)},(_,i)=>synthAddress(start.bank,slot,base+i,typed));
   const data=await client.paramGet(group);current();
   if(data.length!==group.length||data.some((x,i)=>!same(x,group[i])))throw Error('Synth data addresses changed');
   for(let i=0;i<data.length;i++){
    const a=group[i],x=data[i];if(!available(x,a))continue;
    let desc;
    try{desc=await client.describe(a);}catch(e){current(); if(e?.status===STATUS.UNSUPPORTED)continue;throw e;}
    current();
    if(!desc.name||desc.max!==x.max||!int(desc.def,0,x.max)||!int(desc.unit,0,127))continue;
    if(typed&&!(desc.unit&SYNTH_UNIT.TYPED))continue;
    const id=base+i;
    if(typed&&start.bank===3&&(id===207||([240,241,243].includes(id)&&!describeOriginalSynth(3,id,x.max))))continue; // Reserved or malformed extension.
    if(typed&&start.bank===2&&([240,241,242,243,245,255].includes(id)&&x.max!==1||id===245&&(x.value!==0||desc.def!==0)))continue;
    if(typed&&start.bank===2&&id===140)continue; // Dedicated performance input, not a patch edit.
    const presentation=typed?describeOriginalSynth(start.bank,id,x.max):undefined;
    const label=typed?(presentation?.label??`${desc.name} · ID ${id}`):desc.name;
    const names=Array.isArray(desc.names)?[...desc.names]:[];
    const convention=x.max===1&&(presentation?.label==='Filter Link'||presentation?.type==='toggle'||presentation?.stepRole==='on')?['Off','On']:undefined;
    const choices=presentation?.type==='velocity-curve'?['Soft','Medium','Hard']:
      names.length===x.max+1&&names.every(v=>typeof v==='string'&&v.trim())&&new Set(names).size===names.length?names:
      convention;
    found.push({id,address:a,label,descriptorName:desc.name,max:x.max,value:x.value,
      writable:typed?guarded&&!!(desc.unit&SYNTH_UNIT.WRITE):true,names,choices,presentation,unit:desc.unit,def:desc.def});
   }
  }
  const end=await identity();
  if(!unchanged(start,end))return {owner:end,rows:[]};
  owner=end;rows=new Map(found.map(r=>[r.id,r]));
  const reset=typed&&owner.bank===2?rows.get(245):null;
  if(reset&&![143,244].every(id=>rows.has(id)))reset.writable=false;
  return {owner:end,rows:found};
 }
 async function write(id,value){
  const row=rows.get(id),before=owner;
  if(!row?.writable||!int(value,0,row.max))throw Error('Synth control unavailable');
  if(!unchanged(before,await identity()))throw Error('Synth owner changed');
  if(typed){
   const desc=await client.describe(row.address);current();
   if(desc.name!==row.descriptorName||desc.max!==row.max||desc.def!==row.def||desc.unit!==row.unit||
      JSON.stringify(desc.names??[])!==JSON.stringify(row.names)||(desc.unit&(SYNTH_UNIT.TYPED|SYNTH_UNIT.WRITE))!==(SYNTH_UNIT.TYPED|SYNTH_UNIT.WRITE))
    throw Error('Synth descriptor changed');
  }
  const [seen]=await client.paramGet([row.address]);current();
  if(!available(seen,row.address)||seen.max!==row.max||seen.value!==row.value)throw Error('Synth value changed');
  if(!unchanged(before,await identity()))throw Error('Synth owner changed');
  const resetTargets=row.presentation?.type==='action'?[rows.get(143),rows.get(244)]:null;
  if(resetTargets){
   if(value!==1||row.value!==0||resetTargets.some(r=>!r))throw Error('Tuning reset unavailable');
   for(const target of resetTargets){
    const prior=await client.describe(target.address);current();
    if(prior.name!==target.descriptorName||prior.def!==target.def||prior.max!==target.max||prior.unit!==target.unit)throw Error('Tuning descriptor changed');
   }
   const sample=await client.paramGet(resetTargets.map(x=>x.address));current();
   if(sample.length!==2||sample.some((read,i)=>!available(read,resetTargets[i].address)||read.value!==resetTargets[i].value||read.max!==resetTargets[i].max))
    throw Error('Tuning values changed');
   if(!unchanged(before,await identity()))throw Error('Synth owner changed');
  }
  const a=row.address,ack=await client.paramSet(a,value,row.value,{bank:before.bank,...typed?{ownerGeneration:before.token,retry:false}:{}});current();
  if(!same(ack.fields,a)||ack.fields.value!==value)throw Error('Synth write not acknowledged');
  if(resetTargets){
   if(ack.status!==STATUS.OK)throw Error('Tuning reset not acknowledged');
   const checks=[row,...resetTargets];
   if(!unchanged(before,await identity()))throw Error('Synth owner changed');
   const after=await client.paramGet(checks.map(r=>r.address));current();
   if(after.length!==checks.length||after.some((x,i)=>!available(x,checks[i].address)||x.max!==checks[i].max||x.value!==checks[i].def)||
      !unchanged(before,await identity()))throw Error('Tuning reset not confirmed by readback');
   resetTargets.forEach(r=>{r.value=r.def;});
   return {owner:before,rows:[...rows.values()]};
  }
  const queued=typed&&ack.status===STATUS.QUEUED;
  // A QUEUED echo is not a committed value. Only poll independent reads;
  // never send a second edit or let another bank/preset satisfy this write.
  for(let i=0;i<(queued?6:1);i++){
   if(i){await pause(30);current();}
   if(!unchanged(before,await identity()))throw Error('Synth owner changed');
   const [check]=await client.paramGet([a]);current();
   if(!available(check,a)||check.max!==row.max||
      !unchanged(before,await identity()))throw Error('Synth write not confirmed by readback');
   if(check.value===value){
    row.value=value;
    return {owner:before,rows:[...rows.values()]};
   }
   if(check.value!==row.value)break;
  }
  throw Error('Synth write not confirmed by readback');
 }
 const observes=e=>e.gap||e.type==='resync'||e.kind===NOTIFY_KIND.PARAM&&(e.fields.kind===127||
   e.fields.b===slot&&[BANK,PRESET,SETTLED,LEGACY,SYNTH_KIND.LOW,SYNTH_KIND.HIGH].includes(e.fields.kind));
 return {typed,guarded,read,write,observes,close(){closed=true;rows.clear();owner=null;}};
}

export function createSynthView({link,onChange}){
 let active=null;
 function close(){const a=active;active=null;a?.stop();a?.api.close();}
 function open(slot){
  close();
  const connection=link(),api=connection?.synthSession(slot);
  if(!api){onChange({phase:'unsupported'});return;}
  const state=active={api,value:null,busy:false,dirty:false};
  const current=()=>active===state;
  const paint=(phase,message)=>{
   if(current()) onChange({phase,message,typed:api.typed,busy:state.busy,
    owner:state.value?.owner??null,rows:state.value?.rows??[],ownerGuard:api.guarded});
  };
  async function refresh(){
   if(state.busy){state.dirty=true;return;}
   state.busy=true;
   if(state.value?.owner)paint('loading');
   try{
    do{state.dirty=false;state.value=await api.read();}while(current()&&state.dirty);
    state.busy=false;
    paint(state.value.owner?.bank<2?'not-synth':state.value.rows.length?'ready':'unavailable');
   }catch{state.busy=false;state.value=null;paint('unavailable','Firmware synth readback was not confirmed.');}
  }
  state.stop=connection.onNotify(e=>{if(current()&&api.observes(e))void refresh();});
  state.write=async(id,value)=>{
   if(!current()||state.busy)return;
   state.busy=true;paint('ready');
   try{state.value=await api.write(id,value);}
   catch{state.value=null;state.dirty=true;paint('loading','Edit not confirmed. Reading firmware…');}
   finally{
    state.busy=false;
    if(current()){if(state.dirty)void refresh();else paint('ready');}
   }
  };
  paint('loading');void refresh();
 }
 return {open,close,write:(id,value)=>active?.write(id,value)};
}
