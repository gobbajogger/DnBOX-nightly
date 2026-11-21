import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../web/product-site/'+p,import.meta.url),'utf8');
test('Tools distinguishes Remote drafts from the separate browser instrument',()=>{
 const page=read('tools/index.html');
 assert.doesNotMatch(page,/No connected control or playback in this preview/);
 assert.match(page,/<details><summary>Use the browser instrument<\/summary>/);assert.match(page,/More actions/);assert.match(page,/Start emulator/);
 assert.match(page,/Mix.*Emulator/);assert.match(page,/your draft stays untouched/);
 assert.match(page,/does not control a connected device/);assert.match(page,/If the emulator is unavailable, keep working in Draft/);
 assert.match(page,/href="\.\.\/remote\/">Open Remote/);
 assert.match(read('remote/index.html'),/aria-label="More actions"/);
 assert.match(read('remote/index.html'),/id="emulator-start"[^>]*>Start emulator/);
 assert.match(read('remote/app.mjs'),/data-mix-source="emulator"/);
 assert.match(page,/Earlier DnBOX \.dnpr and ZIP files/);
});
