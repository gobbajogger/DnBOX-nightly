// SPDX-License-Identifier: GPL-3.0-only
// Full-file diff of renderInstaller(live catalog 24a8b208aa) against live
// gh-pages install/index.html (blob 15d43a0a, tip 6a9953de). Only allowlisted
// hunks may remain; each has a declared reason.
import test from 'node:test';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { execSync, spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderInstaller, publicCatalog } from '../scripts/render-qualified-nightly.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIVE_INSTALL_BLOB = '15d43a0a8398a69c70e73aa7b6a6dc6bbe5bace0';
const LIVE_CATALOG_BLOB = '24a8b208aa01d539b5ef4e23af73d9c4aa2ac3d8';
const gitBlob = sha => execSync(`git cat-file -p ${sha}`, { cwd: root, encoding: 'utf8', maxBuffer: 10e6 });

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.keys(value).sort().map(k => [k, sortKeys(value[k])]));
  return value;
}
function normalize(html) {
  return html.split('\n').map(line => {
    if (line.startsWith('const catalog = ')) {
      const raw = line.slice('const catalog = '.length).replace(/;?\s*$/, '');
      return 'const catalog = ' + JSON.stringify(sortKeys(JSON.parse(raw))) + ';';
    }
    return line;
  }).join('\n');
}

// Allowlisted remaining hunks. Anything else fails the test.
const ALLOWED = [
  // Exact reviewed UI and admission changes for the owner-tested 94197fc8 release.
  ...JSON.parse(readFileSync(join(root, 'tests/fixtures/installer-v0026-reviewed-hunks.json'), 'utf8')),
  {
    id: "standalone-installer-class",
    reason: "Scope the standalone presentation on the document root.",
    liveOnly: [
      "<html lang=\"en\">",
    ],
    renderOnly: [
      "<html lang=\"en\" class=\"standalone-installer\">",
    ],
  },
  {
    id: "standalone-barlow-and-palette",
    reason: "Bundle the two licensed typefaces, their notice and the reviewed responsive controls. The hash covers the entire generated CSS hunk.",
    liveOnly: [],
    renderOnlySha256: '72d95202418be9129eacd992b639fc9673c7e07f37ce42211fce910e55d44291',
  },
  {
    id: "standalone-header-links",
    reason: "The firmware, manual and changes links reach documents on disk and when hosted.",
    liveOnly: [
      "      <a class=\"home\" href=\"../\" aria-label=\"DnBOX home\">DnBOX</a><span class=\"channel-label\">SMK-37 · NIGHTLY</span>",
      "        <a href=\"../manual/\" data-t=\"navmanual\">Manual</a><a href=\"../new/\">Changes</a><a href=\"https://github.com/gobbajogger/DnBOX-nightly\">Source</a>",
    ],
    renderOnly: [
      "      <a class=\"home\" href=\"#firmware\" aria-label=\"DnBOX home\">DnBOX</a><span class=\"channel-label\">SMK-37 · NIGHTLY</span>",
      "        <a href=\"../manual/index.html\" data-t=\"navmanual\">Manual</a><a href=\"../new/index.html\">Changes</a><a href=\"https://github.com/gobbajogger/DnBOX-nightly\">Source</a>",
    ],
  },
  {
    id: "standalone-changes-link",
    reason: "Open the changes document from the resources navigation.",
    liveOnly: [
      "    <a href=\"../new/\" data-t=\"whatsnew\">What's new</a>",
    ],
    renderOnly: [
      "    <a href=\"../new/index.html\" data-t=\"whatsnew\">What's new</a>",
    ],
  },
  {
    id: "standalone-connection-help-link",
    reason: "Open the local manual directly from connection help.",
    liveOnly: [
      "  <details class=\"connection-help\"><summary>Connection &amp; recovery help</summary><p class=\"small\" data-t=\"direct\"></p><p class=\"small\" data-t=\"helptext\"></p><p class=\"small\"><a href=\"../manual/\" data-t=\"helpmanual\">Open the manual</a></p>  <p class=\"small\" id=\"recovery\"><span data-t=\"brick\"></span>",
    ],
    renderOnly: [
      "  <details class=\"connection-help\"><summary>Connection &amp; recovery help</summary><p class=\"small\" data-t=\"direct\"></p><p class=\"small\" data-t=\"helptext\"></p><p class=\"small\"><a href=\"../manual/index.html\" data-t=\"helpmanual\">Open the manual</a></p>  <p class=\"small\" id=\"recovery\"><span data-t=\"brick\"></span>",
    ],
  },
  {
    id: "standalone-compatibility-manual-link",
    reason: "Open the same document from compatibility help.",
    liveOnly: [
      "      <details><summary>Check the fit for your gear <span>Compatibility and practical limits.</span></summary><p>Supports SMK-37 Elite and Pro; check Install firmware for available packages. Starrykey 37 Play uses the Pro model; choose the name intended for your keyboard. The keyboard's pads and keys play with fixed velocity. SMC uses a single direct Bluetooth MIDI link; Loopy uses USB in the combined setup. No Bluetooth audio or direct multi-SMC connection is offered here.</p><p>A matching stock firmware package can be restored with the original updater; see Restore original firmware.</p><p><a href=\"../manual/\">Open the playing and setup manual</a></p></details>",
    ],
    renderOnly: [
      "      <details><summary>Check the fit for your gear <span>Compatibility and practical limits.</span></summary><p>Supports SMK-37 Elite and Pro; check Install firmware for available packages. Starrykey 37 Play uses the Pro model; choose the name intended for your keyboard. The keyboard's pads and keys play with fixed velocity. SMC uses a single direct Bluetooth MIDI link; Loopy uses USB in the combined setup. No Bluetooth audio or direct multi-SMC connection is offered here.</p><p>A matching stock firmware package can be restored with the original updater; see Restore original firmware.</p><p><a href=\"../manual/index.html\">Open the playing and setup manual</a></p></details>",
    ],
  },
  {
    id: 'programmed-sample-header-padding',
    reason: 'Restore preserves bytes 480..511 when programmed; erased padding retains the legacy short-header commit. Verified by actual-writer simulated-flash regressions, not a physical-device claim.',
    liveOnly: ['  const e = await slotReq(link, 13, [k, ...pack78(img.subarray(0, SLOT_HDR_LEN))], 5000);'],
    renderOnly: ['  const e = await slotReq(link, 13, [k, ...pack78(img.subarray(0, img.subarray(SLOT_HDR_LEN, SLOT_HDR_AREA).some(byte => byte !== 0xff) ? SLOT_HDR_AREA : SLOT_HDR_LEN))], 5000);'],
  },
  {
    id: 'slot-map-port-comment',
    reason: 'Source documents the 9fde4dbe slot-map port so a later render cannot drop it; live has the same pkHasSlotMap logic without this comment.',
    renderOnly: ['  // Port of live gh-pages 9fde4dbe so a later site render cannot drop 0.0.25 packages.'],
    liveOnly: [],
  },
  {
    // Adjacent comment + body are one unified-diff hunk.
    id: 'starry-alias-keyboardModel',
    reason: 'Intended #121: source keyboardModel maps starrykey-37 play / starrykey-37 to smk-37 pro (and documents that). Live is the strict #806 form (`return name === "fm-1" ? null : name`) with no Starry alias. A later publish would add this alias on live and must be called out.',
    renderOnly: [
      '// Package models are distinct even when boards share a family. The verified',
      '// Starrykey stock identity names the Pro model; it is not an Elite alias.',
      '  if (name === "fm-1") return null; // SMK installer: never admit the other board.',
      '  return name === "starrykey-37 play" || name === "starrykey-37" ? "smk-37 pro" : name;',
    ],
    liveOnly: [
      '// Strict model match (DnBOX #806 62cf11e98): a package is written only',
      '// when its model equals the model the keyboard reports (case-insensitive, "ota-"',
      '// ignored). No family or alias match, and an FM-1 is never flashed.',
      '  return name === "fm-1" ? null : name;',
    ],
  },
  {
    "id": "bounded-download-deadline",
    "reason": "Reviewed download lifetime bound; native header/body cancellation and post-await fences prevent expired bytes from enabling Install. Covered by actual downloader and browser timeout/reload tests.",
    "renderOnly": [
      "  const isUsable = () => isLatest() && !controller.signal.aborted;",
      "  // Bound headers, body and late asynchronous verification as one download.",
      "  const deadline = setTimeout(() => {",
      "    controller.abort();",
      "    if (isLatest()) sayK(\"loadfail\", \"Download took too long. Reload this page to retry.\");",
      "  }, 20000);",
      "    if (!isUsable()) { try { await r.body?.cancel(); } catch {} return; }",
      "    if (!isUsable()) return;",
      "    if (!isUsable()) return;",
      "      catch (e) { if (isUsable()) { bundledFailure = true; renderBuildInfo(ver,pkg); sayK(\"ctlbundlebad\", \" \" + e.message); } return; }",
      "      if (!isUsable()) return;"
    ],
    "liveOnly": [
      "    if (!isLatest()) { try { await r.body?.cancel(); } catch {} return; }",
      "    if (!isLatest()) return;",
      "    if (!isLatest()) return;",
      "      catch (e) { if (isLatest()) { bundledFailure = true; renderBuildInfo(ver,pkg); sayK(\"ctlbundlebad\", \" \" + e.message); } return; }",
      "      if (!isLatest()) return;"
    ]
  },
  {
    "id": "bounded-download-timer-cleanup",
    "reason": "Always release the per-download deadline; reuse the identical selection-and-abort predicate for error reporting, preserving its evaluation order and controller identity cleanup.",
    "renderOnly": [
      "  } catch (e) { if (isUsable()) sayK(\"loadfail\", e.message); }",
      "    clearTimeout(deadline);"
    ],
    "liveOnly": [
      "  } catch (e) { if (isLatest() && !controller.signal.aborted) sayK(\"loadfail\", e.message); }"
    ]
  },
];

function parseUnifiedHunks(diff) {
  const hunks = [], lines = diff.split('\n');
  let cur = null;
  for (const line of lines) {
    if (line.startsWith('@@')) {
      if (cur) hunks.push(cur);
      cur = { liveOnly: [], renderOnly: [], header: line };
      continue;
    }
    if (!cur) continue;
    if (line.startsWith('+') && !line.startsWith('+++')) cur.renderOnly.push(line.slice(1));
    else if (line.startsWith('-') && !line.startsWith('---')) cur.liveOnly.push(line.slice(1));
  }
  if (cur) hunks.push(cur);
  return hunks;
}

function assertAllowedRendered(rendered, tempRoot = tmpdir()) {
  const live = gitBlob(LIVE_INSTALL_BLOB);
  const catalog = JSON.parse(gitBlob(LIVE_CATALOG_BLOB));
  // The repos were renamed after this live snapshot (X0X37-for-Loopy-Pro -> DnBOX,
  // x0x37-for-Loopy-Pro_nightly -> DnBOX-nightly). Map the old names in the
  // snapshot and in the catalog it carries, so the rename itself is not reported as a hunk.
  const renamed = live.replaceAll('x0x37-for-Loopy-Pro_nightly', 'DnBOX-nightly').replaceAll('X0X37-for-Loopy-Pro', 'DnBOX');
  // This pinned clip-mode instruction predates the DnBOX name.
  const oldInstruction = 'return to normal X0X operation with KNOB BANK';
  assert.equal(renamed.split(oldInstruction).length, 2);
  const a = normalize(renamed.replace(oldInstruction, 'return to normal DnBOX operation with KNOB BANK'));
  const b = normalize(rendered);
  const dir = mkdtempSync(join(tempRoot, 'installer-diff-'));
  const livePath = join(dir, 'live.html'), rendPath = join(dir, 'rendered.html');
  let comparison;
  try {
    writeFileSync(livePath, a.endsWith('\n') ? a : a + '\n');
    writeFileSync(rendPath, b.endsWith('\n') ? b : b + '\n');
    comparison = spawnSync('diff', ['-u', livePath, rendPath], { encoding: 'utf8', maxBuffer: 10e6 });
    if (comparison.error) throw comparison.error;
    if (comparison.status !== 0 && comparison.status !== 1) {
      throw new Error(`Installer comparison failed (${comparison.signal || comparison.status}): ${comparison.stderr}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const hunks = parseUnifiedHunks(comparison.stdout);
  const unused = new Set(ALLOWED.map(x => x.id));
  const unexpected = [];
  for (const h of hunks) {
    const fullDigest = createHash('sha256').update(JSON.stringify([h.liveOnly, h.renderOnly])).digest('hex');
    const added = JSON.stringify(h.renderOnly);
    const match = ALLOWED.find(allow => {
      if (allow.hunk_sha256) return allow.hunk_sha256 === fullDigest;
      if (JSON.stringify(allow.liveOnly) !== JSON.stringify(h.liveOnly)) return false;
      if (allow.renderOnlySha256) return createHash('sha256').update(added).digest('hex') === allow.renderOnlySha256;
      return JSON.stringify(allow.renderOnly) === added;
    });
    if (!match) unexpected.push({ header: h.header, liveOnly: h.liveOnly, renderOnly: h.renderOnly });
    else unused.delete(match.id);
  }
  assert.equal(unexpected.length, 0, 'unexpected hunks: ' + JSON.stringify(unexpected, null, 2));
  assert.equal(unused.size, 0, 'allowlisted hunk missing from the live diff: ' + [...unused]);
  assert.equal(hunks.length, ALLOWED.length);
}
function currentRendered() {
  return renderInstaller(JSON.parse(gitBlob(LIVE_CATALOG_BLOB))).replaceAll('x0x37-for-Loopy-Pro_nightly', 'DnBOX-nightly').replaceAll('X0X37-for-Loopy-Pro', 'DnBOX');
}
test('full-file comparisons release scratch files, including after a rejected change', t => {
  const scratch = mkdtempSync(join(tmpdir(), 'installer comparison '));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));
  const rendered = currentRendered();
  assertAllowedRendered(rendered, scratch);
  assert.deepEqual(readdirSync(scratch), []);
  assert.throws(() => assertAllowedRendered(rendered + '\n<!-- unreviewed -->', scratch), /unexpected hunks/);
  assert.deepEqual(readdirSync(scratch), []);
});

test('full rendered installer vs live gh-pages differs only by allowlisted hunks', () => {
  assertAllowedRendered(currentRendered());
});
test('the standalone review rejects font, route and permission changes', () => {
  const rendered = currentRendered();
  for (const [before, after] of [
    ['data:font/ttf;base64,AAE', 'data:font/ttf;base64,BAE'],
    ['data-src="../breaks/?embedded=1"', 'data-src="../projects/?embedded=1"'],
    ['frame.hidden = true;', 'navigator.requestMIDIAccess();'],
    ['href="../manual/index.html" data-t="navmanual"', 'href="../" data-t="navmanual"'],
  ]) {
    assert.ok(rendered.includes(before), before);
    assert.throws(() => assertAllowedRendered(rendered.replace(before, after)), /unexpected hunks/);
  }
});

test('release notice comparison rejects a different tag or hardware claim', () => {
  const rendered = currentRendered();
  for (const modified of [
    rendered.replace('releases/tag/v0.0.26\">0.0.26 release notes', 'releases/tag/v0.0.25.1\">0.0.26 release notes'),
    rendered.replace('The owner verified startup and restart', 'The owner verified every function'),
  ]) {
    assert.notEqual(modified, rendered);
    assert.throws(() => assertAllowedRendered(modified), /unexpected hunks|allowlisted hunk missing/);
  }
});

test('exact Restore allowance rejects lost padding, forced full headers and unrelated changes', () => {
  const rendered=currentRendered();
  const selector='img.subarray(SLOT_HDR_LEN, SLOT_HDR_AREA).some(byte => byte !== 0xff) ? SLOT_HDR_AREA : SLOT_HDR_LEN';
  assert.equal(rendered.split(selector).length,2);
  for(const changed of [rendered.replace(selector,'SLOT_HDR_LEN'),rendered.replace(selector,'SLOT_HDR_AREA'),rendered.replace(selector,selector.replace('!==','===')),rendered.replace('if (name === "fm-1") return null;','if (name === "smk-37") return null;')]) {
    assert.notEqual(changed,rendered);
    assert.throws(()=>assertAllowedRendered(changed),/unexpected hunks|allowlisted hunk missing/);
  }
});

test('approved release diff rejects drift in the restart handshake and report bindings', () => {
  const current = currentRendered();
  for (const old of ['restartTicket, dev, up.ports().length === 1','receiptBuild: selectedInstallBuild(ver, pkg, chosenModel)']) {
    assert.equal(current.split(old).length,2);
    assert.throws(()=>assertAllowedRendered(current.replace(old,'undefined')),/unexpected hunks|allowlisted hunk missing/);
  }
});

test('publicCatalog keeps display_version so 0.0.25.1 stays 0.0.25.1', () => {
  const catalog = JSON.parse(gitBlob(LIVE_CATALOG_BLOB));
  const pub = publicCatalog(catalog);
  const v = pub.versions.find(x => x.display_version === '0.0.25.1');
  assert.ok(v, '0.0.25.1 must survive publicCatalog()');
  assert.equal(v.display_version, '0.0.25.1');
  assert.equal(v.version, 'nightly-79280e76-dev');
  assert.equal(pub.versions.filter(x => x.display_version).length, 13);
  const html = renderInstaller(catalog);
  assert.match(html, /"display_version":"0\.0\.25\.1"/);
  // Label is computed at runtime from display_version; the source function is inlined.
  assert.match(html, /v\.display_version \+ " \(firmware " \+ assigned\.version \+ "\)"/);
});
