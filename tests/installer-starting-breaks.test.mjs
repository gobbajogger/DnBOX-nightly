import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const html=readFileSync(new URL('../web/product-site/install/index.html',import.meta.url),'utf8');
test('firmware confirms once and labels selected samples as download-only',async()=>{
  const els={};const get=id=>els[id]??={};
  const a=html.indexOf('let confirmPending = false;'),b=html.indexOf(' $("version")',a);
  const fn=runInNewContext(html.slice(a,b)+'\nconfirmWrite',{lastId:null,$:get,t:x=>x});
  const first=fn('SMK-37 Pro_900',true,['personal-br2-zone2']);
  assert.match(els.inconfirmtext.textContent,/download-only[\s\S]*atomic sample snapshot[\s\S]*stop before restart/);
  assert.equal(await fn('SMK-37 Pro_900',true,[]),false);
  els.inconfirmno.onclick();assert.equal(await first,false);
});
test('firmware click leaves starting audio downloads independent of device writes',()=>{
  assert.doesNotMatch(html,/writeStartingBreaks|breakImages/);
  assert.match(html,/Download chosen breaks/);
  assert.match(html,/open Import samples and explicitly connect/);
});
