// SPDX-License-Identifier: GPL-3.0-only
// DNR3 client (REMOTE-FW-PROTOCOL.md sections 3-5): one outstanding request, 250 ms timeout,
// one retry of the identical frame (same seq, the firmware answers it idempotently),
// lease keepalive, NOTIFY dispatch with revision gap detection.
// transport: {sendSysex(Uint8Array), onSysex(cb) -> unsubscribe, onRefused?(cb) -> unsubscribe}
import * as d from './dnr3.mjs';

const STATUS_NAME = Object.fromEntries(Object.entries(d.STATUS).map(([k, v]) => [v, k]));
export class Dnr3StatusError extends Error {
  constructor(op, status, rev) { super(`${op} ${STATUS_NAME[status] ?? status}`); this.op = op; this.status = status; this.statusName = STATUS_NAME[status]; this.rev = rev; }
}
export class Dnr3Unavailable extends Error {
  constructor(message) { super(message); this.code = 'unavailable'; }
}

export class Dnr3Client {
  constructor({transport, clientId = 1, timeoutMs = 250, keepaliveMs = 800, timers = globalThis} = {}) {
    if (!transport?.sendSysex || !transport?.onSysex) throw Error('DNR3 transport required');
    Object.assign(this, {transport, clientId, timeoutMs, keepaliveMs, timers});
    this.seq = 0; this.queue = Promise.resolve(); this.pending = null; this.epoch = 0; this.rev = null;
    this.hello = null; this.listeners = new Set(); this.closed = false; this.keepTimer = null;
    this.offSysex = transport.onSysex(bytes => this.receive(bytes));
    this.offRefused = transport.onRefused?.(result => this.refused(result)) ?? (() => {});
  }
  onNotify(cb) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  emit(event) { for (const cb of this.listeners) { try { cb(event); } catch { /* listener errors stay local */ } } }
  nextSeq() { this.seq = this.seq % 0x3FFF + 1; return this.seq; }   // 1..0x3FFF; 0 is NOTIFY
  receive(bytes) {
    let frame;
    try { frame = d.decodeFrame(bytes); } catch { return; }
    if (frame.op === d.OP.NOTIFY) {
      let n; try { n = d.decodeNotify(bytes); } catch { return; }
      const delta = this.rev === null ? 0 : (n.rev - this.rev) & 0xFFFFFFF;
      // The firmware groups several notifications under one revision (including POSITION).
      if (delta >= 0x8000000) return; // a stale notification must not move the clock backwards
      const gap = delta > 1;
      this.rev = n.rev;
      this.emit({type: 'notify', ...n, gap});
      if (gap) this.emit({type: 'resync', reason: 'revision gap'});
      return;
    }
    const p = this.pending;
    if (!p || frame.seq !== p.seq || frame.op !== (p.op | 0x40)) return;
    let reply; try { reply = d.decodeReply(bytes); } catch (e) { p.done(null, e); return; }
    if (reply.status === d.STATUS.OK || reply.status === d.STATUS.QUEUED) this.rev = reply.rev;
    p.done(reply);
  }
  refused(result) { this.pending?.done(null, new Dnr3Unavailable(result === -3 ? 'This firmware has no DNR3 handler' : `SysEx refused (${result})`)); }
  request(op, fields = {}, {allow = []} = {}) {
    const run = () => new Promise((resolve, reject) => {
      if (this.closed) { reject(Error('DNR3 client closed')); return; }
      const seq = this.nextSeq(), frame = d.encodeRequest(op, seq, fields);
      let tries = 0, timer = null;
      const p = {seq, op, done: (reply, error) => {
        if (this.pending !== p) return;
        this.timers.clearTimeout(timer); this.pending = null;
        if (error) reject(error);
        else if (reply.status === d.STATUS.OK || reply.status === d.STATUS.QUEUED || allow.includes(reply.status)) resolve(reply);
        else reject(new Dnr3StatusError(reply.name, reply.status, reply.rev));
      }};
      const send = () => {
        tries++;
        timer = this.timers.setTimeout(() => tries < 2 ? send() : p.done(null, Object.assign(Error('DNR3 timeout'), {code: 'timeout'})), this.timeoutMs);
        try { this.transport.sendSysex(frame); } catch (e) { p.done(null, e); }
      };
      this.pending = p; send();
    });
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => {});
    return result;
  }
  async connect({watch = 0x7F, admit} = {}) {
    const h = await this.request(d.OP.HELLO, {client_proto: 3});
    if (admit && !admit(h.fields)) throw new Dnr3Unavailable('This firmware is not approved for live Remote controls');
    this.hello = h.fields;
    const o = await this.request(d.OP.OPEN, {client_id: this.clientId});
    this.epoch = o.fields.epoch;
    if (!(this.hello.caps & d.CAP.VOICE)) watch &= ~d.WATCH.VOICE;
    if (watch && (this.hello.caps & d.CAP.WATCH)) await this.request(d.OP.WATCH, {epoch: this.epoch, mask: watch});
    this.startKeepalive();
    return this.hello;
  }
  startKeepalive() {
    this.timers.clearInterval(this.keepTimer);
    this.keepTimer = this.timers.setInterval(() => { this.request(d.OP.KEEPALIVE, {epoch: this.epoch}).catch(e => this.emit({type: 'lease-lost', error: e})); }, this.keepaliveMs);
  }
  has(cap) { return !!(this.hello && (this.hello.caps & cap)); }
  state() { return this.request(d.OP.STATE).then(r => r.fields); }
  describe(addr) { return this.request(d.OP.DESCRIBE, addr).then(r => r.fields); }
  paramGet(params) { return this.request(d.OP.PARAM_GET, {params}).then(r => r.fields.params); }
  paramSet(addr, value, expect = d.KEEP, {bank} = {}) {
    if (bank!==undefined && !this.has(d.CAP.BASS_BANK_GUARD)) return Promise.reject(new Dnr3Unavailable('Firmware cannot guard the live bass bank'));
    return this.request(d.OP.PARAM_SET, {epoch: this.epoch, ...addr, expect, value, expect_bank:bank});
  }
  stepGet(part, pat, step, track) { return this.request(d.OP.STEP_GET, {part, pat, step, track}).then(r => r.fields); }
  stepSet(part, pat, step, record, expectCrc = d.KEEP) { return this.request(d.OP.STEP_SET, {epoch: this.epoch, part, pat, step, expect_crc: expectCrc, record}); }
  partSet(part, pat, field, value) { return this.request(d.OP.PART_SET, {epoch: this.epoch, part, pat, field, value}); }
  cue(part, pat) { return this.request(d.OP.CUE, {epoch: this.epoch, part, pat: pat ?? 127}); }
  transportAction(action) { return this.request(d.OP.TRANSPORT, {epoch: this.epoch, action}); }
  async record(command = 2) {
    if (!this.has(d.CAP.RECORD)) throw new Dnr3Unavailable('Firmware cannot read or change Record');
    if (![0, 1, 2].includes(command)) throw new RangeError('Invalid Record command');
    const {record} = (await this.request(d.OP.RECORD, {epoch: this.epoch, command})).fields;
    if (record !== 0 && record !== 1) throw Error('Invalid firmware Record state');
    return record;
  }
  tempo(bpmX10) { return this.request(d.OP.TEMPO, {epoch: this.epoch, bpm_x10: bpmX10}); }
  mute(bit, on, queued = 0) { return this.request(d.OP.MUTE, {epoch: this.epoch, bit, on: on ? 1 : 0, queued: queued ? 1 : 0}); }
  async patternDump(pat, chunk = 112) {
    const bytes = []; let total = Infinity, crc = 0;
    while (bytes.length < total) {
      const r = (await this.request(d.OP.PATTERN_DUMP, {pat, offset: bytes.length, count: chunk})).fields;
      if (r.offset !== bytes.length || (total !== Infinity && r.total !== total)) throw Error('PATTERN_DUMP out of order');
      total = r.total; crc = r.pattern_crc;
      if (!r.bytes.length && bytes.length < total) throw Error('PATTERN_DUMP stalled');
      bytes.push(...r.bytes);
    }
    if (d.patternCrc(bytes) !== crc) throw Error('PATTERN_DUMP CRC mismatch');
    return {bytes: Uint8Array.from(bytes), crc, total};
  }
  async close() {
    this.timers.clearInterval(this.keepTimer); this.keepTimer = null;
    let released = false;
    if (this.epoch && !this.closed) { try { await this.request(d.OP.CLOSE, {epoch: this.epoch}); released = true; } catch { /* lease expires */ } }
    this.closed = true; this.offSysex?.(); this.offRefused?.();
    return {released};
  }
}

// Emulator AudioWorklet port (scripts/firmware-emulator/worklet.mjs messages midi / sysex / sysex-out / remote-caps).
export function emulatorTransport(port) {
  const sys = new Set(), ref = new Set(), midiRef = new Set(); let capsWait = [];
  const listener = ({data: m}) => {
    if (m?.type === 'sysex-out') for (const cb of sys) cb(new Uint8Array(m.bytes));
    else if (m?.type === 'sysex-refused') for (const cb of ref) cb(m.result);
    else if (m?.type === 'midi-refused') for (const cb of midiRef) cb(m);
    else if (m?.type === 'remote-caps') { const w = capsWait; capsWait = []; for (const r of w) r(m); }
  };
  port.addEventListener('message', listener);
  return {
    kind: 'emulator',
    sendSysex(bytes) { port.postMessage({type: 'sysex', bytes: Array.from(bytes)}); },
    sendMidi(bytes) { port.postMessage({type: 'midi', bytes: Array.from(bytes)}); },
    onSysex(cb) { sys.add(cb); return () => sys.delete(cb); },
    onRefused(cb) { ref.add(cb); return () => ref.delete(cb); },
    onMidiRefused(cb) { midiRef.add(cb); return () => midiRef.delete(cb); },
    caps(timeoutMs = 1000) {
      return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(Error('Emulator does not report Remote hooks')), timeoutMs);
        capsWait.push(m => { clearTimeout(t); resolve({midi: !!m.midi, realtime: !!m.realtime, dnr3: !!m.dnr3}); });
        port.postMessage({type: 'remote-caps'});
      });
    },
    close() { port.removeEventListener('message', listener); sys.clear(); ref.clear(); midiRef.clear(); },
  };
}

// A Web MIDI input/output pair (a real instrument over USB or Bluetooth MIDI).
export function webMidiTransport(input, output) {
  const sys = new Set();
  const listener = e => { const b = e.data; if (b?.[0] === 0xF0 && b[1] === 0x7D && b[2] === 0x44 && b[3] === 0x4E && b[4] === 0x03) for (const cb of sys) cb(new Uint8Array(b)); };
  input.addEventListener('midimessage', listener);
  return {
    kind: 'midi',
    sendSysex(bytes) { output.send(Array.from(bytes)); },
    sendMidi(bytes) { output.send(Array.from(bytes)); },
    onSysex(cb) { sys.add(cb); return () => sys.delete(cb); },
    async caps() { return {midi: true, realtime: true, dnr3: null}; },   // DNR3 is known only after HELLO
    close() { input.removeEventListener('midimessage', listener); sys.clear(); },
  };
}
