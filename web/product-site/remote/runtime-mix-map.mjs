// SPDX-License-Identifier: GPL-3.0-only
// Presentation-to-native identities only. This does not establish a runtime
// connection, read instrument values, or authorize a device write.
const screens=new Set(['mix-parts-live.svg','mix-master.svg','fx-reverb-direct.svg','fx-delay-direct.svg']);
const required=new Set(['5:0:3',...[0,1,2,3,4].flatMap(v=>[0,1,2].map(p=>`5:${v}:${p}`)),...[2,4,5,6,7,8,9,10,11,14].map(p=>`4:0:${p}`),...[6,12,13].map(p=>`6:0:${p}`)]);
function domain(target,voice,parameter){
 if(target===5&&voice>=0&&voice<5&&parameter>=0&&parameter<4)return 127;
 if(target===4&&voice===0&&[2,4,5,6,7,8,9,10,11,14].includes(parameter))return parameter===8?12:127;
 if(target===6&&voice===0&&[6,12,13].includes(parameter))return 127;
 throw Error('Unsupported Mix identity');
}
export function mixControlBindings(catalog,components){
 const groups=new Map(),byId=new Map(),seenScreens=new Set();
 function add(id,target,voice,parameter){
  const max=domain(target,voice,parameter),key=`${target}:${voice}:${parameter}`;
  const matches=catalog.controls.filter(d=>d.target===target&&d.voice===voice&&d.parameter===parameter);
  if(!matches.length)throw Error('Missing native Mix control');
  if(matches.length!==1)throw Error('Ambiguous native Mix identity');
  const d=matches[0];
  if(d.kind!=='U32'||d.min!==0||d.max!==max||!Number.isSafeInteger(d.id)||d.id<0)throw Error('Native Mix domain mismatch');
  let group=groups.get(key);
  if(!group){group={key,target,voice,parameter,kind:'U32',min:0,max,catalogId:d.id,ids:[]};groups.set(key,group);}
  if(byId.has(id)&&byId.get(id)!==group)throw Error('Ambiguous presentation identity');
  if(!group.ids.includes(id))group.ids.push(id);byId.set(id,group);
 }
 for(const screen of components.screens){
  const name=screen.path.split('/').at(-1);if(!screens.has(name))continue;
  if(seenScreens.has(name))throw Error('Ambiguous Mix presentation screen');seenScreens.add(name);
  for(const control of screen.controls){
   if(!/^1:[456]:[0-4]:\d+$/.test(control.identity))throw Error('Unsupported Mix control kind');
   const[,target,voice,parameter]=control.identity.split(':').map(Number);
   add(screen.path+'|'+control.identity,target,voice,parameter);
  }
 }
 add('catalog/1551',4,0,14);
 if(seenScreens.size!==screens.size||groups.size!==required.size||[...required].some(key=>!groups.has(key)))throw Error('Incomplete Mix presentation coverage');
 return{groups,byId};
}
