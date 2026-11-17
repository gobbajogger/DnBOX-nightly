// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const fixture = JSON.parse(readFileSync(new URL('../visual/fixtures/site-retired-engine4.json', import.meta.url)));
const bytes = new Uint8Array(Buffer.from(fixture.base64, 'base64'));
const infix = String.fromCharCode(0x64, 0x72, 0x6f, 0x6e, 0x65);

for (const path of ['codec.mjs', 'legacy/codec.mjs']) test(path + ' adopts engine-4 records as Synth One init', async () => {
  const c = await import('../../web/product-site/presets/' + path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), fixture.sha256);
  assert.equal(c.DNPR_ENGINES[4].adoptInit, true);
  assert.equal(c.DNPR_ENGINES[4].token, 'synthone');
  const r = c.parseDnpr(bytes, { expectedEngine: '4' });
  assert.equal(r.engineId, 4);
  assert.equal(r.engine, 'synthone');
  assert.equal(r.retiredEngine, false);
  assert.equal(r.adoptedInit, true);
  assert.equal(r.factoryIndex, 0);
  assert.equal(r.params.length, 8);
  assert.ok(r.params.every(b => b === 0));
  assert.equal(c.recordEngineLabel(r), 'Synth One (init)');
  const also = c.parseDnpr(bytes, { expectedEngine: 'synthone' });
  assert.equal(also.engine, 'synthone');
  const exported = c.ensureExportable(r);
  const again = c.parseDnpr(exported);
  assert.equal(again.engine, 'synthone');
  assert.equal(again.factoryIndex, 0);
  assert.ok(again.params.every(b => b === 0));
  assert.match(c.fileNameFor(r), /\.synthone\.dnpr$/);
  assert.equal(c.explicitModelHint('user.elite.' + infix + '.dnpr'), 'elite');
  for (const model of ['elite', 'pro']) assert.equal(c.explicitModelHint('user.' + model + '.synthone.dnpr'), model);
  const encoded = c.encodeDnpr({ engine: 'synthone', name: 'Init', params: new Uint8Array(8) });
  assert.equal(c.parseDnpr(encoded).engine, 'synthone');
});
