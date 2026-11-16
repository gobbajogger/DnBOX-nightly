// SPDX-License-Identifier: GPL-3.0-only
// Explicit native activity adapter. No device transport or production registration.
import t0 from'../native-drum-binding-work/target-0.json'with{type:'json'};import t1 from'../native-drum-binding-work/target-1.json'with{type:'json'};
import{liveTail}from'../native-live-tail-work/tail.mjs';import{NativeTailReturn}from'../native-tail-return-work/return.mjs';
const source='af56c8a4ba7b140402db71ba50a4dea6e14fddfe',tableSource='b341436ff8087c20b8ef51765f986736473611b0',exportHash='cecd9da75b58eb96391136b3609204612fe2ef898eedc22d2c892885853e2be7',controls=new Map(),storage=new ArrayBuffer(4),floats=new Float32Array(storage),bits=new Uint32Array(storage),key=r=>[r.kind,r.target,r.voice,r.slot].join(':');
for(const table of[t0,t1]){if(table.source!==tableSource||table.sourceExportSha256!==exportHash)throw Error('Pinned numeric source required');for(const c of table.controls){if(![1,2].includes(c.role))continue;if(c.kind!==1||c.target!==table.target||!Number.isInteger(c.voice)||!Number.isInteger(c.slot)||controls.has(key(c))||c.minimumRaw!==0||!Number.isInteger(c.maximumRaw)||c.values.length!==c.maximumRaw+1)throw Error('Invalid tail source descriptor');for(let raw=0;raw<c.values.length;raw++){const v=c.values[raw];if(v.raw!==raw||!Number.isInteger(v.unitId)||!Number.isFinite(v.value)||!Number.isInteger(v.floatBits)||v.floatBits<0||v.floatBits>4294967295)throw Error('Invalid source SI record');floats[0]=v.value;if(bits[0]!==v.floatBits)throw Error('Source SI float bits mismatch');}controls.set(key(c),c);}}
if(controls.size!==22)throw Error('Incomplete source tail census');
export class LiveTailSource{
 #returns=new NativeTailReturn();
 project(identity,state,presentationRaw,activity,layout={}){
  const{source:pin,kind,target,voice,slot,name}=identity??{},id={kind,target,voice,slot};
  if(pin!==source||![kind,target,voice,slot].every(Number.isInteger))throw Error('Exact reviewed live source identity required');
  const c=controls.get(key(id));if(!c||c.name!==name)throw Error('Exact source tail descriptor required');
  const committed=state?.[key(id)];if(!Number.isInteger(committed)||committed<0||committed>c.maximumRaw||!Number.isFinite(presentationRaw)||presentationRaw<0||presentationRaw>c.maximumRaw)throw Error('Bounded committed/presentation state required');
  const raw=Math.fround(presentationRaw),si=c.values[Math.trunc(Math.fround(raw+.5))];if(!si||!Number.isInteger(si.unitId)||!Number.isFinite(si.value))throw Error('Exact numeric SI context required');
  const{live,envelope,age,now,ink,lineColor,whiteColor}=activity??{},context={...layout,target,role:c.role,raw,maximum:c.maximumRaw,unitId:si.unitId,siValue:si.value,live,envelope,age,ink,lineColor,whiteColor,back:1};
  // All drawing/activity validation happens before any return-owner mutation.
  const preflight=liveTail(context),back=this.#returns.value({target,voice,live,now});
  return back===1?preflight:liveTail({...context,back});
 }
 snapshot(){return this.#returns.snapshot();}
}
