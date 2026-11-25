#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-only
// Writes web/product-site/remote/preset-banks.json: the bank selector and the presets in each bank for the
// new engines, in the original instruments' order, with real names. Only names, order and the firmware
// preset number go into the file, never preset contents.
//   SYNTH ONE: the firmware's factory pack (assets/factory_banks/synthone). Banks are listed in AudioKit
//     Synth One's initBanks order (AppSettings.swift @ the pack's source pin); a bank holds the presets
//     whose "bank" field names it, sorted by "position", as the app's sortPresets() does. The firmware
//     preset number is the pack's flat index (INIT first, then MANIFEST file order), as sync-firmware-engines reads it.
//   SUPERJ6: the original *.superj6.bank.json files, banks by midiBankChangeNumber, presets by position.
//     A firmware number is attached only when the firmware's SUPERJ6 preset list carries that bank order;
//     until then the firmware's own presets stay selectable in a "DnBOX" bank.
// Usage: node scripts/sync-preset-banks.mjs <firmware checkout> [<superj6 bank dir>] [--check]
import {readFileSync, writeFileSync, readdirSync, existsSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const OUT = fileURLToPath(new URL('../web/product-site/remote/preset-banks.json', import.meta.url));
const ENGINES = fileURLToPath(new URL('../web/product-site/remote/firmware-engines.json', import.meta.url));
// AudioKit/AudioKitSynthOne AudioKitSynthOne/Settings/AppSettings.swift initBanks ("User" holds no factory presets).
export const SYNTH_ONE_BANK_ORDER = ['BankA', 'User', 'Brice Beasley', 'DJ Puzzle', 'Electronisounds', 'Francis Preve', 'JEC',
  'Red Sky Lullaby', 'Spidericemidas', 'Sound of Izrael', 'Sound of Izrael 2', 'Starter Bank'];
const sha = b => createHash('sha256').update(b).digest('hex');
const listOf = d => Array.isArray(d) ? d : d.presets ?? d.data ?? [];

export function synthOneBanks(fw, firmwarePresets) {
  const base = join(fw, 'assets/factory_banks/synthone'), manifest = JSON.parse(readFileSync(join(base, 'MANIFEST.json'), 'utf8'));
  const all = []; let flat = 1;                                   // 0 is the firmware's INIT
  for (const f of manifest.files) for (const p of listOf(JSON.parse(readFileSync(join(base, f.name), 'utf8'))))
    all.push({name: String(p.name ?? p.presetName ?? ''), bank: String(p.bank), position: Number(p.position), firmwareIndex: flat++});
  if (firmwarePresets) for (const p of all) if (firmwarePresets[p.firmwareIndex] !== p.name) throw Error('Synth One flat order differs from firmware-engines.json at ' + p.firmwareIndex);
  const order = [...SYNTH_ONE_BANK_ORDER, ...[...new Set(all.map(p => p.bank))].filter(b => !SYNTH_ONE_BANK_ORDER.includes(b)).sort()];
  const banks = [{name: 'INIT', firmwareOnly: true, presets: [{name: firmwarePresets?.[0] ?? 'INIT', firmwareIndex: 0}]}];
  for (const name of order) {
    const presets = all.filter(p => p.bank === name).sort((a, b) => a.position - b.position).map(({name, firmwareIndex}) => ({name, firmwareIndex}));
    if (presets.length) banks.push({name, presets});
  }
  if (banks.reduce((n, b) => n + b.presets.length, 0) !== all.length + 1) throw Error('Synth One presets lost');
  return {source: 'firmware assets/factory_banks/synthone ' + manifest.source_repo + '@' + manifest.source_pin, bankOrder: 'AudioKitSynthOne initBanks', banks};
}

export function superJ6Banks(dir, firmwarePresets) {
  const files = readdirSync(dir).filter(f => f.endsWith('.superj6.bank.json')).sort();
  const banks = files.map(f => { const raw = readFileSync(join(dir, f)); const d = JSON.parse(raw);
    return {name: d.name, midiBank: d.midiBankChangeNumber, sha256: sha(raw), presets: d.presets.slice().sort((a, b) => a.position - b.position).map(p => ({name: p.name, firmwareIndex: null}))}; })
    .sort((a, b) => a.midiBank - b.midiBank);
  const flat = banks.flatMap(b => b.presets.map(p => p.name)), fwList = firmwarePresets ?? [];
  // The firmware carries the original banks once its list ends with them in this order.
  const offset = fwList.length - flat.length, carried = offset >= 0 && flat.every((n, i) => fwList[offset + i] === n);
  if (carried) { let i = offset; for (const b of banks) for (const p of b.presets) p.firmwareIndex = i++; }
  const own = carried ? fwList.slice(0, offset) : fwList;
  const out = own.length ? [{name: 'DnBOX', firmwareOnly: true, presets: own.map((name, i) => ({name, firmwareIndex: i}))}] : [];
  return {source: 'original SuperJ6 bank files (' + banks.length + ' banks, names and order only)', bankOrder: 'midiBankChangeNumber', firmwareCarriesOriginalBanks: carried,
    banks: [...out, ...banks.map(({sha256, ...b}) => b)], inputs: Object.fromEntries(banks.map(b => [b.name, b.sha256]))};
}

export function buildPresetBanks(fw, sj6Dir, engines = JSON.parse(readFileSync(ENGINES, 'utf8'))) {
  const presetsOf = n => engines.bassEngines.find(e => e.name === n)?.presets;
  return {schema: 1, generator: 'scripts/sync-preset-banks.mjs', firmwareSha: engines.firmwareSha, sendMax: 255,
    engines: {'SYNTH ONE': synthOneBanks(fw, presetsOf('SYNTH ONE')), SUPERJ6: superJ6Banks(sj6Dir, presetsOf('SUPERJ6'))}};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2).filter(a => a !== '--check');
  const fw = args[0] ?? process.env.DNBOX_FIRMWARE_DIR, sj6 = args[1] ?? process.env.DNBOX_SJ6_BANKS ?? '/workspace/sj6-private/banks/J6presets';
  if (!fw || !existsSync(sj6)) { console.error('usage: sync-preset-banks.mjs <firmware checkout> [<superj6 bank dir>] [--check]'); process.exit(2); }
  const text = JSON.stringify(buildPresetBanks(fw, sj6), null, 1) + '\n';
  if (process.argv.includes('--check')) { if (readFileSync(OUT, 'utf8') !== text) { console.error('preset-banks.json is stale'); process.exit(1); } console.log('preset-banks.json matches'); }
  else { writeFileSync(OUT, text); const d = JSON.parse(text); console.log('wrote', OUT, Object.entries(d.engines).map(([k, v]) => k + ' ' + v.banks.length + ' banks ' + v.banks.reduce((n, b) => n + b.presets.length, 0) + ' presets').join(', ')); }
}
