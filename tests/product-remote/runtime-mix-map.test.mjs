// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const path=new URL('../../web/product-site/remote/runtime-mix-map.mjs',import.meta.url);
const module=existsSync(path)?await import(path):{};
const catalog=JSON.parse(readFileSync(new URL('../../web/product-site/remote/catalog.json',import.meta.url)));
const components=JSON.parse(readFileSync(new URL('../../web/product-site/remote/components.json',import.meta.url)));
test('actual Mix family maps 29 native identities and preserves all presentation aliases',()=>{
 assert.equal(typeof module.mixControlBindings,'function','native Mix mapping is not implemented');
 const result=module.mixControlBindings(catalog,components);
 assert.equal(result.groups.size,29);
 assert.equal(result.byId.get('catalog/1551').key,'4:0:14');
 assert.equal(result.byId.has('catalog/1550'),false);
 assert.equal(result.groups.has('4:0:13'),false);
 assert.equal(result.groups.get('4:0:8').max,12);
 assert.ok(result.groups.get('5:0:1').ids.length>=3);
 for(const group of result.groups.values())for(const id of group.ids)assert.equal(result.byId.get(id),group);
 assert.equal(result.byId.has('catalog/1'),false);
});
test('ambiguous catalog identity and wrong native range fail closed',()=>{
 assert.equal(typeof module.mixControlBindings,'function');
 const duplicate=structuredClone(catalog);duplicate.controls.push({...duplicate.controls.find(c=>c.id===1551),id:99999});
 assert.throws(()=>module.mixControlBindings(duplicate,components),/ambiguous/i);
 const wrong=structuredClone(catalog);wrong.controls.find(c=>c.id===1545).max=127;
 assert.throws(()=>module.mixControlBindings(wrong,components),/domain/i);
});
test('missing rendered native control cannot silently become an unbound input',()=>{
 assert.equal(typeof module.mixControlBindings,'function');
 const missing=structuredClone(catalog);missing.controls=missing.controls.filter(c=>c.id!==2317);
 assert.throws(()=>module.mixControlBindings(missing,components),/missing/i);
});
test('complete family refuses missing presentation screens and unique control coverage',()=>{
 for(const omitted of ['mix-parts-live.svg','mix-master.svg','fx-reverb-direct.svg','fx-delay-direct.svg']){
  const partial=structuredClone(components);partial.screens=partial.screens.filter(s=>!s.path.endsWith(omitted));
  assert.throws(()=>module.mixControlBindings(catalog,partial),/incomplete/i);
 }
 const partial=structuredClone(components);for(const s of partial.screens)s.controls=s.controls.filter(c=>c.identity!=='1:6:0:12');
 assert.throws(()=>module.mixControlBindings(catalog,partial),/incomplete/i);
});
test('same-count different identity cannot replace a required rendered control',()=>{
 const wrong=structuredClone(components);for(const s of wrong.screens)for(const c of s.controls)if(c.identity==='1:5:0:3')c.identity='1:5:1:3';
 assert.throws(()=>module.mixControlBindings(catalog,wrong),/incomplete/i);
});
