// SPDX-License-Identifier: GPL-3.0-only
// Actual downloader with controlled network, verification, clock and DOM boundaries.
// Missing cancellation or post-await abort fences must fail these cases.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
function fixture(path, phase, {holdDigest = phase === 'digest'} = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  function span(start, next) {
    const begin = source.indexOf(start), end = source.indexOf(next, begin);
    assert.ok(begin >= 0 && end > begin, `function boundary missing: ${start}`);
    return source.slice(begin, end);
  }
  const pro = {pkg: 'https://packages.test/pro.fwsc', size: 8, sha256: 'good', product: 'Pro'};
  const elite = {pkg: 'https://packages.test/elite.fwsc', size: 8, sha256: 'good', product: 'Elite'};
  if (phase === 'bundled') {
    pro.controller_strategy = 'bundled';
    elite.controller_strategy = 'bundled';
  }
  const ver = {version: 'v', models: {pro, elite}};
  const ui = {devagree: {checked: true}, go: {disabled: false}, installhint: {}};
  const timers = new Map(), messages = [], bundledFailures = [], controllers = new Map();
  let now = 0, id = 0, signal, resolveDigest;
  const pending = s => new Promise((_, reject) =>
    s.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {once: true}));
  const c = {
    AbortController, Blob, URL, loadSerial: 0, chosenModel: 'pro', activeDownloadController: null,
    image: new Uint8Array([1]), selectedProduct: 'old', verifiedDownload: null, bundledFailure: false,
    writing: false, MODELS: {pro: 'Pro', elite: 'Elite'}, $: key => ui[key], t: key => key,
    discardVerifiedDownload() {
      if (c.verifiedDownload) URL.revokeObjectURL(c.verifiedDownload.href);
      c.verifiedDownload = null;
      c.bundledFailure = false;
    },
    refreshMeta: () => c.updateInstallGate(),
    currentSelection: () => ({version: ver, pkg: ver.models[c.chosenModel]}),
    currentVersion: () => ver,
    isCatalogChecked: (version, pkg) => version === ver && pkg === ver.models[c.chosenModel],
    selectionIdentity: (version, pkg) => `${version.version}:${pkg.pkg}`,
    sayK: (...args) => messages.push(args),
    say: message => messages.push(message),
    buildDisplayLabel: () => 'test',
    renderBuildInfo(version, pkg) {
      if (c.bundledFailure) bundledFailures.push({version, pkg});
    },
    async fetch(url, options) {
      signal = options.signal;
      if (phase === 'headers') return pending(signal);
      return {ok: true, redirected: false, url, body: {cancel: async () => {}}};
    },
    async readApprovedPackage(response) {
      if (phase === 'body') return pending(signal);
      return new Uint8Array(8).fill(response.url === elite.pkg ? 2 : 1);
    },
    sha256Hex: () => holdDigest
      ? new Promise(resolve => { resolveDigest = resolve; })
      : Promise.resolve('good'),
    productOf: raw => raw[0] === 2 ? 'Elite' : 'Pro',
    logicalImage: raw => raw,
    verifyBundledController: (logical, pkg) => new Promise((resolve, reject) => {
      controllers.set(pkg.product, {logical, resolve, reject});
    }),
    setTimeout(fn, ms) {
      timers.set(++id, {fn, at: now + ms});
      return id;
    },
    clearTimeout: timer => timers.delete(timer),
  };
  runInNewContext([
    span('function bundledController(', '\nasync function verifyBundledController('),
    span('function hasVerifiedNightlySelection(', '\nfunction buildBadge('),
    span('function cancelPackageDownload(', '\nasync function readApprovedPackage('),
    span('async function loadSelectedPackage() {', '\nfunction versionOptionCaption'),
    'this.load = loadSelectedPackage;',
  ].join('\n'), c);
  const run = c.load();
  const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  return {
    c, ui, messages, bundledFailures, run, flush, timers, controllers,
    resolveDigest: () => resolveDigest('good'), signal: () => signal,
    async advance(ms) {
      now += ms;
      for (const [timer, entry] of [...timers]) {
        if (entry.at <= now) {
          timers.delete(timer);
          entry.fn();
        }
      }
      await flush();
    },
  };
}

function pendingController(f, product) {
  const controller = f.controllers.get(product);
  assert.ok(controller, `${product} package must be waiting on bundled controller verification`);
  assert.equal(f.c.image, null);
  assert.equal(f.c.verifiedDownload, null);
  assert.equal(f.ui.go.disabled, true);
  return controller;
}

function settleController(controller, outcome) {
  if (outcome === 'resolve') controller.resolve();
  else controller.reject(new Error('controller verification failed'));
}

function selectionState(f) {
  return {
    image: f.c.image,
    download: f.c.verifiedDownload,
    product: f.c.selectedProduct,
    messages: [...f.messages],
    installDisabled: f.ui.go.disabled,
    controller: f.c.activeDownloadController,
  };
}

for (const path of ['../web/x0x_installer.html', '../web/product-site/install/index.html', '../docs/install/index.html']) {
  for (const phase of ['headers', 'body']) {
    test(`${path}: stalled ${phase} stops without enabling Install`, async () => {
      const f = fixture(path, phase);
      await f.flush();
      await f.advance(20001);
      assert.equal(f.signal().aborted, true, 'stalled download was not canceled');
      await f.run;
      assert.equal(f.ui.go.disabled, true);
      assert.equal(f.c.image, null);
      assert.equal(f.c.verifiedDownload, null);
      assert.ok(f.messages.length);
      assert.equal(f.timers.size, 0);
    });
  }
  test(`${path}: late digest cannot admit expired bytes`, async () => {
    const f = fixture(path, 'digest');
    await f.flush();
    await f.advance(20001);
    f.resolveDigest();
    await f.run;
    assert.equal(f.c.image, null, 'late digest admitted expired bytes');
    assert.equal(f.c.verifiedDownload, null);
    assert.equal(f.ui.go.disabled, true);
  });
  test(`${path}: canceled old selection cannot report timeout over the new selection`, async () => {
    const f = fixture(path, 'headers');
    await f.flush();
    f.c.chosenModel = 'elite';
    f.c.activeDownloadController.abort();
    await f.run;
    await f.advance(20001);
    assert.equal(f.messages.length, 0);
    assert.equal(f.c.image, null);
    assert.equal(f.timers.size, 0);
  });
  test(`${path}: prompt valid response retained and deadline cleaned`, async t => {
    const f = fixture(path, 'normal');
    t.after(() => f.c.discardVerifiedDownload());
    await f.run;
    assert.equal(f.c.image.length, 8);
    assert.ok(f.c.verifiedDownload);
    assert.equal(f.timers.size, 0);
  });

  for (const outcome of ['resolve', 'reject']) {
    test(`${path}: bundled controller ${outcome} after expiry cannot change the timeout state`, async t => {
      const f = fixture(path, 'bundled');
      t.after(() => f.c.discardVerifiedDownload());
      await f.flush();
      const verification = pendingController(f, 'Pro');
      const signal = f.signal();
      f.ui.devagree.checked = true;
      f.c.updateInstallGate();
      await f.advance(19999);
      assert.equal(signal.aborted, false);
      assert.deepEqual(f.messages, []);
      await f.advance(1);
      assert.equal(signal.aborted, true);
      const timeout = [['loadfail', 'Download took too long. Reload this page to retry.']];
      assert.deepEqual(f.messages, timeout);

      settleController(verification, outcome);
      await f.run;
      assert.equal(f.c.image, null, 'expired bundled package became the install image');
      assert.equal(f.c.verifiedDownload, null, 'expired bundled package became downloadable');
      assert.equal(f.ui.go.disabled, true);
      assert.deepEqual({messages: f.messages, bundledFailures: f.bundledFailures},
        {messages: timeout, bundledFailures: []},
        'late controller verification changed the timeout status or rendered bundled failure UI');
      assert.equal(f.c.bundledFailure, false);
      assert.equal(f.c.activeDownloadController, null);
      assert.equal(f.timers.size, 0);
    });

    for (const freshVerified of [false, true]) {
      const freshState = freshVerified ? 'verified' : 'pending';
      test(`${path}: stale bundled controller ${outcome} leaves the ${freshState} replacement alone`, async t => {
        const f = fixture(path, 'bundled');
        t.after(() => f.c.discardVerifiedDownload());
        await f.flush();
        const obsolete = pendingController(f, 'Pro');
        const oldController = f.c.activeDownloadController;
        f.c.chosenModel = 'elite';
        const freshRun = f.c.load();
        await f.flush();
        const fresh = pendingController(f, 'Elite');
        const freshController = f.c.activeDownloadController;
        assert.ok(freshController && freshController !== oldController);
        assert.equal(oldController.signal.aborted, true);
        assert.equal(freshController.signal.aborted, false);
        if (freshVerified) {
          fresh.resolve();
          await freshRun;
          assert.equal(f.c.image, fresh.logical);
          assert.equal(f.c.verifiedDownload.model, 'elite');
          assert.deepEqual(f.messages, ['test · Elite']);
        }
        const before = selectionState(f);

        settleController(obsolete, outcome);
        await f.run;
        assert.equal(f.c.image, before.image, 'stale verification replaced the current image');
        assert.equal(f.c.verifiedDownload, before.download, 'stale verification replaced the current download');
        assert.equal(f.c.activeDownloadController, before.controller, 'stale cleanup cleared the current controller');
        assert.deepEqual(selectionState(f), before);
        assert.deepEqual(f.bundledFailures, []);
        assert.equal(f.c.bundledFailure, false);
        if (!freshVerified) {
          assert.equal(freshController.signal.aborted, false);
          assert.equal(f.timers.size, 1);
          fresh.resolve();
          await freshRun;
        }
        assert.equal(f.c.image, fresh.logical);
        assert.equal(f.c.verifiedDownload.model, 'elite');
        assert.deepEqual(f.messages, ['test · Elite']);
        assert.equal(f.timers.size, 0);
      });
    }
  }
  test(`${path}: timely bundled controller verification admits the package after acknowledgment`, async t => {
    const f = fixture(path, 'bundled', {holdDigest: true});
    t.after(() => f.c.discardVerifiedDownload());
    await f.flush();
    assert.equal(f.controllers.size, 0, 'bundled verification must wait for the package digest');
    f.resolveDigest();
    await f.flush();
    const verification = pendingController(f, 'Pro');
    verification.resolve();
    await f.run;
    assert.equal(f.c.image, verification.logical);
    assert.equal(f.c.verifiedDownload.model, 'pro');
    assert.equal(f.c.verifiedDownload.pkg, f.c.currentSelection().pkg);
    assert.match(f.c.verifiedDownload.href, /^blob:/);
    assert.deepEqual(f.messages, ['test · Pro']);
    assert.deepEqual(f.bundledFailures, []);
    assert.equal(f.ui.go.disabled, true);
    f.ui.devagree.checked = true;
    f.c.updateInstallGate();
    assert.equal(f.ui.go.disabled, false);
    assert.equal(f.c.activeDownloadController, null);
    assert.equal(f.timers.size, 0);
  });
}
