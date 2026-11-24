// SPDX-License-Identifier: GPL-3.0-only
// The installer's own code (install/index.html) for the chosen starting breaks: what the confirm
// step says, and the step after the firmware that writes all, some or none of them. The slot
// commands are a fake keyboard; the image building and fill rules are the real module.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script, createContext} from 'node:vm';
import {imagesFor, fillChosen, STARTING_BREAK_IDS} from '../web/product-site/starting-break-install.mjs';
import {startingBreakName} from '../web/product-site/starting-break-names.mjs';

const html = readFileSync(new URL('../web/product-site/install/index.html', import.meta.url), 'utf8');
const site = new URL('../web/product-site/', import.meta.url);
const contract = JSON.parse(readFileSync(new URL('sample-contract.json', site), 'utf8'));
const zones = Object.fromEntries(contract.assets.map(a => [a.id, {frames: a.frames,
  adpcm: Uint8Array.from(readFileSync(new URL(`assets/starting-breaks/${a.id}.adpcm`, site)))}]));
const slice = (from, to) => { const a = html.indexOf(from), b = html.indexOf(to, a); assert.ok(a >= 0 && b > a, from); return html.slice(a, b); };
const enBlock = html.slice(html.indexOf('titlesamples: "Samples"'), html.indexOf('breaksunavailable: "The chosen') + 200);
const en = Object.fromEntries([...enBlock.matchAll(/\b(confirmbreaks|confirmbreaksif|confirmbreaksnone|breakswrite|breaksdone|breakskept|breaksnofit|breaksfailed|breaksnoanswer|breaksunavailable): "([^"]*)"/g)]
  .map(m => [m[1], m[2].replace(/\\n/g, '\n')]));

function runtime({blank = true, failWrite = false} = {}) {
  const flash = [0, 1, 2].map(() => new Uint8Array(0x14000).fill(0xff)), writes = [], said = [], logs = [];
  const layout = {count: 3, size: 80 * 1024, ext: true, slots: [0xC2000, 0xD6000, 0xEA000].map((off, k) =>
    ({nz: !blank && k === 0 ? 1 : 0, used: !blank && k === 0 ? 20 : 0, off, size: 0x14000}))};
  const link = {closed: 0, close() { this.closed++; }};
  const env = {
    globalThis: null, TEXT: {en: {}}, lang: 'en',
    t: k => { const v = {...en}[k]; assert.ok(v !== undefined, 'missing text ' + k); return v; },
    sayK: (k, a = '') => said.push([k, a]), log: l => logs.push(l), $: () => ({value: 0}),
    readSlotLayout: async () => layout,
    readSlotBytes: async (l, k, off, n) => flash[k].slice(off, off + n),
    writeSlotImage: async (l, k, img) => { if (failWrite) throw Error('slot 1: write at 0x200 failed (3)'); writes.push(k); flash[k].fill(0xff); flash[k].set(img); },
  };
  env.globalThis = env;
  env.dnboxStartingBreaks = {selectedIds: () => [], names: ids => ids.map(id => startingBreakName(id, id)), fill: fillChosen};
  const ctx = createContext(env);
  new Script(slice('const startingBreaks = () =>', 'async function run(') + slice('let confirmPending = false;', '\n}\n') + '\n}\n' + '\nglobalThis.writeStartingBreaks = writeStartingBreaks;').runInContext(ctx);
  const up = {verified:true, application:{product:'SMK-37 Pro_900'}, waitFor: async () => ({id:{text:'SMK-37 Pro_900'},link}), singlePort(){}, assertContinuous(){}};
  return {ctx, up, said, writes, link, flash, logs};
}
const names = ids => ids.map(id => startingBreakName(id, id)).join(', ');

test('all chosen: both slots written after the firmware, and the names reported', async () => {
  const r = runtime();
  await r.ctx.writeStartingBreaks(r.up, imagesFor(STARTING_BREAK_IDS, zones), [...STARTING_BREAK_IDS]);
  assert.deepEqual(r.writes, [0, 1]);
  assert.deepEqual(r.said.at(-1), ['breaksdone', names(STARTING_BREAK_IDS)]);
  assert.match(r.said.at(-1)[1], /Hot Pants.*Tasty/);
  assert.equal(r.link.closed, 1);
});

test('some chosen: only those are written', async () => {
  const ids = ['personal-br2-zone2'], r = runtime();
  await r.ctx.writeStartingBreaks(r.up, imagesFor(ids, zones), ids);
  assert.deepEqual(r.writes, [1]);
  assert.ok(r.flash[0].every(b => b === 0xff));
  assert.deepEqual(r.said.at(-1), ['breaksdone', 'Tasty']);
});

test('none chosen: the installer never starts the step', () => {
  assert.match(html, /if \(opts\.breakImages\?\.size\) \{\s+if \(r\.freshBreaks && up\.verified\) await writeStartingBreaks/);
  assert.match(html, /let breakImages = new Map\(\);\n  if \(breakIds\.length\) \{/);
  assert.match(html, /run\(img, selectedProduct, \{ foreign: false, factoryData, breakImages, breakIds,/);
});

test('a keyboard that already has samples keeps them', async () => {
  const r = runtime({blank: false});
  await r.ctx.writeStartingBreaks(r.up, imagesFor(STARTING_BREAK_IDS, zones), [...STARTING_BREAK_IDS]);
  assert.deepEqual(r.writes, []);
  assert.deepEqual(r.said.at(-1), ['breakskept', '']);
});

test('a failed write is reported after the firmware, not thrown', async () => {
  const r = runtime({failWrite: true});
  await r.ctx.writeStartingBreaks(r.up, imagesFor(['personal-br1-zone1'], zones), ['personal-br1-zone1']);
  assert.equal(r.said.at(-1)[0], 'breaksfailed');
  assert.equal(r.link.closed, 1);
});

test('the confirm step names the chosen breaks, or none', () => {
  const r = runtime();
  const dom = {};
  const el = id => (dom[id] ??= {hidden: true, textContent: '', scrollIntoView() {}, onclick: null});
  r.ctx.$ = el; r.ctx.lastId = null;
  for (const [ids, want] of [[[...STARTING_BREAK_IDS], /Starting breaks: BR1 1, BR1 2, Hot Pants, BR2 1, Tasty \(added if your keyboard has no samples yet\)/],
    [[], /Starting breaks: none/]]) {
    r.ctx.t = k => en[k] ?? k;
    r.ctx.confirmWrite('SMK37PRO_1', false, ids);
    assert.match(dom.inconfirmtext.textContent, want);
    dom.inconfirmok.onclick();
  }
});

// Dot's published factory-data fix (gh-pages 83781eb0) kept alongside the breaks.
test('a factory-data build keeps the strict snapshot warning, the break list and the single pending confirm', async () => {
  const r = runtime();
  const dom = {};
  const el = id => (dom[id] ??= {hidden: true, textContent: '', scrollIntoView() {}, onclick: null});
  r.ctx.$ = el; r.ctx.lastId = null; r.ctx.t = k => en[k] ?? k;
  const answer = r.ctx.confirmWrite('SMK37PRO_1', true, ['personal-br1-zone3']);
  assert.match(dom.inconfirmtext.textContent, /Starting breaks: Hot Pants[\s\S]*atomic sample snapshot/);
  assert.equal(await r.ctx.confirmWrite('SMK37PRO_1', true, []), false, 'a second confirm while one is open is refused');
  dom.inconfirmok.onclick();
  assert.equal(await answer, true);
  const click = slice('$("go").addEventListener("click"', '$("stockgo").addEventListener');
  assert.match(click, /const factoryData = !!slotPackageFiles\(image\)\?\.\["fdata\.bin"\];/);
  assert.match(click, /confirmWrite\(selectedProduct, factoryData, breakIds\)/);
  assert.match(html, /saveStrict: saveVerifiedSlotBackup, factoryData: opts\.factoryData === true,/);
  assert.match(html, /<section id="strict-backup-panel"/);
});

test('the breaks are fetched and checked before the firmware is written, and the choice cannot change meanwhile', () => {
  const click = slice('$("go").addEventListener("click"', '$("stockgo").addEventListener');
  assert.ok(click.indexOf('startingBreaks().load(breakIds)') < click.indexOf('run(img, selectedProduct'));
  assert.match(click, /const sameBreaks = \(\) => chosenStartingBreaks\(\)\.join\(\) === breakIds\.join\(\)/);
  assert.match(click, /if \(!\$\("devagree"\)\.checked \|\| !sameBreaks\(\)\)/);
  assert.match(click, /installBlocked\(t\("breaksunavailable"\)\)/);
});

test('unverified firmware, changed selection, wrong identity and wrong factory map never fill', async () => {
  const ids=['personal-br1-zone1'], images=imagesFor(ids,zones);
  for (const mode of ['unverified','changed','identity','wrong-map']) {
    const r=runtime(), original=r.up.waitFor;
    if (mode==='unverified') r.up.verified=false;
    if (mode==='identity') r.up.waitFor=async()=>({...await original(),id:{text:'SMK-37 Pro_901'}});
    if (mode==='wrong-map') r.ctx.flashMap=()=>[{off:7,size:4096}];
    await r.ctx.writeStartingBreaks(r.up,images,ids,()=>mode!=='changed',mode==='wrong-map'?[{off:9,size:4096}]:null);
    assert.deepEqual(r.writes,[],mode);
  }
});
