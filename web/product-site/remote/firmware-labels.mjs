// SPDX-License-Identifier: GPL-3.0-only
// Parameter names, value text and knob pages exactly as the instrument's screen shows them.
// firmware-labels.json is produced by the firmware's own C code (describe_pages, pref_name,
// pref_value_of) through scripts/sync-firmware-labels.mjs; nothing here is hand-typed.
const inNode = typeof process !== 'undefined' && !!process.versions?.node && typeof window === 'undefined';
export const FIRMWARE_LABELS = inNode
  ? JSON.parse((await import('node:fs')).readFileSync(new URL('./firmware-labels.json', import.meta.url), 'utf8'))
  : await (await fetch('./firmware-labels.json')).json();
const P = FIRMWARE_LABELS.params;
// The Remote's internal bank names (source-sounds.json) to the firmware's engine names.
const ENGINE = {JUNO: 'SUPERJ6', SUPERJ6: 'SUPERJ6', CHICAGO: 'CHICAGO', MIAMI: 'MIAMI', SYNTHONE: 'SYNTH ONE', 'SYNTH ONE': 'SYNTH ONE'};
export const firmwareEngine = bank => ENGINE[String(bank ?? '').toUpperCase()] ?? null;
// "kind:a:b:c" from a control id ("...|kind:a:b:c") or a bare address.
export function identityOf(id) {
  const tail = (String(id ?? '').includes('|') ? String(id).split('|').pop() : String(id ?? '')).split('@')[0];
  return /^\d+:\d+:\d+:\d+$/.test(tail) ? tail : null;
}
// The engine a control belongs to: given, or read from a source-sound id ("source-sound/BANK/slot|...").
function engineOf(id, engine) {
  return firmwareEngine(engine) ?? firmwareEngine(String(id ?? '').split('@')[1]) ?? firmwareEngine(/^source-sound\/([^/]+)\//.exec(String(id ?? ''))?.[1]);
}
export function firmwareParam(id, engine) {
  const key = identityOf(id); if (!key) return null;
  const e = engineOf(id, engine);
  if (e && P[key + '@' + e]) return P[key + '@' + e];
  if (P[key]) return P[key];
  // Engine-bound without a known engine: only when every engine names it the same way.
  const all = FIRMWARE_LABELS.engines.map(n => P[key + '@' + n]).filter(Boolean);
  return all.length && all.every(p => p.name === all[0].name) ? {...all[0], values: null} : null;
}
export const firmwareName = (id, engine) => firmwareParam(id, engine)?.name ?? null;
export function firmwareValue(id, raw, engine) {
  const p = firmwareParam(id, engine), v = Number(raw);
  if (!p?.values || !Number.isInteger(v) || v < 0 || v > p.max) return null;
  return p.values[v];
}
// The knob pages the instrument shows for a view ("PART", "SEQ", "FX", "MIX", ...), part 0..4,
// drum voice (sel, 11 = KIT), mixer channel and bass engine.
export function firmwarePages(view, part, {sel = 0, mix = 0, engine} = {}) {
  const k = view + '/part' + part + '/sel' + sel + '/mix' + mix, e = firmwareEngine(engine);
  return FIRMWARE_LABELS.pages[k + '@' + e] ?? FIRMWARE_LABELS.pages[k] ?? [];
}
// The address of a firmware option by its pref kind, part (a) and pattern field: first match on the page.
export function firmwareKey(kind, a, b = null) {
  return Object.keys(P).find(k => { const [K, A, B] = k.split('@')[0].split(':').map(Number); return K === kind && A === a && (b === null || B === b); }) ?? null;
}
