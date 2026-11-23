// DNR3 codec: JS (web/product-site/remote/dnr3.mjs) and C reference (tests/c-reference/dnr3_wire.c)
// must both reproduce tests/product-remote/dnr3-vectors.json byte for byte.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {crc32 as zlibCrc32} from 'node:zlib';
import * as d from '../../web/product-site/remote/dnr3.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dir = fileURLToPath(new URL('./tests/', import.meta.url));
const V = JSON.parse(readFileSync(new URL('./dnr3-vectors.json', import.meta.url), 'utf8'));
const hex = b => Buffer.from(b).toString('hex');
const bin = h => Buffer.from(h, 'hex');
const frames = [...V.requests, ...V.replies, ...V.notifies];

test('vectors file is what the generator writes', () => {
  execFileSync('node', ['scripts/make-dnr3-vectors.mjs', '--check'], {cwd: root, stdio: 'pipe'});
});

test('every vector frame has a valid layout and an independent zlib CRC-32', () => {
  assert.ok(V.requests.length >= 17 && V.replies.length >= 17 && V.notifies.length === 8);
  for (const v of frames) {
    const f = bin(v.frame_hex), len = f[8] | f[9] << 7, p = bin(v.payload_hex);
    assert.deepEqual([...f.subarray(0, 5)], [0xF0, 0x7D, 0x44, 0x4E, 0x03], v.name);
    assert.equal(f.at(-1), 0xF7);
    assert.equal(len, p.length);
    assert.equal(f.length, 16 + len);
    assert.ok(f.length <= 256);
    assert.deepEqual(f.subarray(10, 10 + len), p);
    const c = f.subarray(10 + len, 15 + len).reduceRight((a, b) => a * 128 + b, 0);
    assert.equal(c, zlibCrc32(f.subarray(5, 10 + len)), v.name);
  }
  for (const c of V.crc32) assert.equal(zlibCrc32(bin(c.input_hex)).toString(16).padStart(8, '0'), c.crc32);
});

test('JS codec decodes and re-encodes every vector exactly', () => {
  for (const v of V.requests) {
    const r = d.decodeRequest(bin(v.frame_hex));
    assert.equal(r.op, v.op); assert.equal(r.seq, v.seq); assert.deepEqual(r.fields, v.fields, v.name);
    assert.equal(hex(d.encodeRequest(v.op, v.seq, v.fields)), v.frame_hex);
  }
  for (const v of V.replies) {
    const r = d.decodeReply(bin(v.frame_hex));
    assert.equal(bin(v.frame_hex)[5], v.reply_op);
    assert.deepEqual([r.op, r.seq, r.status, r.rev], [v.op, v.seq, v.status, v.rev], v.name);
    assert.deepEqual(r.fields, v.fields, v.name);
    assert.equal(hex(d.encodeReply(v.op, v.seq, v.status, v.rev, v.fields)), v.frame_hex);
  }
  for (const v of V.notifies) {
    const r = d.decodeNotify(bin(v.frame_hex));
    assert.deepEqual([r.rev, r.kind, r.fields], [v.rev, v.kind, v.fields], v.name);
    assert.equal(hex(d.encodeNotify(v.rev, v.kind, v.fields)), v.frame_hex);
  }
  for (const v of V.pack7) {
    assert.equal(hex(d.pack7([...bin(v.raw_hex)])), v.packed_hex);
    assert.deepEqual(d.unpack7([...bin(v.packed_hex)], bin(v.raw_hex).length), [...bin(v.raw_hex)]);
  }
  for (const v of V.invalid) assert.throws(() => d.decodeFrame(bin(v.frame_hex)), e => e.code === v.error, v.name);
  assert.equal(d.decodeFrame(bin(V.max_frame.frame_hex)).payload.length, V.max_frame.payload_len);
});

test('JS codec refuses out-of-range values instead of truncating', () => {
  const err = code => e => e instanceof d.DNR3Error && e.code === code;
  assert.throws(() => d.encodeRequest(d.OP.HELLO, 1, {client_proto: 128}), err('range'));
  assert.throws(() => d.encodeRequest(d.OP.HELLO, 0x4000, {client_proto: 3}), err('range'));
  assert.throws(() => d.encodeRequest(d.OP.TEMPO, 1, {epoch: 1, bpm_x10: 0x4000}), err('range'));
  assert.throws(() => d.encodeRequest(d.OP.TEMPO, 1, {epoch: 1, bpm_x10: 12.5}), err('range'));
  assert.throws(() => d.encodeRequest(d.OP.PARAM_GET, 1, {params: []}), err('range'));
  assert.throws(() => d.encodeRequest(0x25, 1, {}), err('op'));
  assert.throws(() => d.encodeFrame(0x30, 1, new Array(d.MAX_PAYLOAD + 1).fill(0)), err('length'));
  assert.throws(() => d.encodeReply(d.OP.DESCRIBE, 1, 0, 0, {name: 'TOOLONG', max: 1, def: 0, unit: 0, names: []}), err('range'));
  assert.throws(() => d.unpack7([0x02, 0x01], 1), err('range'));
  const extra = [...bin(V.requests[0].payload_hex), 0];
  assert.throws(() => d.decodeRequest(d.encodeFrame(d.OP.HELLO, 1, extra)), err('length'));
  assert.throws(() => d.decodeReply(bin(V.requests[0].frame_hex)), err('op'));
  assert.throws(() => d.decodeNotify(bin(V.replies[0].frame_hex)), err('op'));
});

test('C reference reproduces every vector byte for byte', () => {
  const exe = join(mkdtempSync(join(tmpdir(), 'dnr3-c-')), 'dnr3-fixture');
  execFileSync('cc', ['-std=c11', '-Wall', '-Wextra', '-Werror', '-pedantic', '-O2', 'dnr3_fixture.c', 'c-reference/dnr3_wire.c', '-o', exe], {cwd: dir});
  const lines = [], expect = [];
  for (const v of frames) {
    const f = bin(v.frame_hex);
    lines.push(`enc ${f[5]} ${f[6] | f[7] << 7} ${v.payload_hex || '-'}`); expect.push(v.frame_hex);
    lines.push(`dec ${v.frame_hex}`); expect.push(JSON.stringify({op: f[5], seq: f[6] | f[7] << 7, payload: v.payload_hex}));
  }
  lines.push(`dec ${V.max_frame.frame_hex}`); expect.push(JSON.stringify({op: 0x70, seq: 1, payload: '55'.repeat(V.max_frame.payload_len)}));
  for (const v of V.invalid) { lines.push(`dec ${v.frame_hex}`); expect.push(JSON.stringify({error: v.error})); }
  for (const v of V.pack7) if (v.raw_hex) { lines.push(`pack ${v.raw_hex}`); expect.push(v.packed_hex); }
  for (const v of V.crc32) if (v.input_hex) { lines.push(`crc ${v.input_hex}`); expect.push(v.crc32); }
  const got = execFileSync(exe, {input: lines.join('\n') + '\n'}).toString().trim().split('\n');
  assert.equal(got.length, expect.length);
  got.forEach((g, i) => assert.equal(g, expect[i], lines[i]));
});
