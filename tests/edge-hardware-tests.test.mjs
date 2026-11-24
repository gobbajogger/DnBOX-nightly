// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {catalogWithHardwareTests, effectivePackageVersion, hardwareTestsFor, statusWithHardwareTests, validateHardwareTests} from '../web/product-site/hardware-tests.mjs';
import {applyHardwarePublication} from '../scripts/hardware-publication.mjs';

const read = path => readFileSync(new URL('../web/product-site/' + path, import.meta.url));
const seed = JSON.parse(read('hardware-tests.json'));
const source = JSON.parse(read('versions.json'));
// A newer test build may be listed above the owner-tested latest release.
const latestAt = source.versions.findIndex(row => row.version === source.latest);
const current = source.versions[latestAt], fallback = source.versions[latestAt + 1];
const rawStatus = JSON.parse(read('build-status.json'));

test('owner records bind version, firmware, model, package and controller separately', () => {
  assert.equal(validateHardwareTests(seed).reports.length, 2);
  for (const model of ['elite','pro']) {
    assert.equal(hardwareTestsFor(seed,current,model).model, model);
    assert.equal(hardwareTestsFor(seed,fallback,model), null);
    for (const field of ['version','source_commit','model','package_sha256','controller_sha256']) {
      const ledger = structuredClone(seed);
      ledger.reports.find(row => row.model === model)[field] = 'mismatch';
      assert.equal(hardwareTestsFor(ledger,current,model), null, field);
    }
  }
  const single = {...seed, reports:[seed.reports[0]]};
  assert.equal(hardwareTestsFor(single,current,'pro'), null);
  assert.throws(() => validateHardwareTests({...seed,reports:[...seed.reports,seed.reports[0]]}), /Duplicate/);
  for (const invalid of [{reported_by:'community'},{restart:false},{source_commit:[current.source_commit]},
      {evidence_url:'https://invalid.example/test'},{reported_at:'yesterday'}]) {
    assert.throws(() => validateHardwareTests({...seed,reports:[{...seed.reports[0], ...invalid}]}));
  }
});

test('raw JSON and offline installer are derived from the published ledger; evidence removal revokes tested status', () => {
  const files = new Map(['hardware-tests.json','versions.json','build-status.json','install/index.html'].map(path => [path,read(path)]));
  const authoritative = JSON.stringify({...seed,reports:[seed.reports[0]]},null,1)+'\n';
  files.set('hardware-tests.json', Buffer.from(authoritative));
  applyHardwarePublication(files);
  const catalog = JSON.parse(files.get('versions.json'));
  assert.equal(catalog.versions[0].hardware_tested,false);
  assert.equal(catalog.versions[0].status,'dev-checked');
  const status = JSON.parse(files.get('build-status.json'));
  assert.deepEqual(status.policy.public_device_proven_versions, []);
  assert.equal(status.policy.public_latest, null);
  assert.deepEqual(status.builds,rawStatus.builds);
  assert.equal(status.hardware_tests.reports.length, 1);
  assert.equal(files.get('hardware-tests.json').toString(), authoritative);
  const html = files.get('install/index.html').toString();
  assert.deepEqual(JSON.parse(html.match(/^let currentHardwareLedger = (.*);$/m)[1]), JSON.parse(authoritative));
  assert.deepEqual(JSON.parse(html.match(/^const catalog = (.*);$/m)[1]), catalog);
});

test('new reviewed model reports advance only matching release packages, with explicit denials preserved', () => {
  const newer = structuredClone(current);
  Object.assign(newer,{display_version:'0.0.27',version:'nightly-12345678-dev',source_commit:'12345678'+'0'.repeat(32),status:'dev-checked',hardware_tested:false});
  const reports = seed.reports.map(report => ({...report,version:newer.display_version,source_commit:newer.source_commit}));
  const extended = {schema:1,reports:[...seed.reports,...reports]};
  const catalog = {latest:newer.version,versions:[newer,...source.versions]};
  const materialized = catalogWithHardwareTests(extended,catalog);
  assert.equal(materialized.versions[0].hardware_tested, true);
  assert.equal(statusWithHardwareTests(extended,materialized,rawStatus).policy.public_latest,'0.0.27');
  assert.equal(newer.hardware_tested,false);
  newer.withdrawn = true;
  assert.equal(catalogWithHardwareTests(extended,catalog).versions[0].hardware_tested,false);
});

test('public latest requires evidence for the selected build when display versions repeat', () => {
  const rebuilt = structuredClone(current);
  rebuilt.version = 'nightly-rebuilt-dev';
  rebuilt.models.elite.sha256 = 'a'.repeat(64);
  const catalog = {latest: rebuilt.version, versions: [rebuilt, current]};
  function policy(ledger) {
    return statusWithHardwareTests(ledger, catalogWithHardwareTests(ledger, catalog), rawStatus).policy;
  }
  assert.equal(policy(seed).public_latest, null);
  assert.deepEqual(policy(seed).public_device_proven_versions, [current.display_version]);

  const elite = seed.reports.find(r => r.model === 'elite');
  const tested = {...seed, reports: [...seed.reports, {...elite, package_sha256: rebuilt.models.elite.sha256}]};
  assert.equal(policy(tested).public_latest, current.display_version);
  assert.deepEqual(policy(tested).public_device_proven_versions, [current.display_version]);
});

test('an owner report survives withdrawal without qualifying a denied package for public release', () => {
  for (const change of [
    row => { row.installable = false; },
    row => { row.qualified = false; },
    row => { row.models.pro.withdrawn = true; },
    row => { row.models.elite.status = 'failed'; }
  ]) {
    const row = structuredClone(current);
    change(row);
    const catalog = catalogWithHardwareTests(seed, {latest: row.version, versions: [row]});
    assert.ok(hardwareTestsFor(seed, row, 'elite'));
    assert.equal(catalog.versions[0].hardware_tested, false);
    const {policy} = statusWithHardwareTests(seed, catalog, rawStatus);
    assert.deepEqual(policy.public_device_proven_versions, []);
    assert.equal(policy.public_latest, null);
  }
});

test('all unlabeled packages resolve from exact source and both original model assignments', () => {
  const assignments = JSON.parse(readFileSync(new URL('../package-version-assignments.json', import.meta.url)));
  const unlabeled = source.versions.filter(row => !Object.hasOwn(row,'display_version'));
  assert.equal(unlabeled.length,24);
  for (const row of unlabeled) {
    const pin = assignments.assignments.find(a => a.catalog_id === row.version);
    assert.equal(effectivePackageVersion(row,assignments),pin.package_version);
    assert.equal(effectivePackageVersion(row),null);
  }
  const row = unlabeled[0], version = effectivePackageVersion(row,assignments);
  for (const change of [r=>r.source_tree='0'.repeat(40),r=>r.source_commit='0'.repeat(40),
      r=>r.models.pro.sha256='0'.repeat(64),r=>r.models.elite.size++,
      r=>r.models.pro.product='SMK-37 Elite_900',r=>r.models.elite.controller_sha256='0'.repeat(64),
      r=>delete r.models.pro.controller_size,r=>delete r.models.elite]) {
    const bad=structuredClone(row);change(bad);
    assert.equal(effectivePackageVersion(bad,assignments),null);
  }
  const updated=catalogWithHardwareTests(seed, source, assignments);
  for(let i=1;i<source.versions.length;i++) assert.equal(JSON.stringify(updated.versions[i]), JSON.stringify(source.versions[i]));
  const extra={...seed.reports[0],model:'elite',version,source_commit:row.source_commit,
    package_sha256:row.models.elite.sha256,controller_sha256:row.models.elite.controller_sha256};
  const partial=catalogWithHardwareTests({schema:1,reports:[extra]},source,assignments);
  const resulting=partial.versions.find(v=>v.version===row.version);
  assert.equal(resulting.display_version,version);
  assert.equal(resulting.hardware_tested,false);
  assert.deepEqual(resulting.models,row.models);
  assert.equal(hardwareTestsFor({schema:1,reports:[extra]},row,'elite',assignments),extra);
});
