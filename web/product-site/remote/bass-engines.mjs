// SPDX-License-Identifier: GPL-3.0-only
// Bass engines, their controls and presets, as generated from the firmware source
// (scripts/sync-firmware-engines.mjs -> firmware-engines.json). Nothing here is hand-listed.
import {renderSvg} from './glyph-render.mjs';
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
export function presetSelect(slot, bank, index = 0) {
  const e = engineFor(bank); if (!e || slot < 0) return '';
  return '<label>Preset <select id="sound-preset" aria-label="Preset">' + e.presets.map((name, i) =>
    '<option value="' + i + '"' + (i === index ? ' selected' : '') + '>' + String(i + 1).padStart(3, '0') + ' ' + esc(name) + '</option>').join('') + '</select></label>';
}
export function firmwareSoundControls(bank, values = new Map()) {
  const e = engineFor(bank); if (!e) return '';
  const engine = e.name.toLowerCase().replace(/\s+/g, '');
  return '<div class="source-sound-list firmware-sound" aria-label="' + esc(e.name) + ' controls">' + e.params.map(p => {
    const v = values.get(p.index) ?? p.default, f = (v - 0) / (p.max || 1);
    const shown = p.names ? p.names[v] ?? String(v) : String(v);
    return '<div class="funkybeats-typed-unit encoder"><span class="glyph">' + renderSvg(p.name, f, engine, {live: false, valueDomain: 'normalized'}) + '</span>' +
      '<div class="param-group"><label><span>' + esc(p.name) + '</span></label>' +
      '<input type="range" min="0" max="' + p.max + '" step="1" value="' + v + '" data-firmware-param="' + p.index + '" data-reset-key="fw-' + engine + '-' + p.index + '" data-default="' + p.default + '" aria-label="' + esc(p.name) + '" aria-valuetext="' + esc(shown) + '">' +
      '<span data-param-value>' + esc(shown) + '</span></div></div>';
  }).join('') + '</div>';
}
