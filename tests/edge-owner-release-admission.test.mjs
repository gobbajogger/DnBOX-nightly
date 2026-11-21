// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('web/product-site/install/index.html');
const assignmentFile = JSON.parse(read('package-version-assignments.json'));
const catalog = JSON.parse(html.match(/^const catalog = (.+);$/m)[1]);
const release = catalog.versions.find(row => row.display_version === '0.0.26');
const fallback = catalog.versions.find(row => row.display_version === '0.0.25.1');
const models = ['elite', 'pro'];

function section(start, end) {
  const a = html.indexOf('function ' + start + '(');
  const b = html.indexOf('function ' + end + '(', a);
  assert.ok(a >= 0 && b > a, 'Missing installer function range starting at ' + start);
  return html.slice(a, b);
}

function admitted(row, model) {
  const code = [
    section('isRecord', 'versions'),
    section('nightlyProductIdentity', 'suggestModel'),
    section('bundledController', 'hasVerifiedNightlySelection'),
    section('assignedPackageVersion', 'compareVersionChoices'),
    'isCatalogChecked(row, row.models[chosenModel])',
  ].join('\n');
  return runInNewContext(code, {URL, row, chosenModel: model, MODEL_KEYS: models});
}

test('nightly installer admits the exact owner-tested release and keeps its previous version selectable', () => {
  assert.equal(catalog.latest, release.version);
  const embedded = JSON.parse(html.match(/^  const assignments = (.+);$/m)[1]);
  assert.deepEqual(embedded, assignmentFile.assignments);
  const assigned = embedded.find(a => a.catalog_id === release.version);
  assert.equal(assigned.package_version, '0.0.26');
  assert.equal(assigned.source_commit, '94197fc839b00aff47b98ca02f3c6396e4a6eabf');
  assert.equal(release.status, 'release-checked');
  assert.equal(release.hardware_tested, true);
  assert.equal(release.evidence_url, 'https://github.com/gobbajogger/DnBOX/releases/tag/v0.0.26');
  for (const model of models) {
    assert.equal(admitted(release, model), true);
    assert.equal(admitted(fallback, model), true);
  }
});

test('false release claims, changed package identities and explicit denials cannot inherit owner testing', () => {
  for (const mutate of [
    v => { v.source_commit = fallback.source_commit; },
    v => { v.source_tree = fallback.source_tree; },
    v => { v.hardware_tested = false; },
    v => { v.hardware_tested = 'true'; },
    v => { v.fromRelease = true; },
    v => { v.revoked = true; },
    v => { v.withdrawn = true; },
    v => { v.models.pro.sha256 = fallback.models.pro.sha256; },
    v => { v.models.elite.product = release.models.pro.product; },
    v => { v.models.pro.controller_sha256 = '0'.repeat(64); },
    v => { v.models.elite.size++; },
    v => { delete v.models.elite; },
  ]) {
    const changed = structuredClone(release);
    mutate(changed);
    assert.equal(admitted(changed, 'pro'), false, mutate.toString());
  }
  const promotedFallback = {...fallback, status: 'release-checked', hardware_tested: true};
  assert.equal(admitted(promotedFallback, 'elite'), false);
  const denied = structuredClone(release);
  denied.models.elite.installable = false;
  assert.equal(admitted(denied, 'elite'), false);
  assert.equal(admitted(denied, 'pro'), true);
});
