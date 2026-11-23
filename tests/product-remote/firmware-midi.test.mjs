// Plain MIDI from remote/midi-out.mjs reaches the real firmware (pinned emulator runtime).
// Needs DNBOX_EMULATOR_RUNTIME (the gate sets it).
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadEmulator} from './firmware/emu-node.mjs';
import * as m from '../../web/product-site/remote/midi-out.mjs';
import {encodeRequest, OP} from '../../web/product-site/remote/dnr3.mjs';

const runtime = process.env.DNBOX_EMULATOR_RUNTIME;
const skip = runtime ? false : 'DNBOX_EMULATOR_RUNTIME not set';

// Peak of the 40 ms before and after the event, after letting earlier sound decay.
function onset(emu, bytes) {
  for (let i = 0; i < 40 && emu.ms(100) > 20000; i++);
  const before = emu.ms(40);
  assert.equal(emu.midi(bytes), 0, 'web_midi accepted');
  return {before, after: emu.ms(40)};
}

test('pads: note on the part channel sounds the firmware voice', {skip}, async () => {
  const emu = await loadEmulator(runtime);
  const pads = [['drum909', 0], ['drum808', 0], ['chicago', 48], ['miami', 60], ['breaks', 0]];
  for (const [part, key] of pads) {
    const on = m.padOn(part, key, 110, null);
    assert.ok(on.ok, part);
    const {before, after} = onset(emu, on.bytes);
    assert.ok(after > 4 * before + 50000, `${part} sounded (before ${before}, after ${after})`);
    assert.equal(emu.midi(m.padOff(part, key, null).bytes), 0);
  }
  for (let i = 0; i < 40 && emu.ms(100) > 20000; i++);
  emu.midi(m.padOn('drum909', 0, 120, null).bytes); emu.render(2);
  const amp = emu.envelope(3, 0, 1);
  assert.ok(amp && amp.getUint32(40, true) === 1 && amp.getFloat32(0, true) > 0, '909 BD amp envelope active');
});

test('transport: realtime Start/Stop/Continue drive the sequencer under the default clock source', {skip}, async () => {
  const emu = await loadEmulator(runtime);
  assert.equal(emu.playing(), 0);
  for (const [action, playing] of [[1, 1], [0, 0], [2, 1], [0, 0]]) {
    const t = m.transport(action, null);
    assert.equal(t.via, 'midi');
    assert.equal(emu.midi(t.bytes), 0);
    emu.ms(60);
    assert.equal(emu.playing(), playing, `action ${action}`);
  }
  assert.equal(emu.midi([0xF8, 1, 0]), -1, 'realtime with data bytes refused');
  assert.equal(emu.midi([0xF1, 0, 0]), -1, 'unsupported system message refused');
});

test('SysEx hook reports honestly whether this firmware has a DNR3 handler', {skip}, async () => {
  const emu = await loadEmulator(runtime);
  assert.equal(emu.caps & 1, 1, 'realtime hook present');
  const rc = emu.sysex(encodeRequest(OP.HELLO, 1, {client_proto: 3}));
  if (emu.caps & 2) {
    assert.equal(rc, 0);
    assert.ok(emu.sysexOut().length >= 1, 'HELLO answered');
  } else {
    assert.equal(rc, -3, 'no DNR3 handler: refused, not faked');
    assert.deepEqual(emu.sysexOut(), []);
  }
});
