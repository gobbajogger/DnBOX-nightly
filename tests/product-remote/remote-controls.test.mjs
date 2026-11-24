// SPDX-License-Identifier: GPL-3.0-only
// Remote controls: firmware-derived engines, track order, drum pages and options, and every
// edit's DNR3 request (encoded, decoded and checked against the spec vectors).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import * as d from '../../web/product-site/remote/dnr3.mjs';
import {drumStepEdit, breakStepEdit, paramEdit, tempoEdit, partSetEdit, prefFromId, bassParamPref, encodeEdit, ACCENT_TRACK, PART} from '../../web/product-site/remote/dnr3-link.mjs';
import {firmwarePages} from '../../web/product-site/remote/firmware-labels.mjs';
import {FIRMWARE_ENGINES, bankValues, engineOptions, presetSelect, presetBanksFor, firmwareSoundControls, publicName} from '../../web/product-site/remote/bass-engines.mjs';
import {drumOptions, optionEdit, formatOption, renderDrumParams, renderDrumNav, PAGES, PAGE_STEPS, optionDefaults} from '../../web/product-site/remote/drum-options.mjs';
import {renderFunkyBeatsDrums} from '../../web/product-site/remote/funkybeats-view.mjs';
import {bpmFromTaps} from '../../web/product-site/remote/tempo-control.mjs';
import {noteAtRail} from '../../web/product-site/remote/keybed-scroll.mjs';
import {laneDefault, velocityFromLane, chanceFromLane, pitchOffsetFromLane} from '../../web/product-site/remote/lane.mjs';
const remote = new URL('../../web/product-site/remote/', import.meta.url);
const vectors = JSON.parse(readFileSync(new URL('dnr3-vectors.json', import.meta.url), 'utf8'));
const hex = b => Buffer.from(b).toString('hex');
const roundTrip = edit => d.decodeRequest(encodeEdit(edit, {epoch: 1, seq: 9}));

test('Remote engine list is the firmware list (BENGINE_N at the pinned tip)', () => {
  assert.deepEqual(FIRMWARE_ENGINES.bassEngines.map(e => e.name), ['CHICAGO', 'MIAMI', 'SYNTH ONE', 'SUPERJ6']);
  assert.deepEqual(bankValues().map(publicName), FIRMWARE_ENGINES.bassEngines.map(e => e.name));
  const opts = [...engineOptions('CHICAGO').matchAll(/>([^<]+)<\/option>/g)].map(m => m[1]);
  assert.deepEqual(opts, FIRMWARE_ENGINES.bassEngines.map(e => e.name));
  for (const e of FIRMWARE_ENGINES.bassEngines) {
    assert.ok(e.params.length > 0 && e.presets.length > 0, e.name);
    const bank = e.name === 'SUPERJ6' ? 'JUNO' : e.name;
    const banks = presetBanksFor(bank);
    if (!banks) assert.equal((presetSelect(0, bank, 0).match(/<option/g) ?? []).length, e.presets.length, e.name + ' presets');
    else assert.deepEqual(banks.flatMap(b => b.presets).filter(p => p.firmwareIndex !== null).map(p => p.firmwareIndex).sort((x, y) => x - y), e.presets.map((_, i) => i), e.name + ' presets reachable through the banks');
  }
  // Synth One is edited from the instrument's own pages: R_S1PATCH addresses, firmware names and value text.
  const s1 = firmwareSoundControls('SYNTH ONE', new Map(), 0);
  const refs = firmwarePages('PART', 2, {engine: 'SYNTH ONE'}).flatMap(p => p.refs).filter(r => r && ![41, 42, 43].includes(Number(r.split(':')[0])));
  assert.equal((s1.match(/data-firmware-pref=/g) ?? []).length, refs.length);
  for (const t of ['OSC BALANCE', 'FILTER ATTACK', 'AMP RELEASE', 'data-firmware-pref="51:2:0:0"', '>50 %<', '>2.0 kHz<']) assert.ok(s1.includes(t), t);
});

test('firmware-engines.json is regenerated from the firmware source when a checkout is given', {skip: !process.env.DNBOX_FIRMWARE_DIR && !existsSync('/tmp/fw73/firmware/src/app/ui.c')}, async () => {
  const {parseFirmware} = await import('../../scripts/sync-firmware-engines.mjs');
  const fresh = parseFirmware(process.env.DNBOX_FIRMWARE_DIR ?? '/tmp/fw73');
  const shipped = structuredClone(FIRMWARE_ENGINES); delete shipped.firmwareSha; delete fresh.firmwareSha;
  assert.deepEqual(fresh, shipped);
});

test('track order matches the firmware PART_ORDER with default banks (909, 808, BREAK, Bass A, Bass B)', () => {
  assert.deepEqual(FIRMWARE_ENGINES.partOrder.map(p => p.id), ['PART_909', 'PART_808', 'PART_BRK', 'PART_303B', 'PART_303A']);
  const html = readFileSync(new URL('index.html', remote), 'utf8');
  const buttons = [...html.matchAll(/data-engine="([a-z0-9]+)"/g)].map(m => m[1]);
  const select = [...html.match(/<select id="part"[\s\S]*?<\/select>/)[0].matchAll(/value="([a-z0-9]+)"/g)].map(m => m[1]);
  assert.deepEqual(buttons, ['drum909', 'drum808', 'breaks', 'chicago', 'miami']);
  assert.deepEqual(select, buttons);
  assert.equal(buttons.indexOf('breaks'), 2, 'BREAK is the third option');
  assert.match(html, /<option value="chicago" selected>/, 'the selected part matches the pressed engine button');
  assert.match(html, /data-engine="chicago"[^>]*aria-pressed="true"/);
});

test('no extra connection mode; unsupported Drum controls are explicitly Draft', () => {
  const html = readFileSync(new URL('index.html', remote), 'utf8'), app = readFileSync(new URL('app.mjs', remote), 'utf8');
  assert.doesNotMatch(html.replace(/<[^>]*>/g, ' '), /\b(?:emulator|simulator)\b/i, 'no emulator/simulator mode');
  assert.match(html, /id="edit-scope">Draft · Connect via USB MIDI to edit your DnBOX<\/p>/);
  assert.doesNotMatch(html, /<(?:button|option)[^>]*>[^<]*Draft[^<]*<\/(?:button|option)>/i, 'Draft is edit scope, not an extra connection mode');
  assert.doesNotMatch(html, /Start emulator|Stop emulator|Apply to instrument|Download draft|Open draft|Not connected/);
  assert.match(html, /id="conn-state"[^>]*>Disconnected</);
  assert.match(app, /data-drum-source="draft">Draft \(not sent to the instrument\)/);
  assert.doesNotMatch(app, /mountFirmwareLink|' · Draft|Simulator connected/);
  assert.match(app, /function soundSourceBar\(\)\{return '';\}/);
  assert.match(app, /function mixSourceBar\(\)\{return '';\}/);
  assert.match(app, /function connectionLabel\(\)\{return remoteLink\?\.connected\(\)\?'Connected':'Disconnected';\}/);
});

test('drum tracks open the drum sequencer from the Sequence tab', () => {
  const app = readFileSync(new URL('app.mjs', remote), 'utf8');
  assert.match(app, /function setView\(v\)\{if\(v==='roll'\|\|v==='drums'\)v=drumPart\(\)\?'drums':'roll';/);
  assert.match(app, /const tab=v==='song'\?'patterns':v==='drums'\?'roll':v;/);
  assert.match(app, /function drumPart\(\)\{const p=\$\('part'\)\?\.value;return p==='drum909'\|\|p==='drum808';\}/);
  assert.doesNotMatch(readFileSync(new URL('index.html', remote), 'utf8'), /data-view="drums"/, 'no separate Drums entry');
});

test('drum steps: every voice, step and the accent row round-trip as STEP_SET', () => {
  for (const part of ['drum909', 'drum808']) for (let track = 0; track <= ACCENT_TRACK; track++) for (const step of [0, 15, 16, 63]) for (const on of [true, false]) {
    const r = roundTrip(drumStepEdit(part, 3, track, step, on));
    assert.equal(r.op, d.OP.STEP_SET);
    assert.deepEqual({part: r.fields.part, pat: r.fields.pat, step: r.fields.step, record: r.fields.record}, {part: PART[part], pat: 3, step, record: {track, on: on ? 1 : 0, vel: 127}});
  }
  const v = vectors.requests.find(x => x.name === 'step-set-drum-accent-row');
  assert.equal(hex(encodeEdit(drumStepEdit('drum909', 0, ACCENT_TRACK, 15, true), {epoch: 1, seq: v.seq})), v.frame_hex);
  assert.throws(() => drumStepEdit('drum909', 0, 12, 0, true));
  assert.throws(() => drumStepEdit('drum909', 0, 0, 64, true));
});

test('BREAK steps round-trip as STEP_SET part 4 and match the spec vector', () => {
  const v = vectors.requests.find(x => x.name === 'step-set-break');
  const f = v.fields;
  const e = breakStepEdit(f.pat, f.step, !!f.record.on, f.record.slice);
  assert.equal(hex(d.encodeRequest(e.op, v.seq, {epoch: f.epoch, part: e.part, pat: e.pat, step: e.step, expect_crc: f.expect_crc, record: e.record})), v.frame_hex, 'same record as the spec vector');
  assert.equal(roundTrip(e).fields.expect_crc, d.KEEP, 'Remote edits do not check the pattern CRC');
  for (let step = 0; step < 16; step++) for (const slice of [0, 1, 32]) {
    const r = roundTrip(breakStepEdit(5, step, true, slice));
    assert.deepEqual([r.fields.part, r.fields.pat, r.fields.step, r.fields.record.on, r.fields.record.slice], [4, 5, step, 1, slice]);
  }
});

test('parameters and engine choice round-trip as PARAM_SET at the firmware pref address', () => {
  const k = FIRMWARE_ENGINES.prefKinds;
  const pref = bassParamPref(1, 7), r = roundTrip(paramEdit(pref, 99));
  assert.deepEqual([r.op, r.fields.kind, r.fields.a, r.fields.b, r.fields.c, r.fields.value], [d.OP.PARAM_SET, k.R_ENG, 2, 1, 7, 99]);
  assert.deepEqual(prefFromId('source-sound/CHICAGO/0|1:2:0:5'), {kind: 1, a: 2, b: 0, c: 5});
  assert.equal(prefFromId('no-address'), null);
  const e = roundTrip(paramEdit({kind: k.R_BENGINE, a: 0, b: 0, c: 0}, FIRMWARE_ENGINES.bassEngines[2].kind));
  assert.equal(e.fields.kind, k.R_BENGINE);
});

test('tempo round-trips as TEMPO bpm_x10 and matches the spec vector', () => {
  const v = vectors.requests.find(x => x.name === 'tempo');
  assert.equal(hex(encodeEdit(tempoEdit(300), {epoch: 1, seq: v.seq})), v.frame_hex);
  assert.equal(roundTrip(tempoEdit(125)).fields.bpm_x10, 1250);
  assert.throws(() => tempoEdit(19)); assert.throws(() => tempoEdit(301));
  assert.equal(FIRMWARE_ENGINES.defaultTempo, 125);
  assert.equal(bpmFromTaps([0, 500, 1000, 1500]), 120);
  assert.equal(bpmFromTaps([0]), null);
  assert.equal(bpmFromTaps([0, 100]), 300, 'clamped to the firmware maximum');
});

test('drum parameter page: every firmware SEQUENCE option for drums, formatted and sent as DNR3', () => {
  assert.deepEqual(drumOptions().map(o => o.pref), ['R_DLEN', 'R_DRATE', 'R_SWING', 'R_ACCENT']);
  const [len, rate, swing, accent] = drumOptions();
  assert.deepEqual([len.max, len.default, formatOption(len, 15), formatOption(len, 63)], [63, 15, '16 steps', '64 steps']);
  assert.deepEqual(rate.names, ['1/16', '1/16T', '1/32', '1/8T', '1/8', '1/4']);
  assert.equal(formatOption(swing, 0), '50 %'); assert.equal(formatOption(swing, 100), '75 %');
  assert.equal(formatOption(accent, 88), '69 %');
  const vec = vectors.requests.find(x => x.name === 'part-set-len');
  assert.equal(hex(encodeEdit(optionEdit(len, 'drum808', 0, 63), {epoch: 1, seq: vec.seq})), vec.frame_hex, 'LENGTH 64 = spec vector');
  const r = roundTrip(optionEdit(rate, 'drum909', 4, 5));
  assert.deepEqual([r.op, r.fields.part, r.fields.pat, r.fields.field, r.fields.value], [d.OP.PART_SET, 0, 4, 1, 5]);
  const s = roundTrip(optionEdit(swing, 'drum808', 4, 40));
  assert.deepEqual([r.op, s.fields.part, s.fields.field, s.fields.value], [d.OP.PART_SET, 0, 4, 40], 'swing is part 0 (all parts)');
  const a = roundTrip(optionEdit(accent, 'drum808', 4, 100));
  assert.deepEqual([a.op, a.fields.kind, a.fields.b, a.fields.value], [d.OP.PARAM_SET, FIRMWARE_ENGINES.prefKinds.R_ACCENT ?? 14, 0, 100]);
  assert.throws(() => partSetEdit('drum909', 0, 2, 1), 'direction is 303-only in the firmware');
  const html = renderDrumParams({kit: '909', values: optionDefaults()});
  for (const o of drumOptions()) assert.match(html, new RegExp('data-seq-option="' + o.pref + '"'));
  assert.equal((html.match(/data-seq-opt="R_DRATE"/g) ?? []).length, 6);
  assert.match(html, /type="range"[^>]*data-seq-opt="R_DLEN"[^>]*data-default="15"/);
});

test('drum pages: four pages of 16 cover the firmware 64 steps; steps past LENGTH are marked', () => {
  assert.equal(PAGES * PAGE_STEPS, FIRMWARE_ENGINES.sequenceOptions.steps);
  const nav = renderDrumNav({page: 1, params: false, length: 20});
  assert.deepEqual([...nav.matchAll(/data-drum-page="(\d)"/g)].map(m => m[1]), ['0', '1', '2', '3']);
  assert.match(nav, /data-drum-page="1" aria-pressed="true"/);
  assert.match(nav, /data-drum-page="2" aria-pressed="false" class="beyond"/);
  const hits = Array.from({length: 11}, (_, v) => Array.from({length: 16}, (_, s) => v === 0 && s === 0));
  const grid = renderFunkyBeatsDrums({kit: '909', notes: [], endSample: 88200, accents: Array(16).fill(false), offset: 16, hits, length: 20});
  assert.equal((grid.match(/data-drum-step=/g) ?? []).length, 176);
  assert.match(grid, /data-drum-step="16"[^>]*data-drum-voice="0"/);
  assert.match(grid, /data-drum-accent="31"/);
  assert.match(grid, /<span>17<\/span>/);
  assert.equal((grid.match(/beyond/g) ?? []).length, 12 * 12, 'steps 21..32 dimmed on every row');
});

test('double-tap defaults: lanes and the keybed use the firmware/model defaults', () => {
  assert.equal(velocityFromLane(laneDefault('velocity')), 100);
  assert.equal(chanceFromLane(laneDefault('chance')), '100%');
  assert.equal(pitchOffsetFromLane(laneDefault('pitch')), 0);
  assert.equal(noteAtRail(0, 0, 20), 127);
  assert.equal(noteAtRail(5, 127 * 20, 20), 0);
  assert.equal(noteAtRail(25, 40, 20), 124);
});
