// Plain MIDI out (REMOTE-FW-PROTOCOL.md section 2) against the firmware facts it cites.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import * as m from '../../web/product-site/remote/midi-out.mjs';
import {CAP} from '../../web/product-site/remote/dnr3.mjs';

const fw = process.env.DNBOX_FIRMWARE_CHECKOUT;
const known = {ch: [9, 10, 1, 2, 3], clkSrc: 0, clipMode: 0, caps: 0x1FF};
const internal = {...known, clkSrc: 1};

test('note maps and default channels match firmware sequencer.c when a checkout is given', {skip: !fw || !existsSync(`${fw}/firmware/src/seq/sequencer.c`)}, () => {
  const src = readFileSync(`${fw}/firmware/src/seq/sequencer.c`, 'utf8');
  const rows = [...src.matchAll(/\{([0-9, ]+)\},\s*\/\* (909|808):/g)].map(x => [x[2], x[1].split(',').map(Number)]);
  assert.deepEqual(rows, [['909', [...m.GM_DRUM.drum909]], ['808', [...m.GM_DRUM.drum808]]]);
  assert.match(src, /SEQ_CH_DEFAULT\[NTRACKS\] = \{9, 10, 1, 2, 3\}/);
  const h = readFileSync(`${fw}/firmware/src/seq/sequencer.h`, 'utf8');
  for (const [k, v] of [['AUTO', m.CLK_AUTO], ['INT', m.CLK_INTERNAL], ['EXT', m.CLK_EXTERNAL]]) assert.match(h, new RegExp(`#define SEQ_CLK_${k} ${v}u`));
});

test('pads become note on/off on the part channel', () => {
  assert.deepEqual(m.padOn('drum909', 0, 100, known).bytes, [0x99, 36, 100]);
  assert.deepEqual(m.padOff('drum909', 0, known).bytes, [0x89, 36, 0]);
  assert.deepEqual(m.padOn('drum808', 7, 127, known).bytes, [0x9A, 56, 127]);
  assert.deepEqual(m.padOn('chicago', 48, 90, known).bytes, [0x91, 48, 90]);
  assert.deepEqual(m.padOn('miami', 60, 0, known).bytes, [0x92, 60, 1]);
  assert.deepEqual(m.padOn('breaks', 5, 64, known).bytes, [0x93, 17, 64]);
  assert.equal(m.padOn('drum909', 11, 100, known).reason, 'range');
  assert.equal(m.padOn('breaks', 32, 100, known).reason, 'range');
});

test('routing follows the firmware ownership order', () => {
  assert.equal(m.route('drum909', {...known, ch: [3, 10, 1, 2, 3]}).reason, 'owned-by-break');
  assert.equal(m.route('chicago', {...known, ch: [9, 10, 9, 2, 3]}).reason, 'owned-by-kit');
  assert.deepEqual(m.route('drum909', {...known, ch: [9, 9, 1, 2, 3]}).shared, ['drum808']);
  assert.equal(m.route('miami', {...known, ch: [9, 10, 1, 127, 3]}).reason, 'channel-off');
  assert.equal(m.padOn('drum909', 0, 100, {...known, clipMode: 1}).reason, 'clip-mode');
  assert.ok(m.padOn('drum909', 2, 100, {...known, clipMode: 1}).ok, 'notes >= 40 pass in clip mode');
  assert.ok(m.padOn('breaks', 0, 100, {...known, clipMode: 1}).ok, 'break channel is not a clip pad');
  assert.equal(m.route('drum909', null).assumed, true);
  assert.equal(m.route('drum909', known).assumed, false);
});

test('transport is realtime MIDI unless CLOCK SOURCE is INT', () => {
  assert.deepEqual(m.transport(1, internal), {ok: true, via: 'dnr3', action: 1});
  assert.deepEqual([0, 1, 2].map(a => m.transport(a, known).bytes), [[0xFC], [0xFA], [0xFB]]);
  assert.deepEqual(m.transport(1, {...known, clkSrc: 2}).bytes, [0xFA]);
  assert.equal(m.transport(1, null).assumed, true, 'firmware default AUTO assumed until STATE');
  assert.equal(m.transport(3, known).reason, 'range');
});

test('clip launch is Program Change, only when the firmware reports PC_CLIP', () => {
  assert.equal(m.clipLaunch('chicago', 4, {...known, caps: 0}).reason, 'unsupported');
  assert.equal(m.clipLaunch('chicago', 4, null).reason, 'unsupported');
  assert.deepEqual(m.clipLaunch('chicago', 4, known).bytes, [0xC1, 4]);
  assert.deepEqual(m.clipLaunch('drum909', null, known).bytes, [0xC9, 127]);
  assert.deepEqual(m.clipLaunch('drum909', 0, {...known, ch: [9, 9, 1, 2, 3]}).parts, ['drum909', 'drum808']);
  assert.equal(m.clipLaunch('drum909', 32, known).reason, 'range');
  assert.equal(m.clipLaunch('drum909', 1, {...known, clipMode: 1}).reason, 'clip-mode');
  assert.equal(CAP.PC_CLIP, 128);
});
