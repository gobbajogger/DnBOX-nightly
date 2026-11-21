// SPDX-License-Identifier: GPL-3.0-only
// Presentation identities only. A source snapshot is not current engine state.
// The provider must independently admit the current engine and every write.
export function chicagoControlBindings(rows){
 if(!Array.isArray(rows))throw Error('Chicago source rows required');
 const groups=new Map(),byId=new Map();
 for(const row of rows){
  if(typeof row?.id!=='string'||!row.id.startsWith('source-sound/CHICAGO/')||row.kind!==1)continue;
  const slot=Number(row.id.split('/')[2]?.split('|')[0]),p=row.parameter;
  if(![0,1].includes(slot)||!Number.isSafeInteger(p)||p<0||p>=20||row.target!==2||row.voice!==slot||row.sourceBank!==0||row.min!==0||row.max!==(p===17?11:127)||row.enabled!==true||row.id!==`source-sound/CHICAGO/${slot}|1:2:${slot}:${p}:0`)throw Error('Chicago identity/domain mismatch');
  const key=`CHICAGO:${slot}:2:${slot}:${p}`;
  if(groups.has(key)||byId.has(row.id))throw Error('Duplicate Chicago control');
  const control={key,id:row.id,engine:'CHICAGO',sourceBank:0,slot,target:2,voice:slot,parameter:p,kind:'u32',min:0,max:row.max};
  groups.set(key,control);byId.set(row.id,control);
 }
 if(groups.size!==40)throw Error('Incomplete Chicago scalar coverage');
 return{groups,byId};
}
