// SPDX-License-Identifier: GPL-3.0-only
// Piano roll key column: a one-finger (or mouse) drag scrolls the roll vertically; a tap
// without movement previews that key's note.
export const DRAG_SLOP = 6;
export function noteAtRail(y, scrollTop, row) { return Math.max(0, Math.min(127, 127 - Math.floor((y + scrollTop) / row))); }
export function mountKeybedScroll({rail, scroll, row, onTap = () => {}}) {
  if (!rail || !scroll) return {destroy() {}};
  let drag = null;
  rail.style.touchAction = 'none';
  const down = e => {
    if (e.button !== undefined && e.button !== 0) return;
    drag = {id: e.pointerId, y: e.clientY, top: scroll.scrollTop, moved: false};
    rail.setPointerCapture?.(e.pointerId); e.preventDefault();
  };
  const move = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(dy) < DRAG_SLOP) return;
    drag.moved = true; scroll.scrollTop = drag.top - dy; e.preventDefault();
  };
  const up = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (!d.moved) { const box = rail.getBoundingClientRect(); onTap(noteAtRail(e.clientY - box.top, scroll.scrollTop, row())); }
  };
  const cancel = e => { if (drag && e.pointerId === drag.id) drag = null; };
  rail.addEventListener('pointerdown', down); rail.addEventListener('pointermove', move);
  rail.addEventListener('pointerup', up); rail.addEventListener('pointercancel', cancel);
  return {destroy() { rail.removeEventListener('pointerdown', down); rail.removeEventListener('pointermove', move); rail.removeEventListener('pointerup', up); rail.removeEventListener('pointercancel', cancel); }};
}
