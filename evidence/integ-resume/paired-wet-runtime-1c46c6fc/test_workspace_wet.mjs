// SPDX-License-Identifier: GPL-3.0-only
// Run the actual Nightly Apply/Undo module with its existing DOM fixture. The
// transport is stdio into the exact wet firmware editor with the selected opt-in catalog.
import assert from 'node:assert/strict';
import {execFileSync, spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {once} from 'node:events';
import {resolve} from 'node:path';
import {createInterface} from 'node:readline';
import {setTimeout as delay} from 'node:timers/promises';
import {pathToFileURL} from 'node:url';

const [firmware, nightly, firmwareCheckout] = process.argv.slice(2);
assert.ok(firmware && nightly, 'Supply the scalar test binary and pinned Nightly checkout');
const project = pathToFileURL(resolve(nightly) + '/');
const app = new URL('web/product-site/remote/firmware-link.mjs', project);
const {mountFirmwareLink} = await import(app);
const {REVIEWED_BUNDLE} = await import(new URL('./device/catalog.mjs', app));
const {decodeCommand, decodeReply, OP, STATUS} = await import(new URL('./device/vendor/codec.mjs', app));
const {dom} = await import(new URL('tests/product-remote/tests/firmware-link-dom.mjs', project));
assert.equal(REVIEWED_BUNDLE, null);

const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const revision = checkout => execFileSync('git', ['-C', checkout, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
const firmwareHead = revision(firmwareCheckout), nightlyHead = revision(nightly);
assert.equal(firmwareHead, '1c46c6fc8d7a550b3308515a3415ea63d86e7486');
assert.equal(nightlyHead, 'b0af34316dad63815fadee07863318b5310f140e');
const binarySha256 = hash(firmware);
assert.equal(binarySha256, '18acaea9d1247d613daaea1f0910b173366b8d09e7e097947b0cf9197b110d9e');
const selected = new URL('.output/verified-909-mix/candidate-catalog.mjs', project);
const catalogSha256 = hash(selected);
assert.equal(catalogSha256, 'e703230b78c9615f66b0ab8f4c682f9a9722d32690da911cad198c60ec203269');
const {REVIEWED_BUNDLE: bundle} = await import(selected);
const crc = 0xecca5979;
assert.equal(bundle.catalog.crc, crc);
assert.equal(bundle.catalog.count, 1);
assert.deepEqual(bundle.catalog.controls, [{id:1, kind:1, label:'909 MIX Level', min:0, max:127}]);
assert.equal(bundle.admission.softwareOnly, true);
assert.equal(bundle.admission.staging, true);
assert.equal(bundle.admission.testOnly, undefined);

const defaults = dom();
let defaultMidiRequests = 0;
const defaultLink = mountFirmwareLink({document: defaults.document, bundle: REVIEWED_BUNDLE,
  navigator: {requestMIDIAccess: async () => { defaultMidiRequests++; }}});
await defaults.nodes.get('connect').click();
assert.match(defaults.nodes.get('conn-state').textContent, /No reviewed firmware catalog/);
assert.equal(defaults.nodes.get('apply').disabled, true);
assert.equal(defaultMidiRequests, 0);
await defaultLink.destroy();

const child = spawn(resolve(firmware), ['--serve'], {stdio: ['pipe', 'pipe', 'inherit']});
const exited = once(child, 'exit');
const input = Object.assign(new EventTarget(), {state: 'connected'});
const commands = [], trace = [];
const lines = createInterface({input: child.stdout});
lines.on('line', line => {
  const data = Buffer.from(line, 'hex');
  const r = decodeReply(data), c = commands.shift();
  assert.equal(r.request, c.request);
  trace.push({c, r});
  input.dispatchEvent(Object.assign(new Event('midimessage'), {data}));
});
const output = {
  state: 'connected',
  send(data) {
    commands.push(decodeCommand(data));
    child.stdin.write(Buffer.from(data).toString('hex') + '\n');
  },
};
const {document, nodes} = dom();
const get = id => nodes.get(id);
const midi = {inputs: new Map([['in', input]]), outputs: new Map([['out', output]])};
const link = mountFirmwareLink({document, bundle, navigator: {requestMIDIAccess: async options => {
  assert.deepEqual(options, {sysex:true});
  return midi;
}}});
async function waitFor(predicate) {
  for (let i = 0; i < 500 && !predicate(); ++i) await delay(5);
  assert.ok(predicate(), get('conn-state').textContent);
}
try {
  await get('connect').click();
  await waitFor(() => get('conn-state').dataset.session === 'ready');
  assert.equal(get('fw-1').value, '75');
  await waitFor(() => trace.some(({r}) => r.op === OP.KEEPALIVE && r.status === STATUS.OK));
  assert.equal(trace.filter(({c}) => c.op === OP.SET).length, 0);
  get('fw-1').value = '76';
  get('fw-1').fire('input');
  assert.equal(get('apply').disabled, false);
  await get('apply').click();
  assert.equal(get('fw-1').value, '76');
  await waitFor(() => get('conn-state').textContent === 'Stored 76. Update queued.');
  await get('firmware-undo').click();
  await waitFor(() => get('conn-state').textContent === 'Restored stored value 75. Update queued.');
  assert.equal(get('fw-1').value, '75');

  const {c: helloCommand, r: hello} = trace.find(({r}) => r.op === OP.HELLO);
  assert.ok(helloCommand.client > 0);
  assert.equal(hello.control, 1);
  assert.equal(hello.value, crc);
  assert.equal(hello.status, STATUS.OK);
  const addressed = trace.filter(({c}) => c.control === 1).map(({c, r}) => {
    assert.equal(c.client, helloCommand.client);
    assert.ok(hello.unit && c.unit === hello.unit);
    assert.deepEqual(c.unitHigh, hello.unitHigh);
    assert.equal(c.control, r.control);
    return [r.op, r.status, r.revision, r.value];
  });
  assert.deepEqual(addressed, [
    [OP.READ, STATUS.OK, 1, 75],
    [OP.SET, STATUS.QUEUED, 2, 76],
    [OP.READ, STATUS.OK, 2, 76],
    [OP.READ, STATUS.OK, 2, 76],
    [OP.SET, STATUS.QUEUED, 3, 75],
    [OP.READ, STATUS.OK, 3, 75],
  ]);
  await get('connect').click();
  await waitFor(() => trace.at(-1).r.op === OP.CLOSE);
  assert.equal(trace.at(-1).r.status, STATUS.OK);
  assert.equal(get('apply').disabled, true);
  const runtimeFiles = [
    'web/product-site/remote/app.mjs', 'web/product-site/remote/firmware-link.mjs',
    'web/product-site/remote/device/catalog.mjs', 'web/product-site/remote/device/session.mjs',
    'web/product-site/remote/device/vendor/client.mjs', 'web/product-site/remote/device/vendor/codec.mjs',
    'tests/product-remote/tests/firmware-link-dom.mjs',
  ];
  console.log(JSON.stringify({
    status: 'PASS', chromium: 'NOT_RUN', browserEquivalent: false, softwareOnly: true,
    liveDefaultCatalogAdmitted: false, defaultMidiRequests, node: process.version,
    nightlyHead, firmwareHead, binarySha256, catalogSha256,
    runtimeFileSha256: Object.fromEntries(runtimeFiles.map(path => [path, hash(new URL(path, project))])),
    nodeHarnessSha256: hash(new URL(import.meta.url)),
    transport: 'Node DOM fixture and stdio bridge to the real wet firmware host',
    hello: {status: hello.status, count: hello.control, crc: hello.value},
    addressed,
    wire: trace.map(({c, r}) => ({op:r.op, status:r.status, control:r.control, revision:r.revision, value:r.value,
      request:c.request, guardedRevision:c.revision})),
    close: {status: trace.at(-1).r.status},
  }, null, 2));
} finally {
  await link.destroy();
  lines.close();
  child.stdin.end();
  assert.deepEqual(await exited, [0, null]);
}
