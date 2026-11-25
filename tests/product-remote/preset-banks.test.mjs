// SPDX-License-Identifier: GPL-3.0-only
// SuperJ6 and Synth One presets: a bank selector, then the presets of that bank in the original
// instrument's order with real names; only presets the firmware can select are sent.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PRESET_BANKS, presetSelect, presetBanksFor, presetFirmwareIndex, locatePreset, FIRMWARE_ENGINES} from '../../web/product-site/remote/bass-engines.mjs';
import {buildPresetBanks, superJ6Banks, SYNTH_ONE_BANK_ORDER} from '../../scripts/sync-preset-banks.mjs';

const FW = process.env.DNBOX_FIRMWARE_DIR ?? '/tmp/fw73', SJ6 = process.env.DNBOX_SJ6_BANKS ?? '/workspace/sj6-private/banks/J6presets';
const fwPresets = n => FIRMWARE_ENGINES.bassEngines.find(e => e.name === n).presets;

test('preset-banks.json equals a fresh read of the firmware pack and the original SuperJ6 bank files', {skip: !(existsSync(FW + '/assets/factory_banks/synthone/MANIFEST.json') && existsSync(SJ6))}, () => {
  assert.deepEqual(buildPresetBanks(FW, SJ6), JSON.parse(readFileSync(new URL('../../web/product-site/remote/preset-banks.json', import.meta.url), 'utf8')));
});

test('Synth One: banks in the app order, every firmware preset once, numbers equal the firmware list', () => {
  const banks = presetBanksFor('SYNTH ONE');
  assert.deepEqual(banks.map(b => b.name), ['INIT', ...SYNTH_ONE_BANK_ORDER.filter(b => b !== 'User')]);
  const all = banks.flatMap(b => b.presets), list = fwPresets('SYNTH ONE');
  assert.equal(all.length, list.length);
  assert.deepEqual(all.map(p => p.firmwareIndex).sort((a, b) => a - b), list.map((_, i) => i));
  for (const p of all) assert.equal(list[p.firmwareIndex], p.name);
  assert.equal(banks[1].presets[0].name, 'Synthwave 1974');
  assert.equal(banks[1].presets.length, 135, 'Bonus presets belong to BankA, as their bank field says');
});

test('SuperJ6: 12 original banks by MIDI bank number with 640 real names; the firmware presets stay in DnBOX', () => {
  const banks = presetBanksFor('JUNO');
  assert.equal(banks[0].name, 'DnBOX'); assert.deepEqual(banks[0].presets.map(p => p.name), fwPresets('SUPERJ6'));
  assert.deepEqual(banks.slice(1).map(b => b.name), ['Intro Bank', 'DMT CYMATICS', 'Electronisounds', 'Moby Pixel', 'Red Sky Lullaby', 'Sander R Wolff', 'SOi', 'Sound Test Room', 'The GarageBand Guide', 'Wabi Sabi Waves', 'Brice Beasley', 'Stellar Anomalies']);
  assert.equal(banks.slice(1).reduce((n, b) => n + b.presets.length, 0), 640);
  assert.deepEqual(banks[1].presets.slice(0, 3).map(p => p.name), ['2025: Space Trip', 'MP Hello J6 (Epic Poly)', 'BB Compatible SEQ II']);
  assert.equal(PRESET_BANKS.engines.SUPERJ6.firmwareCarriesOriginalBanks, false);
  assert.ok(banks.slice(1).every(b => b.presets.every(p => p.firmwareIndex === null)), 'no number this firmware does not have');
});

test('the table swaps in firmware numbers once the firmware carries the original banks', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sj6-banks-'));
  try {
    writeFileSync(join(dir, 'B.superj6.bank.json'), JSON.stringify({name: 'B', midiBankChangeNumber: 1, presets: [{name: 'b2', position: 1}, {name: 'b1', position: 0}]}));
    writeFileSync(join(dir, 'A.superj6.bank.json'), JSON.stringify({name: 'A', midiBankChangeNumber: 0, presets: [{name: 'a1', position: 0}]}));
    const now = superJ6Banks(dir, ['POLY']);
    assert.deepEqual(now.banks.map(b => [b.name, b.presets.map(p => [p.name, p.firmwareIndex])]), [['DnBOX', [['POLY', 0]]], ['A', [['a1', null]]], ['B', [['b1', null], ['b2', null]]]]);
    const later = superJ6Banks(dir, ['POLY', 'a1', 'b1', 'b2']);
    assert.equal(later.firmwareCarriesOriginalBanks, true);
    assert.deepEqual(later.banks.map(b => [b.name, b.presets.map(p => p.firmwareIndex)]), [['DnBOX', [0]], ['A', [1]], ['B', [2, 3]]]);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test("the Remote renders a bank selector and that bank's presets, and sends only selectable ones", () => {
  const html = presetSelect(1, 'SYNTH ONE', 300);
  assert.match(html, /id="sound-preset-bank"/);
  const at = locatePreset('SYNTH ONE', 300), bank = presetBanksFor('SYNTH ONE')[at.bank];
  assert.equal((html.match(/<option value="\d+:\d+"/g) ?? []).length, bank.presets.length, "only that bank's presets");
  assert.match(html, new RegExp('selected>' + String(at.preset + 1).padStart(3, '0') + ' '));
  assert.equal(presetFirmwareIndex('SYNTH ONE', at), null, 'number 301 is above the 256 the preset select carries');
  assert.match(html, /data-preset-unsent/);
  assert.equal(presetFirmwareIndex('SYNTH ONE', locatePreset('SYNTH ONE', 12)), 12);
  assert.doesNotMatch(presetSelect(1, 'SYNTH ONE', 12), /data-preset-unsent/);
  assert.equal(presetFirmwareIndex('JUNO', {bank: 0, preset: 2}), 2);
  assert.equal(presetFirmwareIndex('JUNO', {bank: 1, preset: 0}), null);
  assert.match(presetSelect(0, 'JUNO', 0, {bank: 3, preset: 1}), /selected>Electronisounds \(21\)/);
  assert.doesNotMatch(presetSelect(0, 'CHICAGO', 0), /sound-preset-bank/, 'original engines keep one list');
});
