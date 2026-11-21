// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {runInNewContext} from 'node:vm';
import {pack7, Updater} from '../web/fm1ota.js';
import {countInstallReports, installBuild, installReportUrl, InstallRestartCheck,
  loadInstallReports, portVersionMatches} from '../web/product-site/install-reports.mjs';

const product = 'SMK-37 Elite_900';
const name = 'DnBOX 0.0.26 SMK-37 Elite';
const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = source('web/product-site/install/index.html');
const catalog = JSON.parse(html.match(/^const catalog = (.+);$/m)[1]);
const row = catalog.versions.find(v => v.version === catalog.latest);
const build = installBuild(row, row.models.elite, 'elite');
function fixture() {
  const access = Object.assign(new EventTarget(), {inputs: new Map(), outputs: new Map()});
  let queries = 0;
  function pair(inId = 'i1', outId = 'o1', portName = name, identity = product) {
    const input = {type: 'input', id: inId, name: portName, state: 'connected', async open() {}};
    const output = {type: 'output', id: outId, name: portName, state: 'connected', async open() {}, send(bytes) {
      assert.deepEqual([...bytes], [0xf0, 0, 0x32, 0x45, 0, 0, 0, 0x40, 0x7f, 0xf7], 'identity queries only');
      queries++;
      const payload = [...Buffer.from(identity.padEnd(27, '\0'))];
      const sum = ~payload.reduce((a, b) => a + b, 0) & 255;
      input.onmidimessage({data: [0xf0, ...pack7([0, 0x59, 0x11, 27, 0, 0, ...payload, sum]), 0xf7]});
    }};
    access.inputs.set(inId, input);
    access.outputs.set(outId, output);
    return {input, output};
  }
  function state(port, value) {
    port.state = value;
    access.dispatchEvent(Object.assign(new Event('statechange'), {port}));
  }
  return {access, pair, state, queries: () => queries};
}

function scanPage(f, check) {
  // Use the actual product scan handler. Its updater opens the selected pair and parses the real identity frame.
  const body = html.match(/async function scanWorkspaceDevice\([^]*?\n\}/)[0];
  const midiAccess = Object.assign(async () => f.access, {restartCheck: check});
  return runInNewContext('let scanSerial=0, writing=false, lastId=null;\n' + body + '\nscanWorkspaceDevice()', {
    midiAccess, Updater, $: () => ({}), t: key => key, led() {}, setConnected() {}, suggestModel() {},
  });
}

test('actual finishApplication and a fresh post-unplug product scan produce the complete receipt', async () => {
  const f = fixture(), first = f.pair();
  const updater = new Updater(f.access), changes = [];
  assert.equal(await updater.finishApplication(product, () => {}), product);
  assert.equal(updater.application.input, first.input);
  assert.equal(updater.application.output, first.output);
  assert.equal(f.queries(), 1);
  const check = new InstallRestartCheck(f.access, updater.application, build, 'fixture browser',
    (receipt, phase) => changes.push({receipt, phase}));
  await scanPage(f, check);
  assert.equal(check.receipt.restart_ok, false);
  f.state(first.input, 'disconnected');
  assert.equal(check.ticket(), null);
  f.state(first.input, 'connected');
  await scanPage(f, check);
  assert.equal(check.receipt.restart_ok, false, 'one endpoint disappearing cannot stand in for unplugging the keyboard');
  f.state(first.input, 'disconnected');
  f.state(first.output, 'disconnected');
  assert.equal(changes.at(-1).phase, 'replug');
  f.pair();
  await scanPage(f, check);
  assert.equal(changes.at(-1).phase, 'done');
  assert.deepEqual({...check.receipt, time: ''}, {...build, browser: 'fixture browser', port_name: name,
    time: '', startup_ok: true, restart_ok: true, version_matched: true});
  assert.ok(Number.isFinite(Date.parse(check.receipt.time)));
  const link = new URL(installReportUrl(check.receipt));
  assert.equal(link.pathname, '/gobbajogger/DnBOX/issues/new');
  assert.equal(link.searchParams.get('template'), 'install-report.yml');
  assert.ok(link.searchParams.get('title').startsWith('[Install report] '));
  assert.equal(link.searchParams.get('build_id'), build.build_id);
  assert.equal(link.searchParams.get('model'), 'SMK-37 Elite');
  assert.equal(link.searchParams.get('port_name'), name);
  assert.equal(link.searchParams.get('sha256'), build.sha256);
  assert.equal(link.searchParams.get('startup_ok'), 'Yes');
  assert.equal(link.searchParams.get('restart_ok'), 'Yes');
  assert.equal(link.searchParams.get('browser'), 'fixture browser');
  assert.ok(link.searchParams.get('notes').includes(JSON.stringify(check.receipt, null, 2)));
  assert.equal(link.searchParams.has('labels'), false);
});

test('a cached model name, unrelated port, ambiguous pair or stale handshake cannot claim a matching restart', async () => {
  const f = fixture(), oldName = 'DnBOX 0.0.25.1 SMK-37 Elite';
  const original = f.pair('i1', 'o1', oldName);
  const changes = [];
  const check = new InstallRestartCheck(f.access, {product, port_name: oldName, ...original}, build,
    'browser', (_, phase) => changes.push(phase));
  assert.equal(check.receipt.version_matched, false);
  const other = f.pair('other-i', 'other-o');
  f.state(other.input, 'disconnected');
  f.state(other.output, 'disconnected');
  assert.equal(check.ticket(), null);
  f.state(original.input, 'disconnected');
  f.state(original.output, 'disconnected');
  f.pair('i2', 'o2');
  await scanPage(f, check);
  assert.equal(changes.at(-1), 'different-ports');
  assert.equal(check.receipt.restart_ok, false);
  const returned = f.pair('i1', 'o1', oldName, 'SMK-37 Elite_899');
  await scanPage(f, check);
  assert.equal(check.receipt.restart_ok, false);
  f.state(f.access.inputs.get('i2'), 'disconnected');
  f.state(f.access.outputs.get('o2'), 'disconnected');
  await scanPage(f, check);
  assert.equal(check.receipt.restart_ok, false, 'wrong actual identity marker denied');
  const stale = check.ticket();
  f.state(returned.input, 'disconnected');
  f.state(returned.output, 'disconnected');
  const pair = f.pair('i1', 'o1', oldName);
  const dev = {id: {text: product, model: 'SMK-37 Elite'}, link: pair};
  assert.equal(check.reidentify(stale, dev, true), false);
  assert.equal(check.reidentify(check.ticket(), dev, false), false);
  await scanPage(f, check);
  assert.equal(check.receipt.restart_ok, true);
  assert.equal(check.receipt.version_matched, false);
  for (const bad of ['DnBOX 0.0.26.1 SMK-37 Elite', 'DnBOX 0.0.26 SMK-37 Pro',
    'DnBOX 0.0.260 SMK-37 Elite', 'SMK-37 Elite']) assert.equal(portVersionMatches(bad, build), false);
});

// Rendered from DnBOX:lane/integ .github/ISSUE_TEMPLATE/install-report.yml, blob 2a8ebb8aa1f36a6e4927bb34c884b5e85938c800.
const manualBody = source('tests/fixtures/install-report-rendered.md');
const issue = (number, body = manualBody, title = '[Install report] ') => ({number, title, body,
  created_at: '2026-11-21T02:15:00Z', labels: []});
const response = (body, next = false) => new Response(JSON.stringify(body),
  {headers: next ? {Link: '<next>; rel="next"'} : {}});
const search = items => ({total_count: items.length, incomplete_results: false, items});

test('ordinary unlabeled form submissions, default title, manual aliases and generated receipts share accurate counts', async () => {
  const receipt = {...build, port_name: name, browser: 'Chrome 149', time: '2026-11-21T02:15:00Z',
    startup_ok: true, restart_ok: true, version_matched: true};
  const notes = new URL(installReportUrl(receipt)).searchParams.get('notes');
  const generated = manualBody.replace('v0.0.26 (94197fc8)', build.build_id).replace('_No response_', notes);
  const manualId = manualBody.replace('v0.0.26 (94197fc8)', build.build_id);
  const raw = [
    issue(1), issue(2, generated), issue(3, manualId), issue(4, manualId.replace(build.build_id, build.source_commit)),
    issue(5, manualBody.replace('Did restart succeed?\n\nYes', 'Did restart succeed?\n\nNot tested')),
    issue(6, manualBody.replace('0.0.26 SMK', '0.0.25.1 SMK')),
    issue(7, generated.replace('Did startup succeed?\n\nYes', 'Did startup succeed?\n\nNo')),
    issue(8, manualBody.replace(build.sha256, 'Not shown')), {...issue(9), pull_request: {}},
    issue(10, manualBody, 'test Install report'), issue(11, manualBody.replace('94197fc8', 'ff8079e9')),
    issue(12, manualBody.replace('Keyboard model', 'Something else')),
    issue(13, manualBody.replace(build.sha256, 'f'.repeat(64))), issue(14, JSON.stringify(receipt)),
    issue(15, manualBody.replace('SMK-37 Elite\n\n### Firmware', 'SMK-37 Pro\n\n### Firmware')),
  ];
  const before = structuredClone(row);
  const reports = await loadInstallReports({fetchImpl: async (url, init) => {
    const q = new URL(url);
    assert.equal(q.pathname, '/search/issues');
    assert.equal(q.searchParams.get('q'), 'repo:gobbajogger/DnBOX is:issue in:title "Install report"');
    assert.equal(q.searchParams.has('labels'), false);
    assert.equal(init.credentials, 'omit');
    return response(search(raw));
  }});
  assert.equal(countInstallReports(reports, build), 4);
  assert.equal(countInstallReports(reports, {...build, sha256: '0'.repeat(64)}), 0);
  assert.deepEqual(row, before);
});

test('issue search falls back to complete pagination for partial or capped results; errors remain unavailable', async () => {
  for (const first of [{total_count: 1001, incomplete_results: false, items: []},
    {total_count: 10, incomplete_results: true, items: [issue(999)]}]) {
    const calls = [];
    const reports = await loadInstallReports({fetchImpl: async (url) => {
      const u = new URL(url);
      calls.push(u);
      if (u.pathname === '/search/issues') return response(first);
      assert.equal(u.pathname, '/repos/gobbajogger/DnBOX/issues');
      assert.equal(u.searchParams.get('state'), 'all');
      assert.equal(u.searchParams.has('labels'), false);
      return u.searchParams.get('page') === '1' ? response([issue(1), issue(2)], true) : response([issue(2), issue(3)]);
    }});
    assert.equal(calls.length, 3);
    assert.equal(countInstallReports(reports, build), 3);
  }
  await assert.rejects(loadInstallReports({fetchImpl: async () => new Response('limited', {status: 403})}), /403/);
  await assert.rejects(loadInstallReports({fetchImpl: async () => response({})}), /Invalid/);
});

test('legacy nightly receipts recover the exact selected package version from its verified assignment', () => {
  const identities = html.slice(html.indexOf('function nightlyProductIdentity('), html.indexOf('function modelKeyForProduct('));
  const assignment = html.slice(html.indexOf('function assignedPackageVersion('), html.indexOf('function compareVersionChoices('));
  const select = html.match(/function selectedInstallBuild\([^]*?\n\}/)[0];
  const get = runInNewContext(identities + assignment + select + '\nselectedInstallBuild', {installBuild});
  const legacy = catalog.versions.find(v => v.version === 'nightly-d8086cc0-dev');
  assert.equal(legacy.display_version, undefined);
  assert.equal(get(legacy, legacy.models.elite, 'elite').version, '0.0.24');
  const changed = structuredClone(legacy);
  changed.models.elite.sha256 = '0'.repeat(64);
  assert.equal(get(changed, changed.models.elite, 'elite').version, '');
});
