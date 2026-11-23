// SPDX-License-Identifier: GPL-3.0-only
// Musician pages speak to musicians: no developer or file-format explainers in
// visible copy. The manual, protocol reference, build history, installer and
// project tool keep their technical reference text on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const MUSICIAN_ROUTES = [
 'index.html', 'breaks/index.html', 'help/index.html', 'new/index.html', 'presets/index.html',
 'presets/legacy/index.html', 'remote/index.html', 'remote/device/index.html', 'remote/identity/index.html',
 'starting-breaks/index.html', 'tools/index.html',
];
const JARGON = /\b(?:SysEx|SHA-?256|sha256|WASM|WebAssembly|JSON|API|CRC(?:32)?|schema|payload|handshake|localhost|provenance|runtime|stdout|endpoint|hash(?:es)?|commit|bytes?|DOM|npm|Playwright|fixture|oracle|harness|SPDX)\b/g;

export function visibleText(html) {
 return html
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<(script|style|svg|template)\b[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z#0-9]+;/gi, ' ')
  .replace(/\s+/g, ' ');
}

test('musician pages carry no technical explainers', () => {
 const found = [];
 for (const route of MUSICIAN_ROUTES) {
  const text = visibleText(readFileSync(new URL('../web/product-site/' + route, import.meta.url), 'utf8'));
  assert.ok(text.trim().length > 20, route + ' has visible copy');
  for (const m of text.matchAll(JARGON)) found.push(route + ': "' + text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40).trim() + '"');
 }
 assert.deepEqual(found, []);
});

test('the jargon scan catches an explainer', () => {
 const text = visibleText('<main><p>Each record is checked for CRC and schema.</p><script>const JSON=1</script></main>');
 assert.deepEqual([...text.matchAll(JARGON)].map(m => m[0]), ['CRC', 'schema']);
});
