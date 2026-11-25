#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-only
// Generates web/product-site/remote/firmware-engines.json from a DnBOX firmware checkout,
// so the Remote's part order, bass engines, their controls and their presets come from the
// firmware source instead of a hand-written list.
//   node scripts/sync-firmware-engines.mjs <firmware-checkout> [--check]
// Reads: firmware/src/app/ui.c (PART_N, PART_ORDER, BENGINE_N), firmware/src/app/original_sound.{h,c}
// and seq/sequencer.c (default tempo), original_sound.{h,c}
// (engine kinds, control tables, SuperJ6/Synth One names, Chicago visible order), engine.c (default
// bass banks), experiments/original_synth/{chicago,miami}_program.c (preset names, via a host build),
// assets/factory_banks/synthone (Synth One pack programs, MANIFEST order).
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync} from 'node:fs';
import {join, resolve, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'web/product-site/remote/firmware-engines.json');

export function parseFirmware(fw) {
  const read = p => readFileSync(join(fw, p), 'utf8');
  const ui = read('firmware/src/app/ui.c'), osh = read('firmware/src/app/original_sound.h');
  const osc = read('firmware/src/app/original_sound.c'), eng = read('firmware/src/app/engine.c');
  const engH = read('firmware/src/app/engine.h'), seqC = read('firmware/src/seq/sequencer.c');
  const strings = s => [...s.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(m => m[1]);
  const one = (re, src, what) => { const m = src.match(re); if (!m) throw Error('firmware source changed: ' + what); return m; };
  const partIds = one(/enum\s*\{\s*(PART_909[^}]*)\}/, engH, 'PART enum')[1].split(',').map(s => s.trim()).filter(s => s && s !== 'NPARTS');
  const partNames = strings(one(/PART_N\[NPARTS\]\s*=\s*\{([^}]*)\}/, ui, 'PART_N')[1]);
  const order = one(/PART_ORDER\[NPARTS\]\s*=\s*\{([^}]*)\}/, ui, 'PART_ORDER')[1].split(',').map(s => s.trim());
  const bengine = strings(one(/BENGINE_N\[\]\s*=\s*\{([^}]*)\}/, ui, 'BENGINE_N')[1]);
  const def = (name) => Number(one(new RegExp('#define\\s+' + name + '\\s+(\\d+)u?'), osh, name)[1]);
  const kinds = {CHICAGO: def('ORIGINAL_SOUND_CHICAGO'), MIAMI: def('ORIGINAL_SOUND_MIAMI'), 'SYNTH ONE': def('ORIGINAL_SOUND_SYNTHONE'), SUPERJ6: def('ORIGINAL_SOUND_JUNO')};
  const table = name => {
    const body = one(new RegExp('original_sound_' + name + '_params\\[[^\\]]*\\]\\s*=\\s*\\{([\\s\\S]*?)\\n\\};'), osc, name + ' params')[1];
    return [...body.matchAll(/\{"([^"]+)",\s*([A-Z_0-9]+(?:\s*-\s*1u)?|\d+)\s*,\s*(\d+)\s*,\s*([a-z_0-9]+)\}/g)].map((m, index) => ({
      index, name: m[1], max: /^\d+$/.test(m[2]) ? Number(m[2]) : m[2].includes('FX_CHOICES') ? def('ORIGINAL_CHICAGO_FX_CHOICES') - 1 : NaN,
      default: Number(m[3]), names: m[4] === '0' ? null : m[4]}));
  };
  const fxNames = strings(one(/original_sound_fx_names\[[^\]]*\]\s*=\s*\{([^}]*)\}/, osc, 'fx names')[1]);
  const params = {CHICAGO: table('chicago'), MIAMI: table('miami'), 'SYNTH ONE': table('synthone'), SUPERJ6: table('juno')};
  for (const list of Object.values(params)) for (const p of list) { if (p.names) p.names = fxNames; if (!Number.isInteger(p.max)) throw Error('param max ' + p.name); }
  const junoNames = strings(one(/original_sound_juno_names\[\d+\]\s*=\s*\{([^}]*)\}/, osc, 'juno names')[1]);
  const visible = one(/original_sound_chicago_factories\[[^\]]*\]\s*=\s*\{([^}]*)\}/, osc, 'chicago order')[1].split(',').map(s => Number(s.trim()));
  const defaultBank = one(/int bank = v == 0 \? ORIGINAL_SOUND_(\w+) : ORIGINAL_SOUND_(\w+);/, eng, 'default bass banks');
  const raw = hostPresetNames(fw);
  const s1 = synthOnePrograms(fw);
  const byKind = Object.fromEntries(Object.entries(kinds).map(([k, v]) => [v, k]));
  const engines = bengine.map(name => {
    const presets = name === 'CHICAGO' ? visible.map(i => raw.C[i]) : name === 'MIAMI' ? raw.M :
      name === 'SUPERJ6' ? junoNames : ['INIT', ...s1];
    return {name, kind: kinds[name], params: params[name], presets};
  });
  const rEnum = one(/enum\s*\{\s*(R_NONE[^}]*)\}/, ui, 'R_* enum')[1].split(',').map(t => t.trim()).filter(Boolean);
  const prefKinds = Object.fromEntries(['R_ENG', 'R_TEMPO', 'R_BENGINE', 'R_BPRESET', 'R_BRKSLOT', 'R_BRKRATE', 'R_BRKSLICE']
    .map(k => { const i = rEnum.indexOf(k); if (i < 0) throw Error('missing ' + k); return [k, i]; }));
  // Pattern / track options: the firmware's SEQUENCE page (V_SEQ) per part kind, plus HOME's swing
  // and the accent level, with ranges, defaults and value names from SEQ_P.
  const patH = read('firmware/src/seq/pattern.h');
  const hdef = name => Number(one(new RegExp('#define\\s+' + name + '\\s+(\\d+)'), patH, name)[1]);
  const enumCount = (first, last) => one(new RegExp('enum\\s*\\{\\s*(' + first + '[^}]*)\\}'), patH, first)[1].split(',').map(t => t.trim()).filter(Boolean).indexOf(last);
  const consts = {NSTEPS: hdef('NSTEPS'), NRATES: enumCount('RATE_16', 'NRATES')};
  const sqIds = one(/enum\s*\{\s*(SQ_SWING[^}]*)\}/, ui, 'SQ enum')[1].split(',').map(t => t.trim()).filter(t => t && t !== 'NSQ');
  const sqBody = one(/SEQ_P\[NSQ\]\s*=\s*\{([\s\S]*?)\n\};/, ui, 'SEQ_P')[1];
  const nameList = n => strings(one(new RegExp('\\b' + n + '\\[\\]\\s*=\\s*\\{([^}]*)\\}'), ui, n)[1]);
  const sq = [...sqBody.matchAll(/\{"([^"]+)",\s*([A-Z_]+\s*-\s*1|\d+)\s*,\s*(\d+)\s*,\s*(\w+)\}/g)].map((m, i) => {
    const max = /^\d+$/.test(m[2]) ? Number(m[2]) : consts[m[2].split('-')[0].trim()] - 1;
    if (!Number.isInteger(max)) throw Error('SEQ_P max ' + m[1]);
    return [sqIds[i], {label: m[1], max, default: Number(m[3]), names: m[4] === '0' ? null : nameList(m[4])}];
  });
  const sqp = Object.fromEntries(sq);
  const vseq = one(/case V_SEQ:([\s\S]*?)case V_PART:/, ui, 'V_SEQ page')[1];
  const refsOf = src => [...src.matchAll(/PR\((R_[A-Z0-9_]+),/g)].map(m => m[1]);
  const drumRefs = refsOf(one(/if \(part_is_drum\(p\)\)([\s\S]*?)else if \(part_is_303/, vseq, 'drum SEQUENCE')[1]);
  const bassRefs = refsOf(one(/refs\[4\] = \{(PR\(R_BLEN[^}]*)\}/, vseq, 'bass SEQUENCE')[1]);
  const homeRefs = refsOf(one(/case V_HOME:([\s\S]*?)break;/, ui, 'HOME page')[1]);
  const kindToSq = {R_SWING: 'SQ_SWING', R_DLEN: 'SQ_DLEN', R_DRATE: 'SQ_DRATE', R_BLEN: 'SQ_BLEN', R_BRATE: 'SQ_BRATE', R_BDIR: 'SQ_BDIR', R_BTRANS: 'SQ_BTRANS', R_ACCENT: 'SQ_ACCENT'};
  // How the firmware shows a stored value (pref_get offsets and put_* formats), checked against the source.
  const shown = k => {
    if (k === 'R_DLEN' || k === 'R_BLEN') { one(new RegExp('case ' + k + ': return p->\\w+\\[r\\.a\\]\\.len - 1;'), ui, k + ' offset'); return {format: 'plus1'}; }
    if (k === 'R_SWING') { one(/case R_SWING: put_i\(num, 50 \+ v \/ 4\); put_s\(unit, "%"\)/, ui, 'swing format'); return {format: 'swing'}; }
    if (k === 'R_ACCENT') { one(/case R_ACCENT: put_i\(num,\(v\*100\+63\)\/127\);put_s\(unit,"%"\)/, ui, 'accent format'); return {format: 'percent127'}; }
    if (k === 'R_BTRANS') return {format: 'transpose'};
    return {format: 'names'};
  };
  const option = (k, scope) => {
    const i = rEnum.indexOf(k), p = sqp[kindToSq[k]]; if (i < 0 || !p) throw Error('missing option ' + k);
    return {pref: k, kind: i, scope, ...p, ...shown(k)};
  };
  const sequenceOptions = {
    steps: consts.NSTEPS,
    drum: [...drumRefs.map(k => option(k, 'part')), ...homeRefs.filter(k => k === 'R_SWING').map(k => option(k, 'pattern')), option('R_ACCENT', 'global')],
    bass: bassRefs.map(k => option(k, 'part')),
    address: 'PARAM_SET kind=R_*, a = part (0 909, 1 808) or bass voice (0/1), b = pattern+1 (0 = playing pattern), c = 0; R_SWING is the pattern swing of all parts; R_ACCENT is the global accent level'
  };
  const label = p => partNames[partIds.indexOf(p)];
  return {
    schema: 'dnbox-firmware-engines/1',
    generator: 'scripts/sync-firmware-engines.mjs',
    parts: partIds.map((id, index) => ({id, index, label: partNames[index]})),
    partOrder: order.map(id => ({id, index: partIds.indexOf(id), label: label(id)})),
    defaultBassBank: [byKind[kinds[defaultBank[1] === 'JUNO' ? 'SUPERJ6' : defaultBank[1]]] ?? defaultBank[1], byKind[kinds[defaultBank[2] === 'JUNO' ? 'SUPERJ6' : defaultBank[2]]] ?? defaultBank[2]],
    defaultTempo: Number(one(/s->bpm = (\d+(?:\.\d+)?)f;/, seqC, 'default bpm')[1]),
    tempoRange: [Number(one(/bpm < (\d+)\.0f\)/, seqC, 'min bpm')[1]), Number(one(/bpm > (\d+)\.0f\)/, seqC, 'max bpm')[1])],
    bassEngines: engines,
    sequenceOptions,
    prefKinds,
    prefAddress: {bassEngine: 'R_BENGINE a0 b=voice', bassPreset: 'R_BPRESET a0 b=voice (max 255)', breakSlot: 'R_BRKSLOT a=0 A/1 B, b=pattern+1', breakRate: 'R_BRKRATE b=pattern+1, 0 1/16, 1 1/8, 2 1/4'},
    paramAddress: 'R_ENG kind 1, a = T_303 (2), b = bass voice 0/1 (part 2/3), c = param index (engine.h)'
  };
}

function hostPresetNames(fw) {
  const dir = mkdtempSync(join(tmpdir(), 'fw-names-'));
  try {
    const src = join(dir, 'dump.c'), bin = join(dir, 'dump');
    writeFileSync(src, '#include <stdio.h>\n#include "experiments/original_synth/chicago_program.h"\n#include "experiments/original_synth/miami_program.h"\nint main(void){for(unsigned i=0;i<81;i++)printf("C\\t%s\\n",original_chicago_program_name(i));for(unsigned i=0;i<30;i++)printf("M\\t%s\\n",original_miami_program_name(i));return 0;}\n');
    execFileSync('cc', ['-I' + fw, '-I' + join(fw, 'firmware/src'), '-o', bin, src, join(fw, 'experiments/original_synth/chicago_program.c'), join(fw, 'experiments/original_synth/miami_program.c'), '-lm'], {stdio: ['ignore', 'ignore', 'inherit']});
    const out = {C: [], M: []};
    for (const line of execFileSync(bin, {encoding: 'utf8'}).trim().split('\n')) { const [k, n] = line.split('\t'); out[k].push(n); }
    return out;
  } finally { rmSync(dir, {recursive: true, force: true}); }
}

function synthOnePrograms(fw) {
  const base = join(fw, 'assets/factory_banks/synthone');
  if (!existsSync(join(base, 'MANIFEST.json'))) return [];
  const manifest = JSON.parse(readFileSync(join(base, 'MANIFEST.json'), 'utf8'));
  const names = [];
  for (const f of manifest.files) {
    const bank = JSON.parse(readFileSync(join(base, f.name), 'utf8'));
    const list = Array.isArray(bank) ? bank : bank.presets ?? bank.data ?? [];
    for (const p of list) names.push(String(p.name ?? p.presetName ?? ''));
  }
  return names;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const fw = process.argv[2] ?? process.env.DNBOX_FIRMWARE_DIR;
  if (!fw) { console.error('usage: sync-firmware-engines.mjs <firmware-checkout> [--check]'); process.exit(2); }
  const sha = execFileSync('git', ['-C', fw, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
  const data = {firmwareSha: sha, ...parseFirmware(fw)};
  const text = JSON.stringify(data, null, 1) + '\n';
  if (process.argv.includes('--check')) {
    const now = JSON.parse(readFileSync(OUT, 'utf8')); delete now.firmwareSha; delete data.firmwareSha;
    if (JSON.stringify(now) !== JSON.stringify(data)) { console.error('firmware-engines.json differs from ' + fw + ' ' + sha); process.exit(1); }
    console.log('firmware-engines.json matches ' + sha); process.exit(0);
  }
  writeFileSync(OUT, text);
  console.log('wrote ' + OUT + ' from ' + sha);
}
