// SPDX-License-Identifier: GPL-3.0-only
// Project BPM: tap tempo, fine adjust (−/+, drag, arrow keys) and double-tap reset to the
// firmware default. The value goes to the instrument as DNR3 TEMPO when connected.
export const TAP_WINDOW_MS = 2000;
// BPM from tap timestamps (ms): the mean interval of the last taps inside the window.
export function bpmFromTaps(times, {min = 20, max = 300} = {}) {
  const recent = [];
  for (let i = times.length - 1; i >= 0; i--) { if (recent.length && recent[0] - times[i] > TAP_WINDOW_MS) break; recent.unshift(times[i]); if (recent.length === 8) break; }
  if (recent.length < 2) return null;
  const mean = (recent[recent.length - 1] - recent[0]) / (recent.length - 1);
  return Math.max(min, Math.min(max, Math.round(60000 / mean)));
}
export function mountTempoControl({root, display, initial, defaultBpm, min = 20, max = 300, now = () => performance.now(), onChange = () => {}}) {
  let bpm = initial, taps = [], armed = 0;
  const set = (v, source) => {
    const next = Math.max(min, Math.min(max, Math.round(v)));
    if (next === bpm && source !== 'reset') { paint(); return; }
    bpm = next; paint(); onChange(bpm, source);
  };
  const paint = () => { display.textContent = bpm + ' BPM'; display.setAttribute('aria-valuenow', String(bpm)); display.setAttribute('aria-valuetext', bpm + ' BPM'); };
  display.setAttribute('role', 'slider'); display.setAttribute('aria-label', 'Tempo'); display.tabIndex = 0;
  display.setAttribute('aria-valuemin', String(min)); display.setAttribute('aria-valuemax', String(max));
  root.addEventListener('click', e => {
    const b = e.target.closest?.('[data-tempo]'); if (!b) return;
    if (b.dataset.tempo === 'tap') {
      const t = now(); taps = taps.filter(x => t - x <= TAP_WINDOW_MS); taps.push(t);
      // Lit while counting taps, so the first tap shows it was heard.
      b.classList.add('armed'); b.setAttribute('aria-pressed', 'true'); clearTimeout(armed);
      armed = setTimeout(() => { b.classList.remove('armed'); b.setAttribute('aria-pressed', 'false'); }, TAP_WINDOW_MS);
      const v = bpmFromTaps(taps, {min, max}); if (v) set(v, 'tap');
    }
    if (b.dataset.tempo === 'down') set(bpm - 1, 'fine');
    if (b.dataset.tempo === 'up') set(bpm + 1, 'fine');
  });
  display.addEventListener('keydown', e => {
    const d = {ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10}[e.key];
    if (d) { e.preventDefault(); set(bpm + d, 'fine'); }
  });
  let drag = null, lastTap = 0;
  display.style.touchAction = 'none';
  display.addEventListener('pointerdown', e => { drag = {id: e.pointerId, y: e.clientY, bpm, moved: false}; display.setPointerCapture?.(e.pointerId); });
  display.addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; const dy = drag.y - e.clientY; if (Math.abs(dy) > 3) drag.moved = true; if (drag.moved) set(drag.bpm + Math.round(dy / 4), 'fine'); });
  display.addEventListener('pointerup', e => {
    if (!drag || e.pointerId !== drag.id) return; const moved = drag.moved; drag = null;
    if (moved || e.pointerType === 'mouse') return;
    const t = now(); if (t - lastTap < 350) { lastTap = 0; set(defaultBpm, 'reset'); } else lastTap = t;
  });
  display.addEventListener('dblclick', () => set(defaultBpm, 'reset'));
  paint();
  return {value: () => bpm, set: v => set(v, 'set')};
}
