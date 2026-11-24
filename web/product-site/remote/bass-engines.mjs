// SPDX-License-Identifier: GPL-3.0-only
// Bass engines, their controls and presets, as generated from the firmware source
// (scripts/sync-firmware-engines.mjs -> firmware-engines.json). Nothing here is hand-listed.
import {renderSvg} from './glyph-render.mjs';
import {firmwarePages, firmwareParam, firmwareValue, firmwareName, identityOf} from './firmware-labels.mjs';
import {pictogramSvg} from './fw-glyphs.mjs';
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const inNode = typeof process !== 'undefined' && !!process.versions?.node && typeof window === 'undefined';
export const FIRMWARE_ENGINES = inNode
  ? JSON.parse((await import('node:fs')).readFileSync(new URL('./firmware-engines.json', import.meta.url), 'utf8'))
  : await (await fetch('./firmware-engines.json')).json();
// The Remote's existing sound sources call SuperJ6 "JUNO" internally (source-sounds.json).
const INTERNAL = {SUPERJ6: 'JUNO'};
const PUBLIC = Object.fromEntries(Object.entries(INTERNAL).map(([k, v]) => [v, k]));
export const publicName = bank => PUBLIC[bank] ?? bank;
export const internalName = name => INTERNAL[name] ?? name;
export const bankValues = () => FIRMWARE_ENGINES.bassEngines.map(e => internalName(e.name));
export const engineFor = bank => FIRMWARE_ENGINES.bassEngines.find(e => e.name === publicName(bank)) ?? null;
// Banks that the page's source-sound tables do not cover are edited from the firmware table.
export const SOURCE_BANKS = Object.freeze(['CHICAGO', 'MIAMI', 'JUNO']);
export const firmwareOnlyBank = bank => !!engineFor(bank) && !SOURCE_BANKS.includes(bank);
export function engineOptions(bank) {
  return FIRMWARE_ENGINES.bassEngines.map(e => {
    const v = internalName(e.name);
    return '<option value="' + esc(v) + '"' + (v === bank ? ' selected' : '') + '>' + esc(e.name) + '</option>';
  }).join('');
}
// Engines with preset banks (preset-banks.json, scripts/sync-preset-banks.mjs): a bank selector and the
// presets of that bank, in the original instrument's order with their real names. A preset carries the
// firmware's preset number when the firmware has it; the Remote sends only those.
export const PRESET_BANKS = inNode
  ? JSON.parse((await import('node:fs')).readFileSync(new URL('./preset-banks.json', import.meta.url), 'utf8'))
  : await (await fetch('./preset-banks.json')).json();
export const presetBanksFor = bank => { const e = engineFor(bank); return e ? PRESET_BANKS.engines[e.name]?.banks ?? null : null; };
export function locatePreset(bank, firmwareIndex) {
  const banks = presetBanksFor(bank) ?? [];
  for (let b = 0; b < banks.length; b++) { const p = banks[b].presets.findIndex(x => x.firmwareIndex === firmwareIndex); if (p >= 0) return {bank: b, preset: p}; }
  return {bank: 0, preset: 0};
}
// The firmware number to send for a bank/preset pick, or null when this firmware cannot select it.
export function presetFirmwareIndex(bank, pick) {
  const p = presetBanksFor(bank)?.[pick?.bank]?.presets[pick?.preset], i = p?.firmwareIndex;
  return Number.isInteger(i) && i <= PRESET_BANKS.sendMax ? i : null;
}
export function presetSelect(slot, bank, index = 0, pick = null) {
  const e = engineFor(bank); if (!e || slot < 0) return '';
  const label = esc(firmwareName('42:0:0:0', e.name) ?? 'PRESET'), banks = presetBanksFor(bank);
  if (!banks) return '<label class="fw-sound-pick">' + pictogramSvg('LIST') + label + ' <select id="sound-preset" aria-label="Preset">' + e.presets.map((name, i) =>
    '<option value="' + i + '"' + (i === index ? ' selected' : '') + '>' + String(i + 1).padStart(3, '0') + ' ' + esc(name) + '</option>').join('') + '</select></label>';
  const at = pick && banks[pick.bank]?.presets[pick.preset] ? pick : locatePreset(bank, index), list = banks[at.bank].presets;
  const chosen = list[at.preset], sendable = presetFirmwareIndex(bank, at) !== null;
  return '<label class="fw-sound-pick">' + pictogramSvg('LIST') + 'BANK <select id="sound-preset-bank" aria-label="Preset bank">' + banks.map((b, i) =>
    '<option value="' + i + '"' + (i === at.bank ? ' selected' : '') + '>' + esc(b.name) + ' (' + b.presets.length + ')</option>').join('') + '</select></label>' +
    '<label class="fw-sound-pick">' + label + ' <select id="sound-preset" aria-label="Preset" data-preset-bank="' + at.bank + '">' + list.map((p, i) =>
    '<option value="' + at.bank + ':' + i + '"' + (Number.isInteger(p.firmwareIndex) ? ' data-firmware-index="' + p.firmwareIndex + '"' : '') + (i === at.preset ? ' selected' : '') + '>' +
    String(i + 1).padStart(3, '0') + ' ' + esc(p.name) + '</option>').join('') + '</select></label>' +
    (sendable ? '' : '<small class="preset-note" data-preset-unsent>' + esc(chosen.name) + ' is not on firmware ' + esc(String(PRESET_BANKS.firmwareSha).slice(0, 8)) + (Number.isInteger(chosen.firmwareIndex) ? ' preset select (number ' + (chosen.firmwareIndex + 1) + ' is above ' + (PRESET_BANKS.sendMax + 1) + ')' : ' yet') + ', so it is not sent.</small>');
}
// The engine's knob pages exactly as the instrument shows them (firmware-labels.json), for a bank the
// source-sound tables do not cover. Engine, preset and status stay in the selectors above.
const SOUND_PAGE_KINDS = new Set([41, 42, 43]);
export function firmwareSoundControls(bank, values = new Map(), slot = 0) {
  const e = engineFor(bank); if (!e) return '';
  const engine = e.name.toLowerCase().replace(/\s+/g, '');
  const pages = firmwarePages('PART', slot + 2, {engine: e.name}).filter(pg => pg.refs.some(r => r && !SOUND_PAGE_KINDS.has(Number(r.split(':')[0]))));
  return '<div class="source-sound-list firmware-sound" aria-label="' + esc(e.name) + ' controls">' + pages.map(pg =>
    '<h3>' + esc(pg.title) + '</h3><div class="encoder-grid">' + pg.refs.filter(Boolean).map(ref => {
      const p = firmwareParam(ref, e.name), key = identityOf(ref); if (!p) return '';
      const v = values.get(key) ?? p.default, f = v / (p.max || 1), shown = firmwareValue(ref, v, e.name);
      return '<div class="funkybeats-typed-unit encoder"><span class="glyph">' + renderSvg(p.name, f, engine, {live: false, valueDomain: 'normalized'}) + '</span>' +
        '<div class="param-group"><label><span>' + esc(p.name) + '</span></label>' +
        '<input type="range" min="0" max="' + p.max + '" step="1" value="' + v + '" data-firmware-pref="' + key + '" data-firmware-engine="' + esc(e.name) + '" data-reset-key="fw-' + key + '" data-default="' + p.default + '" aria-label="' + esc(pg.title + ' ' + p.name) + '" aria-valuetext="' + esc(shown) + '">' +
        '<span data-param-value>' + esc(shown) + '</span></div></div>';
    }).join('') + '</div>').join('') + '</div>';
}
