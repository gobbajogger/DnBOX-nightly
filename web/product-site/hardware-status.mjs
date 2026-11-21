// SPDX-License-Identifier: GPL-3.0-only
import {fetchHardwareTests, hardwareTestsFor, effectivePackageVersion} from './hardware-tests.mjs';

const output = document.querySelector('[data-hardware-reports]');
if (output) {
  try {
    const [ledger, response, assignmentResponse] = await Promise.all([
      fetchHardwareTests(new URL('./hardware-tests.json', import.meta.url)),
      fetch(new URL('./versions.json', import.meta.url), {cache:'no-store', redirect:'error'}),
      fetch(new URL('./package-version-assignments.json', import.meta.url), {cache:'no-store', redirect:'error'})
    ]);
    if (!response.ok || response.redirected) throw new Error('Catalog unavailable');
    const catalog = await response.json();
    const assignments = assignmentResponse.ok && !assignmentResponse.redirected ? await assignmentResponse.json() : [];
    const rows = [];
    for (const row of catalog.versions) {
      const models = Object.keys(row.models || {}).filter(model => hardwareTestsFor(ledger, row, model, assignments));
      if (!models.length) continue;
      const item = document.createElement('li');
      item.textContent = 'DnBOX ' + effectivePackageVersion(row, assignments) + ' · ' + models.map(model => 'SMK-37 ' +
        model[0].toUpperCase() + model.slice(1)).join(', ') + ' · Startup and restart confirmed';
      rows.push(item);
    }
    const list = document.createElement('ul');
    list.append(...rows);
    if (rows.length) output.replaceChildren(list);
    else output.textContent = 'No exact-package startup and restart confirmations are recorded.';
  } catch {
    output.textContent = 'Current owner hardware records are unavailable.';
  }
}
