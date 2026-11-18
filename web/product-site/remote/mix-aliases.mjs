// SPDX-License-Identifier: GPL-3.0-only
const valid=v=>Number.isInteger(v)&&v>=0&&v<=127;
function admit(g){if(!g||!g.ids?.length||!g.values?.length||g.values.some(v=>!valid(v)||v!==g.values[0]))throw Error('Incoherent mixer source');return g;}
export function mixAliases(components,catalog){
 const groups=new Map(),byId=new Map();
 for(const screen of components.screens)for(const c of screen.controls){
  if(!/^1:5:[0-4]:[0-3]$/.test(c.identity))continue;
  const[k,target,voice,parameter]=c.identity.split(':').map(Number),d=catalog.controls.find(d=>d.target===target&&d.voice===voice&&d.parameter===parameter&&d.kind==='U32');
  if(!d||d.min!==0||d.max!==127)throw Error('Unqualified mixer domain');
  const id=screen.path+'|'+c.identity,value=Number(c.context.raw);let g=groups.get(c.identity);
  if(!g){g={key:c.identity,ids:[],values:[],value};groups.set(c.identity,g)}
  g.values.push(value);if(!g.ids.includes(id))g.ids.push(id);byId.set(id,g);
 }
 for(const g of groups.values())admit(g);
 return{groups,byId};
}
export function mixRead(g,edits){admit(g);const values=g.ids.filter(id=>edits.has(id)).map(id=>edits.get(id));if(values.some(v=>!valid(v)||v!==values[0]))throw Error('Conflicting mixer aliases');return values.length?values[0]:g.value;}
export function mixChange(g,edits,value){admit(g);mixRead(g,edits);if(!valid(value))throw Error('Mixer value outside domain');const before=g.ids.map(id=>[id,edits.has(id),edits.get(id)]);return{redo(){for(const id of g.ids)edits.set(id,value)},undo(){for(const[id,present,v]of before)present?edits.set(id,v):edits.delete(id)}};}
export function normalizeMixEdits(parameters,aliases){const edits=new Map();for(const{id,value}of parameters){if(edits.has(id))throw Error('Duplicate parameter');edits.set(id,value)}for(const g of aliases.groups.values())if(g.ids.some(id=>edits.has(id))){const value=mixRead(g,edits);for(const id of g.ids)edits.set(id,value)}return [...edits].map(([id,value])=>({id,value}));}
