// SPDX-License-Identifier: GPL-3.0-only
// Exact production formatter strings; never a native/runtime admission.
// Typed identity only: retained SVG paths and display labels are not identifiers.
export class DrumFormats{
 constructor(tables){
  this.controls=new Map();this.sourceCommit=null;
  if(!Array.isArray(tables)||!tables.length)throw Error('Drum formatter tables required');
  for(const table of tables){
   if(table?.schema!=='dnbox-production-formatter/1'||table.qualification!=='FORMATTER_ONLY_NOT_DEVICE_OR_FULL_LANE'||!/^([a-f0-9]{40})$/.test(table.productionSourceCommit??'')||![0,1].includes(table.target)||!Number.isInteger(table.voice)||table.voice<0||table.voice>11||!Array.isArray(table.controls)||!Array.isArray(table.stateVector))throw Error('Invalid source formatter table');
   if(this.sourceCommit&&this.sourceCommit!==table.productionSourceCommit)throw Error('Mixed source formatter revisions');this.sourceCommit=table.productionSourceCommit;
   for(const c of table.controls){
    const key=[c.kind,c.target,c.voice,c.slot].join(':');
    if(c.kind!==1||c.target!==table.target||c.voice!==table.voice||!Number.isInteger(c.slot)||c.slot<0||!Number.isInteger(c.minimumRaw)||!Number.isInteger(c.maximumRaw)||c.minimumRaw<0||c.maximumRaw<c.minimumRaw||typeof c.nativeName!=='string'||!c.nativeName||typeof c.displayName!=='string'||!c.displayName||this.controls.has(key)||!Array.isArray(c.values)||c.values.length!==c.maximumRaw-c.minimumRaw+1)throw Error('Invalid source formatter control');
    const values=c.values.map((v,i)=>{if(v.raw!==c.minimumRaw+i||typeof v.number!=='string'||typeof v.unit!=='string')throw Error('Incomplete source formatter domain');return Object.freeze({...v});});
    this.controls.set(key,Object.freeze({...c,values:Object.freeze(values),sourceCommit:table.productionSourceCommit,stateScope:table.stateScope}));
   }
  }
 }
 descriptor(identity){return this.controls.get(identity)??null;}
 format(identity,raw){const c=this.descriptor(identity);if(!c||!Number.isInteger(raw)||raw<c.minimumRaw||raw>c.maximumRaw)return null;const v=c.values[raw-c.minimumRaw];return v.number+v.unit;}
}
