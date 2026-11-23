// SPDX-License-Identifier: GPL-3.0-only
// Writes tests/product-remote/dnr3-vectors.json (byte-exact DNR3 vectors shared with FW Core).
// node scripts/make-dnr3-vectors.mjs [--check]
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as d from '../web/product-site/remote/dnr3.mjs';

const {OP, STATUS: S, NOTIFY_KIND: K, KEEP} = d;
const hex = b => Buffer.from(b).toString('hex');
const sha = Array.from({length: 20}, (_, i) => [0x8f, 0x97, 0xfe, 0x7d, 0x2a][i % 5] ^ i * 13 & 0xff);
const ppat = [0, 1, 2, 3, 31], pcue = [127, 4, 127, 127, 0], ch = [9, 10, 1, 2, 3];
const crcs = Array.from({length: 32}, (_, i) => (i * 1031 + 7) & 0x3FFF);
const dump = Array.from({length: 112}, (_, i) => (i * 37 + 0x80 * (i & 1)) & 0xFF);

const requests = [
  ['hello', OP.HELLO, 1, {client_proto: 3}],
  ['open', OP.OPEN, 2, {client_id: 0x0ABCDEF}],
  ['keepalive', OP.KEEPALIVE, 3, {epoch: 0xFFFFFFF}],
  ['close', OP.CLOSE, 4, {epoch: 1}],
  ['watch-all', OP.WATCH, 5, {epoch: 1, mask: 0x7F}],
  ['describe-909-bd-tune', OP.DESCRIBE, 6, {kind: 1, a: 0, b: 0, c: 3}],
  ['param-get-two', OP.PARAM_GET, 7, {params: [{kind: 1, a: 0, b: 0, c: 3}, {kind: 2, a: 0, b: 0, c: 0}]}],
  ['param-set-nocheck', OP.PARAM_SET, 8, {epoch: 1, kind: 1, a: 2, b: 0, c: 1, expect: KEEP, value: 100}],
  ['param-set-expect', OP.PARAM_SET, 9, {epoch: 1, kind: 1, a: 2, b: 0, c: 1, expect: 100, value: 0x3FFE}],
  ['step-get', OP.STEP_GET, 10, {part: 2, pat: 31, step: 63}],
  ['step-set-drum-accent-row', OP.STEP_SET, 11, {epoch: 1, part: 0, pat: 0, step: 15, expect_crc: KEEP, record: {track: 11, on: 1, vel: 127}}],
  ['step-set-303', OP.STEP_SET, 12, {epoch: 1, part: 3, pat: 5, step: 7, expect_crc: 0x1234, record: {note: 36, gate: 1, accent: 1, slide: 0, velocity: 0, end: 15}}],
  ['step-set-break', OP.STEP_SET, 13, {epoch: 1, part: 4, pat: 2, step: 3, expect_crc: 7, record: {on: 1, slice: 32}}],
  ['part-set-len', OP.PART_SET, 14, {epoch: 1, part: 1, pat: 0, field: 0, value: 64}],
  ['pattern-dump', OP.PATTERN_DUMP, 15, {pat: 31, offset: 560, count: 112}],
  ['cue-all-cancel', OP.CUE, 16, {epoch: 1, part: 127, pat: 127}],
  ['transport-play', OP.TRANSPORT, 17, {epoch: 1, action: 1}],
  ['tempo', OP.TEMPO, 18, {epoch: 1, bpm_x10: 3000}],
  ['mute-queued', OP.MUTE, 19, {epoch: 1, bit: 20, on: 1, queued: 1}],
  ['state', OP.STATE, 20, {}],
  ['seq-wrap', OP.STATE, 0x3FFF, {}],
];
const replies = [
  ['hello', OP.HELLO, 1, S.OK, 0, {proto: 3, minor: 0, fw_commit: sha, board: 3, caps: 0x1FF, npat: 32, nsteps: 64, ntracks: 11, ndrum: 2, clip_mode: 0, clk_src: 0, watch_max_hz: 50}],
  ['open', OP.OPEN, 2, S.OK, 0, {epoch: 0x1234567, lease_ms: 2000}],
  ['keepalive', OP.KEEPALIVE, 3, S.OK, 9, {}],
  ['close', OP.CLOSE, 4, S.OK, 9, {}],
  ['watch', OP.WATCH, 5, S.OK, 9, {mask: 0x7F}],
  ['describe-switch', OP.DESCRIBE, 6, S.OK, 9, {name: 'RATE', max: 3, def: 0, unit: 0, names: ['1/16', '1/8T', '1/32', '']}],
  ['param-get', OP.PARAM_GET, 7, S.OK, 9, {params: [{kind: 1, a: 0, b: 0, c: 3, value: 64, max: 127}, {kind: 2, a: 0, b: 0, c: 0, value: 50, max: 100}]}],
  ['param-set-clamped', OP.PARAM_SET, 8, S.OK, 10, {kind: 1, a: 2, b: 0, c: 1, value: 127}],
  ['param-set-queued', OP.PARAM_SET, 8, S.QUEUED, 10, {kind: 1, a: 2, b: 0, c: 1, value: 100}],
  ['param-set-conflict', OP.PARAM_SET, 9, S.CONFLICT, 10, {}],
  ['step-get-303', OP.STEP_GET, 10, S.OK, 10, {part: 2, pat: 31, step: 63, record: {note: 127, gate: 2, accent: 0, slide: 1, velocity: 100, end: 0}}],
  ['step-set-drum', OP.STEP_SET, 11, S.OK, 11, {part: 0, pat: 0, step: 15, record: {track: 11, on: 1, vel: 127}, pattern_crc: 0x3FFE}],
  ['part-set', OP.PART_SET, 14, S.OK, 12, {part: 1, pat: 0, field: 0, value: 64}],
  ['pattern-dump-full', OP.PATTERN_DUMP, 15, S.OK, 12, {pat: 31, offset: 560, total: 1234, bytes: dump, pattern_crc: crcs[31]}],
  ['pattern-dump-empty', OP.PATTERN_DUMP, 15, S.OK, 12, {pat: 0, offset: 1234, total: 1234, bytes: [], pattern_crc: 0}],
  ['cue', OP.CUE, 16, S.OK, 13, {part: 1, pat: 4, ppat, pcue}],
  ['transport', OP.TRANSPORT, 17, S.OK, 14, {playing: 1}],
  ['transport-external-clock', OP.TRANSPORT, 17, S.DENIED, 14, {}],
  ['tempo', OP.TEMPO, 18, S.OK, 15, {bpm_x10: 1205}],
  ['mute-u32-max', OP.MUTE, 19, S.OK, 0xFFFFFFF, {mute: 0xFFFFFFFF, vmute: 0x80000001}],
  ['state', OP.STATE, 20, S.OK, 16, {playing: 1, clk_src: 0, clip_mode: 0, send_notes: 1, bpm_x10: 1200, ppat, pcue, mute: 0x100000, vmute: 0, part_off: 0, song_on: 0, song_pos: 0, ch, step_pos: [0, 15, 127, 127, 3], pattern_crc: crcs}],
  ['busy', OP.STATE, 21, S.BUSY, 16, {}],
  ['stale', OP.KEEPALIVE, 22, S.STALE, 16, {}],
  ['unsupported', OP.PARAM_SET, 23, S.UNSUPPORTED, 16, {}],
  ['bad', OP.PARAM_GET, 24, S.BAD, 16, {}],
  ['full', OP.CUE, 25, S.FULL, 16, {}],
];
const notifies = [
  ['param', 20, K.PARAM, {kind: 1, a: 0, b: 0, c: 3, value: 64}],
  ['step', 21, K.STEP, {part: 0, pat: 1, step: 2, pattern_crc: 0x2AAA}],
  ['cue', 22, K.CUE, {ppat, pcue}],
  ['pattern', 23, K.PATTERN, {ppat, pcue: [127, 127, 127, 127, 127]}],
  ['transport', 24, K.TRANSPORT, {playing: 0, bpm_x10: 1200, clk_src: 0}],
  ['mute', 25, K.MUTE, {mute: 3, vmute: 0, part_off: 16}],
  ['voice', 26, K.VOICE, {part: 0, note: 36, velocity: 127}],
  ['position', 27, K.POSITION, {step_pos: [0, 0, 8, 8, 127]}],
];
const out = {
  format: 'dnbox-dnr3-vectors', version: 1,
  spec: 'REMOTE-FW-PROTOCOL.md v3.0 sections 3-5',
  notes: [
    'frame_hex is the complete SysEx F0..F7. payload_hex is the wire payload (each byte < 0x80).',
    'Integers are 7-bit groups low first; crc = zlib CRC-32 of op..payload wire bytes as u32 (5 groups).',
    'Reply op = request op | 0x40. Replies with status other than OK/QUEUED carry only status and rev.',
    'NOTIFY op 0x7F, seq 0, payload rev u28, kind u7, fields. Kinds: 0 PARAM 1 STEP 2 CUE 3 TRANSPORT 4 MUTE 5 VOICE 6 POSITION 7 PATTERN.',
    'Strings are printable ASCII followed by one 0 byte. PATTERN_DUMP reply carries count u7 before the ed_put7 bytes.',
  ],
  crc32: [['', 0], ['123456789', 0xCBF43926], ['DNR3', null]].map(([s, v]) => {
    const b = Buffer.from(s, 'ascii'), c = d.crc32(b);
    if (v !== null && c !== v) throw Error('crc32 self-check');
    return {input_hex: hex(b), crc32: c.toString(16).padStart(8, '0')};
  }),
  pack7: [[], [0x80], [0xFF, 0, 0x81, 0x7F], Array.from({length: 7}, () => 0xFF), Array.from({length: 8}, (_, i) => 0x80 | i), Array.from({length: 20}, (_, i) => i * 13)]
    .map(raw => ({raw_hex: hex(raw), packed_hex: hex(d.pack7(raw))})),
  requests: requests.map(([name, op, seq, fields]) => {
    const f = d.encodeRequest(op, seq, fields), x = d.decodeFrame(f);
    return {name, op, seq, fields, payload_hex: hex(x.payload), frame_hex: hex(f)};
  }),
  replies: replies.map(([name, op, seq, status, rev, fields]) => {
    const f = d.encodeReply(op, seq, status, rev, fields), x = d.decodeFrame(f);
    return {name, op, reply_op: op | 0x40, seq, status, rev, fields, payload_hex: hex(x.payload), frame_hex: hex(f)};
  }),
  notifies: notifies.map(([name, rev, kind, fields]) => {
    const f = d.encodeNotify(rev, kind, fields), x = d.decodeFrame(f);
    return {name, rev, kind, fields, payload_hex: hex(x.payload), frame_hex: hex(f)};
  }),
};
const good = Buffer.from(out.requests.find(v => v.name === 'param-set-nocheck').frame_hex, 'hex');
const bad = (name, error, edit) => { const b = Buffer.from(good); edit(b); return {name, error, frame_hex: hex(b)}; };
const maxPayload = d.encodeFrame(OP.STATE | 0x40, 1, new Array(d.MAX_PAYLOAD).fill(0x55));
out.max_frame = {payload_len: d.MAX_PAYLOAD, frame_len: maxPayload.length, frame_hex: hex(maxPayload)};
out.invalid = [
  bad('crc-flipped', 'crc', b => { b[b.length - 2] ^= 1; }),
  bad('payload-flipped', 'crc', b => { b[12] ^= 1; }),
  bad('wrong-major', 'header', b => { b[4] = 2; }),
  bad('wrong-manufacturer', 'header', b => { b[1] = 0x7E; }),
  bad('no-f7', 'header', b => { b[b.length - 1] = 0x7F; }),
  bad('high-bit-in-body', 'range', b => { b[12] |= 0x80; }),
  bad('length-too-long', 'length', b => { b[8] += 1; }),
  {name: 'too-short', error: 'length', frame_hex: hex(good.subarray(0, 15))},
  {name: 'over-256', error: 'length', frame_hex: hex(Buffer.concat([maxPayload.subarray(0, 5), Buffer.from([0x70, 1, 0, 0x71, 1]), Buffer.alloc(241, 0x55), Buffer.alloc(5, 0), Buffer.from([0xF7])]))},
];
const path = fileURLToPath(new URL('../tests/product-remote/dnr3-vectors.json', import.meta.url));
const text = JSON.stringify(out, null, 1) + '\n';
if (process.argv.includes('--check')) {
  if (readFileSync(path, 'utf8') !== text) { console.error('dnr3-vectors.json is stale: run node scripts/make-dnr3-vectors.mjs'); process.exit(1); }
  console.log('dnr3-vectors.json up to date');
} else { writeFileSync(path, text); console.log('wrote', path); }
