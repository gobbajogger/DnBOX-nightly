// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {renderSynthOneInit} from '../../web/product-site/remote/synth-one-init.mjs';
import {INIT} from '../../web/product-site/remote/synth-one-init-data.mjs';

test('both owners show the production INIT values and measured envelopes without write targets', () => {
  for (const slot of [0, 1]) {
    const html = renderSynthOneInit(slot);
    assert.ok(html.includes('data-synth-one-init="'+slot+'"'));
    assert.equal(new Set([...html.matchAll(/data-init-field="([^"]+)"/g)].map(m => m[1])).size, 14);
    for (const label of ['Saw', '2000 Hz', '90%', '50 ms', '5 ms', '80%', '500 ms']) assert.ok(html.includes('>'+label+'<'));
    assert.doesNotMatch(html, /data-param=|<button|<input|<select|data-firmware/);
    for (const name of ['amp','filter']) assert.ok(html.includes('data-init-plot="'+name+'"'));
  }
  assert.throws(() => renderSynthOneInit(2), RangeError);
  assert.equal(INIT.sampleRate, 44100);
  assert.equal(INIT.gateOffSample, 8820);
  assert.equal(INIT.points.length, 81);
  assert.ok(INIT.points.every(p => p.length === 2 && p.every(n => n >= 0 && n <= 1.01)));
  assert.ok(INIT.points[20][0] > INIT.points[40][0]);
  assert.ok(INIT.points[20][1] > INIT.points[60][1]);
});

if (process.env.DNBOX_SYNTH_ONE_FIRMWARE) {
  test('the original compiled note path reproduces all thirteen INIT values and both measured traces', () => {
    const script = fileURLToPath(new URL('../../tools/synth-one-init/generate.py', import.meta.url));
    const result = execFileSync('python3', [script, process.env.DNBOX_SYNTH_ONE_FIRMWARE, '--check'], {encoding:'utf8'});
    assert.match(result,/13 frozen values, 81 paired envelope observations/);
  });
}
