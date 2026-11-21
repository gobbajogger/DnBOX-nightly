import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as codec from '../../web/product-site/presets/legacy/codec.mjs';

const root = new URL('../../web/product-site/presets/legacy/', import.meta.url);
// Encoded by the previous revision for DNPR v1 engine 3 with 18 ramping parameters.
const bytes = Uint8Array.from(Buffer.from(
  'RE5QUgEAAwABAAAAdgAAADMMIDUCAwAAACk1AQAAAABMZWFkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE9yaWdpbmFsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEgAAAAAHDhUcIyoxOD9GTVRbYmlwdw==',
  'base64'
));

test('legacy target displays SuperJ6 and selects the existing juno token', () => {
  const html = readFileSync(new URL('index.html', root), 'utf8');
  const target = html.match(/<select id="target">([\s\S]*?)<\/select>/)[1];
  assert.match(target, /<option value="juno">SuperJ6<\/option>/);
});

test('legacy SuperJ6 records keep their engine ID, parameters and original export bytes', () => {
  const session = new codec.PresetSession();
  const [entry] = session.importMany([{ name: 'Lead.elite.juno.dnpr', bytes }],
    { expectedEngine: 'juno', targetModel: 'elite' });
  assert.equal(entry.record.engineId, 3);
  assert.equal(entry.record.originalEngine, 3);
  assert.equal(entry.record.engine, 'juno');
  assert.equal(entry.record.filenameModelHint, 'elite');
  assert.deepEqual(entry.record.params, Uint8Array.from({length: 18}, (_, i) => i * 7));
  assert.deepEqual(session.exportOne(entry.id), { name: 'Lead.juno.dnpr', bytes });
  assert.equal(entry.record.title, 'SuperJ6');
  assert.equal(codec.engineMetadataLabel(entry.record), 'SuperJ6');
  assert.equal(codec.recordEngineLabel(entry.record), 'SuperJ6');
});
