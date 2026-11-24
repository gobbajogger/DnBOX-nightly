// SPDX-License-Identifier: GPL-3.0-only
// Double-tap (touch) or double-click (mouse) on any knob or slider resets it to its default.
// Defaults are the values each control showed when the page first painted it (the fresh
// project's firmware values), unless the instrument reports a DESCRIBE default.
export const DOUBLE_TAP_MS = 350;
export const RESETTABLE = 'input[type="range"],[data-lane-step]';
export const controlKey = el => el.dataset.nativeParam || el.dataset.param || el.dataset.resetKey || el.id || null;
export function mountResetGesture({root, onReset, now = () => performance.now()}) {
  const defaults = new Map();
  const remember = scope => { for (const el of scope.querySelectorAll?.('input[type="range"]') ?? []) { const k = controlKey(el); if (k && !defaults.has(k)) defaults.set(k, Number(el.dataset?.default ?? el.getAttribute('value') ?? el.value)); } };
  remember(root);
  const observer = typeof MutationObserver === 'function' ? new MutationObserver(() => remember(root)) : null;
  observer?.observe(root, {subtree: true, childList: true});
  const fire = el => {
    if (el.matches('input[type="range"]')) {
      const k = controlKey(el), def = el.dataset.default !== undefined ? Number(el.dataset.default) : defaults.get(k);
      if (def === undefined || el.disabled) return;
      onReset({kind: 'range', el, key: k, value: def});
    } else if (!el.disabled) onReset({kind: 'lane', el, step: Number(el.dataset.laneStep)});
  };
  // dblclick does not reach controls whose pointerdown is consumed (the step lanes), so a second
  // pointerup on the same control within DOUBLE_TAP_MS also counts, for mouse, touch and pen alike.
  let fired = -Infinity;
  root.addEventListener('dblclick', e => { const el = e.target.closest?.(RESETTABLE); if (el && now() - fired > DOUBLE_TAP_MS) { e.preventDefault(); fire(el); } });
  let last = {el: null, t: 0};
  root.addEventListener('pointerup', e => {
    if (e.button !== undefined && e.button > 0) return;
    // A captured pointer reports the capturing container as its target: find the control under it.
    const el = e.target.closest?.(RESETTABLE) ?? root.ownerDocument?.elementFromPoint?.(e.clientX, e.clientY)?.closest?.(RESETTABLE); if (!el) return;
    const t = now();
    // Compare by control identity: a re-render between the taps replaces the element.
    const id = controlKey(el) ?? (el.dataset.laneStep !== undefined ? 'lane:' + el.closest('[id]')?.id + ':' + el.dataset.laneStep : el);
    if (last.el === id && t - last.t < DOUBLE_TAP_MS) { last = {el: null, t: 0}; fired = t; fire(el); } else last = {el: id, t};
  });
  return {defaults, destroy() { observer?.disconnect(); }};
}
// Apply a range reset through the control's own input/change handlers.
export function applyRangeReset(el, value) {
  el.value = String(value);
  el.dispatchEvent(new Event('input', {bubbles: true}));
  el.dispatchEvent(new Event('change', {bubbles: true}));
}
