// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const release = 'https://github.com/gobbajogger/DnBOX/releases/tag/v0.0.26';
const download = 'https://github.com/gobbajogger/DnBOX/releases/download/v0.0.26/';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const manual = ['web/product-site/manual/index.html', 'web/product-site/manual/legacy.html'];
const changes = ['CHANGELOG.md', 'docs/new/index.html', 'web/product-site/new/index.html'];

test('current release entry points identify the published source and startup/restart scope', () => {
  for (const path of ['README.md', 'docs/RELEASES.md', ...manual, ...changes]) {
    const text = read(path);
    assert.ok(text.includes(release), path);
    assert.match(text, /94197fc8/, path);
    assert.match(text, /startup and restart/i, path);
  }
  for (const model of ['elite', 'pro']) {
    assert.ok(read('README.md').includes(download + 'dnbox-x0x37-0.0.26-' + model + '.fwsc'));
  }
});

test('installer source and both built surfaces link the release without modifying admission', () => {
  for (const path of ['web/x0x_installer.html', 'docs/install/index.html', 'web/product-site/install/index.html']) {
    const notice = read(path).match(/<aside class="release-notice"[^>]*>([\s\S]*?)<\/aside>/)?.[1];
    assert.ok(notice?.includes(release), path);
    assert.match(notice, /600b3b45.{0,30}withdrawn/, path);
  }
  const catalog = JSON.parse(read('preview-catalog.json'));
  assert.equal(catalog.latest, null);
  assert.deepEqual(catalog.versions, []);
});

test('build history distinguishes the current release from its archived entries', () => {
  const page = read('web/product-site/builds/index.html');
  assert.ok(page.slice(0, page.indexOf('data-record-id=')).includes(release));
  const recordIds = [...page.matchAll(/data-record-id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(recordIds.filter(id => id === 'release-v0.0.26-94197fc8').length, 1);
  assert.equal(new Set(recordIds.filter(id => id !== 'release-v0.0.26-94197fc8')).size, 197);
  assert.equal(recordIds.length, 198);
});

test('the archived FM-1 manual has a title and readable section numbers', () => {
  const page = read('web/product-site/manual/original/index.html');
  assert.match(page, /<h1>[^<]*FM-1[^<]*<\/h1>/);
  const headings = [...page.matchAll(/<h2 id="s(\d+)">([\s\S]*?)<\/h2>/g)];
  assert.equal(headings.length, 19);
  for (const [, number, heading] of headings) {
    const contents = page.match(new RegExp('<a href="#s' + number + '">([^<]+)</a>'));
    assert.ok(contents, 'Missing contents entry for section ' + number);
    assert.equal(heading.replace(/<[^>]+>/g, ''), number + ' ' + contents[1]);
  }
});
