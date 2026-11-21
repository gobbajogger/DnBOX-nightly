// SPDX-License-Identifier: GPL-3.0-only
// Reports bind the owner's startup and restart observations to one installed package.
export function validateHardwareTests(ledger) {
  if (!ledger || ledger.schema !== 1 || !Array.isArray(ledger.reports) ||
      ledger.reports.length > 20000 || Object.keys(ledger).some(key => !['schema', 'reports'].includes(key))) {
    throw new Error('Invalid hardware test ledger');
  }
  const keys = ['version', 'source_commit', 'model', 'package_sha256', 'controller_sha256',
    'startup', 'restart', 'evidence_url', 'reported_by', 'reported_at'];
  const seen = new Set();
  for (const report of ledger.reports) {
    if (!report || typeof report !== 'object' || Object.keys(report).some(key => !keys.includes(key)) ||
        typeof report.version !== 'string' || !/^\d+(?:\.\d+){2,3}$/.test(report.version) || typeof report.source_commit !== 'string' || !/^[0-9a-f]{40}$/.test(report.source_commit) ||
        !['elite', 'pro'].includes(report.model) || typeof report.package_sha256 !== 'string' ||
        typeof report.controller_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(report.package_sha256) ||
        !/^[0-9a-f]{64}$/.test(report.controller_sha256) || report.startup !== true || report.restart !== true ||
        report.reported_by !== 'owner' || typeof report.evidence_url !== 'string' ||
        !/^https:\/\/github\.com\/gobbajogger\/DnBOX(?:-nightly)?\/(?:releases\/tag\/v\d+(?:\.\d+){2,3}|(?:issues|pull)\/[1-9]\d*(?:#issuecomment-[1-9]\d*)?)$/.test(report.evidence_url) ||
        (report.reported_at !== undefined && (typeof report.reported_at !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(report.reported_at) ||
          !Number.isFinite(Date.parse(report.reported_at))))) {
      throw new Error('Invalid model hardware report');
    }
    const key = [report.version, report.source_commit, report.model, report.package_sha256, report.controller_sha256].join('/');
    if (seen.has(key)) throw new Error('Duplicate model hardware report');
    seen.add(key);
  }
  return ledger;
}

// Historical packages used the same SMK product string for several releases.
export function effectivePackageVersion(row, assignments = []) {
  const versionPattern = /^(?:0|[1-9]\d*)(?:\.(?:0|[1-9]\d*)){2,3}$/;
  if (!row || typeof row !== 'object') return null;
  if (Object.hasOwn(row, 'display_version')) {
    return typeof row.display_version === 'string' && versionPattern.test(row.display_version) ? row.display_version : null;
  }
  const entries = Array.isArray(assignments) ? assignments : assignments?.schema === 1 ? assignments.assignments : null;
  if (!Array.isArray(entries)) return null;
  const matches = entries.filter(entry => entry?.catalog_id === row.version);
  if (matches.length !== 1) return null;
  const assignment = matches[0];
  if (typeof assignment.package_version !== 'string' || !versionPattern.test(assignment.package_version) ||
      !/^[a-f0-9]{40}$/.test(assignment.source_commit) || !/^[a-f0-9]{40}$/.test(assignment.source_tree) ||
      row.source_commit !== assignment.source_commit || row.source_tree !== assignment.source_tree) return null;
  const models = Object.keys(assignment.models || {}).sort();
  if (!models.length || models.join(',') !== Object.keys(row.models || {}).sort().join(',')) return null;
  const fields = ['product','sha256','size','controller_sha256','controller_strategy','controller_size'];
  for (const key of models) {
    const pkg = row.models[key], pin = assignment.models[key];
    if (!pkg || !pin || !/^SMK-37 (?:Elite|Pro)_/.test(pin.product) ||
        !/^[a-f0-9]{64}$/.test(pin.sha256) || !/^[a-f0-9]{64}$/.test(pin.controller_sha256) ||
        !Number.isSafeInteger(pin.size) || pin.size <= 0 ||
        !fields.every(field => Object.hasOwn(pkg, field) === Object.hasOwn(pin, field) &&
          pkg[field] === pin[field])) return null;
  }
  return assignment.package_version;
}

export function hardwareTestsFor(ledger, row, model, assignments) {
  const pkg = row?.models?.[model];
  if (!pkg || !['elite','pro'].includes(model)) return null;
  const version = effectivePackageVersion(row, assignments);
  if (!version) return null;
  return ledger.reports.find(report => report.model === model && report.version === version &&
    report.source_commit === row.source_commit && report.package_sha256 === pkg.sha256 &&
    report.controller_sha256 === pkg.controller_sha256) || null;
}

export async function fetchHardwareTests(url, options = {}) {
  const response = await fetch(url, {cache:'no-store', redirect:'error', credentials:'omit', ...options});
  if (!response.ok || response.redirected) throw new Error('Hardware report ledger unavailable');
  return validateHardwareTests(await response.json());
}

// Materialize the two public JSON views on build or in the owner's single Git commit.
export function catalogWithHardwareTests(ledger, sourceCatalog, assignments) {
  validateHardwareTests(ledger);
  const catalog = structuredClone(sourceCatalog);
  for (const row of catalog.versions) {
    const models = Object.keys(row.models || {});
    const tested = models.filter(model => hardwareTestsFor(ledger, row, model, assignments));
    if (tested.length && !row.display_version) row.display_version = effectivePackageVersion(row, assignments);
    const complete = models.length > 0 && tested.length === models.length;
    const withheld = row.revoked || row.blocked || row.withdrawn ||
      (row.lifecycle !== undefined && row.lifecycle !== 'current');
    const priorRelease = row.status === 'release-checked';
    if (complete && !withheld && ['dev-checked','release-checked'].includes(row.status)) {
      row.status = 'release-checked';
      row.hardware_tested = true;
      row.label = 'OWNER HARDWARE TESTED — STARTUP AND RESTART OK ON ' + tested.join(' AND ').toUpperCase();
      row.evidence_url = hardwareTestsFor(ledger, row, tested[0]).evidence_url;
    } else if (priorRelease || row.hardware_tested === true) {
      row.hardware_tested = false;
      if (priorRelease) row.status = 'dev-checked';
      row.label = 'Exact-package hardware confirmation incomplete';
      row.description = 'See the per-model owner hardware records for this package.';
    }
  }
  return catalog;
}

export function statusWithHardwareTests(ledger, catalog, sourceStatus, assignments) {
  validateHardwareTests(ledger);
  const status = structuredClone(sourceStatus);
  const proven = catalog.versions.filter(row => row.hardware_tested === true &&
    row.status === 'release-checked' && Object.keys(row.models).length &&
    Object.keys(row.models).every(model => hardwareTestsFor(ledger, row, model, assignments))).map(row => effectivePackageVersion(row, assignments));
  status.policy.public_device_proven_versions = proven;
  const selected = catalog.versions.find(row => row.version === catalog.latest);
  status.policy.public_latest = proven.includes(selected?.display_version) ? selected.display_version : null;
  status.hardware_tests = {source: 'hardware-tests.json', reports: ledger.reports};
  return status;
}
