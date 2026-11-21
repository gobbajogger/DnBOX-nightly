// SPDX-License-Identifier: GPL-3.0-only
// Keep the downloaded tools self-contained, including the bundled font license.
import { readFileSync } from 'node:fs';

const assets = 'web/product-site/assets/';
const faces = [
  [500, 'BarlowSemiCondensed-Medium.ttf'],
  [700, 'BarlowSemiCondensed-Bold.ttf'],
];
const license = assets + 'Barlow-OFL.txt';
export const standaloneFontInputs = [license, ...faces.map(([, name]) => assets + name)];

export function inlineStandaloneFonts(template) {
  const marker = '/* STANDALONE_BARLOW_FACES */';
  if (template.split(marker).length !== 2) throw new Error('expected one offline font marker');
  const root = new URL('../', import.meta.url);
  const notice = readFileSync(new URL(license, root), 'utf8').replace(/[ \t]+$/gm, '').trimEnd();
  const rules = faces.map(([weight, name]) => {
    const data = readFileSync(new URL(assets + name, root)).toString('base64');
    return `@font-face { font-family: "DnBOX Barlow"; font-style: normal; font-weight: ${weight}; src: url(data:font/ttf;base64,${data}) format("truetype"); }`;
  });
  return template.replace(marker, () => [`/*
${notice}
*/`, ...rules].join('\n'));
}
