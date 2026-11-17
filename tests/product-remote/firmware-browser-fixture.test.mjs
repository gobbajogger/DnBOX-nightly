import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('./firmware-browser.py',import.meta.url),'utf8');
test('browser MIDI fixture substitutes only its payload placeholder',()=>{
 const match=source.match(/MIDI = r'''([\s\S]*?)'''\.replace\('([^']+)', BUNDLE\)/);
 assert.ok(match,'fixture template and substitution remain inspectable');
 const script=match[1].split(match[2]).join(JSON.stringify({catalog:{crc:1},admission:{testOnly:true}}));
 assert.doesNotThrow(()=>new vm.Script(script));
 const context={window:{},navigator:{}};vm.runInNewContext(script,context);
 assert.equal(context.window.__DNBOX_FIRMWARE_BUNDLE.catalog.crc,1);
 assert.equal(typeof context.navigator.requestMIDIAccess,'function');
});
