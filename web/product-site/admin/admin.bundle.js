'use strict';
(()=>{
// hardware-tests.mjs
// SPDX-License-Identifier: GPL-3.0-only
// Reports bind the owner's startup and restart observations to one installed package.
function validateHardwareTests(ledger) {
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
function effectivePackageVersion(row, assignments = []) {
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

function hardwareTestsFor(ledger, row, model, assignments) {
  const pkg = row?.models?.[model];
  if (!pkg || !['elite','pro'].includes(model)) return null;
  const version = effectivePackageVersion(row, assignments);
  if (!version) return null;
  return ledger.reports.find(report => report.model === model && report.version === version &&
    report.source_commit === row.source_commit && report.package_sha256 === pkg.sha256 &&
    report.controller_sha256 === pkg.controller_sha256) || null;
}

async function fetchHardwareTests(url, options = {}) {
  const response = await fetch(url, {cache:'no-store', redirect:'error', credentials:'omit', ...options});
  if (!response.ok || response.redirected) throw new Error('Hardware report ledger unavailable');
  return validateHardwareTests(await response.json());
}

function permitsRelease(record) {
  if (!record || typeof record !== 'object') return false;
  const denials=['revoked','blocked','withdrawn','fromRelease','device_verified'];
  const approvals=['qualified','installable','qa_pass','source_licenses_approved','immutable_http_pass',
    'backup_integrity_pass','model_and_controller_pass'];
  return (!Object.hasOwn(record,'lifecycle') || record.lifecycle==='current') &&
    denials.every(key=>!Object.hasOwn(record,key)||record[key]===false) &&
    approvals.every(key=>!Object.hasOwn(record,key)||record[key]===true);
}

function eligibleNightlyBuild(row) {
  return permitsRelease(row) && (row.hardware_tested === undefined || typeof row.hardware_tested === 'boolean') &&
    ['dev-checked', 'release-checked'].includes(row.status) &&
    Object.values(row.models || {}).every(pkg => permitsRelease(pkg) &&
      (pkg.status === undefined || pkg.status === 'dev-checked') &&
      (pkg.hardware_tested === undefined || pkg.hardware_tested === false));
}

// Materialize the two public JSON views on build or in the owner's single Git commit.
function catalogWithHardwareTests(ledger, sourceCatalog, assignments) {
  validateHardwareTests(ledger);
  const catalog = structuredClone(sourceCatalog);
  for (const row of catalog.versions) {
    const models = Object.keys(row.models || {});
    const tested = models.filter(model => hardwareTestsFor(ledger, row, model, assignments));
    if (tested.length && !row.display_version) row.display_version = effectivePackageVersion(row, assignments);
    const complete = models.length > 0 && tested.length === models.length;
    const priorRelease = row.status === 'release-checked';
    if (complete && eligibleNightlyBuild(row)) {
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

function statusWithHardwareTests(ledger, catalog, sourceStatus, assignments) {
  validateHardwareTests(ledger);
  const status = structuredClone(sourceStatus);
  const proven = catalog.versions.filter(row => row.hardware_tested === true &&
    row.status === 'release-checked' && eligibleNightlyBuild(row) && Object.keys(row.models || {}).length &&
    Object.keys(row.models).every(model => hardwareTestsFor(ledger, row, model, assignments)));
  status.policy.public_device_proven_versions = [...new Set(proven.map(row => effectivePackageVersion(row, assignments)))];
  const latest = catalog.versions.find(row => row.version === catalog.latest);
  status.policy.public_latest = proven.includes(latest) ? effectivePackageVersion(latest, assignments) : null;
  status.hardware_tests = {source: 'hardware-tests.json', reports: ledger.reports};
  return status;
}

// install-reports.mjs
// SPDX-License-Identifier: GPL-3.0-only
// Public, user-submitted install observations. Owner hardware approvals live in a separate ledger.
const reportRepository = 'gobbajogger/DnBOX';
const reportTitle = '[Install report]';
const modelNames = {elite: 'SMK-37 Elite', pro: 'SMK-37 Pro'};

function installBuild(version, pkg, model) {
  if (!version || !pkg || !Object.hasOwn(modelNames, model) ||
      !/^[a-z0-9._-]{1,100}$/i.test(version.version) || !/^[a-f0-9]{64}$/.test(pkg.sha256)) return null;
  return {build_id: version.version, version: version.display_version || '', sha256: pkg.sha256, source_commit: version.source_commit, model, product: pkg.product};
}

function portVersionMatches(name, build) {
  // OS-specific suffixes are allowed, but the DnBOX version token and full model must agree.
  const match = /^DnBOX\s+v?(\d+\.\d+\.\d+(?:\.\d+)?)\s+(SMK-37 (?:Elite|Pro))(?=$|\s|[([])/i.exec(name);
  return !!match && match[1] === build.version && match[2].toLowerCase() === modelNames[build.model]?.toLowerCase();
}

function sameReceiptPort(port, original) {
  return !!port && !!original && (!port.type || !original.type || port.type === original.type) &&
    (port === original || (original.id && port.id === original.id));
}

function connectedReceiptPort(ports, original) {
  const matches = [...ports.values()].filter(p => p.state === 'connected' && sameReceiptPort(p, original));
  return matches.length === 1 ? matches[0] : null;
}

// Created only from finishApplication's exact application reply and its actual pair.
// A timer, picker selection or a scan that started before the physical unplug cannot complete this check.
class InstallRestartCheck {
  constructor(access, application, build, browser, changed) {
    if (!build || application?.product !== build.product || !application.input || !application.output)
      throw Error('A confirmed application and its MIDI pair are required');
    this.access = access;
    this.input = application.input;
    this.output = application.output;
    this.changed = changed;
    this.generation = 0;
    this.unplugged = false;
    this.receipt = {...build, port_name: application.port_name, browser, time: new Date().toISOString(),
      startup_ok: true, restart_ok: false, version_matched: portVersionMatches(application.port_name, build)};
    this.onState = e => this.stateChange(e.port);
    access.addEventListener('statechange', this.onState);
    this.changed(this.receipt, 'unplug');
  }

  stateChange(port) {
    if (port?.state !== 'disconnected' ||
        !(sameReceiptPort(port, this.input) || sameReceiptPort(port, this.output))) return;
    this.generation++;
    const input = connectedReceiptPort(this.access.inputs, this.input);
    const output = connectedReceiptPort(this.access.outputs, this.output);
    if (!input && !output) {
      this.unplugged = true;
      this.changed(this.receipt, 'replug');
    }
  }

  ticket() {
    if (!this.unplugged || this.receipt.restart_ok) return null;
    const input = connectedReceiptPort(this.access.inputs, this.input);
    const output = connectedReceiptPort(this.access.outputs, this.output);
    return input && output ? {input, output, generation: this.generation} : null;
  }

  reidentify(ticket, dev, soleKeyboard) {
    const current = this.ticket();
    if (!ticket && this.unplugged && soleKeyboard && dev?.id?.text === this.receipt.product &&
        (!sameReceiptPort(dev.link?.input, this.input) || !sameReceiptPort(dev.link?.output, this.output))) {
      this.changed(this.receipt, 'different-ports');
    }
    if (!ticket || !current || !soleKeyboard || current.generation !== ticket.generation ||
        ticket.input !== current.input || ticket.output !== current.output ||
        dev?.link?.input !== current.input || dev?.link?.output !== current.output ||
        dev.id?.text !== this.receipt.product || dev.id.model !== modelNames[this.receipt.model] ||
        !current.input.name || current.input.name !== current.output.name) return false;
    this.receipt = {...this.receipt, port_name: current.input.name, restart_ok: true,
      version_matched: portVersionMatches(current.input.name, this.receipt), time: new Date().toISOString()};
    this.changed(this.receipt, 'done');
    this.close();
    return true;
  }

  close() {
    this.unplugged = false;
    this.generation++;
    this.access.removeEventListener('statechange', this.onState);
  }
}

function installReportUrl(receipt) {
  const url = new URL('https://github.com/' + reportRepository + '/issues/new');
  url.search = new URLSearchParams({
    template: 'install-report.yml', title: reportTitle + ' ' + receipt.build_id + ' · ' + modelNames[receipt.model],
    build_id: receipt.build_id, model: modelNames[receipt.model], sha256: receipt.sha256,
    port_name: receipt.port_name, startup_ok: receipt.startup_ok ? 'Yes' : 'Not tested',
    restart_ok: receipt.restart_ok ? 'Yes' : 'Not tested', browser: receipt.browser,
    notes: 'Installer receipt\n\n```json\n' + JSON.stringify(receipt, null, 2) + '\n```',
  });
  return url.href;
}

const formHeadings = ['Build ID', 'Keyboard model', 'Firmware package SHA-256', 'Port name',
  'Did startup succeed?', 'Did restart succeed?', 'Browser and version', 'Notes'];

function submittedReceipt(issue) {
  if (!Number.isSafeInteger(issue?.number) || issue.number <= 0 || issue.pull_request ||
      !/^\[Install report\](?:\s|$)/.test(issue.title) || typeof issue.body !== 'string' || issue.body.length > 65536) return null;
  // GitHub publishes issue forms as Markdown with a heading for each field.
  const parts = issue.body.replace(/\r\n/g, '\n').split(/^### ([^\n]+)\s*$/m);
  const fields = new Map();
  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i].trim();
    if (fields.has(heading)) return null;
    fields.set(heading, parts[i + 1].trim());
  }
  if (!formHeadings.slice(0, -1).every(key => fields.has(key))) return null;
  const [build_id, modelName, sha256, port_name, startup, restart, browser, notes] = formHeadings.map(h => fields.get(h));
  const model = Object.keys(modelNames).find(key => modelNames[key] === modelName);
  if (!model || !build_id || build_id.length > 120 || !/^[a-f0-9]{64}$/i.test(sha256) ||
      !port_name || !browser || browser === '_No response_' || ![startup, restart].every(x => ['Yes', 'No', 'Not tested'].includes(x))) return null;
  const common = {build_id, model, sha256: sha256.toLowerCase(), port_name, browser,
    startup_ok: startup === 'Yes', restart_ok: restart === 'Yes'};
  if (/^Installer receipt\b/.test(notes || '')) {
    const fenced = /^Installer receipt\s+```json\s*\n([\s\S]+?)\n```\s*$/.exec(notes);
    if (!fenced) return null;
    try {
      const r = JSON.parse(fenced[1]);
      if (!r || !Object.entries(common).every(([key, value]) => r[key] === value) ||
          typeof r.product !== 'string' || !/^SMK-37 (?:Elite|Pro)_\d+$/.test(r.product) ||
          r.product.split('_')[0] !== modelName || typeof r.time !== 'string' || !Number.isFinite(Date.parse(r.time)) ||
          typeof r.version_matched !== 'boolean' || !/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(r.version)) return null;
      return r;
    } catch { return null; }
  }
  // Ordinary users can fill the published form manually and leave Notes empty.
  const namedVersion = /^v?(\d+\.\d+\.\d+(?:\.\d+)?)(?:\s*\([a-f0-9]{7,40}\))?$/i.exec(build_id);
  return {...common, version: namedVersion?.[1] || '', time: issue.created_at, manual: true};
}

async function loadInstallReports({fetchImpl = fetch, signal = globalThis.AbortSignal?.timeout?.(20000)} = {}) {
  const reports = new Map();
  async function request(url) {
    const response = await fetchImpl(url.href, {credentials: 'omit', referrerPolicy: 'no-referrer', signal,
      headers: {Accept: 'application/vnd.github+json'}});
    if (!response.ok) throw Error('Public installs API returned HTTP ' + response.status);
    return {body: await response.json(), hasNext: /;\s*rel="next"/.test(response.headers.get('Link') || '')};
  }
  function add(issues) {
    if (!Array.isArray(issues)) throw Error('Invalid public installs response');
    for (const issue of issues) {
      const receipt = submittedReceipt(issue);
      if (receipt) reports.set(issue.number, {number: issue.number,
        url: 'https://github.com/' + reportRepository + '/issues/' + issue.number, receipt});
    }
  }
  // A title search normally takes a single public request. Avoid GitHub's search
  // limit and partial-result flag by enumerating the complete issue list when needed.
  for (let page = 1; ; page++) {
    const search = new URL('https://api.github.com/search/issues');
    search.search = new URLSearchParams({q: 'repo:' + reportRepository + ' is:issue in:title "Install report"', per_page: 100, page});
    const {body, hasNext} = await request(search);
    if (!Number.isSafeInteger(body?.total_count) || body.total_count < 0 ||
        typeof body.incomplete_results !== 'boolean' || !Array.isArray(body.items)) throw Error('Invalid public installs search');
    if (body.incomplete_results || body.total_count > 1000) break;
    add(body.items);
    if (!hasNext) return [...reports.values()];
  }
  reports.clear();
  for (let page = 1; ; page++) {
    const url = new URL('https://api.github.com/repos/' + reportRepository + '/issues');
    url.search = new URLSearchParams({state: 'all', per_page: 100, page});
    const {body, hasNext} = await request(url);
    add(body);
    if (!hasNext) return [...reports.values()];
  }
}

function reportBuildMatches(receipt, selection) {
  if (!selection.build_id || receipt.build_id === selection.build_id) return true;
  if (!receipt.manual) return false;
  const alias = /^v?(\d+\.\d+\.\d+(?:\.\d+)?)(?:\s*\(([a-f0-9]{7,40})\))?$/i.exec(receipt.build_id);
  if (alias) return alias[1] === selection.version && (!alias[2] || selection.source_commit?.startsWith(alias[2].toLowerCase()));
  return /^[a-f0-9]{7,40}$/i.test(receipt.build_id) && selection.source_commit?.startsWith(receipt.build_id.toLowerCase());
}

function countInstallReports(reports, selection = {}) {
  return reports.filter(({receipt: r}) => {
    if (!r.startup_ok || !r.restart_ok || !reportBuildMatches(r, selection) ||
        (selection.sha256 && selection.sha256 !== r.sha256) || (selection.model && selection.model !== r.model)) return false;
    if (r.manual) {
      const version = selection.version || r.version;
      return !!version && portVersionMatches(r.port_name, {version, model: r.model});
    }
    return r.version_matched && (!selection.version || selection.version === r.version) && portVersionMatches(r.port_name, r);
  }).length;
}

function mountInstallReports(doc, getSelection, browser) {
  const element = id => doc.getElementById(id);
  let read, check = null, displayed = null;
  element('report-install').addEventListener('click', () => {
    if (displayed) doc.defaultView.open(installReportUrl(displayed), '_blank', 'noopener,noreferrer');
  });
  function render(receipt, phase) {
    element('install-check').hidden = false;
    element('receipt-result').textContent = 'Startup OK · ' + (receipt.restart_ok ? 'Restart OK' : 'Restart pending') +
      ' · ' + (receipt.version_matched ? 'version matched' : 'version unconfirmed');
    element('receipt-next').textContent = phase === 'done' ? '' : phase === 'different-ports'
      ? 'Restart unconfirmed. The browser assigned different MIDI ports, so this keyboard could not be linked to the install.'
      : phase === 'replug'
      ? 'Reconnect the same keyboard to the same USB port. Use Connect to check again if needed.'
      : 'Unplug the keyboard, then reconnect it to the same USB port. Keep this page open for the restart check.';
    if (!receipt.version_matched) element('receipt-next').textContent += ' The OS may have cached an older MIDI port name.';
    element('receipt-json').textContent = JSON.stringify(receipt, null, 2);
    displayed = receipt;
    element('report-install').disabled = false;
  }
  async function refresh() {
    const selection = getSelection();
    if (!selection) { element('public-installs').textContent = ''; return; }
    const output = element('public-installs');
    output.textContent = 'Checking public install reports…';
    const pending = read ||= loadInstallReports({signal: globalThis.AbortSignal?.timeout?.(15000)});
    try {
      const reports = await pending;
      const current = getSelection();
      if (current?.sha256 !== selection.sha256 || current?.build_id !== selection.build_id) return;
      const n = countInstallReports(reports, selection);
      output.textContent = n + (n === 1 ? ' install' : ' installs') + ' reported OK for this build and model.';
    } catch {
      if (read === pending) read = null;
      const current = getSelection();
      if (!read && current?.sha256 === selection.sha256 && current.build_id === selection.build_id) {
        output.textContent = 'Public install reports unavailable.';
      }
    }
  }
  // Selection changes can be user-initiated or come from a connected device.
  return {refresh, reset() {
    check?.close();
    check = null;
    element('install-check').hidden = true;
    displayed = null;
    element('report-install').disabled = true;
  }, observed(access, application, build) {
    if (!application?.input || !application.output || !access.addEventListener) return null;
    check = new InstallRestartCheck(access, application, build, browser, render);
    return check;
  }};
}

// admin/github.mjs
// SPDX-License-Identifier: GPL-3.0-only

const OWNER = 'gobbajogger';
const NIGHTLY = 'DnBOX-nightly';
const MAIN = 'DnBOX';
const REPOS = [NIGHTLY, MAIN];
const PAGES = 'gh-pages';
const API = 'https://api.github.com';
const HEX40 = /^[a-f0-9]{40}$/;
const HEX64 = /^[a-f0-9]{64}$/;
const MODELS = ['elite', 'pro'];
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', {fatal:true});
const jsonBytes = value => textEncoder.encode(JSON.stringify(value, null, 2) + '\n');

function oid(value) {
  if (!HEX40.test(value)) throw Error('GitHub returned an invalid object identifier.');
  return value;
}
function pathParts(path) {
  const parts = path.split('/');
  if (!parts.every(p => /^[A-Za-z0-9._-]+$/.test(p) && p !== '.' && p !== '..')) throw Error('Invalid repository path.');
  return parts.map(encodeURIComponent).join('/');
}
function repoPath(repo) {
  if (!REPOS.includes(repo)) throw Error('Unsupported repository.');
  return '/repos/' + OWNER + '/' + repo;
}
function b64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(s);
}
function unbase64(s) {
  if (typeof s !== 'string') throw Error('Missing GitHub file contents.');
  return Uint8Array.from(atob(s.replace(/\s/g,'')), ch => ch.charCodeAt(0));
}
async function sha256(bytes) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  return Array.from(hash, x => x.toString(16).padStart(2,'0')).join('');
}
function createGitHub(fetcher = fetch) {
  let credential = '';
  let session = 0;
  let authorized = false;
  async function request(path, method='GET', data, secret=credential) {
    if (!(path === '/user' || REPOS.some(r => path.startsWith(repoPath(r) + '/'))) || /[\\\r\n#]/.test(path)) throw Error('Invalid GitHub API request.');
    const url = new URL(API + path);
    if (url.origin !== API || url.pathname !== path.split('?')[0]) throw Error('Invalid GitHub API path.');
    if (method !== 'GET' && (!authorized || !secret || secret !== credential)) throw Error('Connect an owner token before saving.');
    const headers = {Accept:'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28'};
    if (secret) headers.Authorization = 'Bearer ' + secret;
    if (data !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetcher(url.href,{method,headers,body:data===undefined ? undefined : JSON.stringify(data),
      credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',cache:'no-store'});
    if (!res.ok) {
      const error = Error('GitHub returned HTTP ' + res.status + (res.status === 403 ? '. Check permissions or the API rate limit.' : '.'));
      error.status = res.status;
      throw error;
    }
    return res.json();
  }
  function lock() { session++; credential=''; authorized=false; }
  async function connect(token) {
    lock();
    const attempt=session;
    if (typeof token !== 'string' || !/^github_pat_[A-Za-z0-9_]+$/.test(token)) throw Error('Use a fine-grained personal access token.');
    const account=await request('/user','GET',undefined,token);
    if (session!==attempt) throw Error('Connection cancelled.');
    if (account.login?.toLowerCase() !== OWNER) throw Error('This page requires the repository owner.');
    credential=token; authorized=true;
  }
  async function head(repo) {
    const ref=await request(repoPath(repo)+'/git/ref/heads/'+PAGES);
    return oid(ref.object?.sha);
  }
  async function file(repo,path,ref) {
    const data=await request(repoPath(repo)+'/contents/'+pathParts(path)+'?ref='+oid(ref));
    if (data.type!=='file'||data.path!==path||!Number.isSafeInteger(data.size)||data.size<0||data.size>4*1024*1024) throw Error('Unexpected file metadata for '+path+'.');
    oid(data.sha);
    const blob=data.encoding==='base64' && (data.content||data.size===0) ? data : await request(repoPath(repo)+'/git/blobs/'+data.sha);
    if(blob.encoding!=='base64'||blob.sha!==data.sha) throw Error('Invalid file response for '+path+'.');
    const bytes=unbase64(blob.content);
    if(bytes.length!==data.size) throw Error('Incomplete file '+path+'.');
    return {sha:data.sha,bytes};
  }
  async function readJson(repo,path,ref) {
    const data=await file(repo,path,ref);
    return {...data,value:JSON.parse(textDecoder.decode(data.bytes))};
  }
  async function snapshot(repo) {
    const ref=await head(repo);
    const catalog=await readJson(repo,'versions.json',ref);
    if (!Array.isArray(catalog.value.versions)) throw Error('Invalid installer catalog.');
    if (repo===NIGHTLY && catalog.value.versions.some(row=>!row.display_version)) {
      // Legacy builds carry their display version in the separately pinned package assignments.
      let ledger;
      try {ledger=(await readJson(repo,'package-version-assignments.json',ref)).value;}
      catch(error){if(error.status!==404)throw error;}
      if(ledger) catalog.value.versions=catalog.value.versions.map(row=>{
        const display=effectivePackageVersion(row,ledger);
        return !row.display_version&&display ? {...row,display_version:display} : row;
      });
    }
    return {ref,catalog};
  }
  async function lanePRs(repo) {
    const rows=[];
    for (let page=1;;page++) {
      const batch=await request(repoPath(repo)+'/pulls?state=open&per_page=100&page='+page);
      rows.push(...batch.filter(p=>p.head?.ref?.startsWith('lane/') && p.head.repo?.full_name === OWNER+'/'+repo)
        .map(p=>({repo,number:p.number,title:p.title,lane:p.head.ref,sha:oid(p.head.sha),draft:p.draft})));
      if(batch.length<100) return rows;
    }
  }
  async function checks(repo,sha,number) {
    const root=repoPath(repo);
    const path=root+'/commits/'+oid(sha);
    const rows=[];
    const statuses=await Promise.allSettled([request(path+'/status'),request(path+'/check-runs?per_page=100')]);
    for(const [i,result] of statuses.entries()) {
      if(result.status==='rejected') {rows.push([i?'Check runs':'Commit statuses','unavailable']);continue;}
      const value=result.value;
      rows.push(...(i?value.check_runs.map(x=>[x.name,x.conclusion||x.status]):value.statuses.map(x=>[x.context,x.state])));
    }
    if(Number.isSafeInteger(number)&&number>0) {
      let gate;
      const pattern=new RegExp('^DNBOX-GATE RESULT (PASS|FAIL|VOID) sha='+sha+'(?: |$)','m');
      for(let page=1;;page++){
        const comments=await request(root+'/issues/'+number+'/comments?per_page=100&page='+page);
        for(const comment of comments){
          if(!['OWNER','MEMBER','COLLABORATOR'].includes(comment.author_association)) continue;
          const match=pattern.exec(comment.body);
          if(match)gate=match[1];
        }
        if(comments.length<100)break;
      }
      rows.push(['Local gate',gate||'no exact-head result posted']);
    }
    return rows;
  }
  async function markTested(selection,evidenceUrl) {
    const {ref,catalog}=await snapshot(NIGHTLY);
    const row=selected(catalog.value,selection);
    const entry=candidate(row,selection.model);
    const url=new URL(evidenceUrl);
    if(url.protocol!=='https:' || url.host!=='github.com'||url.username||url.password||url.search||
       !/^\/gobbajogger\/DnBOX(?:-nightly)?\/(?:issues\/\d+|pull\/\d+|releases\/tag\/[A-Za-z0-9._-]+)$/.test(url.pathname)) throw Error('Use a DnBOX GitHub issue, PR or release as evidence.');
    const ledger=await readJson(NIGHTLY,'hardware-tests.json',ref);
    validateHardwareTests(ledger.value);
    if(hardwareTestsFor(ledger.value,row,selection.model)) return 'This package already has an owner test.';
    const report={version:row.display_version,source_commit:row.source_commit,model:selection.model,package_sha256:entry.sha256,controller_sha256:entry.controller_sha256,startup:true,restart:true,evidence_url:url.href,reported_by:'owner',reported_at:new Date().toISOString()};
    const updated={...ledger.value,reports:[...ledger.value.reports,report]};
    validateHardwareTests(updated);
    await request(repoPath(NIGHTLY)+'/contents/hardware-tests.json','PUT',{message:'data: record owner startup and restart on '+selection.model+' '+row.display_version,branch:PAGES,sha:ledger.sha,content:b64(jsonBytes(updated))});
    return 'Saved the hardware test for '+row.display_version+' '+selection.model+'.';
  }
  async function promote(selection) {
    const [src,dest]=await Promise.all([snapshot(NIGHTLY),snapshot(MAIN)]);
    if(dest.catalog.value.installer_promotion_schema!==1) throw Error('The main site needs the ledger-aware installer before it can accept a promotion.');
    const row=selected(src.catalog.value,selection);
    const ledger=await readJson(NIGHTLY,'hardware-tests.json',src.ref);
    validateHardwareTests(ledger.value);
    if(!MODELS.every(m=>hardwareTestsFor(ledger.value,row,m))) throw Error('Both model packages need an owner startup and restart record.');
    const target=structuredClone(row), files=[];
    for(const model of MODELS) {
      const entry=candidate(row,model);
      const prefix='/DnBOX-nightly/artifacts/';
      const url=new URL(entry.pkg);
      if(url.origin!=='https://gobbajogger.github.io'||url.username||url.password||url.search||url.hash||!url.pathname.startsWith(prefix)) throw Error('Invalid nightly package URL.');
      const path=url.pathname.slice('/DnBOX-nightly/'.length);
      pathParts(path);
      const parts=path.split('/');
      if(parts.at(-2)!==entry.sha256||!/^[A-Za-z0-9._-]+\.fwsc$/.test(parts.at(-1))) throw Error('Expected an immutable firmware package path.');
      const pkg=await file(NIGHTLY,path,src.ref);
      if(pkg.bytes.length!==entry.size||await sha256(pkg.bytes)!==entry.sha256) throw Error('Firmware verification failed for '+model+'.');
      const to='artifacts/releases/'+entry.sha256+'/'+parts.at(-1);
      files.push({path:to,bytes:pkg.bytes,original:pkg.sha});
      target.models[model].pkg='https://gobbajogger.github.io/DnBOX/'+to;
      // MAIN checks an explicit model status against the promoted catalog row.
      if (entry.status!==undefined) target.models[model].status='release-checked';
    }
    Object.assign(target,{hardware_tested:true,status:'release-checked',lifecycle:'current'});
    const prior=dest.catalog.value.versions.find(v=>v.version===target.version);
    if (prior) {
      const buildFields = ['source_commit', 'source_tree', 'display_version'];
      const modelFields = ['product', 'sha256', 'size', 'controller_sha256', 'controller_size', 'controller_strategy'];
      if (buildFields.some(key => prior[key] !== target[key]) ||
          MODELS.some(model => modelFields.some(key => prior.models?.[model]?.[key] !== target.models[model][key]))) {
        throw Error('The existing build ID has different firmware.');
      }
    }
    const next={...dest.catalog.value,latest:target.version,versions:[target,...dest.catalog.value.versions.filter(v=>v.version!==target.version)]};
    const root=repoPath(MAIN)+'/git/';
    const parent=await request(root+'commits/'+dest.ref);
    const entries=[];
    for(const f of [...files,{path:'versions.json',bytes:jsonBytes(next)}]) {
      const blob=await request(root+'blobs','POST',{content:b64(f.bytes),encoding:'base64'});
      if(f.original&&f.original!==blob.sha) throw Error('GitHub stored different package bytes.');
      entries.push({path:f.path,mode:'100644',type:'blob',sha:oid(blob.sha)});
    }
    const tree=await request(root+'trees','POST',{base_tree:oid(parent.tree.sha),tree:entries});
    if(tree.sha===parent.tree.sha) return 'The main installer already has this exact release.';
    const commit=await request(root+'commits','POST',{message:'release: promote '+row.display_version+' to the main installer',parents:[dest.ref],tree:oid(tree.sha)});
    if(await head(NIGHTLY)!==src.ref) throw Error('The nightly source changed. Refresh before promoting.');
    await request(root+'refs/heads/'+PAGES,'PATCH',{sha:oid(commit.sha),force:false});
    return 'Promoted '+row.display_version+' in '+commit.sha.slice(0,12)+'.';
  }
  async function release(repo,tag) {
    if(!/^v[0-9]+(?:\.[0-9]+){1,3}(?:-[A-Za-z0-9.-]+)?$/.test(tag)) throw Error('Enter a version tag such as v0.0.26.');
    const r=await request(repoPath(repo)+'/releases/tags/'+encodeURIComponent(tag));
    if(r.tag_name!==tag||!Number.isSafeInteger(r.id)) throw Error('GitHub returned a different release.');
    return {repo,tag,id:r.id,body:r.body??'',updated:r.updated_at};
  }
  async function saveNotes(previous,body) {
    const current=await release(previous.repo,previous.tag);
    if(current.id!==previous.id || current.body!==previous.body || current.updated!==previous.updated) throw Error('The release changed. Reload its notes before saving.');
    await request(repoPath(current.repo)+'/releases/'+current.id,'PATCH',{body});
    const saved=await release(current.repo,current.tag);
    if(saved.id!==current.id||saved.body!==body) throw Error('Another edit reached the release during save. Reload to see the current notes.');
    return 'Saved the release notes for '+current.tag+'.';
  }
  return {connect,lock,head,snapshot,readJson,lanePRs,checks,markTested,promote,release,saveNotes};
}
function selected(catalog,selection) {
  const matches=catalog.versions.filter(v=>v.version===selection.id);
  const row=matches[0];
  if(matches.length!==1 || !permitsRelease(row) || row.source_commit!==selection.source ||
     !HEX40.test(row.source_commit) || !HEX40.test(row.source_tree) ||
     !/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(row.display_version) ||
     !['dev-checked','release-checked'].includes(row.status) ||
     (row.hardware_tested!==undefined && typeof row.hardware_tested!=='boolean') ||
     Object.keys(row.models||{}).sort().join(',')!=='elite,pro' ||
     !MODELS.every(m=>row.models[m]?.sha256===selection.digests?.[m]))
    throw Error('The selected build changed or is unavailable. Refresh the catalog.');
  return row;
}
function candidate(row,model) {
  const entry=row.models?.[model];
  const product=model==='elite'?'Elite':'Pro';
  if(!MODELS.includes(model)||!permitsRelease(entry)||!HEX64.test(entry.sha256)||!HEX64.test(entry.controller_sha256)||
     (entry.status!==undefined && entry.status!=='dev-checked') ||
     (entry.hardware_tested!==undefined && entry.hardware_tested!==false) ||
     (Object.hasOwn(entry,'controller_strategy') && !['bundled','owner-supplied'].includes(entry.controller_strategy)) ||
     (entry.controller_strategy==='bundled' &&
       (!Number.isSafeInteger(entry.controller_size) || entry.controller_size<68 || entry.controller_size>65536)) ||
     !Number.isSafeInteger(entry.size)||entry.size<=960||entry.size>2097152||
     !new RegExp('^SMK-37 '+product+'_(?:900|9[0-9]{6})$').test(entry.product))
    throw Error('This model package is unavailable.');
  return entry;
}

// admin/admin.mjs
// SPDX-License-Identifier: GPL-3.0-only

if (self === top) initialize();

function initialize() {
  const byId = id => document.getElementById(id);
  const node = (tag, text) => {const el=document.createElement(tag);el.textContent=text;return el;};
  const github=createGitHub();
  const repos=[NIGHTLY,MAIN];
  let authenticated=false, saving=false, releases=[], loadedNotes=null, revision=0;
  const message=(id,text)=>{byId(id).textContent=text;};
  const selected=()=>releases.find(r=>r.version===byId('build').value);
  function selection() {
    const r=selected();
    if(!r) throw Error('Select a nightly build.');
    return {id:r.version,source:r.source_commit,model:byId('model').value,
      digests:{elite:r.models?.elite?.sha256,pro:r.models?.pro?.sha256}};
  }
  function controls() {
    byId('connect').disabled=authenticated||saving;
    byId('token').disabled=authenticated||saving;
    byId('lock').disabled=!authenticated;
    byId('mark').disabled=!authenticated||saving||!selected()||!byId('verified').checked||!byId('evidence').value.trim();
    byId('promote').disabled=!authenticated||saving||!selected();
    byId('save-notes').disabled=!authenticated||saving||!loadedNotes||byId('notes').value===loadedNotes.body;
  }
  function identity() {
    const r=selected(),m=byId('model').value;
    message('identity',r ? [r.version,r.source_commit,r.models?.[m]?.sha256].join(' · ') : '');
    byId('verified').checked=false; controls();
  }
  async function action(id,work) {
    if(saving) return;
    saving=true; controls(); message(id,'Working…');
    try{message(id,await work());}catch(error){message(id,error.message);}
    finally{saving=false;controls();}
  }
  function disconnect() {
    revision++; github.lock();authenticated=false;byId('token').value='';byId('verified').checked=false;
    message('connection','Viewing public data.');controls();
  }
  byId('workspace').hidden=false;
  byId('connect').onclick=()=>action('connection',async()=>{
    let value=byId('token').value.trim();byId('token').value='';
    try{await github.connect(value);}finally{value='';}
    authenticated=true;return 'Connected as '+OWNER+'.';
  });
  byId('lock').onclick=disconnect; window.addEventListener('pagehide',disconnect);
  byId('build').onchange=identity;byId('model').onchange=identity;
  byId('verified').onchange=controls;byId('evidence').oninput=controls;
  byId('mark').onclick=()=>action('test-result', async()=>{
    if(!byId('verified').checked) throw Error('Confirm the two hardware checks.');
    const result=await github.markTested(selection(),byId('evidence').value.trim());
    byId('verified').checked=false;return result;
  });
  byId('promote').onclick=()=>action('promotion-result',async()=>{
    const s=selection();
    if(!window.confirm('Promote '+s.id+' to DnBOX gh-pages?\n\nElite '+s.digests.elite+'\nPro '+s.digests.pro)) return 'Promotion cancelled.';
    const result=await github.promote(s);await refresh();return result;
  });
  function clearNotes(){loadedNotes=null;byId('notes').value='';byId('notes').disabled=true;controls();}
  byId('repo').onchange=clearNotes;byId('tag').oninput=clearNotes;
  byId('read-notes').onclick=()=>action('notes-result',async()=>{
    const repo=byId('repo').value,tag=byId('tag').value.trim();
    const result=await github.release(repo,tag);
    if(repo!==byId('repo').value||tag!==byId('tag').value.trim()) return 'Selection changed. Load the selected release.';
    loadedNotes=result;byId('notes').value=result.body;byId('notes').disabled=false;return 'Loaded '+tag+'.';
  });
  byId('notes').oninput=controls;
  byId('save-notes').onclick=()=>action('notes-result',async()=>{
    const before=loadedNotes,body=byId('notes').value;
    if(!before) throw Error('Load the release first.');
    const result=await github.saveNotes(before,body);
    if(loadedNotes===before){loadedNotes=await github.release(before.repo,before.tag);}
    return result;
  });
  function displayCatalog(repo,catalog,ledger) {
    const el=document.createElement('details'),rows=catalog.versions;
    const latest=rows.find(v=>v.version===catalog.latest);
    el.append(node('summary',repo+' · '+(latest?.display_version||catalog.latest||'no latest build')+' · '+rows.length+' builds'));
    const list=document.createElement('ul');
    for(const row of rows){
      const item=document.createElement('li'),details=document.createElement('details');
      const title=[row.display_version||row.version,row.version===catalog.latest?'Latest':'',row.status].filter(Boolean).join(' · ');
      details.append(node('summary',title),node('p',row.version+' · '+(row.source_commit||'source unavailable')));
      for(const [model,pkg] of Object.entries(row.models||{})){
        const status=ledger ? (hardwareTestsFor(ledger,row,model)?'Owner tested startup and restart':'No matching owner test recorded') : 'Owner records unavailable';
        details.append(node('p',[model,pkg.size+' bytes',pkg.sha256,status].join(' · ')));
      }
      item.append(details);list.append(item);
    }
    el.append(list);return el;
  }
  async function refresh() {
    const id=++revision;
    const previous=byId('build').value;
    message('status','Loading lane pull requests and both catalogs…');
    const rows=await Promise.allSettled(repos.map(r=>github.lanePRs(r)));
    if(id!==revision) return;
    byId('lanes').replaceChildren();
    for(const [i,result] of rows.entries()){
      if(result.status==='rejected'){byId('lanes').append(node('p',repos[i]+': '+result.reason.message));continue;}
      for(const pr of result.value){
        const el=document.createElement('details'),summary=node('summary',pr.repo+' #'+pr.number+' · '+pr.lane+(pr.draft?' · Draft':''));
        const link=node('a',pr.title);link.href='https://github.com/'+OWNER+'/'+pr.repo+'/pull/'+pr.number;
        const checks=node('p','Open to read GitHub checks and commit status.');
        el.append(summary,link,checks);
        el.addEventListener('toggle',async()=>{if(!el.open)return;try{const data=await github.checks(pr.repo,pr.sha,pr.number);checks.textContent=data.map(([n,s])=>n+' · '+s).join(' / ')||'No GitHub checks or commit statuses recorded.';}catch(e){checks.textContent=e.message;}});
        byId('lanes').append(el);
      }
    }
    if(!byId('lanes').children.length) byId('lanes').append(node('p','No open lane pull requests.'));
    const snapshots=await Promise.allSettled(repos.map(r=>github.snapshot(r)));
    let ledger;
    if(snapshots[0].status==='fulfilled'){
      try {ledger=validateHardwareTests((await github.readJson(NIGHTLY,'hardware-tests.json',snapshots[0].value.ref)).value);}
      catch {ledger=null;}
    }
    if(id!==revision)return;
    byId('catalogs').replaceChildren();releases=[];byId('build').replaceChildren();
    for(const [i,result] of snapshots.entries()){
      if(result.status==='rejected'){byId('catalogs').append(node('p',repos[i]+': '+result.reason.message));continue;}
      const catalog=result.value.catalog.value;byId('catalogs').append(displayCatalog(repos[i],catalog,ledger));
      if(repos[i]===NIGHTLY) {
        releases=catalog.versions.filter(v=>v.display_version&&v.models?.elite&&v.models?.pro);
        for(const r of releases){const opt=node('option',r.display_version+' · '+r.source_commit.slice(0,8));opt.value=r.version;byId('build').append(opt);}
        byId('build').value=releases.some(v=>v.version===previous)?previous:catalog.latest;
      }
    }
    identity();message('status','');message('reports','Loading install reports…');
    try {
      if(snapshots.some(s=>s.status!=='fulfilled')) throw Error('Catalog unavailable.');
      const reports=await loadInstallReports();
      const packages=snapshots.flatMap(s=>s.value.catalog.value.versions.flatMap(row=>
        Object.entries(row.models||{}).map(([model,pkg])=>installBuild(row,pkg,model)).filter(Boolean)));
      // A package can appear in both catalogs. Count each submitted issue only once.
      const count=reports.filter(report=>packages.some(pkg=>countInstallReports([report],pkg)===1)).length;
      if(id===revision)message('reports',count+' install'+(count===1?'':'s')+' reported OK');
    }
    catch{if(id===revision)message('reports','Install-report count unavailable.');}
  }
  byId('refresh').onclick=()=>refresh().catch(e=>message('status',e.message));
  controls();refresh().catch(e=>message('status',e.message));
}
})();
