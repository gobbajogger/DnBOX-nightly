// SPDX-License-Identifier: GPL-3.0-only
// The installer's starting-break write step against gobbajogger/DnBOX tools/default_breaks.py.
// REFERENCE: sha256 of default_breaks.images(choice) for all 32 choices (DnBOX 73749f55), slot -> image.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {STARTING_BREAK_IDS, imagesFor, planFill, fillChosen, loadChosenImages, normalizeChoice} from '../web/product-site/starting-break-install.mjs';
import {STARTING_BREAK_NAMES, startingBreakName, startingBreakSlot} from '../web/product-site/starting-break-names.mjs';

const REFERENCE = {
  "none": {},
  "personal-br1-zone1": {"1": "d98364a502bef8095eae56bb9142229d280c5061fb9ab5f46c709d93b3dcb139"},
  "personal-br1-zone2": {"1": "276ff4b47ce639e9a3e1b8614131b192a016cc10b5a9b8a978797068f8225564"},
  "personal-br1-zone3": {"1": "35080c28ac4fb86cabb4833a130b6e7a104f3eedd01815311f3f3a07e31eeaf6"},
  "personal-br2-zone1": {"2": "cd99d766777655c6b6d7ccc5d973454f6565136227ea5824bf9efb4e190bfe1f"},
  "personal-br2-zone2": {"2": "acd02942beb67347b62f5fc477527c5eebd86922be88ce96c9616034893a252f"},
  "personal-br1-zone1,personal-br1-zone2": {"1": "fb653e6c1d10871e9e19554716f2af1b54a0769466dfe9bc99ee00f272cc91ea"},
  "personal-br1-zone1,personal-br1-zone3": {"1": "164d0269d28f61627a34c852a03c17cf1f74c880d3fcf0bcd9acc689070f0b3e"},
  "personal-br1-zone1,personal-br2-zone1": {"1": "d98364a502bef8095eae56bb9142229d280c5061fb9ab5f46c709d93b3dcb139", "2": "cd99d766777655c6b6d7ccc5d973454f6565136227ea5824bf9efb4e190bfe1f"},
  "personal-br1-zone1,personal-br2-zone2": {"1": "d98364a502bef8095eae56bb9142229d280c5061fb9ab5f46c709d93b3dcb139", "2": "acd02942beb67347b62f5fc477527c5eebd86922be88ce96c9616034893a252f"},
  "personal-br1-zone2,personal-br1-zone3": {"1": "605737e1a09dd4d19ce7d5028099fea479f9f3c0312b8b599f313426604b0aa8"},
  "personal-br1-zone2,personal-br2-zone1": {"1": "276ff4b47ce639e9a3e1b8614131b192a016cc10b5a9b8a978797068f8225564", "2": "cd99d766777655c6b6d7ccc5d973454f6565136227ea5824bf9efb4e190bfe1f"},
  "personal-br1-zone2,personal-br2-zone2": {"1": "276ff4b47ce639e9a3e1b8614131b192a016cc10b5a9b8a978797068f8225564", "2": "acd02942beb67347b62f5fc477527c5eebd86922be88ce96c9616034893a252f"},
  "personal-br1-zone3,personal-br2-zone1": {"1": "35080c28ac4fb86cabb4833a130b6e7a104f3eedd01815311f3f3a07e31eeaf6", "2": "cd99d766777655c6b6d7ccc5d973454f6565136227ea5824bf9efb4e190bfe1f"},
  "personal-br1-zone3,personal-br2-zone2": {"1": "35080c28ac4fb86cabb4833a130b6e7a104f3eedd01815311f3f3a07e31eeaf6", "2": "acd02942beb67347b62f5fc477527c5eebd86922be88ce96c9616034893a252f"},
  "personal-br2-zone1,personal-br2-zone2": {"2": "5c87d668124fff63d092acb0493c94515a9010463c148c0fc9bf522bea0ee947"},
  "personal-br1-zone1,personal-br1-zone2,personal-br1-zone3": {"1": "77ae0a208740797b35f5a92164980e8a48b1529e5c003ff9e706481719500cf8"},
  "personal-br1-zone1,personal-br1-zone2,personal-br2-zone1": {"1": "fb653e6c1d10871e9e19554716f2af1b54a0769466dfe9bc99ee00f272cc91ea", "2": "cd99d766777655c6b6d7ccc5d973454f6565136227ea5824bf9efb4e190bfe1f"},
  "personal-br1-zone1,personal-br1-zone2,personal-br2-zone2": {"1": "fb653e6c1d10871e9e19554716f2af1b54a0769466dfe9bc99ee00f272cc91ea", "2": "acd02942beb67347b62f5fc477527c5eebd86922be88ce96c9616034893a252f"},
  "personal-br1-zone1,personal-br1-zone3,personal-br2-zone1": {"1": "164d0269d28f61627a34c852a03c17cf1f74c880d3fcf0bcd9acc689070f0b3e", "2": "cd99d766777655c6b6d7ccc5d973454f6565136227ea5824bf9efb4e190bfe1f"},
  "personal-br1-zone1,personal-br1-zone3,personal-br2-zone2": {"1": "164d0269d28f61627a34c852a03c17cf1f74c880d3fcf0bcd9acc689070f0b3e", "2": "acd02942beb67347b62f5fc477527c5eebd86922be88ce96c9616034893a252f"},
  "personal-br1-zone1,personal-br2-zone1,personal-br2-zone2": {"1": "d98364a502bef8095eae56bb9142229d280c5061fb9ab5f46c709d93b3dcb139", "2": "5c87d668124fff63d092acb0493c94515a9010463c148c0fc9bf522bea0ee947"},
  "personal-br1-zone2,personal-br1-zone3,personal-br2-zone1": {"1": "605737e1a09dd4d19ce7d5028099fea479f9f3c0312b8b599f313426604b0aa8", "2": "cd99d766777655c6b6d7ccc5d973454f6565136227ea5824bf9efb4e190bfe1f"},
  "personal-br1-zone2,personal-br1-zone3,personal-br2-zone2": {"1": "605737e1a09dd4d19ce7d5028099fea479f9f3c0312b8b599f313426604b0aa8", "2": "acd02942beb67347b62f5fc477527c5eebd86922be88ce96c9616034893a252f"},
  "personal-br1-zone2,personal-br2-zone1,personal-br2-zone2": {"1": "276ff4b47ce639e9a3e1b8614131b192a016cc10b5a9b8a978797068f8225564", "2": "5c87d668124fff63d092acb0493c94515a9010463c148c0fc9bf522bea0ee947"},
  "personal-br1-zone3,personal-br2-zone1,personal-br2-zone2": {"1": "35080c28ac4fb86cabb4833a130b6e7a104f3eedd01815311f3f3a07e31eeaf6", "2": "5c87d668124fff63d092acb0493c94515a9010463c148c0fc9bf522bea0ee947"},
  "personal-br1-zone1,personal-br1-zone2,personal-br1-zone3,personal-br2-zone1": {"1": "77ae0a208740797b35f5a92164980e8a48b1529e5c003ff9e706481719500cf8", "2": "cd99d766777655c6b6d7ccc5d973454f6565136227ea5824bf9efb4e190bfe1f"},
  "personal-br1-zone1,personal-br1-zone2,personal-br1-zone3,personal-br2-zone2": {"1": "77ae0a208740797b35f5a92164980e8a48b1529e5c003ff9e706481719500cf8", "2": "acd02942beb67347b62f5fc477527c5eebd86922be88ce96c9616034893a252f"},
  "personal-br1-zone1,personal-br1-zone2,personal-br2-zone1,personal-br2-zone2": {"1": "fb653e6c1d10871e9e19554716f2af1b54a0769466dfe9bc99ee00f272cc91ea", "2": "5c87d668124fff63d092acb0493c94515a9010463c148c0fc9bf522bea0ee947"},
  "personal-br1-zone1,personal-br1-zone3,personal-br2-zone1,personal-br2-zone2": {"1": "164d0269d28f61627a34c852a03c17cf1f74c880d3fcf0bcd9acc689070f0b3e", "2": "5c87d668124fff63d092acb0493c94515a9010463c148c0fc9bf522bea0ee947"},
  "personal-br1-zone2,personal-br1-zone3,personal-br2-zone1,personal-br2-zone2": {"1": "605737e1a09dd4d19ce7d5028099fea479f9f3c0312b8b599f313426604b0aa8", "2": "5c87d668124fff63d092acb0493c94515a9010463c148c0fc9bf522bea0ee947"},
  "personal-br1-zone1,personal-br1-zone2,personal-br1-zone3,personal-br2-zone1,personal-br2-zone2": {"1": "77ae0a208740797b35f5a92164980e8a48b1529e5c003ff9e706481719500cf8", "2": "5c87d668124fff63d092acb0493c94515a9010463c148c0fc9bf522bea0ee947"}
};
const site = new URL('../web/product-site/', import.meta.url);
const contract = JSON.parse(readFileSync(new URL('sample-contract.json', site), 'utf8'));
const zones = Object.fromEntries(contract.assets.map(a => [a.id, {frames: a.frames,
  adpcm: new Uint8Array(readFileSync(new URL(`assets/starting-breaks/${a.id}.adpcm`, site)))}]));
const sha = b => createHash('sha256').update(b).digest('hex');
const choices = ids => ids.length ? ids.join(',') : 'none';
const subsets = [...Array(32).keys()].map(m => STARTING_BREAK_IDS.filter((_, i) => m >> i & 1));

test('every one of the 32 choices builds default_breaks.py slot images byte for byte', () => {
  assert.equal(Object.keys(REFERENCE).length, 32);
  for (const ids of subsets) {
    const got = Object.fromEntries([...imagesFor(ids, zones)].map(([s, img]) => [String(s), sha(img)]));
    assert.deepEqual(got, REFERENCE[choices(ids)], choices(ids));
  }
});

test('unknown, repeated or unordered choices', () => {
  assert.throws(() => normalizeChoice(['personal-br3-zone1']));
  assert.throws(() => normalizeChoice(['personal-br1-zone1', 'personal-br1-zone1']));
  assert.deepEqual(normalizeChoice(['personal-br2-zone2', 'personal-br1-zone1']), ['personal-br1-zone1', 'personal-br2-zone2']);
});

// A keyboard's sample slots as the firmware reports them (SMK-37 extended map), plus the write log.
function keyboard({nz = [0, 0, 0], header = null} = {}) {
  const flash = [0, 1, 2].map(() => new Uint8Array(0x14000).fill(0xff)), log = [];
  if (header) flash[header.k].set(header.bytes);
  const off = [0xC2000, 0xD6000, 0xEA000];
  return {log, flash, io: {
    async layout() { return {count: 3, size: 80 * 1024, ext: true,
      slots: nz.map((n, k) => ({nz: n, used: n ? 20 : 0, off: off[k], size: 0x14000}))}; },
    async readBytes(k, at, n) { return flash[k].slice(at, at + n); },
    async writeSlot(k, img) { log.push({k, sha: sha(img)}); flash[k].fill(0xff); flash[k].set(img); },
  }};
}

test('all chosen: both slots written and read back', async () => {
  const kb = keyboard();
  const r = await fillChosen(kb.io, imagesFor(STARTING_BREAK_IDS, zones));
  assert.deepEqual(r, {filled: [1, 2], reason: null});
  assert.deepEqual(kb.log.map(w => [w.k, w.sha]), [[0, REFERENCE[choices(STARTING_BREAK_IDS)]['1']], [1, REFERENCE[choices(STARTING_BREAK_IDS)]['2']]]);
});

test('some chosen: only the chosen loops are written', async () => {
  const ids = ['personal-br1-zone3', 'personal-br2-zone2'];
  const kb = keyboard();
  const r = await fillChosen(kb.io, imagesFor(ids, zones));
  assert.deepEqual(r.filled, [1, 2]);
  assert.deepEqual(kb.log.map(w => w.sha), [REFERENCE[choices(ids)]['1'], REFERENCE[choices(ids)]['2']]);
  const only = ['personal-br2-zone1'], kb2 = keyboard();
  assert.deepEqual((await fillChosen(kb2.io, imagesFor(only, zones))).filled, [2]);
  assert.deepEqual(kb2.log.map(w => w.k), [1]);
  assert.ok(kb2.flash[0].every(b => b === 0xff), 'slot 1 stays erased');
});

test('none chosen: nothing is read or written', async () => {
  const kb = keyboard();
  kb.io.layout = async () => { throw Error('must not talk to the keyboard'); };
  assert.deepEqual(await fillChosen(kb.io, imagesFor([], zones)), {filled: [], reason: 'none'});
  assert.equal(kb.log.length, 0);
});

test('a keyboard with samples, or a stray header, is never written', async () => {
  const kb = keyboard({nz: [0, 2, 0]});
  assert.deepEqual(await fillChosen(kb.io, imagesFor(STARTING_BREAK_IDS, zones)), {filled: [], reason: 'notblank'});
  const kb2 = keyboard({header: {k: 2, bytes: [0x46, 0x53]}});
  assert.deepEqual(await fillChosen(kb2.io, imagesFor(STARTING_BREAK_IDS, zones)), {filled: [], reason: 'notblank'});
  assert.equal(kb.log.length + kb2.log.length, 0);
});

test('a slot that does not read back fails the step', async () => {
  const kb = keyboard();
  kb.io.writeSlot = async (k, img) => { kb.flash[k].set(img); kb.flash[k][600] ^= 1; };
  await assert.rejects(fillChosen(kb.io, imagesFor(['personal-br1-zone1'], zones)), /did not read back/);
});

test('another flash map keeps the default out of the wrong place', () => {
  const lay = {count: 3, ext: true, slots: [{nz: 0, used: 0, off: 0xC0000, size: 0x14000}, {nz: 0, used: 0, off: 0xD6000, size: 0x14000}, {nz: 0, used: 0, off: 0xEA000, size: 0x14000}]};
  assert.deepEqual(planFill(lay, imagesFor(STARTING_BREAK_IDS, zones)), []);
  assert.deepEqual(planFill(lay, imagesFor([STARTING_BREAK_IDS[3]], zones)).map(t => t.k), [1]);
});

test('loadChosenImages verifies the pinned contract and each loop before building', async () => {
  const fetchImpl = async url => ({ok: true, arrayBuffer: async () => Uint8Array.from(readFileSync(new URL(url))).buffer});
  const got = await loadChosenImages(['personal-br1-zone2'], {baseURL: site, fetchImpl});
  assert.deepEqual([...got].map(([s, i]) => [s, sha(i)]), [[1, REFERENCE['personal-br1-zone2']['1']]]);
  assert.equal((await loadChosenImages([], {baseURL: site, fetchImpl: () => { throw Error('no fetch for none'); }})).size, 0);
  const bad = async url => ({ok: true, arrayBuffer: async () => { const b = Uint8Array.from(readFileSync(new URL(url))); if (String(url).endsWith('.adpcm')) b[9] ^= 1; return b.buffer; }});
  await assert.rejects(loadChosenImages(['personal-br1-zone1'], {baseURL: site, fetchImpl: bad}), /identity mismatch/);
});

test('display names: the two matched originals are named, every id has one', () => {
  assert.deepEqual(Object.keys(STARTING_BREAK_NAMES), [...STARTING_BREAK_IDS]);
  assert.equal(startingBreakName('personal-br1-zone3'), 'Hot Pants');
  assert.equal(startingBreakName('personal-br2-zone2'), 'Tasty');
  assert.equal(startingBreakSlot('personal-br2-zone1'), 'BR2 · 1');
});
