import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../web/product-site/'+p,import.meta.url),'utf8');
test('Tools describes the Remote as connected control, without draft or emulator modes',()=>{
 const page=read('tools/index.html');
 assert.doesNotMatch(page,/No connected control or playback in this preview/);
 assert.match(page,/Edit patterns, sounds and tempo on a connected DnBOX over USB or Bluetooth MIDI/);
 assert.doesNotMatch(page,/Start emulator|Mix → Emulator|keep working in Draft/);
 assert.match(page,/href="\.\.\/remote\/">Open Remote/);
 assert.match(read('remote/index.html'),/aria-label="More actions"/);
 assert.doesNotMatch(read('remote/index.html'),/emulator-start|emulator-stop/);
 assert.doesNotMatch(read('remote/app.mjs'),/data-mix-source="emulator"/);
 assert.match(page,/Earlier DnBOX \.dnpr and ZIP files/);
});
