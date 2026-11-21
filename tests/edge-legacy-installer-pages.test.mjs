// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';
import {SITE_ORIGIN} from '../web/product-site/site-origin.mjs';

const repo = new URL('../', import.meta.url);
const channels = [
  ['X0X37-for-Loopy-Pro', SITE_ORIGIN.firmwareRepo],
  ['x0x37-for-Loopy-Pro_nightly', SITE_ORIGIN.nightlyRepo],
];

for (const [previous, current] of channels) {
  test(`legacy ${previous} installer opens the ${current} channel`, () => {
    const path = `${previous}/install/index.html`;
    const page = readFileSync(new URL(`deployment/account-pages/${path}`, repo), 'utf8');
    const origin = `https://${SITE_ORIGIN.owner}.github.io`;
    const destination = `/${current}/install/`;
    const script = page.match(/<script>([\s\S]*?)<\/script>/)[1];
    for (const suffix of ['', '?model=elite#projects', '?next=//example.invalid/#buildarchive']) {
      const entry = new URL(`/${previous}/install/${suffix}`, origin);
      const calls = [];
      const location = {search: entry.search, hash: entry.hash, replace: url => calls.push(new URL(url, entry).href)};
      runInNewContext(script, {location});
      assert.deepEqual(calls, [origin + destination + suffix]);
    }
    assert.equal(page.match(/<noscript>\s*<meta http-equiv="refresh" content="0;url=([^"]+)">\s*<\/noscript>/i)[1], destination);
    assert.equal(page.match(/<a href="([^"]+)"/)[1], destination);
    assert.equal(page.match(/<link rel="canonical" href="([^"]+)"/)[1], origin + destination);

    // Only the account site's publishing root owns these two paths.
    assert.equal(existsSync(new URL(`docs/${path}`, repo)), false);
    const manifest = JSON.parse(readFileSync(new URL('web/product-site/SOURCE-MANIFEST.json', repo)));
    assert.equal(manifest.files.some(file => file.path === path), false);
  });
}
