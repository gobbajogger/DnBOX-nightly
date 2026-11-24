// SPDX-License-Identifier: GPL-3.0-only
// The chosen starting breaks, written during a firmware install. A port of gobbajogger/DnBOX
// tools/default_breaks.py (images, plan_fill, fill_fresh), the step tools/fm1_install.py
// --fresh-install --default-breaks WHICH runs after the firmware is written:
//  - only the chosen loops; none chosen writes nothing;
//  - only when every sample slot is blank (SMP_INFO and the header bytes), so it never erases or
//    overwrites a sample, and a later install never refills a slot the user cleared;
//  - each slot image is written with the installer's slot writer, then read back and compared.
// Slot images match default_breaks.slot_image byte for byte
// (tests/starting-break-install.test.mjs checks every one of the 32 choices).
import {SAMPLE_CONTRACT_SHA256} from './sample-pin.mjs';

export const STARTING_BREAK_IDS = Object.freeze(['personal-br1-zone1', 'personal-br1-zone2', 'personal-br1-zone3',
  'personal-br2-zone1', 'personal-br2-zone2']);
const HDR_LEN = 32 + 16 * 28, DATA_OFF = 512, MAGIC = 0x504D5346, ROOT_BASE = 36;
const HOME = {1: 0xC2000, 2: 0xD6000};          // slots.c SMP_USER_OFF: where each default belongs
const SLOT_OF = id => Number(/^personal-br([12])-zone[123]$/.exec(id)?.[1]);

export function crc32(b) {
  let c = 0xffffffff;
  for (const byte of b) { c ^= byte; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0); }
  return (c ^ 0xffffffff) >>> 0;
}

// The chosen ids in official order; anything unknown or repeated is refused.
export function normalizeChoice(ids) {
  if (!Array.isArray(ids) || ids.some(i => !STARTING_BREAK_IDS.includes(i)) || new Set(ids).size !== ids.length)
    throw new Error('Choose known starting breaks');
  return STARTING_BREAK_IDS.filter(i => ids.includes(i));
}

function keySplit(roots) {
  const n = roots.length;
  return roots.map((r, j) => [j === 0 ? 0 : Math.floor((roots[j - 1] + r) / 2) + 1, j === n - 1 ? 127 : Math.floor((r + roots[j + 1]) / 2)]);
}

// [{adpcm, frames}] -> header (480 B) padded with zeros to 512, then the ADPCM (default_breaks.slot_image)
export function slotImage(name, zones, rate = 22050) {
  let len = 0;
  const zs = zones.map((z, i) => { const off = len; len += z.adpcm.length; return {off, n: z.frames, root: ROOT_BASE + i}; });
  const img = new Uint8Array(DATA_OFF + len), v = new DataView(img.buffer);
  const q16 = Math.round(rate / 44100 * 65536);
  keySplit(zs.map(z => z.root)).forEach(([lo, hi], i) => {
    const {off, n, root} = zs[i], at = 32 + 28 * i;
    v.setUint32(at, off, true); v.setUint32(at + 4, n, true); v.setUint32(at + 8, 0, true);
    v.setUint32(at + 12, n - 1, true); v.setUint32(at + 16, q16, true);
    v.setInt16(at + 20, root * 16, true); v.setInt16(at + 22, 0, true);
    img[at + 24] = 0; img[at + 25] = lo; img[at + 26] = hi; img[at + 27] = 0;
  });
  let at = DATA_OFF;
  for (const z of zones) { img.set(z.adpcm, at); at += z.adpcm.length; }
  v.setUint32(0, MAGIC, true); v.setUint16(4, 1, true); img[6] = zs.length; img[7] = 0;
  img.set(new TextEncoder().encode(name.toUpperCase()).subarray(0, 8), 8);
  v.setUint32(16, len, true); v.setUint32(20, crc32(img.subarray(DATA_OFF)), true);
  return img;
}

// chosen ids + {id: {adpcm, frames}} -> Map(slot number -> image); empty when none are chosen
export function imagesFor(ids, zones) {
  const want = normalizeChoice(ids), out = new Map();
  for (const slot of [1, 2]) {
    const mine = want.filter(id => SLOT_OF(id) === slot).map(id => zones[id]);
    if (mine.length) out.set(slot, slotImage(`BR${slot}`, mine));
  }
  return out;
}

// SMP_INFO layout -> [{k, img}]; [] unless EVERY slot is blank (default_breaks.plan_fill)
export function planFill(layout, images) {
  if (!layout?.ext || layout.slots.some(sl => sl.nz || sl.used)) return [];
  const todo = [];
  for (const [slot, img] of [...images].sort((a, b) => a[0] - b[0])) {
    const k = slot - 1;
    if (k >= layout.count) continue;
    const sl = layout.slots[k];
    if (layout.ext && sl.off !== HOME[slot]) continue;
    if (img.length > sl.size) continue;
    todo.push({k, img});
  }
  return todo.length === images.size ? todo : [];
}

// io: {layout(), readBytes(k, off, n), writeSlot(k, img, onPart)} on the reconnected keyboard.
// -> {filled: [slot numbers], reason: 'none' | 'notblank' | 'nofit' | null}
export async function fillChosen(io, images, onPart) {
  if (!images.size) return {filled: [], reason: 'none'};
  const layout = await io.layout();
  const todo = planFill(layout, images);
  if (!todo.length) return {filled: [], reason: layout?.slots?.some(sl => sl.nz || sl.used) ? 'notblank' : 'nofit'};
  for (let k = 0; k < layout.count; k++) {               // every header still erased: nothing was there
    const head = await io.readBytes(k, 0, HDR_LEN);
    if (head.length !== HDR_LEN || head.some(b => b !== 0xff)) return {filled: [], reason: 'notblank'};
  }
  const filled = [];
  for (const {k, img} of todo) {
    // Check the target header again immediately before asking for its first write.
    const head = await io.readBytes(k, 0, HDR_LEN);
    if (head.length !== HDR_LEN || head.some(b => b !== 0xff))
      throw new Error(`slot ${k + 1}: no longer blank`);
    await io.writeSlot(k, img, onPart);
    const back = await io.readBytes(k, 0, img.length);
    if (back.length !== img.length || back.some((b, i) => b !== img[i]))
      throw new Error(`slot ${k + 1}: the starting breaks did not read back`);
    filled.push(k + 1);
  }
  return {filled, reason: null};
}

async function exact(url, size, hash, fetchImpl) {
  const response = await fetchImpl(url, {credentials: 'omit'});
  if (!response.ok) throw new Error('Starting breaks unavailable');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length !== size) throw new Error('Starting break size mismatch');
  const got = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
  if (got !== hash) throw new Error('Starting break identity mismatch');
  return bytes;
}

// Fetch and verify the chosen loops (pinned contract, then each ADPCM by size and SHA-256) BEFORE the
// firmware is written, so a download failure never leaves a half-done install. -> Map(slot -> image)
export async function loadChosenImages(ids, {baseURL = import.meta.url, fetchImpl = globalThis.fetch} = {}) {
  const want = normalizeChoice(ids);
  if (!want.length) return new Map();
  const contract = JSON.parse(new TextDecoder().decode(await exact(new URL('./sample-contract.json', baseURL), 2702, SAMPLE_CONTRACT_SHA256, fetchImpl)));
  const zones = {};
  for (const id of want) {
    const a = contract.assets.find(x => x.id === id);
    if (!a || a.sample_rate !== 22050 || a.adpcm_bytes !== Math.ceil(a.frames / 2)) throw new Error('Starting break metadata mismatch');
    zones[id] = {adpcm: await exact(new URL(`./assets/starting-breaks/${id}.adpcm`, baseURL), a.adpcm_bytes, a.adpcm_sha256, fetchImpl), frames: a.frames};
  }
  return imagesFor(want, zones);
}
