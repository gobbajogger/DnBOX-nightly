// SPDX-License-Identifier: GPL-3.0-only
// The one place pan lives. User rule: "The panning must clip at 50".
// Matched to DnBOX Lead's FINAL mapping (2026-11-16 14:16 VLAT; firmware SHA pending):
// storage, CC, presets, file format and outgoing values stay RAW 0..127, centre 64,
// UNCLAMPED. Only the display (and the marker) is in L50..C..R50 units:
//   d   = clamp(roundHalfAway((raw-64)*50/63), -50, +50)
//   raw = 64 + roundHalfAway(d*63/50), except d=-50 -> 0 and d=+50 -> 127
// Integer math only (no FP drift).
export const PAN_CENTRE=64;
export const PAN_MAX=50;
const sign=x=>x<0?-1:x>0?1:0;
// roundHalfAway(n/den) for integers, den>0.
const rhaDiv=(n,den)=>sign(n)*Math.floor((2*Math.abs(n)+den)/(2*den));
export function rawPan(raw){const n=Math.trunc(Number(raw));return Number.isFinite(n)?n:PAN_CENTRE;}
export function panDisplay(raw){const d=rhaDiv((rawPan(raw)-PAN_CENTRE)*50,63);return Math.max(-PAN_MAX,Math.min(PAN_MAX,d));}
export function rawFromDisplay(d){d=Math.max(-PAN_MAX,Math.min(PAN_MAX,Math.trunc(Number(d))||0));if(d===-PAN_MAX)return 0;if(d===PAN_MAX)return 127;return PAN_CENTRE+rhaDiv(d*63,50);}
export function formatPan(raw){const d=panDisplay(raw);return d===0?'C':d<0?'L'+(-d):'R'+d;}
// Edits work in display units: a 0..1 travel picks d in -50..50, then raw.
export function panFromFraction(p){const q=Math.max(0,Math.min(1,Number(p)||0));return rawFromDisplay(Math.round(q*2*PAN_MAX)-PAN_MAX);}
// Marker position from the same d.
export function fractionFromPan(raw){return (panDisplay(raw)+PAN_MAX)/(2*PAN_MAX);}
