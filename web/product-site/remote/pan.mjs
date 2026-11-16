// SPDX-License-Identifier: GPL-3.0-only
// The one place pan range lives. User rule: "The panning must clip at 50".
// PROVISIONAL: raw storage is 0..127 with centre 64, clipped to 64±50 (14..114),
// pending Lead's firmware mapping on lead/pan-clip-50-20261116. Change only here.
export const PAN_CENTRE=64;
export const PAN_MAX=50;
export const PAN_MIN_RAW=PAN_CENTRE-PAN_MAX;
export const PAN_MAX_RAW=PAN_CENTRE+PAN_MAX;
export function clampPan(raw){const n=Math.round(Number(raw));if(!Number.isFinite(n))return PAN_CENTRE;return Math.max(PAN_MIN_RAW,Math.min(PAN_MAX_RAW,n));}
// Full travel p=0..1 maps to L50..R50 with no dead zone. Snaps within ±2 of centre.
export function panFromFraction(p){const q=Math.max(0,Math.min(1,Number(p)||0));const raw=Math.round(PAN_MIN_RAW+q*2*PAN_MAX);return Math.abs(raw-PAN_CENTRE)<=2?PAN_CENTRE:raw;}
export function fractionFromPan(raw){return (clampPan(raw)-PAN_MIN_RAW)/(2*PAN_MAX);}
export function formatPan(raw){const n=clampPan(raw);if(n===PAN_CENTRE)return 'C';return n<PAN_CENTRE?'L'+(PAN_CENTRE-n):'R'+(n-PAN_CENTRE);}
