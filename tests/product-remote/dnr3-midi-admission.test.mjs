// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import test from 'node:test';
import {mountDnr3Link, tempoEdit} from '../../web/product-site/remote/dnr3-link.mjs';

function fixture(nav) {
  const nodes = new Map(['connect', 'conn-state', 'draft-project-label',
    'connection-result', 'connection-message', 'close-connection'].map(id => [id, {
      dataset: {}, setAttribute(k, v) { this[k] = v; },
      addEventListener(k, fn) { this[k] = fn; },
      focus() { this.focused = true; },
    }]));
  const get = id => nodes.get(id);
  const link = mountDnr3Link({document: {getElementById: get}, navigator: nav});
  return {get, link};
}

for (const denied of [false, true]) {
  test(denied ? 'denied Web MIDI SysEx remains in Draft' : 'absent Web MIDI remains in Draft', async () => {
    const requests = [];
    const nav = denied ? {async requestMIDIAccess(options) {
      assert.equal(this, nav);
      requests.push(options);
      throw new DOMException('Denied', 'NotAllowedError');
    }} : {};
    const {link, get} = fixture(nav);
    assert.equal(get('connection-result').hidden, true);
    await link.connect();
    assert.deepEqual(requests, denied ? [{sysex: true}] : []);
    assert.equal(link.connected(), false);
    assert.equal(link.noRemoteReply(), false);
    assert.equal(get('conn-state').textContent, 'Disconnected');
    assert.equal(get('connect')['aria-pressed'], 'false');
    assert.equal(get('draft-project-label').hidden, false);
    assert.equal(get('connection-result').hidden, false);
    assert.match(get('connection-message').textContent, denied ? /Allow MIDI access/ : /Web MIDI isn’t available.*Draft/);
    assert.equal(get('close-connection').focused, true);
    assert.deepEqual(await link.send(tempoEdit(126)), {sent: false});
    get('close-connection').click();
    assert.equal(get('connection-result').hidden, true);
    assert.equal(get('connect').focused, true);
  });
}
