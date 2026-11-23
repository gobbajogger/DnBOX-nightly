// SPDX-License-Identifier: GPL-3.0-only
// Plain MIDI the firmware already understands (REMOTE-FW-PROTOCOL.md section 2).
// Grounded at firmware 8f97fe7d2:
//   seq/sequencer.c L29-34   GM_DRUM note maps, SEQ_CH_DEFAULT {9,10,1,2,3} (0-based)
//   app/engine.c   L1866-1925 note routing: break channel owns its notes, then kit channels
//                            (GM_DRUM match), then 303 channels; SMK clip mode eats notes < 40
//                            on non-break channels; brk_note_slice = (note - 12) mod count
//   seq/sequencer.c L1172    FA/FB/FC/F8 are ignored under internal clock
// Program Change clip launch needs the drain() change FW Core adds; it is sent only when
// HELLO reports caps bit PC_CLIP. Pure functions: nothing here touches Web MIDI.
import {CAP} from './dnr3.mjs';

export const PARTS = Object.freeze(['drum909', 'drum808', 'chicago', 'miami', 'breaks']);
export const PART_INDEX = Object.freeze(Object.fromEntries(PARTS.map((p, i) => [p, i])));
export const GM_DRUM = Object.freeze({
  drum909: Object.freeze([36, 38, 41, 45, 50, 37, 39, 42, 46, 49, 51]),
  drum808: Object.freeze([36, 38, 41, 45, 50, 37, 39, 56, 49, 46, 42]),
});
export const DEFAULT_CH = Object.freeze([9, 10, 1, 2, 3]);
export const CH_OFF = 127;              // STATE reports SEQ_CH_OFF (0xFF) as 127
export const CLIP_NOTES = 40;           // SMK_APC40_CLIP_COUNT
export const CLK_INTERNAL = 0;
export const BREAK_SLICE_BASE = 12;
export const PC_CANCEL = 127;

// state: {ch:[5], clkSrc, clipMode, caps, known} from DNR3 HELLO/STATE. Without it the
// firmware defaults are assumed and the result says so.
export function firmwareState(state) {
  const s = state ?? {};
  const ch = Array.isArray(s.ch) && s.ch.length === 5 ? s.ch.slice() : DEFAULT_CH.slice();
  return {ch, clkSrc: s.clkSrc ?? CLK_INTERNAL, clipMode: !!s.clipMode, caps: s.caps ?? 0, known: !!state && Array.isArray(s.ch)};
}

// Which channel reaches the part, or why notes would not reach it.
export function route(part, state) {
  const s = firmwareState(state), k = PART_INDEX[part];
  if (k === undefined) return {ok: false, reason: 'unknown-part'};
  const ch = s.ch[k];
  if (ch === CH_OFF || ch > 15) return {ok: false, reason: 'channel-off'};
  if (k !== 4 && s.ch[4] === ch) return {ok: false, ch, reason: 'owned-by-break'};
  if (k >= 2 && k <= 3 && (s.ch[0] === ch || s.ch[1] === ch)) return {ok: false, ch, reason: 'owned-by-kit'};
  const shared = PARTS.filter((p, i) => i !== k && s.ch[i] === ch);
  return {ok: true, ch, shared, assumed: !s.known};
}

function noteFor(part, key) {
  if (GM_DRUM[part]) return Number.isInteger(key) && key >= 0 && key < 11 ? GM_DRUM[part][key] : null;
  if (part === 'breaks') return Number.isInteger(key) && key >= 0 && key < 32 ? BREAK_SLICE_BASE + key : null;
  return Number.isInteger(key) && key >= 0 && key <= 127 ? key : null;
}

// key: drum voice 0..10, 303 MIDI note 0..127, break slice 0..31.
export function padOn(part, key, velocity, state) {
  const r = route(part, state), s = firmwareState(state), note = noteFor(part, key);
  if (!r.ok) return r;
  if (note === null) return {ok: false, reason: 'range'};
  if (s.clipMode && note < CLIP_NOTES && part !== 'breaks') return {ok: false, ch: r.ch, reason: 'clip-mode'};
  const v = Math.max(1, Math.min(127, Math.round(velocity)));
  return {...r, note, bytes: [0x90 | r.ch, note, v]};
}
export function padOff(part, key, state) {
  const on = padOn(part, key, 1, state);
  return on.ok ? {...on, bytes: [0x80 | on.ch, on.note, 0]} : on;
}

// action: 0 stop, 1 play from start, 2 continue (DNR3 TRANSPORT numbering).
export function transport(action, state) {
  const s = firmwareState(state);
  if (![0, 1, 2].includes(action)) return {ok: false, reason: 'range'};
  if (s.clkSrc === CLK_INTERNAL) return {ok: true, via: 'dnr3', action};
  return {ok: true, via: 'midi', bytes: [[0xFC, 0xFA, 0xFB][action]]};
}

// pat 0..31, or null to cancel the cue.
export function clipLaunch(part, pat, state) {
  const s = firmwareState(state);
  if (!(s.caps & CAP.PC_CLIP)) return {ok: false, reason: 'unsupported'};
  if (s.clipMode) return {ok: false, reason: 'clip-mode'};
  if (pat !== null && !(Number.isInteger(pat) && pat >= 0 && pat < 32)) return {ok: false, reason: 'range'};
  if (PART_INDEX[part] === undefined) return {ok: false, reason: 'unknown-part'};
  const ch = s.ch[PART_INDEX[part]];
  if (ch === CH_OFF || ch > 15) return {ok: false, reason: 'channel-off'};
  const parts = PARTS.filter((p, i) => s.ch[i] === ch);
  return {ok: true, ch, parts, assumed: !s.known, bytes: [0xC0 | ch, pat === null ? PC_CANCEL : pat]};
}
