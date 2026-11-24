#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-only
// Generates web/product-site/remote/firmware-labels.json: every parameter name and the exact value text
// the instrument's screen shows, produced by the firmware's own C code (describe_pages, pref_name,
// pref_value_of in firmware/src/app/ui.c) compiled with the firmware host build. Nothing is hand-typed.
//   node scripts/sync-firmware-labels.mjs <firmware-checkout> [--check]
// Built like the shipping Elite and Pro (tools/build.py: X0X_SYNTHONE_PATCH=1, the Synth One editor).
// Needs the checkout's host build inputs (tools/check_original_inputs.py passes) and a C compiler.
import {readFileSync, writeFileSync, mkdtempSync, rmSync, chmodSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'web/product-site/remote/firmware-labels.json');
const DUMP = join(ROOT, 'scripts/firmware-labels-dump.c');

export function dumpFirmware(fw) {
  const dir = mkdtempSync(join(tmpdir(), 'fw-labels-'));
  try {
    const cc = join(dir, 'cc.sh'), bin = join(dir, 'dump');
    writeFileSync(cc, '#!/bin/bash\nout=()\nfor a in "$@"; do if [ "$a" = host/x0x_host.c ]; then out+=("-I' + fw + '" "' + DUMP + '"); else out+=("$a"); fi; done\nexec "${REAL_CC:-cc}" "${out[@]}"\n');
    chmodSync(cc, 0o755);
    execFileSync('sh', ['host/build_host.sh'], {cwd: fw, env: {...process.env, CC: cc, X0X_HOST_OUT: bin, X0X_SYNTHONE_PATCH: '1'}, stdio: ['ignore', 'ignore', 'pipe']});
    return execFileSync(bin, [], {cwd: fw, encoding: 'utf8', maxBuffer: 1 << 28});
  } finally { rmSync(dir, {recursive: true, force: true}); }
}

export function parseDump(tsv) {
  const rows = tsv.split('\n').filter(l => l.startsWith('R\t')).map(l => l.split('\t'));
  // Engine names: the firmware's own SOUND / ENGINE value texts (R_BENGINE).
  const engineRow = rows.find(r => r[9] === 'ENGINE' && r[12].includes('CHICAGO'));
  if (!engineRow) throw Error('firmware dump has no ENGINE parameter');
  const engines = engineRow[12].split('\x1f').map(v => v.split('\x1e')[0]);
  // A parameter whose name, range or value text depends on the bass engine (engine knobs, presets,
  // pattern sounds) is keyed "kind:a:b:c@ENGINE"; every other one is "kind:a:b:c".
  const byBase = new Map(), placed = [];
  for (const r of rows) {
    const [, ctx, page, title, slot, kind, a, b, c, name, max, def, values] = r;
    const [view, part, sel, mix, , eng] = ctx.split('/');
    const engine = engines[Number(eng.replace('eng', ''))];
    const base = [kind, a, b, c].join(':');
    const text = values.split('\x1f').map(v => { const [n, u] = v.split('\x1e'); return u ? n + ' ' + u : n; });
    const entry = {name, max: Number(max), default: Number(def), values: text};
    const perEngine = byBase.get(base) ?? new Map(); byBase.set(base, perEngine);
    const seen = perEngine.get(engine);
    if (seen && JSON.stringify(seen) !== JSON.stringify(entry)) throw Error('firmware dump: ' + base + ' differs on one engine');
    perEngine.set(engine, entry);
    placed.push({pkey: [view, part, sel, mix].join('/') + '@' + engine, page: Number(page), title, slot: Number(slot), base, engine});
  }
  const params = {}, split = new Set();
  for (const [base, perEngine] of byBase) {
    const list = [...perEngine.values()].map(e => JSON.stringify(e));
    if (list.every(x => x === list[0])) params[base] = perEngine.values().next().value;
    else { split.add(base); for (const [engine, e] of perEngine) params[base + '@' + engine] = e; }
  }
  const pages = {};
  for (const {pkey, page, title, slot, base, engine} of placed) {
    const list = pages[pkey] ??= [];
    let pg = list.find(x => x.page === page);
    if (!pg) list.push(pg = {page, title, refs: []});
    const key = split.has(base) ? base + '@' + engine : base;
    if (pg.refs[slot] && pg.refs[slot] !== key) throw Error('firmware dump: page ' + pkey + ' slot differs');
    pg.refs[slot] = key;
  }
  for (const list of Object.values(pages)) for (const pg of list) pg.refs = Array.from(pg.refs, k => k ?? null);
  // A page set that is the same on every engine is keyed without the engine.
  const grouped = new Map();
  for (const [k, v] of Object.entries(pages)) { const [ctx, engine] = k.split('@'); (grouped.get(ctx) ?? grouped.set(ctx, new Map()).get(ctx)).set(engine, v); }
  const out = {};
  for (const [ctx, perEngine] of grouped) {
    const list = [...perEngine.values()].map(v => JSON.stringify(v));
    if (list.every(x => x === list[0])) out[ctx] = perEngine.values().next().value;
    else for (const [engine, v] of perEngine) out[ctx + '@' + engine] = v;
  }
  return {engines, params, pages: out};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const fw = resolve(process.argv[2] ?? process.env.DNBOX_FIRMWARE_DIR ?? '');
  if (!process.argv[2] && !process.env.DNBOX_FIRMWARE_DIR) { console.error('usage: sync-firmware-labels.mjs <firmware-checkout> [--check]'); process.exit(2); }
  const sha = execFileSync('git', ['-C', fw, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
  const data = {firmwareSha: sha, generator: 'scripts/sync-firmware-labels.mjs', ...parseDump(dumpFirmware(fw))};
  if (process.argv.includes('--check')) {
    const now = JSON.parse(readFileSync(OUT, 'utf8')); delete now.firmwareSha; delete data.firmwareSha;
    if (JSON.stringify(now) !== JSON.stringify(data)) { console.error('firmware-labels.json differs from ' + fw + ' ' + sha); process.exit(1); }
    console.log('firmware-labels.json matches ' + sha); process.exit(0);
  }
  writeFileSync(OUT, JSON.stringify(data) + '\n');
  console.log('wrote ' + OUT + ' from ' + sha + ': ' + Object.keys(data.params).length + ' parameters, ' + Object.keys(data.pages).length + ' page sets');
}
