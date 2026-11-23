// DNR3 client logic against a TEST-ONLY scripted peer (no firmware claims; the firmware
// path is covered by firmware-e2e once FW Core's handler is in the emulator).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../../web/product-site/remote/dnr3.mjs';
import {Dnr3Client, Dnr3StatusError, Dnr3Unavailable, emulatorTransport} from '../../web/product-site/remote/dnr3-client.mjs';

function peer({drop = 0, handler} = {}) {
  const subs = new Set(), refused = new Set(), sent = [];
  let dropped = 0;
  const t = {
    sent,
    sendSysex(bytes) {
      sent.push(Array.from(bytes));
      const q = d.decodeRequest(bytes);
      if (dropped < drop) { dropped++; return; }
      const r = handler(q);
      if (r === 'refuse') { queueMicrotask(() => { for (const cb of refused) cb(-3); }); return; }
      if (r) queueMicrotask(() => { for (const cb of subs) cb(r); });
    },
    onSysex(cb) { subs.add(cb); return () => subs.delete(cb); },
    onRefused(cb) { refused.add(cb); return () => refused.delete(cb); },
    push(frame) { for (const cb of subs) cb(frame); },
  };
  return t;
}
const hello = {proto: 3, minor: 0, fw_commit: new Array(20).fill(1), board: 3, caps: 0x1FF, npat: 32, nsteps: 64, ntracks: 11, ndrum: 2, clip_mode: 0, clk_src: 0, watch_max_hz: 50};
function firmware(extra = {}) {
  let rev = 1;
  return q => {
    if (extra[q.op]) return extra[q.op](q, () => ++rev);
    switch (q.op) {
      case d.OP.HELLO: return d.encodeReply(q.op, q.seq, 0, rev, hello);
      case d.OP.OPEN: return d.encodeReply(q.op, q.seq, 0, rev, {epoch: 77, lease_ms: 2000});
      case d.OP.WATCH: return d.encodeReply(q.op, q.seq, 0, rev, {mask: q.fields.mask});
      case d.OP.KEEPALIVE: case d.OP.CLOSE: return d.encodeReply(q.op, q.seq, 0, rev, {});
      case d.OP.TEMPO: return d.encodeReply(q.op, q.seq, 0, ++rev, {bpm_x10: Math.min(q.fields.bpm_x10, 3000)});
      default: return d.encodeReply(q.op, q.seq, d.STATUS.UNSUPPORTED, rev, {});
    }
  };
}
const fast = {setTimeout: (f, ms) => setTimeout(f, Math.min(ms, 5)), clearTimeout, setInterval: () => 0, clearInterval: () => {}};

test('connect does HELLO, OPEN, WATCH and keeps the lease epoch', async () => {
  const t = peer({handler: firmware()});
  const c = new Dnr3Client({transport: t, timers: fast});
  const h = await c.connect();
  assert.equal(h.caps, 0x1FF); assert.equal(c.epoch, 77); assert.ok(c.has(d.CAP.PC_CLIP));
  assert.deepEqual(t.sent.map(f => f[5]), [d.OP.HELLO, d.OP.OPEN, d.OP.WATCH]);
  assert.equal((await c.tempo(1250)).fields.bpm_x10, 1250);
  assert.equal(c.rev, 2);
  assert.deepEqual(await c.close(), {released: true});
});

test('a lost reply is retried once with the identical frame, then times out', async () => {
  const t = peer({drop: 1, handler: firmware()});
  const c = new Dnr3Client({transport: t, timers: fast});
  await c.request(d.OP.HELLO, {client_proto: 3});
  assert.equal(t.sent.length, 2); assert.deepEqual(t.sent[0], t.sent[1]);
  const silent = peer({handler: () => null});
  const c2 = new Dnr3Client({transport: silent, timers: fast});
  await assert.rejects(c2.request(d.OP.HELLO, {client_proto: 3}), e => e.code === 'timeout');
  assert.equal(silent.sent.length, 2);
});

test('non-OK statuses reject with the status name; requests stay serialized', async () => {
  const t = peer({handler: firmware({[d.OP.PARAM_SET]: q => d.encodeReply(q.op, q.seq, d.STATUS.CONFLICT, 5, {})})});
  const c = new Dnr3Client({transport: t, timers: fast});
  await c.connect({watch: 0});
  const results = await Promise.allSettled([c.paramSet({kind: 1, a: 0, b: 0, c: 3}, 10, 9), c.tempo(900), c.mute(0, 1)]);
  assert.ok(results[0].reason instanceof Dnr3StatusError); assert.equal(results[0].reason.statusName, 'CONFLICT');
  assert.equal(results[1].status, 'fulfilled');
  assert.equal(results[2].reason.statusName, 'UNSUPPORTED');
});

test('missing firmware handler surfaces as unavailable, not as success', async () => {
  const c = new Dnr3Client({transport: peer({handler: () => 'refuse'}), timers: fast});
  await assert.rejects(c.connect(), e => e instanceof Dnr3Unavailable);
});

test('NOTIFY updates the revision and flags gaps for a resync', async () => {
  const t = peer({handler: firmware()});
  const c = new Dnr3Client({transport: t, timers: fast});
  const events = []; c.onNotify(e => events.push(e));
  await c.connect();
  t.push(d.encodeNotify(2, d.NOTIFY_KIND.TRANSPORT, {playing: 1, bpm_x10: 1200, clk_src: 0}));
  t.push(d.encodeNotify(5, d.NOTIFY_KIND.MUTE, {mute: 1, vmute: 0, part_off: 0}));
  assert.deepEqual(events.map(e => [e.type, e.rev ?? null, e.gap ?? null]), [['notify', 2, false], ['notify', 5, true], ['resync', null, null]]);
});

test('PATTERN_DUMP reads every chunk and checks the CRC-14', async () => {
  const raw = Array.from({length: 300}, (_, i) => (i * 7) & 0xFF), crc = d.patternCrc(raw);
  const t = peer({handler: firmware({[d.OP.PATTERN_DUMP]: q => {
    const {pat, offset, count} = q.fields, bytes = raw.slice(offset, offset + count);
    return d.encodeReply(q.op, q.seq, 0, 1, {pat, offset, total: raw.length, bytes, pattern_crc: crc});
  }})});
  const c = new Dnr3Client({transport: t, timers: fast});
  const r = await c.patternDump(3);
  assert.deepEqual(Array.from(r.bytes), raw); assert.equal(t.sent.length, 3);
  const bad = peer({handler: firmware({[d.OP.PATTERN_DUMP]: q => d.encodeReply(q.op, q.seq, 0, 1, {pat: 0, offset: q.fields.offset, total: 4, bytes: [1, 2, 3, 4], pattern_crc: 0})})});
  await assert.rejects(new Dnr3Client({transport: bad, timers: fast}).patternDump(0), /CRC/);
});

test('emulator transport speaks the worklet message names', async () => {
  const posted = [], listeners = new Set();
  const port = {postMessage: m => posted.push(m), addEventListener: (_, f) => listeners.add(f), removeEventListener: (_, f) => listeners.delete(f)};
  const tr = emulatorTransport(port), got = [];
  tr.onSysex(b => got.push(Array.from(b)));
  tr.sendMidi([0x99, 36, 100]); tr.sendSysex([0xF0, 0xF7]);
  const caps = tr.caps(); for (const f of listeners) f({data: {type: 'remote-caps', midi: true, realtime: true, dnr3: false}});
  for (const f of listeners) f({data: {type: 'sysex-out', bytes: new Uint8Array([0xF0, 1, 0xF7])}});
  assert.deepEqual(posted, [{type: 'midi', bytes: [0x99, 36, 100]}, {type: 'sysex', bytes: [0xF0, 0xF7]}, {type: 'remote-caps'}]);
  assert.deepEqual(await caps, {midi: true, realtime: true, dnr3: false});
  assert.deepEqual(got, [[0xF0, 1, 0xF7]]);
  tr.close(); assert.equal(listeners.size, 0);
});
