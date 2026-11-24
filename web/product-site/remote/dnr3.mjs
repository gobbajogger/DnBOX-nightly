// SPDX-License-Identifier: GPL-3.0-only
// DNR3: Remote <-> firmware SysEx wire format (v3.0).
// Spec: REMOTE-FW-PROTOCOL.md section 3-5 (handed to FW Core). Byte-exact vectors:
// tests/product-remote/dnr3-vectors.json, also checked against the C reference in
// tests/product-remote/tests/c-reference/dnr3_wire.c.
//   F0 7D 44 4E 03 op seq0 seq1 len0 len1 payload[len] crc0..crc4 F7
// All integers are 7-bit groups, low group first. crc = zlib CRC-32 of op..payload (wire bytes), as u32.
// Pure codec: no I/O, no timers, no globals.

export const HEADER = Object.freeze([0xF0, 0x7D, 0x44, 0x4E, 0x03]);
export const MAX_FRAME = 256;
export const MAX_PAYLOAD = MAX_FRAME - 16;
export const OP = Object.freeze({HELLO:0x00, OPEN:0x01, KEEPALIVE:0x06, CLOSE:0x07, WATCH:0x08,
  DESCRIBE:0x10, PARAM_GET:0x11, PARAM_SET:0x12, STEP_GET:0x20, STEP_SET:0x21, PART_SET:0x22,
  PATTERN_DUMP:0x23, CUE:0x24, TRANSPORT:0x26, TEMPO:0x27, MUTE:0x28, RECORD:0x29, MOTION_GET:0x2A, MOTION_SET:0x2B, STATE:0x30, NOTIFY:0x7F});
export const STATUS = Object.freeze({OK:0, QUEUED:1, BAD:2, BUSY:3, STALE:4, CONFLICT:5, UNSUPPORTED:6, FULL:7, DENIED:8});
export const NOTIFY_KIND = Object.freeze({PARAM:0, STEP:1, CUE:2, TRANSPORT:3, MUTE:4, VOICE:5, POSITION:6, PATTERN:7});
export const WATCH = Object.freeze({PARAM:1, STEP:2, CUE:4, TRANSPORT:8, MUTE:16, VOICE:32, POSITION:64});
export const CAP = Object.freeze({PARAM:1, STEP:2, CUE:4, TRANSPORT:8, MUTE:16, WATCH:32, PATTERN_DUMP:64, PC_CLIP:128, VOICE:256, BASS_BANK_GUARD:512, RECORD:1024, MOTION_MIAMI_CARRIER:2048});
export const PARTS = 5, KEEP = 0x3FFF;
const NAME = Object.fromEntries(Object.entries(OP).map(([k, v]) => [v, k]));

export class DNR3Error extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}
const fail = (code, message) => { throw new DNR3Error(code, message); };

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
export function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (const b of bytes) c = TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

const WIDTH = {u7: 1, u14: 2, u21: 3, u28: 4, u32: 5};
const LIMIT = {u7: 0x7F, u14: 0x3FFF, u21: 0x1FFFFF, u28: 0xFFFFFFF, u32: 0xFFFFFFFF};

// ed_put7 layout: per group of up to 7 bytes, one byte of high bits (bit j = bit 7 of byte j), then the low 7 bits.
export function pack7(raw) {
  const out = [];
  for (let k = 0; k < raw.length; k += 7) {
    const group = raw.slice(k, k + 7);
    let m = 0;
    group.forEach((b, j) => { if (!Number.isInteger(b) || b < 0 || b > 255) fail('range', 'byte'); m |= (b >> 7) << j; });
    out.push(m, ...group.map(b => b & 0x7F));
  }
  return out;
}
export const packedLength = n => n + Math.ceil(n / 7);
export function unpack7(wire, n) {
  if (wire.length !== packedLength(n)) fail('length', 'packed length');
  const out = [];
  for (let at = 0; out.length < n;) {
    const m = wire[at++], count = Math.min(7, n - out.length);
    if (m >> count) fail('range', 'unused high bits set');
    for (let j = 0; j < count; j++) out.push(wire[at++] | ((m >> j) & 1) << 7);
  }
  return out;
}

class Writer {
  constructor() { this.b = []; }
  int(type, v) {
    if (!Number.isSafeInteger(v) || v < 0 || v > LIMIT[type]) fail('range', `${type} ${v}`);
    for (let i = 0; i < WIDTH[type]; i++) { this.b.push(v % 128); v = Math.floor(v / 128); }
  }
  ascii(s, max) {
    if (typeof s !== 'string' || s.length > max || /[^\x20-\x7E]/.test(s)) fail('range', 'ascii');
    for (const ch of s) this.b.push(ch.charCodeAt(0));
    this.b.push(0);
  }
}
class Reader {
  constructor(b) { this.b = b; this.at = 0; }
  need(n) { if (this.at + n > this.b.length) fail('length', 'payload too short'); }
  int(type) {
    const w = WIDTH[type]; this.need(w);
    let v = 0;
    for (let i = w - 1; i >= 0; i--) v = v * 128 + this.b[this.at + i];
    this.at += w;
    if (v > LIMIT[type]) fail('range', `${type} overflow`);
    return v;
  }
  ascii(max) {
    let s = '';
    for (;;) { this.need(1); const c = this.b[this.at++]; if (!c) return s; if (c < 0x20 || c > 0x7E || s.length === max) fail('range', 'ascii'); s += String.fromCharCode(c); }
  }
  end() { if (this.at !== this.b.length) fail('length', 'trailing payload'); }
}

// Field schemas. Types: u7/u14/u21/u28/u32, [type, n] fixed array, {raw:n} packed bytes,
// {ascii:max}, or a function (reader/writer pair) for variable parts.
const pref = [['kind', 'u7'], ['a', 'u7'], ['b', 'u7'], ['c', 'u7']];
const stepRecord = {
  write(w, f) {
    const r = f.record ?? fail('range', 'record');
    if (f.part < 2) for (const k of ['track', 'on', 'vel']) w.int('u7', r[k]);
    else if (f.part < 4) for (const k of ['note', 'gate', 'accent', 'slide', 'velocity', 'end']) w.int('u7', r[k]);
    else if (f.part === 4) for (const k of ['on', 'slice']) w.int('u7', r[k]);
    else fail('range', 'part');
  },
  read(r, f) {
    const keys = f.part < 2 ? ['track', 'on', 'vel'] : f.part < 4 ? ['note', 'gate', 'accent', 'slide', 'velocity', 'end'] : f.part === 4 ? ['on', 'slice'] : fail('range', 'part');
    return Object.fromEntries(keys.map(k => [k, r.int('u7')]));
  }
};
// Firmware accepts an optional track selector on STEP_GET for drum parts.
const stepTrack = {
  write(w, f) {
    if (f.track === undefined) return;
    if (f.part >= 2 || f.track > 11) fail('range', 'drum step track');
    w.int('u7', f.track);
  },
  read(r, f) {
    if (r.at === r.b.length) return undefined;
    if (f.part >= 2) fail('range', 'drum step part');
    const track = r.int('u7');
    if (track > 11) fail('range', 'drum step track');
    return track;
  }
};
const expectBank = {
  write(w,f) {
    if (f.expect_bank === undefined) return;
    if (f.kind!==1 || f.a!==2) fail('range','bank guard requires a bass engine address');
    w.int('u7',f.expect_bank);
  },
  read(r,f) {
    if (r.at===r.b.length) return undefined;
    if (f.kind!==1 || f.a!==2) fail('range','bank guard requires a bass engine address');
    return r.int('u7');
  }
};
const paramList = {
  write(w, f) { const list = f.params ?? []; if (list.length < 1 || list.length > 16) fail('range', 'count'); w.int('u7', list.length); for (const p of list) for (const [k] of pref) w.int('u7', p[k]); },
  read(r) { const n = r.int('u7'); if (n < 1 || n > 16) fail('range', 'count'); return Array.from({length: n}, () => Object.fromEntries(pref.map(([k]) => [k, r.int('u7')]))); }
};
const paramValues = {
  write(w, f) { const list = f.params ?? []; if (list.length < 1 || list.length > 16) fail('range', 'count'); w.int('u7', list.length); for (const p of list) { for (const [k] of pref) w.int('u7', p[k]); w.int('u14', p.value); w.int('u14', p.max); } },
  read(r) { const n = r.int('u7'); if (n < 1 || n > 16) fail('range', 'count'); return Array.from({length: n}, () => ({...Object.fromEntries(pref.map(([k]) => [k, r.int('u7')])), value: r.int('u14'), max: r.int('u14')})); }
};
const dumpBytes = {
  write(w, f) { const raw = f.bytes ?? []; if (raw.length > 112) fail('range', 'count'); w.int('u7', raw.length); w.b.push(...pack7(raw)); },
  read(r) { const n = r.int('u7'); if (n > 112) fail('range', 'count'); const len = packedLength(n); r.need(len); const raw = unpack7(r.b.slice(r.at, r.at + len), n); r.at += len; return raw; }
};
const switchNames = {
  write(w, f) { const names = f.names ?? []; if (names.length > 32) fail('range', 'names'); w.int('u7', names.length); for (const s of names) w.ascii(s, 5); },
  read(r) { const n = r.int('u7'); if (n > 32) fail('range', 'names'); return Array.from({length: n}, () => r.ascii(5)); }
};

export const REQUEST = {
  [OP.HELLO]: [['client_proto', 'u7']],
  [OP.OPEN]: [['client_id', 'u28']],
  [OP.KEEPALIVE]: [['epoch', 'u28']],
  [OP.CLOSE]: [['epoch', 'u28']],
  [OP.WATCH]: [['epoch', 'u28'], ['mask', 'u28']],
  [OP.DESCRIBE]: pref,
  [OP.PARAM_GET]: [['params', paramList]],
  [OP.PARAM_SET]: [['epoch', 'u28'], ...pref, ['expect', 'u14'], ['value', 'u14'], ['expect_bank', expectBank]],
  [OP.STEP_GET]: [['part', 'u7'], ['pat', 'u7'], ['step', 'u7'], ['track', stepTrack]],
  [OP.STEP_SET]: [['epoch', 'u28'], ['part', 'u7'], ['pat', 'u7'], ['step', 'u7'], ['expect_crc', 'u14'], ['record', stepRecord]],
  [OP.PART_SET]: [['epoch', 'u28'], ['part', 'u7'], ['pat', 'u7'], ['field', 'u7'], ['value', 'u14']],
  [OP.PATTERN_DUMP]: [['pat', 'u7'], ['offset', 'u14'], ['count', 'u7']],
  [OP.CUE]: [['epoch', 'u28'], ['part', 'u7'], ['pat', 'u7']],
  [OP.RECORD]: [['epoch', 'u28'], ['command', 'u7']],
  [OP.MOTION_GET]: [['voice', 'u7'], ['pat', 'u7']],
  [OP.MOTION_SET]: [['epoch', 'u28'], ['voice', 'u7'], ['pat', 'u7'], ['step', 'u7'], ['expect', 'u14'], ['value', 'u14']],
  [OP.TRANSPORT]: [['epoch', 'u28'], ['action', 'u7']],
  [OP.TEMPO]: [['epoch', 'u28'], ['bpm_x10', 'u14']],
  [OP.MUTE]: [['epoch', 'u28'], ['bit', 'u7'], ['on', 'u7'], ['queued', 'u7']],
  [OP.STATE]: [],
};
// Reply fields after status and rev; sent only when status is OK or QUEUED.
export const REPLY = {
  [OP.HELLO]: [['proto', 'u7'], ['minor', 'u7'], ['fw_commit', {raw: 20}], ['board', 'u7'], ['caps', 'u28'],
    ['npat', 'u7'], ['nsteps', 'u7'], ['ntracks', 'u7'], ['ndrum', 'u7'], ['clip_mode', 'u7'], ['clk_src', 'u7'], ['watch_max_hz', 'u7']],
  [OP.OPEN]: [['epoch', 'u28'], ['lease_ms', 'u14']],
  [OP.KEEPALIVE]: [], [OP.CLOSE]: [],
  [OP.WATCH]: [['mask', 'u28']],
  [OP.DESCRIBE]: [['name', {ascii: 6}], ['max', 'u14'], ['def', 'u14'], ['unit', 'u7'], ['names', switchNames]],
  [OP.PARAM_GET]: [['params', paramValues]],
  [OP.PARAM_SET]: [...pref, ['value', 'u14']],
  [OP.STEP_GET]: [['part', 'u7'], ['pat', 'u7'], ['step', 'u7'], ['record', stepRecord]],
  [OP.STEP_SET]: [['part', 'u7'], ['pat', 'u7'], ['step', 'u7'], ['record', stepRecord], ['pattern_crc', 'u14']],
  [OP.PART_SET]: [['part', 'u7'], ['pat', 'u7'], ['field', 'u7'], ['value', 'u14']],
  [OP.PATTERN_DUMP]: [['pat', 'u7'], ['offset', 'u14'], ['total', 'u14'], ['bytes', dumpBytes], ['pattern_crc', 'u14']],
  [OP.CUE]: [['part', 'u7'], ['pat', 'u7'], ['ppat', ['u7', PARTS]], ['pcue', ['u7', PARTS]]],
  [OP.RECORD]: [['record', 'u7']],
  [OP.MOTION_GET]: [['points', ['u14', 16]]],
  [OP.MOTION_SET]: [['value', 'u14']],
  [OP.TRANSPORT]: [['playing', 'u7']],
  [OP.TEMPO]: [['bpm_x10', 'u14']],
  [OP.MUTE]: [['mute', 'u32'], ['vmute', 'u32']],
  [OP.STATE]: [['playing', 'u7'], ['clk_src', 'u7'], ['clip_mode', 'u7'], ['send_notes', 'u7'], ['bpm_x10', 'u14'],
    ['ppat', ['u7', PARTS]], ['pcue', ['u7', PARTS]], ['mute', 'u32'], ['vmute', 'u32'], ['part_off', 'u7'], ['song_on', 'u7'],
    ['song_pos', 'u14'], ['ch', ['u7', PARTS]], ['step_pos', ['u7', PARTS]], ['pattern_crc', ['u14', 32]]],
};
export const NOTIFY = {
  [NOTIFY_KIND.PARAM]: [...pref, ['value', 'u14']],
  [NOTIFY_KIND.STEP]: [['part', 'u7'], ['pat', 'u7'], ['step', 'u7'], ['pattern_crc', 'u14']],
  [NOTIFY_KIND.CUE]: [['ppat', ['u7', PARTS]], ['pcue', ['u7', PARTS]]],
  [NOTIFY_KIND.PATTERN]: [['ppat', ['u7', PARTS]], ['pcue', ['u7', PARTS]]],
  [NOTIFY_KIND.TRANSPORT]: [['playing', 'u7'], ['bpm_x10', 'u14'], ['clk_src', 'u7']],
  [NOTIFY_KIND.MUTE]: [['mute', 'u32'], ['vmute', 'u32'], ['part_off', 'u7']],
  [NOTIFY_KIND.VOICE]: [['part', 'u7'], ['note', 'u7'], ['velocity', 'u7']],
  [NOTIFY_KIND.POSITION]: [['step_pos', ['u7', PARTS]]],
};

function writeFields(w, schema, f) {
  for (const [key, type] of schema) {
    if (typeof type === 'string') w.int(type, f[key]);
    else if (Array.isArray(type)) { const v = f[key]; if (!Array.isArray(v) || v.length !== type[1]) fail('range', key); for (const x of v) w.int(type[0], x); }
    else if (type.raw) { const v = f[key]; if (!Array.isArray(v) || v.length !== type.raw) fail('range', key); w.b.push(...pack7(v)); }
    else if (type.ascii) w.ascii(f[key], type.ascii);
    else type.write(w, f);
  }
}
function readFields(r, schema) {
  const f = {};
  for (const [key, type] of schema) {
    if (typeof type === 'string') f[key] = r.int(type);
    else if (Array.isArray(type)) f[key] = Array.from({length: type[1]}, () => r.int(type[0]));
    else if (type.raw) { const len = packedLength(type.raw); r.need(len); f[key] = unpack7(r.b.slice(r.at, r.at + len), type.raw); r.at += len; }
    else if (type.ascii) f[key] = r.ascii(type.ascii);
    else { const value = type.read(r, f); if (value !== undefined) f[key] = value; }
  }
  return f;
}

export function encodeFrame(op, seq, payload) {
  if (!Number.isInteger(op) || op < 0 || op > 0x7F) fail('range', 'op');
  if (!Number.isInteger(seq) || seq < 0 || seq > 0x3FFF) fail('range', 'seq');
  if (payload.length > MAX_PAYLOAD) fail('length', 'payload too long');
  for (const b of payload) if (!Number.isInteger(b) || b < 0 || b > 0x7F) fail('range', 'payload byte');
  const body = [op, seq & 0x7F, seq >> 7, payload.length & 0x7F, payload.length >> 7, ...payload];
  const w = new Writer(); w.int('u32', crc32(body));
  return Uint8Array.from([...HEADER, ...body, ...w.b, 0xF7]);
}
export function decodeFrame(frame) {
  const b = Array.from(frame);
  if (b.length < 16 || b.length > MAX_FRAME) fail('length', 'frame length');
  for (let i = 0; i < 5; i++) if (b[i] !== HEADER[i]) fail('header', 'not DNR3');
  if (b[b.length - 1] !== 0xF7) fail('header', 'no F7');
  for (let i = 1; i < b.length - 1; i++) if (b[i] > 0x7F) fail('range', 'byte >= 0x80');
  const op = b[5], seq = b[6] | b[7] << 7, len = b[8] | b[9] << 7;
  if (len !== b.length - 16) fail('length', 'length field');
  const body = b.slice(5, 10 + len), crc = new Reader(b.slice(10 + len, 15 + len)).int('u32');
  if (crc !== crc32(body)) fail('crc', 'CRC mismatch');
  return {op, seq, payload: b.slice(10, 10 + len)};
}

export function encodeRequest(op, seq, fields = {}) {
  const schema = REQUEST[op] ?? fail('op', 'unknown request op');
  const w = new Writer(); writeFields(w, schema, fields);
  return encodeFrame(op, seq, w.b);
}
export function decodeRequest(frame) {
  const {op, seq, payload} = decodeFrame(frame);
  const schema = REQUEST[op] ?? fail('op', 'unknown request op');
  const r = new Reader(payload), fields = readFields(r, schema); r.end();
  return {op, name: NAME[op], seq, fields};
}
export function encodeReply(op, seq, status, rev, fields = {}) {
  const schema = REPLY[op] ?? fail('op', 'unknown reply op');
  const w = new Writer(); w.int('u7', status); w.int('u28', rev);
  if (status === STATUS.OK || status === STATUS.QUEUED) writeFields(w, schema, fields);
  return encodeFrame(op | 0x40, seq, w.b);
}
export function decodeReply(frame) {
  const {op: wire, seq, payload} = decodeFrame(frame);
  if (wire === OP.NOTIFY || !(wire & 0x40)) fail('op', 'not a reply');
  const op = wire & 0x3F, schema = REPLY[op] ?? fail('op', 'unknown reply op');
  const r = new Reader(payload), status = r.int('u7'), rev = r.int('u28');
  if (status > STATUS.DENIED) fail('range', 'status');
  const fields = status === STATUS.OK || status === STATUS.QUEUED ? readFields(r, schema) : {};
  r.end();
  return {op, name: NAME[op], seq, status, rev, fields};
}
export function encodeNotify(rev, kind, fields = {}) {
  const schema = NOTIFY[kind] ?? fail('op', 'unknown notify kind');
  const w = new Writer(); w.int('u28', rev); w.int('u7', kind); writeFields(w, schema, fields);
  return encodeFrame(OP.NOTIFY, 0, w.b);
}
export function decodeNotify(frame) {
  const {op, seq, payload} = decodeFrame(frame);
  if (op !== OP.NOTIFY || seq !== 0) fail('op', 'not a notify');
  const r = new Reader(payload), rev = r.int('u28'), kind = r.int('u7');
  const schema = NOTIFY[kind] ?? fail('op', 'unknown notify kind');
  const fields = readFields(r, schema); r.end();
  return {rev, kind, fields};
}
// CRC-14 used for pattern_crc: low 14 bits of crc32 over the raw pattern_t bytes.
export const patternCrc = raw => crc32(raw) & 0x3FFF;
