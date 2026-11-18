import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SourceSounds} from '../../web/product-site/remote/sound.mjs';
import {chicagoControlBindings} from '../../web/product-site/remote/runtime-sound-map.mjs';
const root=new URL('../../web/product-site/remote/',import.meta.url);
const source=JSON.parse(fs.readFileSync(new URL('source-sounds.json',root)));
const catalog=JSON.parse(fs.readFileSync(new URL('catalog.json',root)));
const rows=()=>new SourceSounds(source,catalog).entries();
test('both Chicago slots retain all twenty scalar identities with engine-qualified keys',()=>{
 const result=chicagoControlBindings(rows());assert.equal(result.groups.size,40);assert.equal(result.byId.size,40);
 for(const slot of[0,1])for(let parameter=0;parameter<20;parameter++){
  const c=result.groups.get(`CHICAGO:${slot}:2:${slot}:${parameter}`);assert.ok(c);assert.equal(c.engine,'CHICAGO');assert.equal(c.sourceBank,0);assert.equal(c.slot,slot);assert.equal(c.max,parameter===17?11:127);assert.equal(c.min,0);
 }
 assert.equal([...result.groups.values()].some(c=>c.id.includes('|41:')),false);
});
test('missing or duplicate Chicago identities refuse incomplete admission',()=>{
 const r=rows(),first=r.find(c=>c.id==='source-sound/CHICAGO/0|1:2:0:0:0');
 assert.throws(()=>chicagoControlBindings(r.filter(c=>c!==first)),/coverage/);
 assert.throws(()=>chicagoControlBindings([...r,first]),/duplicate/i);
});
test('bank, slot, source identity, native domain and enabled status cannot drift',()=>{
 for(const patch of[{sourceBank:1},{voice:1},{target:3},{max:126},{min:1},{enabled:false},{id:'source-sound/MIAMI/0|1:2:0:0:1'}]){
  const r=rows(),i=r.findIndex(c=>c.id==='source-sound/CHICAGO/0|1:2:0:0:0');r[i]={...r[i],...patch};assert.throws(()=>chicagoControlBindings(r),/Chicago|coverage/);
 }
});
