// SPDX-License-Identifier: GPL-3.0-only
// Admission of 2-file NIGHTLY packages and 5-file FDATA packages (xdata, fittab, fdata).
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {controllerOf, logicalImage, productOf} from '../web/fm1pkg.js';
import {crc32, makeController, makePackage} from './fixtures/bundled-synthetic.mjs';

const CTL_SHA = 'a334208b51f62bc7231ebb76a6de0dfa260033d7f7316e5b92053c540bc1d984';
const FDATA_MAP = [[0xc2000, 0x14000], [0xd6000, 0xf000], [0xb3000, 0x8000]];
const CURRENT_MAP = [[0xc2000, 0x14000], [0xd6000, 0x1e000], [0xb3000, 0x8000]];
const PUBLISHED = {
  elite27: {
    product: 'SMK-37 Elite_900',
    sha256: '3cd2e16cc7119bf82e6274c3f46d2caad0dd576c0818dc43f9ab817a9dd1eee2',
    file: 'DnBOX-0.0.27-SMK37-elite-73749f55-test.fwsc',
  },
  pro27: {
    product: 'SMK-37 Pro_900',
    sha256: 'e62b1dfe4a03c32abc57660dd228fe40ce575d0dd1f2b7cf8920cce82029c785',
    file: 'DnBOX-0.0.27-SMK37-pro-73749f55-test.fwsc',
  },
  elite26: {
    product: 'SMK-37 Elite_900',
    sha256: '95b3195f4767ef5df33b365197b01203873e5eec3d7fa497c73e5e509484a4a6',
    file: 'DnBOX-0.0.26-SMK37-Elite-94197fc8-hwtest.fwsc',
  },
  pro26: {
    product: 'SMK-37 Pro_900',
    sha256: 'ce67d560eebd03cb8b9087f7723b1e0b71fb7cca256184cdfdd55a8c27c708b8',
    file: 'DnBOX-0.0.26-SMK37-Pro-94197fc8-hwtest.fwsc',
  },
};

function sha256(u8) {
  return createHash('sha256').update(u8).digest('hex');
}

function makeFdata(size = 0xf000) {
  const b = Buffer.alloc(size, 0xff);
  b.write('S1PK', 0);
  b.writeUInt16LE(1, 4);
  b.writeUInt16LE(694, 6);
  b.writeUInt32LE(32, 12);
  b.writeUInt32LE(crc32(Buffer.alloc(0)), 16);
  return b;
}

function fdataPackage(model, extra = {}) {
  return makePackage(model, {
    slotMap: FDATA_MAP,
    extraFiles: [
      [101, 'xdata.bin', Buffer.alloc(0x2000)],
      [102, 'fittab.bin', Buffer.alloc(0x1000)],
      [103, 'fdata.bin', makeFdata()],
    ],
    ...extra,
  });
}

function admit(raw, product) {
  assert.equal(productOf(raw), product);
  const ctl = controllerOf(logicalImage(raw));
  assert.ok(ctl.length >= 68);
  return ctl;
}

let cases = 0;

for (const model of ['elite', 'pro']) {
  const product = `SMK-37 ${model === 'elite' ? 'Elite' : 'Pro'}_900`;
  admit(makePackage(model), product);
  cases++;
  const five = fdataPackage(model);
  const ctl = admit(five, product);
  assert.deepEqual(Buffer.from(ctl), makeController());
  cases++;
}

assert.throws(() => controllerOf(logicalImage(fdataPackage('pro', {slotMap: CURRENT_MAP}))),
  /FDATA requires the reserved slot map/);
cases++;
assert.throws(() => controllerOf(logicalImage(makePackage('pro', {slotMap: FDATA_MAP}))),
  /FDATA requires the reserved slot map/);
cases++;
assert.throws(() => controllerOf(logicalImage(makePackage('pro', {
  slotMap: FDATA_MAP,
  extraFiles: [[103, 'fdata.bin', Buffer.alloc(0xf000, 0xff)]],
}))), /FDATA requires the reserved slot map/);
cases++;
assert.throws(() => controllerOf(logicalImage(makePackage('pro', {
  slotMap: FDATA_MAP,
  extraFiles: [[103, 'fdata.bin', Buffer.alloc(0x1000)]],
}))), /optional-region package size/);
cases++;
assert.throws(() => controllerOf(logicalImage(makePackage('pro', {
  extraFiles: [[104, 'extra.bin', Buffer.alloc(0x100)]],
}))), /file identity|file layout|file bounds/);
cases++;

async function loadPublished(entry) {
  const local = `/tmp/ghp/artifacts/nightly-dev/${entry.sha256}/${entry.file}`;
  if (existsSync(local)) return new Uint8Array(readFileSync(local));
  const url = `https://gobbajogger.github.io/DnBOX-nightly/artifacts/nightly-dev/${entry.sha256}/${entry.file}`;
  const response = await fetch(url, {redirect: 'error'});
  if (!response.ok || response.redirected) throw new Error(`${url}: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

for (const [name, entry] of Object.entries(PUBLISHED)) {
  const raw = await loadPublished(entry);
  assert.equal(sha256(raw), entry.sha256, name);
  const ctl = admit(raw, entry.product);
  assert.equal(ctl.length, 61552, name);
  assert.equal(sha256(ctl), CTL_SHA, name);
  cases++;
}

console.log(`PASS fdata-package-admission: ${cases} cases; synthetic 2-file and 5-file layouts plus published 0.0.26 and 0.0.27 Elite/Pro packages`);
