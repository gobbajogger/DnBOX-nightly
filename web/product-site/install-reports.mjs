// SPDX-License-Identifier: GPL-3.0-only
// Public, user-submitted install observations. Owner hardware approvals live in a separate ledger.
const reportRepository = 'gobbajogger/DnBOX';
const reportTitle = '[Install report]';
const modelNames = {elite: 'SMK-37 Elite', pro: 'SMK-37 Pro'};

export function installBuild(version, pkg, model) {
  if (!version || !pkg || !Object.hasOwn(modelNames, model) ||
      !/^[a-z0-9._-]{1,100}$/i.test(version.version) || !/^[a-f0-9]{64}$/.test(pkg.sha256)) return null;
  return {build_id: version.version, version: version.display_version || '', sha256: pkg.sha256, source_commit: version.source_commit, model, product: pkg.product};
}

export function portVersionMatches(name, build) {
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
export class InstallRestartCheck {
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

export function installReportUrl(receipt) {
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

export async function loadInstallReports({fetchImpl = fetch, signal = globalThis.AbortSignal?.timeout?.(20000)} = {}) {
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

export function countInstallReports(reports, selection = {}) {
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

export function mountInstallReports(doc, getSelection, browser) {
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
    try {
      read ||= loadInstallReports({signal: globalThis.AbortSignal?.timeout?.(15000)});
      const reports = await read;
      const current = getSelection();
      if (current?.sha256 !== selection.sha256 || current?.build_id !== selection.build_id) return;
      const n = countInstallReports(reports, selection);
      output.textContent = n + (n === 1 ? ' install' : ' installs') + ' reported OK for this build and model.';
    } catch {
      if (getSelection()) output.textContent = 'Public install reports unavailable.';
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
