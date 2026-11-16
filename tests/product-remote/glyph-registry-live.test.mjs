// SPDX-License-Identifier: GPL-3.0-only
// Every glyph G001-G082 must have a value-driven renderer: its pixels change
// with its value. A static icon fails.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ID_FAMILY, familyOf} from '../../web/product-site/remote/glyph-render.mjs';
import {paintPixels} from '../../web/product-site/remote/glyph-live.mjs';
import {FUNCTION_GLYPH} from '../../web/product-site/remote/glyph-registry.mjs';
const ids=Array.from({length:82},(_,i)=>'G'+String(i+1).padStart(3,'0'));
const engineFor=id=>{const n=+id.slice(1);return n<=22?'drum909':'chicago';};
test('registry: all 82 ids map to a renderer family',()=>{
 for(const id of ids)assert.ok(ID_FAMILY[id],id+' has no family');
 for(const id of Object.values(FUNCTION_GLYPH))assert.ok(ids.includes(id)||!/^G\d{3}$/.test(id),id);
});
test('registry: every glyph changes shape with its value (no static icons)',()=>{
 const w=80,h=48,sig=v=>{const d=new Uint8ClampedArray(w*h*4);return {d,f:null};};
 const bad=[];
 for(const id of ids){const e=engineFor(id);const shots=[0,0.5,1].map(v=>{const d=new Uint8ClampedArray(w*h*4);paintPixels(d,w,h,id,v,e);return Buffer.from(d).toString('base64');});
  if(shots[0]===shots[1]||shots[1]===shots[2]||shots[0]===shots[2])bad.push(id+':'+familyOf(id));}
 assert.deepEqual(bad,[]);
});
test('drum voice glyphs react to level, hit pulse and decay',()=>{
 const w=80,h=48,p=(st)=>{const d=new Uint8ClampedArray(w*h*4);paintPixels(d,w,h,'G001',0.5,'drum909',st);return Buffer.from(d).toString('base64');};
 const base=p({level:0.5,decay:0.5,hit:0});
 assert.notEqual(p({level:1,decay:0.5,hit:0}),base,'level');
 assert.notEqual(p({level:0.5,decay:1,hit:0}),base,'decay');
 assert.notEqual(p({level:0.5,decay:0.5,hit:1}),base,'hit pulse');
});
