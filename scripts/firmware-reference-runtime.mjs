// SPDX-License-Identifier: GPL-3.0-only
import {join} from 'node:path';
import {readEmulatorPin, readRuntimeFiles} from './emulator-runtime.mjs';

export function readFirmwareReference(repoRoot, directory) {
  if (!directory) throw Error('Firmware screen renderer missing. Set DNBOX_FWUI_RUNTIME to the qualified artifact directory.');
  const pin = readEmulatorPin(join(repoRoot, 'scripts/firmware-reference-pin.json'));
  const maxBytes = 4 * 1024 * 1024;
  const limits = {'fwui.wasm':maxBytes,'routes.wasm':maxBytes,'normal.wasm':maxBytes,'wave.wasm':maxBytes,'guard.wasm':maxBytes,'synthone-patch.wasm':maxBytes,'synthone-frame.wasm':maxBytes};
  if (!/^([a-f0-9]{40})$/.test(pin.firmware) || Object.keys(pin.files).sort().join() !== Object.keys(limits).sort().join()) {
    throw Error('Invalid firmware screen renderer pin');
  }
  return readRuntimeFiles({directory, files:pin.files, limits, prefix:'reference/screens/'});
}
