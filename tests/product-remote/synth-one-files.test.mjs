// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {S1_FILE_FIELDS, acceptsSynthOneFileValue, openSynthOneFile} from '../../web/product-site/remote/synth-one-file-model.mjs';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const banks = new URL('../../web/product-site/remote/synth-one-banks/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('MANIFEST.json', banks)));
const source = '[{"name":"Écho","uid":"a","bank":"A","waveform1":0,"cutoff":2e3,"filterADSRMix":1.2,"opaque":9007199254740993},\n{"uid":"b","name":"Écho","bank":"A","waveform1":1,"cutoff":-0}]';

test('all 694 original records and twelve source banks retain their bytes and numeric fields', async () => {
  let count = 0;
  const license = await readFile(new URL('LICENSE', banks));
  assert.equal(createHash('sha1').update('blob '+license.length+'\0').update(license).digest('hex'), manifest.license_blob);
  for (const file of manifest.files) {
    const bytes = await readFile(new URL(file.name, banks));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
    const records = JSON.parse(bytes);
    const model = openSynthOneFile(bytes);
    assert.equal(model.names.length, file.count);
    assert.deepEqual(model.names, records.map(record => record.name));
    for (const [i,record] of records.entries()) {
      assert.deepEqual(model.record(i), Object.fromEntries(S1_FILE_FIELDS.filter(field => Object.hasOwn(record,field.key)).map(field => [field.key,record[field.key]])));
    }
    assert.deepEqual(Buffer.from(model.bytes()), bytes);
    model.set(0,'cutoff',4321);
    assert.equal(JSON.parse(decoder.decode(model.bytes()))[0].cutoff,4321);
    model.undo();
    assert.deepEqual(Buffer.from(model.bytes()), bytes);
    count += records.length;
  }
  assert.equal(count,694);
});

test('edits preserve original numeric spelling, unknown fields, missing fields and preset identity', () => {
  const bytes = encoder.encode(source);
  const a = openSynthOneFile(bytes), b = openSynthOneFile(bytes);
  bytes.fill(0);
  assert.equal(a.record(0).filterADSRMix,1.2);
  assert.ok(Object.is(a.record(1).cutoff,-0));
  a.set(0,'cutoff',8100);
  a.set(1,'waveform1',0.75);
  assert.equal(decoder.decode(a.bytes()),source.replace('2e3','8100').replace('"waveform1":1','"waveform1":0.75'));
  a.undo();
  a.undo();
  assert.equal(decoder.decode(a.bytes()),source);
  a.redo();
  assert.equal(a.record(0).cutoff,8100);
  a.set(0,'filterADSRMix',1.1);
  assert.equal(a.canRedo,false);
  assert.equal(decoder.decode(b.bytes()),source);
  for (const [i,key,value] of [[0,'cutoff',63],[0,'cutoff',Infinity],[0,'cutoff','3'],[1,'filterADSRMix',0],[0,'opaque',1],[-1,'cutoff',100]]) {
    assert.throws(()=>a.set(i,key,value));
  }
  assert.throws(()=>openSynthOneFile(encoder.encode(source.replace('"cutoff":2e3','"cutoff":3,"cutoff":2e3'))));
  const single = openSynthOneFile(encoder.encode(JSON.stringify(JSON.parse(source)[0])));
  single.set(0,'cutoff',3000);
  assert.equal(JSON.parse(decoder.decode(single.bytes())).cutoff,3000);
});


test('factory endpoint values follow binary32 bounds and preserve the one out-of-domain original', async () => {
  const counts = new Map();
  const outside = [];
  for (const file of manifest.files) {
    const original = await readFile(new URL(file.name, banks));
    const records = JSON.parse(original);
    const model = openSynthOneFile(original);
    for (const [index, record] of records.entries()) {
      for (const field of S1_FILE_FIELDS) {
        const value = record[field.key];
        if (!acceptsSynthOneFileValue(field,value)) {
          outside.push([file.name,record.name,field.key,value]);
          assert.throws(() => model.set(index,field.key,value));
        } else if (value < field.min || value > field.max) {
          counts.set(field.key,(counts.get(field.key) ?? 0) + 1);
          model.set(index,field.key,value);
        }
      }
    }
    assert.equal(model.canUndo,false);
    assert.deepEqual(Buffer.from(model.bytes()),original);
  }
  assert.deepEqual(Object.fromEntries(counts),{filterADSRMix:192,filterDecay:30,decayDuration:14});
  assert.deepEqual(outside,[['Bonus.json','Wavesss','noiseVolume',0.5]]);
});
