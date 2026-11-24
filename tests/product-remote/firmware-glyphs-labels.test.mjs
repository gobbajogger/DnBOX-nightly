// SPDX-License-Identifier: GPL-3.0-only
// The Remote's glyphs and parameter text are the firmware's: firmware-glyphs.json is read from the
// firmware source and firmware-labels.json is printed by the firmware's own C code; every Remote surface
// that shows a glyph or a parameter takes it from those files.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {FIRMWARE_GLYPHS, pictogramSvg, playIconSvg, playColour, firedWindowMs, cssVars} from '../../web/product-site/remote/fw-glyphs.mjs';
import {FIRMWARE_LABELS, firmwareName, firmwareValue, firmwarePages} from '../../web/product-site/remote/firmware-labels.mjs';
import {drumOptions, formatOption} from '../../web/product-site/remote/drum-options.mjs';
import {firmwareSoundControls, presetSelect} from '../../web/product-site/remote/bass-engines.mjs';
import {SourceSounds} from '../../web/product-site/remote/sound.mjs';
import {renderFunkyBeatsDrums} from '../../web/product-site/remote/funkybeats-view.mjs';

const R = new URL('../../web/product-site/remote/', import.meta.url);
const read = f => readFileSync(new URL(f, R), 'utf8');
const FW = process.env.DNBOX_FIRMWARE_DIR ?? '/tmp/fw73';
const haveFw = existsSync(FW + '/firmware/src/app/ui.c');

test('firmware-glyphs.json equals a fresh read of the firmware source', {skip: !haveFw}, async () => {
  const {parseFirmwareGlyphs} = await import('../../scripts/sync-firmware-glyphs.mjs');
  const {firmwareSha, ...committed} = JSON.parse(read('firmware-glyphs.json'));
  assert.deepEqual(parseFirmwareGlyphs(FW), committed);
});

test('pictograms decode the firmware atlas (9x9, one per UI_G id)', () => {
  const src = haveFw ? readFileSync(FW + '/firmware/src/app/ui_pictograms.h', 'utf8') : null;
  assert.equal(Object.keys(FIRMWARE_GLYPHS.pictograms).length, src ? src.match(/enum\s*\{([^}]*)\}/)[1].split(',').map(s => s.trim()).filter(s => s && s !== 'UI_G_COUNT').length : 37);
  assert.deepEqual(FIRMWARE_GLYPHS.pictograms.PLAY, ['..#......', '..##.....', '..###....', '..####...', '..#####..', '..####...', '..###....', '..##.....', '..#......']);
  for (const name of Object.keys(FIRMWARE_GLYPHS.pictograms)) {
    const svg = pictogramSvg(name), ink = FIRMWARE_GLYPHS.pictograms[name].join('').split('#').length - 1;
    const area = [...svg.matchAll(/width="(\d+)" height="1"/g)].reduce((a, m) => a + Number(m[1]), 0);
    assert.equal(area, ink, name + ' pixels');
  }
  assert.equal((playIconSvg().match(/<rect/g) ?? []).length, FIRMWARE_GLYPHS.transport.play.coverage16.flat().filter(Boolean).length);
});

test('glyph motion follows the firmware: play flash on the beat, hit flash window, colours', () => {
  const C = FIRMWARE_GLYPHS.colours;
  assert.equal(playColour(false, 0), C.DIM);
  assert.equal(playColour(true, 0), C.WHITE);            // metro_view 1
  assert.equal(playColour(true, 3.99 / 32), C.WHITE);    // metro_view 4
  assert.equal(playColour(true, 4 / 32), C.HI);          // metro_view 5
  assert.equal(firedWindowMs(125), 140); assert.equal(firedWindowMs(10), 145);
  assert.deepEqual(C.parts, ['#ff9628', '#ff4840', '#82f05a', '#46cdff', '#d678ff']);
  const v = cssVars(); assert.equal(v['--fw-line'], C.LINE); assert.equal(v['--fw-cell-aspect'], '12 / 9');
});

test('the Remote draws the firmware glyphs, not the old drawings', () => {
  const html = read('index.html'), app = read('app.mjs'), css = read('style.css');
  assert.equal((html.match(/class="fw-lane"/g) ?? []).length, 5, 'HOME lane bar per track');
  assert.doesNotMatch(html, /M3\.9 8\.85A4 4 0 1 1 6\.1 8\.85|rx="4\.2" ry="1\.3"/, 'old ring/ellipse track glyphs');
  for (const t of ['playIconSvg()', 'stopIconSvg()', 'recIconSvg()', "pictogramSvg('SOUND')", 'fwAnimate(state)', "classList.add('fired')", "classList.add('held')", "classList.add('ph')"]) assert.ok(app.includes(t), t);
  for (const t of ['.fw-drum-grid .seq-step.fired::after', '.fw-drum-grid .seq-step.ph:not(.hit)', '.fw-drum-grid .seq-row.accent-row .seq-step.accent::before', '.break-on.ph::before']) assert.ok(css.includes(t), t);
  const grid = renderFunkyBeatsDrums({kit: '909', notes: [{track: 'drum909', note: 36, start: 0, velocity: 100}], endSample: 16000, accents: Array(16).fill(false), length: 16, selected: 0});
  assert.match(grid, /fw-drum-grid/); assert.equal((grid.match(/data-col="0"/g) ?? []).length, 12);
  assert.match(grid, /seq-row[^"]*sel/); assert.doesNotMatch(grid, />100</, 'no velocity number in a hit cell');
  assert.match(presetSelect(0, 'CHICAGO', 0), /data-fw-glyph="LIST"/);
  for (const f of ['index.html', 'style.css', 'app.mjs', 'funkybeats-view.mjs', 'glyph-registry.mjs'])
    assert.doesNotMatch(read(f), /#ff9529|#ff4841/i, f + ' uses the firmware part colours');
});

test('firmware-labels.json equals the firmware host dump', {skip: !haveFw || !!process.env.DNBOX_SKIP_HOST_DUMP}, async () => {
  const {parseDump, dumpFirmware} = await import('../../scripts/sync-firmware-labels.mjs');
  const {firmwareSha, generator, ...committed} = JSON.parse(read('firmware-labels.json'));
  assert.deepEqual(parseDump(dumpFirmware(FW)), committed);
});

test('every Remote parameter shows the firmware name and value text', () => {
  // Mixer, FX and drum voice screens (components.json identities).
  const comp = JSON.parse(read('components.json'));
  let n = 0;
  for (const s of comp.screens) for (const c of s.controls) {
    const p = FIRMWARE_LABELS.params[c.identity]; assert.ok(p, c.identity);
    assert.equal(firmwareName(c.identity), p.name);
    for (let v = 0; v <= p.max; v++) assert.equal(firmwareValue(c.identity, v), p.values[v]);
    n++;
  }
  assert.equal(n, 124);
  // Bass and BREAK sound sources: rows carry the firmware name and value text.
  const sounds = new SourceSounds(JSON.parse(read('source-sounds.json')), JSON.parse(read('catalog.json')));
  let rows = 0;
  for (const c of sounds.entries()) {
    const bank = c.id.split('/')[1], fw = [c.kind, c.target, c.voice, c.parameter].join(':');
    const name = firmwareName(fw, bank);
    if (name === null) continue;
    assert.equal(c.label, name, c.id); if (c.raw >= 0 && c.raw <= c.max) assert.equal(c.display, firmwareValue(fw, c.raw, bank) ?? c.display, c.id); rows++;
  }
  assert.ok(rows >= 100, 'bass/BREAK rows named from the firmware: ' + rows);
  // Drum SEQUENCE options: the firmware page's value text for every value.
  for (const o of drumOptions()) for (const a of [0, 1]) {
    const key = o.kind + ':' + a + ':0:0', p = FIRMWARE_LABELS.params[key];
    if (!p) continue;
    for (let v = 0; v <= o.max; v++) assert.equal(formatOption(o, v, a), p.values[v], key + ' ' + v);
  }
  // Synth One: the firmware's pages, names and text.
  const s1 = firmwareSoundControls('SYNTH ONE', new Map(), 1);
  for (const pg of firmwarePages('PART', 3, {engine: 'SYNTH ONE'})) for (const r of pg.refs) {
    if (!r || [41, 42, 43].includes(Number(r.split(':')[0]))) continue;
    const p = FIRMWARE_LABELS.params[r]; assert.ok(s1.includes('<span>' + p.name.replace(/&/g, '&amp;') + '</span>'), p.name);
    assert.ok(s1.includes('>' + p.values[p.default] + '<'), p.name + ' default text');
  }
});
