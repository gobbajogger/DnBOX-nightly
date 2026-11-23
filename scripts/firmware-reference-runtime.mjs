// SPDX-License-Identifier: GPL-3.0-only
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {readEmulatorPin, readRuntimeFiles} from './emulator-runtime.mjs';
import {runFixture} from '../web/product-site/reference/screens/runner.mjs';
import {paintFrame} from '../web/product-site/reference/screens/render.mjs';

const prefix = 'reference/screens/';
const maxBytes = 4 * 1024 * 1024;
const limits = {'fwui.wasm':maxBytes,'routes.wasm':maxBytes,'normal.wasm':maxBytes,'wave.wasm':maxBytes,'guard.wasm':maxBytes,'synthone-patch.wasm':maxBytes,'synthone-frame.wasm':maxBytes};
const revision = /^[a-f0-9]{40}$/;

export function readFirmwareReference(repoRoot, directory, requestedRevision) {
  if (!directory) throw Error('Firmware screen renderer missing. Set DNBOX_FWUI_RUNTIME to the qualified artifact directory.');
  const explicit = requestedRevision !== undefined;
  if (explicit && (typeof requestedRevision !== 'string' || !revision.test(requestedRevision))) throw Error('Invalid requested firmware screen revision');
  // Never take the pin from the runtime directory. Only a reviewed repository
  // pin can opt in a different revision, independent of the historical default.
  const filename = explicit ? `firmware-reference-pins/${requestedRevision}.json` : 'firmware-reference-pin.json';
  const pin = readEmulatorPin(join(repoRoot, 'scripts', filename));
  const expected = explicit ? {...limits, 'states.json':maxBytes, 'native-rgb.tsv':maxBytes} : limits;
  if (!revision.test(pin.firmware) || (explicit && pin.firmware !== requestedRevision) ||
      !pin.files || Object.keys(pin.files).sort().join('|') !== Object.keys(expected).sort().join('|')) {
    throw Error('Invalid firmware screen renderer pin or revision mismatch');
  }
  const files = readRuntimeFiles({directory, files:pin.files, limits:expected, prefix});
  if (explicit) verifyReference(pin.firmware, new Map(files.map(([name, bytes]) => [name.slice(prefix.length), bytes])));
  return files;
}

function verifyReference(firmware, files) {
  const {firmware:source, groups, kinds, modules, states} = JSON.parse(files.get('states.json'));
  const labels = xs => Array.isArray(xs) && xs.length > 0 && xs.every(x => typeof x === 'string' && x.trim());
  if (source !== firmware || !labels(groups) || !labels(kinds) || !labels(modules) ||
      [...modules].sort().join('|') !== Object.keys(limits).sort().join('|') || !Array.isArray(states)) {
    throw Error('Invalid firmware screen state manifest or revision mismatch');
  }
  const native = new Map();
  for (const line of files.get('native-rgb.tsv').toString('utf8').replace(/\n$/, '').split('\n')) {
    const [id, hash, extra] = line.split('\t');
    if (!id || extra !== undefined || !/^[a-f0-9]{64}$/.test(hash ?? '') || native.has(id)) throw Error('Invalid or duplicate native oracle state');
    native.set(id, hash);
  }
  const batches = new Map(modules.map(name => [name, new Map()]));
  const rows = new Map();
  const index = (i, list) => Number.isInteger(i) && i >= 0 && i < list.length;
  for (const row of states) {
    if (!Array.isArray(row) || row.length !== 5) throw Error('Invalid firmware screen state row');
    const [id, group, kind, module, family] = row;
    if (typeof id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(id) || rows.has(id) ||
        !index(group, groups) || !index(kind, kinds) || !index(module, modules) ||
        !Number.isInteger(family) || family < 0 || family > 255 || !native.has(id)) {
      throw Error('Invalid, duplicate, or unproved firmware screen state: '+id);
    }
    rows.set(id, row);
    const families = batches.get(modules[module]);
    if (!families.has(family)) families.set(family, new Set());
    families.get(family).add(id);
  }
  if (native.size !== rows.size) throw Error('Native oracle and selector states differ');

  // These public state keys encode the model-specific register input family.
  for (const [model, first] of [['elite', 0], ['pro', 2]]) {
    for (const [suffix, family] of [['first-fault', first], ...['fault','post-crash','retry','safe'].map(x => ['safe-play-'+x, first+1])]) {
      const id = `guard-${model}-${suffix}`;
      const row = rows.get(id);
      if (!row || modules[row[3]] !== 'guard.wasm' || row[4] !== family) throw Error('Missing or mismatched model guard state: '+id);
    }
  }
  const rgba = new Uint8ClampedArray(240*240*4);
  const rgb = Buffer.alloc(240*240*3);
  const context = {createImageData: () => ({data:rgba}), putImageData() {}};
  for (const [name, families] of batches) {
    if (!families.size) throw Error('Firmware screen module has no states: '+name);
    const wasm = new WebAssembly.Module(files.get(name));
    for (const [family, pending] of families) {
      // Same module/family dispatcher and first capture semantics as the browser.
      runFixture(wasm, family, (id, frame) => {
        if (!pending.delete(id)) return;
        paintFrame(context, frame);
        for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
          rgb[j] = rgba[i]; rgb[j + 1] = rgba[i + 1]; rgb[j + 2] = rgba[i + 2];
        }
        if (createHash('sha256').update(rgb).digest('hex') !== native.get(id)) throw Error('Native frame digest mismatch: '+id);
      });
      if (pending.size) throw Error('Firmware screen state not produced: '+[...pending].join(', '));
    }
  }
}
