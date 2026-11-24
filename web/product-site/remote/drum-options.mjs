// SPDX-License-Identifier: GPL-3.0-only
import {firmwareValue} from './firmware-labels.mjs';
const kitIndex = kit => String(kit) === '808' ? 1 : 0;
// Drum sequencer pages and the pattern/track parameter page. Every option, range, default and
// value name comes from the firmware's SEQUENCE page (firmware-engines.json sequenceOptions).
import {FIRMWARE_ENGINES} from './bass-engines.mjs';
import {paramEdit, partSetEdit, PART_FIELD} from './dnr3-link.mjs';
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export const SEQ = FIRMWARE_ENGINES.sequenceOptions;
export const PAGE_STEPS = 16;
export const PAGES = SEQ.steps / PAGE_STEPS;
export const drumOptions = () => SEQ.drum;
export const optionDefaults = (list = SEQ.drum) => Object.fromEntries(list.map(o => [o.pref, o.default]));
// The value as the firmware screen shows it (ui.c pref_get offsets and put_* formats).
// The instrument's own value text (firmware-labels.json) where the option is on a firmware page;
// otherwise the format read from ui.c pref_value_of by sync-firmware-engines.mjs.
export function formatOption(o, v, a = 0) {
  const fw = firmwareValue(o.kind + ':' + a + ':0:0', v);
  if (fw !== null) return fw;
  switch (o.format) {
    case 'plus1': return String(v + 1);
    case 'swing': return (50 + Math.floor(v / 4)) + ' %';
    case 'percent127': return Math.floor((v * 100 + 63) / 127) + ' %';
    case 'transpose': return (v - 24 > 0 ? '+' : '') + (v - 24);
    default: return o.names?.[v] ?? String(v);
  }
}
// PARAM_SET address: a = part (0 909, 1 808), b = pattern + 1, c = 0. Swing is the pattern's
// (all parts), accent is global (ui.c pref_pattern).
export function optionPref(o, partIndex, pattern) {
  if (![0, 1, 2, 3].includes(partIndex) || !Number.isInteger(pattern) || pattern < 0 || pattern > 31) throw Error('Invalid sequence option target');
  return {kind: o.kind, a: o.scope === 'part' ? (partIndex > 1 ? partIndex - 2 : partIndex) : 0, b: o.scope === 'global' ? 0 : pattern + 1, c: 0};
}
export const pagesFor = length => Math.max(1, Math.ceil(length / PAGE_STEPS));
export function renderDrumNav({page, params, length}) {
  const pages = Array.from({length: PAGES}, (_, i) => {
    const from = i * PAGE_STEPS + 1, to = from + PAGE_STEPS - 1;
    return '<button type="button" data-drum-page="' + i + '" aria-pressed="' + (!params && i === page) + '"' + (i >= pagesFor(length) ? ' class="beyond"' : '') + '>' + from + '–' + to + '</button>';
  }).join('');
  return '<nav class="drum-nav" aria-label="Steps">' + pages + '<span class="drum-len">LEN ' + length + '</span>' +
    '<button type="button" data-drum-params aria-pressed="' + !!params + '">PARAMS</button></nav>';
}
export function renderDrumParams({kit, values, options = SEQ.drum}) {
  return '<section class="drum-params" aria-label="' + esc(kit) + ' pattern parameters">' + options.map(o => {
    const v = values[o.pref] ?? o.default, scope = o.scope === 'part' ? kit : o.scope === 'pattern' ? 'ALL PARTS' : 'GLOBAL';
    const head = '<div class="seq-opt-head"><span>' + esc(o.label) + '</span><small>' + esc(scope) + '</small><output data-seq-value-of="' + o.pref + '">' + esc(formatOption(o, v, kitIndex(kit))) + '</output></div>';
    const body = o.names && o.format === 'names'
      ? '<div class="seq-opt-chips" role="group" aria-label="' + esc(o.label) + '">' + o.names.map((n, i) => '<button type="button" data-seq-opt="' + o.pref + '" data-seq-value="' + i + '" aria-pressed="' + (i === v) + '">' + esc(n) + '</button>').join('') + '</div>'
      : '<input type="range" min="0" max="' + o.max + '" step="1" value="' + v + '" data-seq-opt="' + o.pref + '" data-default="' + o.default + '" data-reset-key="seq-' + esc(kit) + '-' + o.pref + '" aria-label="' + esc(o.label) + '" aria-valuetext="' + esc(formatOption(o, v, kitIndex(kit))) + '">';
    return '<div class="seq-opt" data-seq-option="' + o.pref + '">' + head + body + '</div>';
  }).join('') + '</section>';
}
// The DNR3 message for one option: PART_SET for the step-page settings (§4.3, swing on part 0),
// PARAM_SET for the rest (accent level, global).
const FIELD_OF = {R_DLEN: PART_FIELD.LEN, R_DRATE: PART_FIELD.RATE, R_BLEN: PART_FIELD.LEN, R_BRATE: PART_FIELD.RATE, R_BDIR: PART_FIELD.DIR, R_BTRANS: PART_FIELD.TRANSPOSE, R_SWING: PART_FIELD.SWING};
export function optionEdit(o, part, pattern, v) {
  const field = FIELD_OF[o.pref];
  if (field !== undefined) return partSetEdit(o.pref === 'R_SWING' ? 'drum909' : part, pattern, field, o.format === 'plus1' ? v + 1 : v);
  const index = {drum909: 0, drum808: 1, chicago: 2, miami: 3}[part];
  return paramEdit(optionPref(o, index, pattern), v);
}
