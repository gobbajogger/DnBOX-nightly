// SPDX-License-Identifier: GPL-3.0-only
import { readFileSync } from 'node:fs';

// File-open previews need the font inside the document, including when copied
// without the rest of the site. Use the same font and tool palette as the site.
const assets = 'web/product-site/assets/';
export const offlineThemeInputs = [
  assets + 'BarlowSemiCondensed-Medium.ttf',
  assets + 'BarlowSemiCondensed-Bold.ttf',
  assets + 'Barlow-OFL.txt',
];
function replaceOnce(source, marker, replacement) {
  if (source.split(marker).length !== 2) throw new Error('Offline theme expected one ' + marker);
  return source.replace(marker, replacement);
}

export function withOfflineTheme(html) {
  const fonts = offlineThemeInputs.slice(0, 2).map((path, index) => {
    const weight = index === 0 ? 400 : 700;
    const font = readFileSync(new URL('../' + path, import.meta.url));
    return `@font-face{font-family:Barlow;font-weight:${weight};src:url(data:font/ttf;base64,${font.toString('base64')}) format('truetype')}`;
  }).join('\n');
  const barlowLicense = readFileSync(new URL('../' + offlineThemeInputs[2], import.meta.url), 'utf8').replace(/[ \t]+$/gm, '');
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
  const styled = replaceOnce(html, '</head>', offlineTheme + '\n</head>');
  return replaceOnce(styled, '<script type="module">', `<script type="module">
if (location.protocol === 'file:') document.documentElement.classList.add('offline-tool');`);
}

export function withOfflineInstallerRouting(html) {
  const sampleFrame = replaceOnce(html, 'src="../breaks/?embedded=1"', 'data-src="../breaks/?embedded=1"');
  const projectFrame = replaceOnce(sampleFrame, 'src="../projects/?embedded=1"', 'data-src="../projects/?embedded=1"');
  const sampleLink = replaceOnce(projectFrame, 'href="../breaks/">Open sample tools separately',
    'href="../breaks/index.html">Open sample tools separately');
  const projectLink = replaceOnce(sampleLink, 'href="../projects/">Open Songs &amp; projects separately',
    'href="../projects/index.html">Open Songs &amp; projects separately');
  const initialize = replaceOnce(projectLink, 'function navigateWorkspace() {', `// Local files have separate origins. Use standalone workspaces there; the
// same-origin hosted installer can keep one embedded MIDI owner.
const standaloneTasks = location.protocol === "file:" ? {
  samples: "../breaks/index.html",
  projects: "../projects/index.html",
} : null;
if (standaloneTasks) {
  for (const [task, href] of Object.entries(standaloneTasks)) $(task + "-tab").href = href;
} else {
  for (const id of ["sample-frame", "project-frame"]) {
    const frame = $(id);
    frame.src = frame.dataset.src;
  }
}
function navigateWorkspace() {`);
  return replaceOnce(initialize, '  const samples = getSampleWorkspace(), projects = getProjectWorkspace();', `  if (standaloneTasks && task !== "firmware") {
    location.replace(standaloneTasks[task]);
    return;
  }
  const samples = getSampleWorkspace(), projects = getProjectWorkspace();`);
}
