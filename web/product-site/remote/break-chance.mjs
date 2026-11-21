// SPDX-License-Identifier: GPL-3.0-only
// A probability point belongs to a step of this local BREAK sequence, independently of its MIDI notes.
import {chanceDomain, encodeChance} from './sequence.mjs';
import {chanceFromLane} from './lane.mjs';

const labels = new Map(chanceDomain.map(label => [encodeChance(label), label]));
const empty = () => Array(16).fill(null);
const stored = label => label === '100%' ? null : encodeChance(label);
export const breakChanceText = value => value == null ? '100%' : labels.get(value);
export function validBreakChance(values) {
  return Array.isArray(values) && values.length === 16 && Array.from(values).every(value =>
    value === null || (value !== 100 && labels.has(value)));
}

export class BreakChanceLane {
  constructor({read, commit, paint}) {
    this.read = read;
    this.commit = commit;
    this.paint = paint;
    this.gesture = null;
    this.pointers = new Set();
  }
  get values() { return this.gesture?.values ?? this.read() ?? empty(); }
  begin(owner) {
    this.pointers.add(owner);
    if (this.pointers.size !== 1) {
      this.gesture = null;
      this.paint();
      return false;
    }
    this.gesture = {owner, values: [...this.values], last: null};
    return true;
  }
  preview(owner, position, step) {
    const g = this.gesture;
    if (!g || g.owner !== owner || !Number.isInteger(step) || step < 0 || step >= 16 || !Number.isFinite(position)) return;
    const from = g.last ?? {position, step};
    const distance = Math.abs(step - from.step), direction = Math.sign(step - from.step);
    for (let i = 0; i <= distance; i++) {
      const p = distance ? from.position + (position - from.position) * i / distance : position;
      g.values[from.step + direction * i] = stored(chanceFromLane(p));
    }
    g.last = {position, step};
    this.paint();
  }
  end(owner) {
    this.pointers.delete(owner);
    if (this.gesture?.owner !== owner) return;
    const {values} = this.gesture;
    this.gesture = null;
    this.commit(values);
    this.paint();
  }
  nudge(group, kind, direction) {
    this.cancel();
    const values = [...this.values], i = chanceDomain.indexOf(breakChanceText(values[group.step]));
    const index = Math.min(chanceDomain.length - 1, Math.max(0, i - direction));
    values[group.step] = stored(chanceDomain[index]);
    this.commit(values);
    this.paint();
  }
  cancel() {
    this.pointers.clear();
    if (this.gesture) { this.gesture = null; this.paint(); }
  }
  cancelPointer(owner) {
    this.pointers.delete(owner);
    if (this.gesture?.owner === owner) { this.gesture = null; this.paint(); }
  }
}
