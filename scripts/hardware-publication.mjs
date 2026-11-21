// SPDX-License-Identifier: GPL-3.0-only
import {catalogWithHardwareTests, statusWithHardwareTests, validateHardwareTests} from '../web/product-site/hardware-tests.mjs';

const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');

export function applyHardwarePublication(files) {
  if (!files.has('hardware-tests.json')) return;
  const ledger = validateHardwareTests(JSON.parse(files.get('hardware-tests.json')));
  const assignments = files.has('package-version-assignments.json') ? JSON.parse(files.get('package-version-assignments.json')) : [];
  const catalog = catalogWithHardwareTests(ledger, JSON.parse(files.get('versions.json')), assignments);
  files.set('versions.json', json(catalog));
  const status = statusWithHardwareTests(ledger, catalog, JSON.parse(files.get('build-status.json')));
  files.set('build-status.json', json(status));

  // Self-contained release HTML carries exactly the same evidence as the standalone catalog.
  // The browser also reads the live ledger for any owner updates made after this build.
  const installer = files.get('install/index.html').toString();
  const replaceField = (html, pattern, value) => {
    if (!pattern.test(html)) throw new Error('Missing hardware evidence field in installer');
    return html.replace(pattern, () => value);
  };
  const inline = value => JSON.stringify(value).replaceAll('<', '\\u003c');
  const withCatalog = replaceField(installer, /^const catalog = .*;$/m, 'const catalog = ' + inline(catalog) + ';');
  files.set('install/index.html', Buffer.from(replaceField(withCatalog, /^let currentHardwareLedger = .*;$/m,
    'let currentHardwareLedger = ' + inline(ledger) + ';')));
}
