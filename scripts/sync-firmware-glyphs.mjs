#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-only
// Generates web/product-site/remote/firmware-glyphs.json from a DnBOX firmware checkout:
// the glyphs and colours the Remote draws exactly as the instrument's display does.
//   node scripts/sync-firmware-glyphs.mjs <firmware-checkout> [--check]
// Sources (firmware/src): app/ui_pictograms.h (9x9 atlas), gfx.c (palettes), ui_theme.h (materials),
// app/project.c (default palette), app/ui.c (part colours, play icon, header transport, draw_drum,
// BREAK footer in app/ui_break_layout_main.h, HOME pattern glyph in app/home_pattern_glyph.h,
// pad lights drum_step_lights).
import {readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'web/product-site/remote/firmware-glyphs.json');
const one = (re, src, what) => { const m = src.match(re); if (!m) throw Error('firmware source changed: ' + what); return m; };
const has = (src, text, what) => { if (!src.includes(text)) throw Error('firmware source changed: ' + what + ' (' + text + ')'); return true; };
const nums = s => s.split(',').map(x => x.trim()).filter(Boolean).map(Number);
const rgb = s => [...s.matchAll(/RGB\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g)].map(m => [+m[1], +m[2], +m[3]]);
const hex = ([r, g, b]) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');

export function parseFirmwareGlyphs(fw) {
  const read = p => readFileSync(join(fw, 'firmware/src', p), 'utf8');
  const pict = read('app/ui_pictograms.h'), gfx = read('gfx.c'), theme = read('ui_theme.h'), project = read('app/project.c');
  const ui = read('app/ui.c'), brk = read('app/ui_break_layout_main.h'), home = read('app/home_pattern_glyph.h');

  // 9x9 pictograms: row = LOW[i] | (HIGH[i>>3]>>(i&7)&1)<<8, bit (8-col) is column col.
  const names = one(/enum\s*\{\s*(UI_G_NONE[^}]*)\}/, pict, 'UI_G enum')[1].split(',').map(s => s.trim()).filter(Boolean);
  if (names.at(-1) !== 'UI_G_COUNT') throw Error('firmware source changed: UI_G_COUNT');
  const low = nums(one(/UI_PICTOGRAM_LOW\[\]\s*=\s*\{([^}]*)\}/, pict, 'LOW')[1]), high = nums(one(/UI_PICTOGRAM_HIGH\[\]\s*=\s*\{([^}]*)\}/, pict, 'HIGH')[1]);
  has(pict, 'UI_PICTOGRAM_LOW[i] | ((unsigned)((UI_PICTOGRAM_HIGH[i>>3]>>(i&7))&1u)<<8)', 'pictogram row packing');
  has(ui, 'if (!(bits & (1u<<(8-col)))) { col++; continue; }', 'pictogram column order');
  const pictograms = {};
  names.slice(0, -1).forEach((name, g) => {
    pictograms[name.replace(/^UI_G_/, '')] = Array.from({length: 9}, (_, row) => {
      const i = g * 9 + row, bits = low[i] | (((high[i >> 3] >> (i & 7)) & 1) << 8);
      return Array.from({length: 9}, (_, col) => (bits >> (8 - col)) & 1 ? '#' : '.').join('');
    });
  });

  // Colours: the default palette (project.c), its five steps, the night materials and the part colours.
  const paletteIndex = +one(/s->palette\s*=\s*(\d+);/, project, 'default palette')[1];
  const neutrals = rgb(one(/#define NEUTRALS ([^\n]*)/, gfx, 'NEUTRALS')[1]);
  const rows = [...one(/PALETTES\[\]\s*=\s*\{([\s\S]*?)\n\};/, gfx, 'PALETTES')[1].matchAll(/\{"(\w+)",\s*\{([^}]*)\}\}/g)];
  const pal = rows[paletteIndex][2].includes('NEUTRALS') ? [...neutrals, ...rgb(rows[paletteIndex][2])] : rgb(rows[paletteIndex][2]);
  const steps = ['LINE', 'DIM', 'GRAY', 'AMB', 'HI'];
  steps.forEach((s, i) => has(gfx, '#define C_' + s + ' pal[' + i + ']', 'C_' + s));
  const material = rgb(one(/ui_material\[2\]\[16\]\s*=\s*\{\s*\{([^}]*)\}/, theme, 'ui_material')[1]);
  const matNames = [...theme.matchAll(/#define UI_N_(\w+) ui_material\[ui_theme_light\]\[(\d+)\]/g)];
  const parts = rgb(one(/PART_COLOURS\[2\]\[NPARTS\]\s*=\s*\{\s*\{([^}]*)\}/, ui, 'PART_COLOURS')[1]);
  const colours = {palette: rows[paletteIndex][1], ...Object.fromEntries(steps.map((s, i) => [s, hex(pal[i])])), BLACK: '#000000', WHITE: '#ffffff',
    night: Object.fromEntries(matNames.map(m => [m[1], hex(material[+m[2]])])), parts: parts.map(hex),
    rec: hex(rgb(one(/if\(ui\.rec\) dot\([^;]*RGB\((\d+,\d+,\d+)\)\);/, ui, 'REC dot')[0])[0])};

  // Header transport (part views): play triangle blinks on the metronome, stopped = 5x5 square, REC = red dot r3.
  const play = one(/static void play_icon\(int32_t x, int32_t y, uint16_t c\)\s*\{([\s\S]*?)\n\}/, ui, 'play_icon')[1];
  const pm = one(/for \(j = 0; j < (\d+); j\+\+\)[\s\S]*?for \(i = 0; i < (\d+); i\+\+\)[\s\S]*?\(float\)j \+ 0\.5f - ([\d.]+)f[\s\S]*?edge = ([\d.]+)f - fx - fm_fabsf\(fy\) \* ([\d.]+)f;[\s\S]*?edge \* ([\d.]+)f \+ 0\.5f/, play, 'play_icon raster');
  const [H, W, cy, e0, slope, gain] = pm.slice(1).map(Number);
  const playCoverage = Array.from({length: H}, (_, j) => Array.from({length: W}, (_, i) => {
    const fy = j + 0.5 - cy, fx = i + 0.5, edge = e0 - fx - Math.abs(fy) * slope;
    const a = Math.min(1, Math.max(0, edge * gain + 0.5)) * Math.min(1, Math.max(0, fx + 0.5));
    return Math.floor(a * 16 + 0.5);
  }));
  has(ui, 'else if(seq.playing) play_icon(168,4,!seq.metro_view?C_DIM:seq.metro_view<=4u?C_WHITE:C_HI);', 'play blink');
  has(ui, 'else cv_rect(170,7,5,5,SOUND_GRAY);', 'stopped square');
  has(ui, 'if(ui.rec) dot(pickup?190:206,9,3,RGB(255,50,50));', 'REC dot');
  // metro_view = 1 + quarter-note phase * 32 / period (sequencer.c metro_advance).
  has(readFileSync(join(fw, 'firmware/src/seq/sequencer.c'), 'utf8'), 's->metro_view = (uint8_t)(1u + phase * 32u / period);', 'metro_view');
  const transport = {play: {w: W, h: H, coverage16: playCoverage, idle: 'DIM', beat: 'WHITE', beatWhileMetroAtMost: 4, metroSteps: 32, run: 'HI'},
    stopped: {w: 5, h: 5, colour: 'night.GRAY'}, rec: {radius: 3, colour: 'rec'}};

  // Drum step grid (draw_drum).
  const dd = one(/static UI_DRAW void draw_drum\(int band\)\s*\{([\s\S]*?)\n\}\n/, ui, 'draw_drum')[1];
  const drow = +one(/#define DROW (\d+)/, ui, 'DROW')[1];
  const colx = one(/static int32_t col_x\(int c\) \{ return GX \+ c \* (\d+) \+ \(c >> (\d+)\); \}/, ui, 'col_x');
  const gx = +one(/#define GX (\d+)/, ui, 'GX')[1];
  for (const t of ['uint16_t col = part_col(), on_dim = dim(col, 8);', 'cv_rect(x + 5, y + 3, 2, 2, C_LINE);', 'box(x + 2, y + 1, 8, 6, C_WHITE);',
    'rbox(x + 2, y + 3, 8, 2, 1, C_LINE);', 'box(x, y, 12, DROW - 2, hit ? (muted ? C_DIM : sel ? col : on_dim) : (s == ph ? C_DIM : C_LINE));',
    'box(x + 2, y + 2, 8, DROW - 6, C_WHITE);', 'cv_rect(x + 8, y + 1, 3, 3, C_BLACK);', '(uint32_t)(15000.0f / (seq.bpm >= 20.0f ? seq.bpm : 120.0f)) + 20u',
    'surface_panel(0,y-1,24,DROW,1,col,col,dim(col,5));', 'sel ? C_BLACK : muted ? C_LINE : v < NDRUM ? C_GRAY : C_WHITE'])
    has(dd, t, 'draw_drum');
  has(ui, 'static int32_t rad_of(int32_t h) { return h >= 30 ? 6 : h >= 18 ? 4 : h >= 9 ? 3 : 2; }', 'rad_of');
  has(ui, 'static uint16_t dim(uint16_t c, int t) { return blend(C_BLACK, c, t); }', 'dim');
  const radOf = h => h >= 30 ? 6 : h >= 18 ? 4 : h >= 9 ? 3 : 2;
  const cellH = drow - 2;
  const drumGrid = {rowPitch: drow, columnX: {left: gx, pitch: +colx[1], beatGapShift: +colx[2]},
    cell: {w: 12, h: cellH, r: radOf(Math.min(12, cellH)), empty: 'LINE', playhead: 'DIM', hit: 'part/8', hitSelected: 'part', hitMuted: 'DIM'},
    fired: {x: 2, y: 2, w: 8, h: drow - 6, r: radOf(Math.min(8, drow - 6)), colour: 'WHITE', windowMs: '15000/bpm+20'},
    accentOn: {x: 2, y: 1, w: 8, h: 6, r: radOf(6), colour: 'WHITE'}, accentOff: {x: 2, y: 3, w: 8, h: 2, r: 1, colour: 'LINE'},
    beyondLength: {x: 5, y: 3, w: 2, h: 2, colour: 'LINE'}, lockNotch: {x: 8, y: 1, w: 3, h: 3, colour: 'BLACK'},
    label: {selectedPanel: 'part', selectedInk: 'BLACK', ink: 'GRAY', accentInk: 'WHITE', mutedInk: 'LINE'}, dimOf16: 'blend(BLACK, colour, t/16)'};

  // Pad lights: a step is lit when on, inverted at the playhead; held keys light (k |= ui.keys).
  has(ui, 'if (seq.playing && s == ph) on = !on;', 'pad playhead inversion');
  has(ui, 'k |= ui.keys;', 'held pad light');
  const padLights = {stepOn: 'lit', playhead: 'invert', held: 'lit'};

  // BREAK footer (ui_break_layout_main.h break_layout_footer).
  for (const t of ['cv_rect(x,234-KNOB_Y,11,4,i==ph?C_WHITE:on?part_col():C_LINE);', 'bp->slice[i]?(on?C_HI:C_DIM):C_DIM', 'if((locks>>i)&1u)cv_rect(x+4,238-KNOB_Y,3,2,C_AMB);'])
    has(brk, t, 'BREAK footer');
  const breakSteps = {bar: {w: 11, h: 4, playhead: 'WHITE', on: 'part', off: 'LINE'}, slice: {onWithSlice: 'HI', other: 'DIM'}, lock: {w: 3, h: 2, colour: 'AMB'}};

  // HOME pattern glyph (track identity): 8 bins over the part length, 1x3 px, brightness 4+(v*12+63)/127 of 16.
  for (const t of ['t = 4u + ((unsigned)velocity * 12u + 63u) / 127u;', 'return (uint8_t)(current ? t : (t * 9u + 8u) / 16u);', 'unsigned bin = step * 8u / length;'])
    has(home, t, 'HOME pattern glyph');
  has(ui, 'cv_rect(x+i,y,1,3,dim(c,home_glyph_brightness(strength[i],current)));', 'pat_glyph_row');
  has(ui, 'frame(x,6,10,7,ink);', 'header pattern badge frame');
  const patternGlyph = {bins: 8, bar: {w: 1, h: 3}, frame: {w: 10, h: 7}, brightness: '4+(v*12+63)/127, not current: (t*9+8)/16'};
  // HOME lane identity: a 2x11 bar in the part colour (muted: DIM).
  has(ui, 'cv_rect(4,y+3,2,11,accent);', 'HOME lane bar');
  const laneBar = {w: 2, h: 11, colour: 'part', muted: 'DIM'};

  return {pictograms, colours, transport, drumGrid, padLights, breakSteps, patternGlyph, laneBar};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const fw = process.argv[2] ?? process.env.DNBOX_FIRMWARE_DIR;
  if (!fw) { console.error('usage: sync-firmware-glyphs.mjs <firmware-checkout> [--check]'); process.exit(2); }
  const sha = execFileSync('git', ['-C', fw, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
  const data = {firmwareSha: sha, ...parseFirmwareGlyphs(fw)};
  if (process.argv.includes('--check')) {
    const now = JSON.parse(readFileSync(OUT, 'utf8')); delete now.firmwareSha; delete data.firmwareSha;
    if (JSON.stringify(now) !== JSON.stringify(data)) { console.error('firmware-glyphs.json differs from ' + fw + ' ' + sha); process.exit(1); }
    console.log('firmware-glyphs.json matches ' + sha); process.exit(0);
  }
  writeFileSync(OUT, JSON.stringify(data, null, 1) + '\n');
  console.log('wrote ' + OUT + ' from ' + sha);
}
