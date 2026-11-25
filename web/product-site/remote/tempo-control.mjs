// SPDX-License-Identifier: GPL-3.0-only
// BPM: offline Draft is local; the device setting is shown only after native readback.
import {NOTIFY_KIND} from './dnr3.mjs';
export const TAP_WINDOW_MS = 2000;
// BPM from tap timestamps (ms): the mean interval of the last taps inside the window.
export function bpmFromTaps(times, {min = 20, max = 300} = {}) {
  const recent = [];
  for (let i = times.length - 1; i >= 0; i--) { if (recent.length && recent[0] - times[i] > TAP_WINDOW_MS) break; recent.unshift(times[i]); if (recent.length === 8) break; }
  if (recent.length < 2) return null;
  const mean = (recent[recent.length - 1] - recent[0]) / (recent.length - 1);
  return Math.max(min, Math.min(max, Math.round(60000 / mean)));
}
export function mountTempoControl({root, display, badge, link, initial, defaultBpm, min = 20, max = 300, now = () => performance.now()}) {
  let draft = initial, device = null, generation = 0, state = 'Draft';
  let queued = null, sent = null, reading = false, readTicket = 0, message = '', taps = [], armed = 0;
  const bpm = () => link?.connected() ? device : draft;
  const ready = () => bpm() !== null;
  const valid = x => Number.isInteger(x) && x >= min * 10 && x <= max * 10;
  const buttons = [...root.querySelectorAll('[data-tempo]')];
  const tap = buttons.find(b => b.dataset.tempo === 'tap');
  function clearTaps() {
    taps = []; clearTimeout(armed);
    tap?.classList.remove('armed'); tap?.setAttribute('aria-pressed', 'false');
  }
  function paint() {
    const value = bpm();
    display.textContent = value === null ? '— BPM' : value + ' BPM';
    if (value === null) display.removeAttribute('aria-valuenow');
    else display.setAttribute('aria-valuenow', String(value));
    display.setAttribute('aria-valuetext', value === null ? 'BPM unavailable' : value + ' BPM');
    display.setAttribute('aria-disabled', String(value === null));
    for (const b of buttons) b.disabled = value === null;
    if (badge) {
      if (badge.textContent !== state) badge.textContent = state;
      badge.title = message || (link?.connected()
        ? 'DnBOX tempo setting. External clock can control playback speed.'
        : 'Browser draft tempo. Nothing is sent to DnBOX.');
    }
  }
  async function refresh(g) {
    if (!link?.connected() || reading) return;
    reading = true;
    const ticket = ++readTicket;
    const current = () => g === generation && ticket === readTicket;
    try {
      const x = await link.readTempo();
      if (!current()) return;
      if (!valid(x)) throw Error('Invalid BPM readback');
      device = x / 10; state = message ? 'Not confirmed' : 'Device'; paint();
    } catch {
      if (!current()) return;
      device = null; state = 'Unavailable'; paint();
    } finally { if (current()) reading = false; }
  }
  async function flush(g) {
    if (!link?.connected() || sent !== null || queued === null) return;
    const requested = sent = queued; queued = null;
    ++readTicket; reading = false;
    state = 'Updating'; paint();
    try {
      const x = await link.writeTempo(requested);
      if (g !== generation) return;
      if (!valid(x) || x !== Math.round(requested * 10)) throw Error('BPM not confirmed');
      device = x / 10; state = 'Device'; message = '';
    } catch {
      if (g !== generation) return;
      queued = null; device = null; state = 'Reading'; message = 'Tempo change not confirmed.';
      await refresh(g);
    } finally {
      if (g === generation) {
        sent = null; paint();
        if (queued !== null) void flush(g);
      }
    }
  }
  function set(v) {
    if (!ready()) return;
    const next = Math.max(min, Math.min(max, Math.round(v * 10) / 10));
    if (!link?.connected()) { draft = next; paint(); return; }
    if ((queued ?? sent ?? device) === next) return;
    queued = next; void flush(generation);
  }
  function sync() {
    const g = ++generation;
    device = null; queued = sent = null; reading = false; message = '';
    clearTaps(); drag = null; lastTap = null;
    state = link?.connected() ? 'Reading' : 'Draft'; paint();
    if (link?.connected()) void refresh(g);
  }
  display.setAttribute('role', 'slider'); display.setAttribute('aria-label', 'BPM'); display.tabIndex = 0;
  display.setAttribute('aria-valuemin', String(min)); display.setAttribute('aria-valuemax', String(max));
  const basis = () => queued ?? sent ?? bpm();
  root.addEventListener('click', e => {
    const b = e.target.closest?.('[data-tempo]'); if (!b || !ready()) return;
    if (b.dataset.tempo === 'tap') {
      const t = now(); taps = taps.filter(x => t - x <= TAP_WINDOW_MS); taps.push(t);
      b.classList.add('armed'); b.setAttribute('aria-pressed', 'true'); clearTimeout(armed);
      armed = setTimeout(clearTaps, TAP_WINDOW_MS);
      const v = bpmFromTaps(taps, {min, max}); if (v) set(v);
    }
    if (b.dataset.tempo === 'down') set(basis() - 1);
    if (b.dataset.tempo === 'up') set(basis() + 1);
    if (b.dataset.tempo === 'reset') set(defaultBpm);
  });
  display.addEventListener('keydown', e => {
    const d = {ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10}[e.key];
    if (d) { e.preventDefault(); set(basis() + d); }
    if (e.key.toLowerCase() === 'r') { e.preventDefault(); set(defaultBpm); }
  });
  let drag = null, lastTap = null;
  display.addEventListener('pointerdown', e => {
    if (!ready()) return;
    drag = {id: e.pointerId, y: e.clientY, start: basis(), generation};
    display.setPointerCapture?.(e.pointerId);
  });
  display.addEventListener('pointercancel', () => { drag = null; lastTap = null; });
  display.addEventListener('pointerup', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const {y,start,generation:own}=drag; drag=null;
    if (own !== generation) return;
    const delta=y-e.clientY;
    if (Math.abs(delta)>3) { set(start+Math.round(delta/4)); lastTap=null; return; }
    if (e.pointerType === 'mouse') return;
    const t = now(); if (lastTap !== null && t - lastTap < 350) { lastTap = null; set(defaultBpm); } else lastTap = t;
  });
  display.addEventListener('dblclick', () => set(defaultBpm));
  link?.onState(sync);
  link?.onNotify(e => {
    if (!link.connected() || sent !== null) return;
    if (e.type === 'resync' || e.gap || e.kind === NOTIFY_KIND.TRANSPORT) void refresh(generation);
  });
  sync();
  return {value: bpm, set};
}
