// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {inflateSync} from 'node:zlib';
import {paintDrumGlyph,paintKickDepth} from '../../web/product-site/remote/drum-strip.mjs';
import {polylines} from '../../web/product-site/remote/glyph-live.mjs';

const fixture=JSON.parse(readFileSync(new URL('./fixtures/drum-dv-roles-f178.json',import.meta.url)));
const native=inflateSync(Buffer.from(fixture.values,'base64'));
assert.equal(fixture.firmware,'f1786ebec2616477163b62b029c7e77405a9c3de');
assert.equal(native.length,2*fixture.coordinates);
const ids=['1:0:0:0','1:0:0:4','1:0:0:5'];
const contexts=[[34,0,45],[18,64,32],[100,127,99]];

function mountedGlyphs(){
 const drawings=new Map(),mounted=new Map();
 const root={querySelectorAll(selector){
  const id=selector.match(/data-source-control="([^"]+)"/)?.[1];
  if(!id)return [];
  if(!mounted.has(id)){
   const path={setAttribute(name,value){assert.equal(name,'d');drawings.set(id,value);}};
   mounted.set(id,{querySelector:()=>path,setAttribute(){}});
  }
  return [mounted.get(id)];
 }};
 return {root,drawings};
}

test('nine Remote drum glyphs match all 1034 pinned native idle drawings',()=>{
 let offset=0,rows=0;
 function compare(drawing,count,label){
  const points=polylines(drawing).flat(2);
  assert.equal(points.length,count,label);
  for(const actual of points){
   const expected=native.readUInt16LE(offset)/1000;
   assert.ok(Math.abs(actual-expected)<=.00061,`${label}: ${actual}, ${expected}`);
   offset+=2;
  }
  rows++;
 }
 const {root,drawings}=mountedGlyphs();
 for(const pots of contexts)for(let raw=0;raw<=127;raw++){
  for(const [id,count] of [[ids[0],56],[ids[2],66]]){
   paintKickDepth(root,id,raw,other=>pots[ids.indexOf(other)]);
   compare(drawings.get(id),count,id+' raw '+raw);
  }
 }
 for(const identity of ['1:0:1:2','1:1:1:2'])for(let raw=0;raw<=127;raw++){
  paintDrumGlyph(root,{identity,context:{name:'Snappy'}},raw,127);
  compare(drawings.get(identity),34,identity+' raw '+raw);
 }
 for(const identity of ['1:1:2:3','1:1:3:3','1:1:4:3','1:1:5:3','1:1:6:4'])for(let raw=0;raw<=1;raw++){
  paintDrumGlyph(root,{identity,context:{name:'Sound'}},raw,1);
  compare(drawings.get(identity),26,identity+' raw '+raw);
 }
 assert.equal(rows,1034);
 assert.equal(rows,fixture.rows);
 assert.equal(offset,native.length);
});

test('coupled redraw preserves the other kick pots and respects zero depth',()=>{
 const {root,drawings}=mountedGlyphs(),pot=new Map(ids.map((id,i)=>[id,contexts[0][i]]));
 function edit(id,raw){
  pot.set(id,raw);
  paintKickDepth(root,id,raw,other=>pot.get(other));
  return ids.map(key=>drawings.get(key));
 }
 let unchanged=edit(ids[2],0);
 assert.deepEqual(edit(ids[2],127),unchanged,'Pitch has no effect when Depth is zero');
 assert.notDeepEqual(edit(ids[1],64),unchanged);
 unchanged=edit(ids[2],0);
 const next=edit(ids[2],127);
 for(const [index,before] of unchanged.entries())assert.notEqual(next[index],before);
 assert.deepEqual([...pot.values()],[34,64,127]);
});
