// SPDX-License-Identifier: GPL-3.0-only
// Build a source-only browser preview. It deliberately cannot add hosted firmware.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (name) => readFileSync(join(root, name), 'utf8');
const catalog = JSON.parse(read('preview-catalog.json'));
if (catalog.latest !== null || catalog.versions.length || catalog.history.length) {
  throw new Error('Nightly UI preview must not publish firmware catalog entries');
}
function replaceOnce(source, marker, replacement, where) {
  if (source.split(marker).length !== 2) throw new Error(`${where}: expected exactly one ${marker}`);
  return source.replace(marker, replacement);
}
function stripModule(source) {
  return source.replace(/^export\s+/gm, '').replace(/^import .*?;\r?\n/gm, '');
}
const installerLibraries = ['web/fm1pkg.js', 'web/fm1ota.js', 'web/x0x_breaks.js', 'web/product-site/install-reports.mjs']
  .map((name) => stripModule(read(name))).join('\n');
let installer = replaceOnce(read('web/x0x_installer.html'), '/*LIB*/', installerLibraries, 'installer');
installer = replaceOnce(installer, '/*CATALOG*/', JSON.stringify(catalog), 'installer');
installer = replaceOnce(installer, '/*HARDWARE_TEST_DATA*/{"schema":1,"reports":[]}',
  JSON.stringify(JSON.parse(read('web/product-site/hardware-tests.json'))), 'installer');
installer = replaceOnce(installer, '/*PACKAGE_VERSION_ASSIGNMENTS*/[]',
  JSON.stringify(JSON.parse(read('package-version-assignments.json')).assignments).replace(/</g, '\\u003c'), 'installer');
const sampleImporter = replaceOnce(read('web/x0x_breaks.html'), '/*LIB*/',
  stripModule(read('web/x0x_breaks.js')), 'sample importer');
const projects = read('web/x0x_projects.html').replace(
  /^import .* from "\.\/x0x_projects.js";$/m, '/*LIB*/');
const projectPage = replaceOnce(projects, '/*LIB*/',
  ['web/x0x_breaks.js', 'web/x0x_projects.js'].map(name => stripModule(read(name))).join('\n'), 'projects');
// File-open previews need the font inside the document, including when copied
// without the rest of the site. Use the same font and tool palette as the site.
const fonts = [
  ['Medium', 400],
  ['Bold', 700],
].map(([name, weight]) => {
  const font = readFileSync(join(root, `web/product-site/assets/BarlowSemiCondensed-${name}.ttf`));
  return `@font-face{font-family:Barlow;font-weight:${weight};src:url(data:font/ttf;base64,${font.toString('base64')}) format('truetype')}`;
}).join('\n');
const barlowLicense = read('web/product-site/assets/Barlow-OFL.txt').replace(/[ \t]+$/gm, '');
const offlineTheme = `<style>
/*
${barlowLicense}
*/
${fonts}
:root.offline-tool:not([data-theme="light"]) {
  color-scheme: dark;
  --bg: #101715;
  --card: #1b2b20;
  --fg: #e7eee2;
  --ink: #e7eee2;
  --dim: #b6c7af;
  --muted: #b6c7af;
  --rule: #3c5140;
  --line: #3c5140;
  --accent: #c8dfa7;
}
.offline-tool body { font-family: Barlow, sans-serif; }
</style>`;
function withOfflineTheme(html) {
  const styled = replaceOnce(html, '</head>', offlineTheme + '\n</head>', 'offline theme');
  return replaceOnce(styled, '<script type="module">', `<script type="module">
if (location.protocol === 'file:') document.documentElement.classList.add('offline-tool');`, 'offline theme toggle');
}

const outputs = {
  'docs/install/index.html': withOfflineTheme(installer),
  'docs/breaks/index.html': withOfflineTheme(sampleImporter),
  'docs/projects/index.html': withOfflineTheme(projectPage),
  'docs/versions.json': JSON.stringify(catalog, null, 2) + '\n',
};
const check = process.argv.includes('--check');
for (const [path, content] of Object.entries(outputs)) {
  if (check) {
    if (read(path) !== content) throw new Error(`${path} differs from source; run npm run build`);
  } else {
    const fullPath = join(root, path);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
  }
}
console.log(`${check ? 'CHECK' : 'BUILD'} PASS — self-contained nightly installer, samples, projects and empty catalog; no firmware files`);
