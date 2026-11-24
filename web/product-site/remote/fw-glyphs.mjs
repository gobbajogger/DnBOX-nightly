// SPDX-License-Identifier: GPL-3.0-only
// The instrument's own glyphs and their motion, from firmware-glyphs.json (scripts/sync-firmware-glyphs.mjs,
// read from firmware/src at the pinned tip): the 9x9 pictogram atlas, the header transport (play triangle
// that flashes on the beat, stopped square, REC dot), the HOME lane bar, the drum step grid (draw_drum)
// and the BREAK step bars. Nothing is redrawn by hand.
const inNode = typeof process !== 'undefined' && !!process.versions?.node && typeof window === 'undefined';
export const FIRMWARE_GLYPHS = inNode
  ? JSON.parse((await import('node:fs')).readFileSync(new URL('./firmware-glyphs.json', import.meta.url), 'utf8'))
  : await (await fetch('./firmware-glyphs.json')).json();
const G = FIRMWARE_GLYPHS, C = G.colours;
// A firmware colour name ("LINE", "night.GRAY", "rec") to CSS.
export function colour(name) {
  if (name.startsWith('night.')) return C.night[name.slice(6)];
  return C[name] ?? name;
}
// The 9x9 pictogram as crisp pixels, one rect per horizontal run (like ui_pictogram).
export function pictogramSvg(name, {label = ''} = {}) {
  const rows = G.pictograms[name]; if (!rows) throw Error('No firmware pictogram ' + name);
  let rects = '';
  rows.forEach((row, y) => { for (const m of row.matchAll(/#+/g)) rects += '<rect x="' + m.index + '" y="' + y + '" width="' + m[0].length + '" height="1"/>'; });
  return '<svg class="fw-pictogram" data-fw-glyph="' + name + '" viewBox="0 0 9 9" shape-rendering="crispEdges" fill="currentColor"' + (label ? ' role="img" aria-label="' + label + '"' : ' aria-hidden="true"') + '>' + rects + '</svg>';
}
// play_icon: the anti-aliased triangle, each pixel at its firmware coverage (of 16).
export function playIconSvg() {
  const p = G.transport.play;
  let rects = '';
  p.coverage16.forEach((row, y) => row.forEach((a, x) => { if (a) rects += '<rect x="' + x + '" y="' + y + '" width="1" height="1"' + (a < 16 ? ' fill-opacity="' + (a / 16) + '"' : '') + '/>'; }));
  return '<svg class="fw-transport fw-play" data-fw-glyph="play" viewBox="0 0 ' + p.w + ' ' + p.h + '" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">' + rects + '</svg>';
}
export function stopIconSvg() {
  const s = G.transport.stopped;
  return '<svg class="fw-transport fw-stop" data-fw-glyph="stopped" viewBox="0 0 ' + s.w + ' ' + s.h + '" shape-rendering="crispEdges" aria-hidden="true"><rect width="' + s.w + '" height="' + s.h + '" fill="' + colour(s.colour) + '"/></svg>';
}
export function recIconSvg() {
  const r = G.transport.rec.radius;
  return '<svg class="fw-transport fw-rec" data-fw-glyph="rec" viewBox="0 0 ' + (2 * r + 1) + ' ' + (2 * r + 1) + '" aria-hidden="true"><circle cx="' + (r + 0.5) + '" cy="' + (r + 0.5) + '" r="' + r + '" fill="' + colour(G.transport.rec.colour) + '"/></svg>';
}
// The play triangle's colour: DIM when stopped; while running, WHITE while metro_view (1 + quarter-note
// phase * 32) is at most 4, else HI. beatPhase is the position inside the current quarter note, 0..1.
export function playColour(playing, beatPhase) {
  const p = G.transport.play;
  if (!playing) return colour(p.idle);
  return 1 + Math.floor(beatPhase * p.metroSteps) <= p.beatWhileMetroAtMost ? colour(p.beat) : colour(p.run);
}
// engine_drum_fired window: one sixteenth at the tempo plus 20 ms.
export const firedWindowMs = bpm => Math.floor(15000 / (bpm >= 20 ? bpm : 120)) + 20;
// CSS custom properties that carry the firmware palette and drum-cell geometry (fractions of the 12x9 cell).
export function cssVars() {
  const d = G.drumGrid, c = d.cell, pc = (v, of) => (100 * v / of).toFixed(3) + '%';
  const v = {
    '--fw-line': C.LINE, '--fw-dim': C.DIM, '--fw-gray': C.GRAY, '--fw-amb': C.AMB, '--fw-hi': C.HI, '--fw-white': C.WHITE, '--fw-rec': C.rec,
    '--fw-cell-aspect': c.w + ' / ' + c.h, '--fw-cell-r': pc(c.r, c.w) + ' / ' + pc(c.r, c.h),
    '--fw-fired-x': pc(d.fired.x, c.w), '--fw-fired-y': pc(d.fired.y, c.h), '--fw-fired-w': pc(d.fired.w, c.w), '--fw-fired-h': pc(d.fired.h, c.h),
    '--fw-acc-x': pc(d.accentOn.x, c.w), '--fw-acc-y': pc(d.accentOn.y, c.h), '--fw-acc-w': pc(d.accentOn.w, c.w), '--fw-acc-h': pc(d.accentOn.h, c.h),
    '--fw-accoff-y': pc(d.accentOff.y, c.h), '--fw-accoff-h': pc(d.accentOff.h, c.h),
    '--fw-dot-x': pc(d.beyondLength.x, c.w), '--fw-dot-y': pc(d.beyondLength.y, c.h), '--fw-dot-w': pc(d.beyondLength.w, c.w), '--fw-dot-h': pc(d.beyondLength.h, c.h),
    '--fw-brk-bar-aspect': G.breakSteps.bar.w + ' / ' + G.breakSteps.bar.h
  };
  G.colours.parts.forEach((p, i) => { v['--fw-part-' + i] = p; });
  return v;
}
