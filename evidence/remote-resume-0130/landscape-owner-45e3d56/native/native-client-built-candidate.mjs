// SPDX-License-Identifier: GPL-3.0-only
// Run the actual Nightly Apply/Undo module with its existing DOM fixture. The
// transport is stdio into the exact firmware editor and a test-only scalar.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {resolve} from 'node:path';
import {createInterface} from 'node:readline';
import {setTimeout as delay} from 'node:timers/promises';
import {pathToFileURL} from 'node:url';

const [firmware, nightly] = process.argv.slice(2);
assert.ok(firmware && nightly, 'Supply the scalar test binary and pinned Nightly checkout');
const project = pathToFileURL(resolve(nightly) + '/');
const app = new URL('web/product-site/remote/firmware-link.mjs', project);
const {mountFirmwareLink} = await import(app);
const {REVIEWED_BUNDLE} = await import(new URL('./device/catalog.mjs', app));
const {decodeCommand, decodeReply, OP, STATUS} = await import(new URL('./device/vendor/codec.mjs', app));
const {dom} = await import(new URL('tests/product-remote/tests/firmware-link-dom.mjs', project));
assert.equal(REVIEWED_BUNDLE, null);

const crc = 0xecca5979;
const bundle = {
  catalog: {admitted: true, testOnly: true, count: 1, crc,
    controls: [{id: 1, kind: 1, min: 0, max: 127, label: '909 MIX Level'}]},
  admission: {testOnly: true, catalogCrc: crc, sourceSha: 'ba56645b2142b134be3aeee2236406e1c95b2bde', reviewSha: '3b18684ccadfd418675a75357806555c6c0ce9a1672ce8a5cabfba903dc2f608'},
};
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
get('conn-state').textContent='Not connected';
for(const id of ['connection-result','connection-message','close-connection']){const node=document.createElement('node');node.id=id;}

const midi = {inputs: new Map([['in', input]]), outputs: new Map([['out', output]])};
const link = mountFirmwareLink({document, bundle, navigator: {requestMIDIAccess: async () => midi}});
async function waitFor(predicate) {
  for (let i = 0; i < 200 && !predicate(); ++i) await delay(5);
  assert.ok(predicate(), get('conn-state').textContent);
}
try {
  await get('connect').click();
  await waitFor(() => get('conn-state').dataset.session === 'ready');
  assert.equal(get('fw-1').value, '75');
  get('fw-1').value = '76';
  get('fw-1').fire('input');
  assert.equal(get('apply').disabled, false);
  await get('apply').click();
  assert.equal(get('fw-1').value, '76');
  await waitFor(() => get('conn-state').textContent === 'Stored 76. Update queued.');
  await get('firmware-undo').click();
  await waitFor(() => get('conn-state').textContent === 'Restored stored value 75. Update queued.');
  assert.equal(get('fw-1').value, '75');

  const hello = trace.find(({r}) => r.op === OP.HELLO).r;
  const addressed = trace.filter(({c}) => c.control === 1).map(({c, r}) => {
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
  assert.equal(hello.value,0xecca5979);assert.equal(hello.control,1);
  assert.deepEqual([...nodes.keys()].filter(id=>id.startsWith('fw-')),['fw-1']);
  assert.ok(trace.filter(({c})=>c.op===OP.SET).every(({c})=>c.control===1));
  const proof={softwareOnly:true,realNativeEngine:true,syntheticScalar:false,stockCatalogAdmitted:false,
    testOnlyInjection:true,transport:'stdio into actual native C editor/project/engine',
    hello:{status:hello.status,count:hello.control,crc:hello.value},
    ownership:{target:'T_MIX',voice:'PART_909',parameter:'MX_LEVEL',id:1,min:0,max:127},
    coverage:{declared:1,confirmed:1,editable:1,unbound:0,scope:'Only this source-owned one-control test declaration'},addressed,trace};
  await get('connect').click();
  await waitFor(() => trace.at(-1).r.op === OP.CLOSE);
  assert.equal(trace.at(-1).r.status, STATUS.OK);
  await waitFor(()=>get('conn-state').textContent==='Disconnected');
  assert.equal(get('apply').disabled,true);
  const framesBeforeDismiss=trace.length;
  await get('close-connection').click();
  assert.equal(get('conn-state').textContent,'Not connected');assert.equal(get('connection-result').hidden,true);
  assert.equal(trace.length,framesBeforeDismiss);
  assert.equal(REVIEWED_BUNDLE,null);proof.closeConfirmed=true;
  proof.returnedIdleLabel={fixture:true,browser:false,before:'Not connected',afterClose:'Disconnected',afterDismiss:get('conn-state').textContent,noExtraProtocolFrames:true};
  console.log(JSON.stringify(proof));
} finally {
  await link.destroy();
  lines.close();
  child.stdin.end();
  assert.deepEqual(await exited, [0, null]);
}
