// SPDX-License-Identifier: GPL-3.0-only
// Display names for the five starting breaks. The keyboard still shows the slot names (BR1, BR2);
// these are the loops' own names, shown wherever the page lists them.
// BR1 3 and BR2 2 are the owner's "broken s1100 hot pants baggy.wav" and "extremely tasty break
// tightened.wav" (the stock HOTPANT and TASTY loops, assets/factory-breaks/provenance.json in
// gobbajogger/DnBOX): their decoded audio matches those originals (correlation 0.99). The other
// three have no recorded original name, so they keep their slot names until the owner names them.
export const STARTING_BREAK_NAMES = Object.freeze({
  'personal-br1-zone1': 'BR1 1',
  'personal-br1-zone2': 'BR1 2',
  'personal-br1-zone3': 'Hot Pants',
  'personal-br2-zone1': 'BR2 1',
  'personal-br2-zone2': 'Tasty',
});
const SLOT_LABEL = /^personal-br([12])-zone([123])$/;
// -> "BR1 · 3", where the loop sits on the keyboard
export function startingBreakSlot(id) {
  const m = SLOT_LABEL.exec(id);
  return m ? `BR${m[1]} · ${m[2]}` : '';
}
export function startingBreakName(id, fallback = '') {
  return STARTING_BREAK_NAMES[id] ?? fallback;
}
