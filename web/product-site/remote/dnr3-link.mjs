// SPDX-License-Identifier: GPL-3.0-only
// The Remote's only link to a DnBOX: Web MIDI + DNR3 (REMOTE-FW-PROTOCOL.md v3.0).
// Two states only: connected (HELLO and OPEN answered by the instrument) or disconnected.
// Nothing is simulated: without a DNR3 answer the page stays disconnected and sends no edits.
import {Dnr3Client, webMidiTransport} from './dnr3-client.mjs';
import * as d from './dnr3.mjs';
import {createDnr3MixProvider} from './dnr3-mix.mjs';
import {createChicagoSession} from './dnr3-chicago.mjs';

export const PART = Object.freeze({drum909: 0, drum808: 1, chicago: 2, miami: 3, breaks: 4});
export const ACCENT_TRACK = 11;            // §4.2: part 0/1 track 11 = accent row
export const VEL_KEEP = 127;               // §4.2: vel 127 = no change
export const R_ENG = 1, T_303 = 2;         // §4.1 / engine.h; mixer catalog ids carry the same 1:a:b:c
export const STATE = Object.freeze({CONNECTED: 'connected', DISCONNECTED: 'disconnected'});

// Pure edit -> DNR3 request field builders (pattern pat 0..31, step 0..63).
export function drumStepEdit(part, pat, track, step, on, vel = VEL_KEEP) {
  if (!['drum909', 'drum808'].includes(part) || !Number.isInteger(track) || track < 0 || track > ACCENT_TRACK ||
      !Number.isInteger(step) || step < 0 || step > 63 || !Number.isInteger(pat) || pat < 0 || pat > 31) throw Error('Invalid drum step');
  return {op: d.OP.STEP_SET, part: PART[part], pat, step, record: {track, on: on ? 1 : 0, vel}};
}
export function breakStepEdit(pat, step, on, slice) {
  if (!Number.isInteger(step) || step < 0 || step > 15 || !Number.isInteger(slice) || slice < 0 || slice > 32) throw Error('Invalid BREAK step');
  return {op: d.OP.STEP_SET, part: PART.breaks, pat, step, record: {on: on ? 1 : 0, slice}};
}
// "kind:a:b:c" pref address, as the catalog/mixer ids carry it after "|".
export function prefFromId(id) {
  const tail = String(id).includes('|') ? String(id).split('|')[1] : String(id);
  const parts = tail.split(':').map(Number);
  if (parts.length !== 4 || !parts.every(n => Number.isInteger(n) && n >= 0 && n < 128)) return null;
  const [kind, a, b, c] = parts;
  return {kind, a, b, c};
}
export function bassParamPref(slot, index) {
  if (![0, 1].includes(slot) || !Number.isInteger(index) || index < 0 || index > 127) throw Error('Invalid bass control');
  return {kind: R_ENG, a: T_303, b: slot, c: index};
}
export function paramEdit(pref, value) {
  if (!pref || !Number.isInteger(value) || value < 0 || value > 0x3FFE) throw Error('Invalid parameter edit');
  return {op: d.OP.PARAM_SET, ...pref, value};
}
// PART_SET (§4.3): 0 len 1..64, 1 rate RATE_*, 2 dir (303), 3 transpose (303, 0..48), 4 swing (part 0 only, 0..100).
export const PART_FIELD = Object.freeze({LEN: 0, RATE: 1, DIR: 2, TRANSPOSE: 3, SWING: 4});
export function partSetEdit(part, pat, field, value) {
  const max = [64, 5, 3, 48, 100][field], min = field === PART_FIELD.LEN ? 1 : 0;
  if (!(part in PART) || !Number.isInteger(pat) || pat < 0 || pat > 31 || max === undefined || !Number.isInteger(value) || value < min || value > max ||
      (field === PART_FIELD.SWING && part !== 'drum909') || ((field === PART_FIELD.DIR || field === PART_FIELD.TRANSPOSE) && !['chicago', 'miami'].includes(part))) throw Error('Invalid part setting');
  return {op: d.OP.PART_SET, part: PART[part], pat, field, value};
}
export const TEMPO_MIN = 20, TEMPO_MAX = 300;   // TEMPO bpm_x10 200..3000 (§4)
export function tempoEdit(bpm) {
  const x10 = Math.round(Number(bpm) * 10);
  if (!Number.isInteger(x10) || x10 < TEMPO_MIN * 10 || x10 > TEMPO_MAX * 10) throw Error('Invalid tempo');
  return {op: d.OP.TEMPO, bpm_x10: x10};
}
// Encode exactly what the client would send (epoch/seq supplied), for tests and logs.
export function encodeEdit(edit, {epoch = 1, seq = 1} = {}) {
  if (edit.op === d.OP.STEP_SET)
    return d.encodeRequest(d.OP.STEP_SET, seq, {epoch, part: edit.part, pat: edit.pat, step: edit.step, expect_crc: d.KEEP, record: edit.record});
  if (edit.op === d.OP.PARAM_SET)
    return d.encodeRequest(d.OP.PARAM_SET, seq, {epoch, kind: edit.kind, a: edit.a, b: edit.b, c: edit.c, expect: d.KEEP, value: edit.value});
  if (edit.op === d.OP.PART_SET) return d.encodeRequest(d.OP.PART_SET, seq, {epoch, part: edit.part, pat: edit.pat, field: edit.field, value: edit.value});
  if (edit.op === d.OP.TEMPO) return d.encodeRequest(d.OP.TEMPO, seq, {epoch, bpm_x10: edit.bpm_x10});
  throw Error('Unsupported edit');
}

export function mountDnr3Link({document: doc = globalThis.document, navigator: nav = globalThis.navigator,
  timeoutMs = Number.isFinite(globalThis.__DNBOX_MIDI_TIMEOUT) ? globalThis.__DNBOX_MIDI_TIMEOUT : 250, onChange = () => {}} = {}) {
  const $ = id => doc.getElementById(id);
  const button = $('connect'), label = $('conn-state'), draftProjectLabel = $('draft-project-label');
  const close = $('close-connection'); if (close) close.addEventListener('click', () => { const panel = $('connection-result'); if (panel) panel.hidden = true; button?.focus?.(); });
  let client = null, transport = null, busy = false, hello = null, noRemoteReply = false;
  const listeners = new Set(), notifications = new Set();
  function show(state, note = '', noReply = false) {
    noRemoteReply = noReply;
    // STATE reports active pattern IDs, not a device project title.
    if (draftProjectLabel) draftProjectLabel.hidden = state === STATE.CONNECTED;
    if (label) { label.textContent = state === STATE.CONNECTED ? 'Connected' : 'Disconnected'; label.dataset.session = state; label.title = note; }
    if (button) { button.textContent = state === STATE.CONNECTED ? 'Disconnect' : 'Connect'; button.setAttribute('aria-pressed', String(state === STATE.CONNECTED)); }
    // A failed connect says why in the connection panel (dismissed with its Close button).
    const panel = $('connection-result'), message = $('connection-message');
    if (panel && message) { message.textContent = state === STATE.CONNECTED ? '' : note; panel.hidden = !(state !== STATE.CONNECTED && note); if(!panel.hidden)close?.focus?.(); }
    for (const cb of listeners) { try { cb(state, note); } catch {} }
    onChange(state, note);
  }
  async function disconnect(note = '') {
    const c = client, t = transport;
    if (!c || !t) return;
    client = null; transport = null; hello = null;
    busy = true;
    show(STATE.DISCONNECTED, note);
    try { await c?.close(); } catch {}
    t?.close();
    busy = false;
  }
  async function connect() {
    if (busy || client) return;
    busy = true;
    let opening = null;
    try {
      const request = nav?.requestMIDIAccess;
      if (typeof request !== 'function') { show(STATE.DISCONNECTED, 'Web MIDI isn’t available in this browser. Keep editing the Draft here, or open Remote in a browser with Web MIDI to connect.'); return; }
      const access = await request.call(nav, {sysex: true});
      const dnbox = p => p.state === 'connected' && /\bDnBOX\b/i.test(p.name ?? '');
      const inputs = [...access.inputs.values()].filter(dnbox), outputs = [...access.outputs.values()].filter(dnbox);
      if (inputs.length !== 1 || outputs.length !== 1 || inputs[0].name !== outputs[0].name) {
        show(STATE.DISCONNECTED, inputs.length > 1 || outputs.length > 1 ? 'Connect just one DnBOX over USB, then try again.' : 'No DnBOX MIDI ports found. Connect it over USB, then try again.'); return;
      }
      const [input] = inputs, [output] = outputs;
      await input.open?.(); await output.open?.();
      transport = webMidiTransport(input, output);
      const c = opening = new Dnr3Client({transport, clientId: 91, timeoutMs});
      c.onNotify(e => {
        if (client !== c) return;
        if (e?.type === 'lease-lost') { void disconnect('Connection lost'); return; }
        if (e?.type === 'notify' || e?.type === 'resync') for (const cb of notifications) { try { cb(e); } catch {} }
      });
      hello = await c.connect();
      client = c;
      show(STATE.CONNECTED);
    } catch (error) {
      try { await opening?.close(); } catch {}
      transport?.close(); transport = null; client = null; hello = null;
      const noReply = Boolean(opening && !opening.hello && error?.code === 'timeout');
      show(STATE.DISCONNECTED, noReply
        ? 'DnBOX MIDI was detected, but DnBOX didn’t answer Remote. Edits stay in Draft. Check USB and use firmware that supports Remote, then try again.'
        : error?.code === 'unavailable' || /timeout/i.test(String(error?.message))
          ? 'DnBOX didn’t answer. Check the USB connection, then try again.'
          : 'Could not connect. Allow MIDI access in your browser and try again.', noReply);
    } finally { busy = false; }
  }
  button?.addEventListener('click', () => { if (client) void disconnect(); else void connect(); });
  show(STATE.DISCONNECTED);
  async function send(edit) {
    if (!client) return {sent: false};
    try {
      const r = edit.op === d.OP.STEP_SET ? await client.stepSet(edit.part, edit.pat, edit.step, edit.record)
        : edit.op === d.OP.TEMPO ? await client.tempo(edit.bpm_x10)
        : edit.op === d.OP.PART_SET ? await client.partSet(edit.part, edit.pat, edit.field, edit.value)
        : await client.paramSet({kind: edit.kind, a: edit.a, b: edit.b, c: edit.c}, edit.value);
      return {sent: true, reply: r};
    } catch (error) { return {sent: false, error}; }
  }
  async function readSession(operation) {
    const c = client;
    if (!c) return null;
    const result = await operation(c);
    return c === client ? result : null;
  }
  const bassClients = new WeakMap();
  function bassRollClient() {
    const c=client;
    if (!c) return null;
    if (!bassClients.has(c)) {
      const bound=method=>(...args)=>{
        if (client!==c) return Promise.reject(Error('DnBOX session changed'));
        return c[method](...args);
      };
      bassClients.set(c,Object.freeze(Object.fromEntries(
        ['state','paramGet','paramSet','stepGet','stepSet'].map(method=>[method,bound(method)])
      )));
    }
    return bassClients.get(c);
  }
  return {
    bassRollClient,
    connected: () => !!client, noRemoteReply: () => noRemoteReply, hello: () => hello, send, connect, disconnect,
    drumClient: () => client,
    breakClient: () => client,
    sendMidi: bytes => { if (client && transport) transport.sendMidi(bytes); },
    describe: pref => readSession(c => c.describe(pref)),
    record: command => readSession(c => c.record(command)),
    readTempo: () => readSession(async c => (await c.state()).bpm_x10),
    writeTempo: value => readSession(async c => {
      const {bpm_x10}=tempoEdit(value);
      const reply=(await c.tempo(bpm_x10)).fields.bpm_x10;
      if(c!==client||reply!==bpm_x10)throw Error('Tempo was not acknowledged');
      const actual=(await c.state()).bpm_x10;
      if(actual!==reply)throw Error('Tempo readback did not match');
      return actual;
    }),
    readTransport: () => readSession(async c => (await c.state()).playing),
    transport: action => readSession(async c => (await c.transportAction(action)).fields.playing),
    mixProvider(groups) {
      const own=client;
      return createDnr3MixProvider({client:own,current:()=>client===own,
        onNotify(cb){notifications.add(cb);return ()=>notifications.delete(cb);}},groups);
    },
    readClips: () => readSession(c => c.state()),
    confirmClip: (part,pat) => readSession(async c => {
      const before=await c.state();
      if(c!==client)throw Error('Connection changed');
      if(before.clip_mode)return {blocked:true};
      const reply=(await c.cue(part,pat)).fields;
      if(reply.part!==part||reply.pat!==pat)throw Error('Wrong native pattern receipt');
      const state=await c.state();
      return state.clip_mode?{blocked:true}:state;
    }),
    chicagoSession(slot,bindings) {
      const own=client;
      return createChicagoSession(own,slot,bindings,()=>own===client);
    },
    onNotify(cb) { notifications.add(cb); return () => notifications.delete(cb); },
    async readMotion(voice) {
      const own=client;
      if (!own?.has(d.CAP.MOTION_MIAMI_CARRIER)) throw Error('Firmware does not offer MIAMI Carrier motion');
      const {ppat}=await own.state();
      if (own!==client) throw Error('Connection changed');
      const pat=ppat[2+voice];
      const {points}=(await own.request(d.OP.MOTION_GET,{voice,pat})).fields;
      if (own!==client) throw Error('Connection changed');
      return {pat,points};
    },
    async writeMotion(voice,pat,step,expect,value) {
      const own=client;
      if (!own?.has(d.CAP.MOTION_MIAMI_CARRIER)) throw Error('Firmware does not offer MIAMI Carrier motion');
      const confirmed=(await own.request(d.OP.MOTION_SET,{epoch:own.epoch,voice,pat,step,expect,value})).fields;
      if (own!==client || confirmed.value!==value) throw Error('Motion write not confirmed');
    },
    onState(cb) { listeners.add(cb); return () => listeners.delete(cb); },
  };
}
