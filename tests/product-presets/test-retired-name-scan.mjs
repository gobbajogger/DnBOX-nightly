import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const name = String.fromCharCode(100, 114, 111, 110, 101);
// Generated from the firmware: some firmware preset names contain the word (for example "FM ... Zone"),
// so that file is scanned below with its preset-name lists left out.
const FIRMWARE_DATA = 'web/product-site/remote/firmware-engines.json';

test('tracked current sources have no retired engine name', () => {
  const result = spawnSync('git', ['grep', '-niwI', name, '--', '.',
    ':!*CHANGELOG*', ':!docs/history/**', ':!docs/scheduler-handoffs/**', ':!' + FIRMWARE_DATA], { encoding: 'utf8' });
  assert.equal(result.status, 1, result.stdout || result.stderr);
});

test('firmware engine data has no retired engine name outside firmware preset names', () => {
  const word = new RegExp('\\b' + name + '\\b', 'i'), hits = [];
  const walk = (value, path) => {
    if (Array.isArray(value)) value.forEach((v, i) => walk(v, path.endsWith('/presets') ? path + '[preset]' : path + '[' + i + ']'));
    else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) { if (word.test(k)) hits.push(path + '/' + k); walk(v, path + '/' + k); }
    else if (typeof value === 'string' && word.test(value) && !path.endsWith('/presets[preset]')) hits.push(path + ' = ' + value);
  };
  walk(JSON.parse(readFileSync(new URL('../../' + FIRMWARE_DATA, import.meta.url), 'utf8')), '');
  assert.deepEqual(hits, []);
});
