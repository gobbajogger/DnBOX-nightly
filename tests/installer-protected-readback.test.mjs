// SPDX-License-Identifier: GPL-3.0-only
// The actual installer parser, backup, snapshot, Updater, and restore paths.
// All devices and flash in this file are in-memory transport fixtures.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {makePackage} from './fixtures/bundled-synthetic.mjs';
import {withInstallSnapshot} from './fixtures/install-snapshot.mjs';

const html = readFileSync(new URL('../web/product-site/install/index.html', import.meta.url), 'utf8');
const start = html.indexOf('const BLOCKS = 20');
const end = html.indexOf('const $ = (id)', start);
const {Updater, installKeepingSlots, logicalImage, readArchive, userSlotRaw, pack78, unpack78} =
  runInNewContext(html.slice(start, end) +
    '\n({Updater, installKeepingSlots, logicalImage, readArchive, userSlotRaw, pack78, unpack78})',
  {TextEncoder, TextDecoder, crypto: globalThis.crypto, EventTarget, setTimeout: fn => setTimeout(fn, 0), clearTimeout});

const newMap = [[0xC2000, 0x14000], [0xD6000, 0xF000], [0xB3000, 0x8000]];
const oldMap = [newMap[0], [0xE6000, 0x8000], newMap[2]];
const fdata = Buffer.alloc(0xF000, 255);
fdata.write('S1PK');
fdata[4] = 1;
const fdataHeader = [...fdata.subarray(0, 32)].flatMap(byte => [byte & 127, byte >>> 7]);
const UPGRADE = [0xf0, 0x22, 0x24, 0x35, 0x7f, 0xf7];
const editor = [0xf0, 0x7d, 0x46, 0x4c];
const data = Uint8Array.from({length: 231}, (_, i) => i);
const sample = userSlotRaw('saved', [{adpcm: data, n: 462, rate: 22050}], 0x8000);
const sampleImage = Buffer.alloc(512 + data.length, 255);
sampleImage.set(sample.hdr);
sampleImage.set(sample.data, 512);

function slotInfo(map, slots, extended = true) {
  const parts = map.map((_, k) => slots[k] ?
    [1, ...Buffer.from('saved'), 0, 1] : [0, 0, 0]);
  const minimum = Math.min(...map.map(x => x[1])) / 1024;
  const prefix = [map.length, minimum, ...parts.flat()];
  if (!extended) return prefix;
  const u14 = n => [n & 127, n >>> 7];
  return [...prefix, 0x58, 1, ...map.flatMap(([off, size], k) =>
    [...u14(off / 4096), ...u14(size / 4096), ...u14(slots[k] ? 1 : 0)])];
}

function fixture(model, mode, protectedInstall = true, keepFile = null) {
  const product = 'SMK-37 ' + (model === 'pro' ? 'Pro' : 'Elite') + '_900';
  const packageBytes = logicalImage(makePackage(model, {slotMap: newMap, extraFiles: protectedInstall ? [[103, 'fdata.bin', fdata]] : []}));
  const oldFlash = oldMap.map(([, size]) => Buffer.alloc(size, 255));
  const newFlash = newMap.map(([, size]) => Buffer.alloc(size, 255));
  if (mode !== 'legacy-normal') oldFlash[1].set(sampleImage);
  const trace = [];
  let approved = true, oldInfoCount = 0, applicationCount = 0, findCount = 0, restored = false;
  let up;
  function endpoint(phase, id = product) {
    const input = {name: product, state: 'connected'};
    const output = {...input};
    const flash = phase === 'old' ? oldFlash : newFlash;
    const map = phase === 'old' ? oldMap : newMap;
    let reply;
    const link = {
      input, output, drain() { reply = null; }, close() {},
      send(frame) {
        const cmd = frame[4], a = frame.slice(5, -1);
        trace.push({phase, cmd, a, frame: [...frame]});
        let bytes;
        if (cmd === 15) {
          const legacy = (phase === 'old' && ['preflight-legacy', 'legacy-normal'].includes(mode)) ||
            (phase === 'restore' && mode === 'restore-legacy');
          const drift = (phase === 'old' && ++oldInfoCount === 2 && mode === 'backup-map-drift') ||
            (phase === 'restore' && (mode === 'restore-map' || (mode === 'restore-after-map' && restored)));
          const chosenMap = drift ? [map[0], [0xE2000, 0x8000], map[2]] : map;
          bytes = slotInfo(chosenMap, (phase === 'old' && mode !== 'legacy-normal') || restored ? [null, sampleImage, null] : [], !legacy);
        } else if (cmd === 16) {
          const offset = a[1] | a[2] << 7 | a[3] << 14;
          const packed = [...pack78(flash[a[0]].subarray(offset, offset + a[4] * 2))];
          const echo = a.slice(0, 4);
          if (phase === 'old' && mode === 'backup-header-slot' && offset === 224) echo[0] = 0;
          if (phase === 'old' && mode === 'backup-data-address' && offset > 512) echo[1] ^= 1;
          if (phase === 'old' && mode === 'backup-short' && offset === 512) packed.pop();
          if (phase === 'restore' && mode === 'restore-data-address' && offset > 512) echo[1] ^= 1;
          bytes = [...echo, ...packed];
        } else if (cmd === 52) {
          bytes = [1, ...fdataHeader];
          if (phase === 'restore' && mode === 'restore-factory-marker') bytes[1] ^= 1;
        } else if (cmd === 11) {
          flash[a[0]].fill(255);
          bytes = [a[0], 0];
          if (mode === 'restore-selection-between-writes') approved = false;
        } else if (cmd === 12) {
          const offset = a[1] | a[2] << 7 | a[3] << 14;
          flash[a[0]].set(unpack78(a.slice(4)), offset);
          bytes = [...a.slice(0, 4), 0];
        } else if (cmd === 13) {
          flash[a[0]].set(unpack78(a.slice(1)));
          restored = true;
          bytes = [a[0], 0];
        }
        if (bytes) reply = [...editor, cmd, ...bytes,
          cmd === 16 && phase === 'old' && mode === 'backup-malformed-frame' ? 0 : 0xf7];
        return true;
      },
      async read() { const result = reply; reply = null; return result; },
    };
    return {name: product, id: {model: id.split('_')[0], text: id}, link};
  }

  const old = endpoint('old'), app = endpoint('app');
  const back = endpoint('restore', mode === 'restore-other-version' ? product.replace('_900', '_901') : product);
  // The expected reboot may replace the original ports. Automatic restore must
  // subsequently use the very same connection that passed app verification.
  if (mode !== 'restore-other-port') Object.assign(back.link, {input: app.link.input, output: app.link.output});
  const loader = endpoint('loader', 'ota-' + product);
  const access = Object.assign(new EventTarget(), {inputs: new Map(), outputs: new Map()});
  function select(dev) {
    access.inputs.set('in', dev.link.input);
    access.outputs.set('out', dev.link.output);
    return dev;
  }
  select(old);
  up = new Updater(access);
  up.find = async () => {
    if (++findCount === 2 && mode === 'precommit-other-port') {
      const other = endpoint('old');
      return select(other);
    }
    return old;
  };
  up.waitFor = async filter => {
    if (filter(loader.id)) return loader;
    if (++applicationCount === 1) return select(app);
    if (mode === 'restore-selection') approved = false;
    if (mode === 'restore-port-reopened') {
      const pulse = new Event('statechange');
      Object.defineProperty(pulse, 'port', {value: app.link.input});
      app.link.input.state = 'disconnected';
      access.dispatchEvent(pulse);
      app.link.input.state = 'connected';
    }
    return select(back);
  };
  up.serve = async () => ({finished: true, served: 1});
  const snapshot = withInstallSnapshot(old.link);
  const retained = [];
  const install = () => installKeepingSlots(up, packageBytes, product, 'smk', {
    factoryData: protectedInstall, admitted: () => approved,
    saveStrict: async (file, name) => {
      assert.equal(snapshot.commits, 0);
      assert.ok(!trace.some(({cmd}) => [11, 12, 13, 14].includes(cmd)));
      const archived = readArchive(file);
      assert.deepEqual(Buffer.from(archived.images[1]), sampleImage);
      retained.push(file.length);
      if (mode === 'snapshot-dirty') snapshot.changed();
      return keepFile ? keepFile(file, name) : mode !== 'retention-denied';
    },
  });
  return {install, snapshot, trace, retained, newFlash};
}

for (const model of ['elite', 'pro']) {
  test(model + ' native SMP_READ shape supports multi-chunk header, odd final payload, and protected restore', async () => {
    const f = fixture(model, 'normal');
    const result = await f.install();
    assert.deepEqual(JSON.parse(JSON.stringify(result.move.todo)), [{k: 1, j: 1}]);
    assert.equal(f.snapshot.commits, 1);
    assert.equal(f.retained.length, 1);
    assert.deepEqual(f.newFlash[1].subarray(0, sampleImage.length), sampleImage);
    for (const phase of ['old', 'restore']) {
      const reads = f.trace.filter(t => t.phase === phase && t.cmd === 16);
      assert.equal(reads.length, 5);
      assert.deepEqual(Array.from(reads.at(-1).a), [1, 96, 5, 0, 4]); // 736 offset, last seven bytes rounded to four pairs
    }
  });
}

for (const mode of ['preflight-legacy', 'backup-map-drift', 'backup-header-slot', 'backup-data-address',
  'backup-short', 'backup-malformed-frame', 'retention-denied', 'snapshot-dirty', 'precommit-other-port']) {
  test(mode + ' stops before OTA or sample writes', async () => {
    const f = fixture('pro', mode);
    const errors = {
      'preflight-legacy': /extended sample layout/, 'backup-map-drift': /layout changed/,
      'backup-header-slot': /wrong readback address/, 'backup-data-address': /wrong readback address/,
      'backup-short': /malformed readback data/, 'backup-malformed-frame': /framing/,
      'retention-denied': /confirm saving/, 'snapshot-dirty': /samples changed/,
      'precommit-other-port': /connection changed/,
    };
    await assert.rejects(f.install, errors[mode]);
    assert.equal(f.snapshot.commits, 0);
    assert.ok(!f.trace.some(t => [11, 12, 13, 14].includes(t.cmd) || t.frame.join() === UPGRADE.join()));
  });
}

for (const mode of ['restore-other-version', 'restore-other-port', 'restore-selection',
  'restore-legacy', 'restore-map', 'restore-factory-marker', 'restore-port-reopened']) {
  test(mode + ' keeps the verified backup and stops before sample writes', async () => {
    const f = fixture('elite', mode);
    await assert.rejects(f.install, error => error.code === 'slots' && /x0xslots/.test(error.detail));
    assert.equal(f.retained.length, 1);
    assert.equal(f.snapshot.commits, 1);
    assert.ok(!f.trace.some(t => [11, 12, 13, 14].includes(t.cmd)));
  });
}

for (const [mode, reason] of [
  ['restore-data-address', /wrong readback address/],
  ['restore-after-map', /map changed during restoration/],
  ['restore-selection-between-writes', /selection changed/],
]) {
  test(mode + ' cannot report a verified restore', async () => {
    const f = fixture('pro', mode);
    await assert.rejects(f.install, error => error.code === 'slots' &&
      /x0xslots/.test(error.detail) && reason.test(error.message));
    assert.equal(f.retained.length, 1);
    if (mode === 'restore-selection-between-writes')
      assert.deepEqual(f.trace.filter(t => [11, 12, 13, 14].includes(t.cmd)).map(t => t.cmd), [11]);
  });
}


test('legacy non-protected install can use the legacy slot layout', async () => {
  const f = fixture('pro', 'legacy-normal', false);
  const result = await f.install();
  assert.equal(result.move, null);
  assert.equal(f.snapshot.commits, 1);
  assert.equal(f.retained.length, 0);
  assert.ok(f.trace.some(t => t.frame.join() === UPGRADE.join()));
});


test('the real backup reader and retention dialog block COMMIT until the exact downloaded archive is reread', async () => {
  for (const cancel of [false, true]) {
    const controls = Object.fromEntries(['panel', 'download', 'file', 'cancel', 'status'].map(id => [
      'strict-backup-' + id, {hidden: true, textContent: '', value: '', scrollIntoView() {},
        removeAttribute(key) { delete this[key]; }},
    ]));
    const source = html.slice(html.indexOf('async function saveVerifiedSlotBackup'),
      html.indexOf('async function run(img'));
    let announce, bytes;
    const ready = new Promise(resolve => { announce = resolve; });
    const retain = runInNewContext(source + '\n' + 'saveVerifiedSlotBackup;', {
      $: id => controls[id], window: new EventTarget(), Blob,
      URL: {createObjectURL: () => 'blob:offline-test', revokeObjectURL() {}}, setTimeout, clearTimeout,
    });
    const f = fixture('pro', 'normal', true, (file, name) => {
      bytes = Uint8Array.from(file);
      const answer = retain(file, name);
      announce();
      return answer;
    });
    const operation = f.install();
    await ready;
    assert.match(controls['strict-backup-download'].download, /x0xslots$/);
    const input = controls['strict-backup-file'];
    const wrong = Uint8Array.from(bytes);
    wrong[0] ^= 1;
    input.files = [{size: wrong.length, arrayBuffer: async () => wrong.buffer}];
    await input.onchange();
    assert.match(controls['strict-backup-status'].textContent, /different/);
    assert.equal(f.snapshot.commits, 0);
    assert.ok(!f.trace.some(t => [11, 12, 13, 14].includes(t.cmd) || t.frame.join() === UPGRADE.join()));
    if (cancel) {
      controls['strict-backup-cancel'].onclick();
      await assert.rejects(operation, error => error.code === 'slotbackupconfirm');
      assert.equal(f.snapshot.commits, 0);
    } else {
      input.files = [{size: bytes.length, arrayBuffer: async () => bytes.buffer}];
      await input.onchange();
      await operation;
      assert.equal(f.snapshot.commits, 1);
    }
  }
});
