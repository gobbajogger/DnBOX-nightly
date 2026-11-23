// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {stepMs, playheadAt, tempoFrom, createPlayhead} from '../../web/product-site/remote/playhead.mjs';

test('one sixteenth step lasts a quarter beat at the pattern tempo', () => {
 assert.equal(stepMs(120), 125);
 assert.equal(stepMs(90), 60000 / 90 / 4);
 assert.throws(() => stepMs(0));
 assert.throws(() => stepMs(Number.NaN));
});

test('the playhead sweeps one bar of 16 steps and loops', () => {
 assert.deepEqual(playheadAt(0, 120), {position: 0, step: 0, beat: 0, bar: 0});
 assert.equal(playheadAt(125 * 5 + 10, 120).step, 5);
 assert.equal(playheadAt(125 * 5 + 10, 120).beat, 1);
 const wrapped = playheadAt(2000 + 250, 120);
 assert.equal(wrapped.step, 2);
 assert.equal(wrapped.bar, 1);
 assert.ok(playheadAt(1999, 120).position < 16);
 assert.equal(playheadAt(-50, 120).position, 0);
});

test('tempo comes from the BPM readout', () => {
 assert.equal(tempoFrom('120 BPM'), 120);
 assert.equal(tempoFrom('97.5 bpm'), 97.5);
 assert.equal(tempoFrom(''), 120);
 assert.equal(tempoFrom('fast', 100), 100);
});

test('start paints every frame, stop returns to the start and cancels frames', () => {
 let clock = 1000, queued = null, cancelled = 0;
 const painted = [];
 const head = createPlayhead({bpm: () => 120, paint: s => painted.push(s), now: () => clock,
  frame: f => { queued = f; return 7; }, cancel: id => { assert.equal(id, 7); cancelled++; queued = null; }});
 head.start();
 assert.equal(head.playing, true);
 assert.equal(painted.at(-1).step, 0);
 clock += 130; queued();
 assert.equal(painted.at(-1).step, 1);
 head.start();
 clock += 250; queued();
 assert.equal(painted.at(-1).step, 3, 'a second Play does not restart the bar');
 head.stop();
 assert.equal(head.playing, false);
 assert.equal(painted.at(-1), null);
 assert.equal(cancelled, 1);
 assert.equal(queued, null);
});
