// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const instrument = readFileSync(new URL('./native-sound-instrument.js', import.meta.url), 'utf8');
const count = 2048;
const pixels = 240 * 240;

class TestPort extends EventTarget {
  postMessage() {}
  start() {}
}

function setup(history) {
  const scope = {navigator: {}, structuredClone, recordNativeFrameHistory: history,
    AudioWorkletNode: class { constructor() { this.port = new TestPort(); } }};
  scope.window = scope;
  vm.runInNewContext(instrument, scope);
  return scope;
}

function deliver(node, message) {
  node.port.dispatchEvent(new MessageEvent('message', {data: message}));
}

for (const history of [false, true]) {
  test(history ? 'playing evidence retains all scalar readings' : 'long-running probe releases native pixel buffers', () => {
    const scope = setup(history);
    const node = new scope.AudioWorkletNode();
    let delivered;
    node.port.addEventListener('message', ({data}) => { delivered = data; });
    for (let i = 0; i < count; i++) {
      const framebuffer = new Uint16Array(pixels);
      framebuffer[0] = i;
      const frame = {type: 'frame', playing: i % 2, time: i * 33, framebuffer,
        keys: 0, dim: 0, buttons: 0, peak: i};
      deliver(node, frame);
      assert.strictEqual(delivered, frame);
      assert.strictEqual(delivered.framebuffer, framebuffer);
      deliver(node, {type: 'envelopes', sequence: i, timeMs: i * 33,
        voices: [{engine: 'CHICAGO', available: true, snapshot: {level: i}}]});
    }
    const retainedBytes = scope.nativeFrames.reduce((n, f) => n + (f.framebuffer?.byteLength ?? 0), 0);
    assert.equal(retainedBytes, 0);
    assert.equal(scope.nativeFrames.length, history ? count : 1);
    for (const [index, frame] of scope.nativeFrames.entries()) {
      const i = history ? index : count - 1;
      assert.deepEqual(Object.keys(frame).sort(), ['framebufferLength', 'playing', 'time']);
      assert.equal(frame.time, i * 33);
      assert.equal(frame.playing, i % 2);
      assert.equal(frame.framebufferLength, pixels);
    }
    assert.equal(scope.nativePackets.length, 5);
    for (const [i, packet] of scope.nativePackets.entries()) {
      assert.equal(packet.sequence, count - 5 + i);
      assert.equal(packet.voices[0].snapshot.level, packet.sequence);
    }
    const next = new scope.AudioWorkletNode();
    deliver(node, {type: 'frame', framebuffer: new Uint16Array(pixels)});
    deliver(node, {type: 'envelopes', sequence: -1});
    assert.equal(scope.nativeFrames.length, 0);
    assert.equal(scope.nativePackets.length, 0);
    // A malformed reading stays observable to the existing acceptance checks.
    deliver(next, {type: 'frame', playing: 7, time: -1, framebuffer: new Uint16Array(3)});
    assert.equal(scope.nativeFrames[0].playing, 7);
    assert.equal(scope.nativeFrames[0].framebufferLength, 3);
  });
}
