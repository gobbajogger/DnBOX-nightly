import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createInterface} from 'node:readline';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const [host, nightly] = process.argv.slice(2);
const project = pathToFileURL(resolve(nightly) + '/');
const {encodeCommand, decodeReply, OP, STATUS} = await import(new URL('web/product-site/remote/device/vendor/codec.mjs', project));
const child = spawn(resolve(host), ['--serve'], {stdio: ['pipe', 'pipe', 'inherit']});
const exited = once(child, 'exit');
const lines = createInterface({input: child.stdout});
const replies = lines[Symbol.asyncIterator]();
let request = 0, epoch = 0, unit = 0, unitHigh = [0, 0, 0];
const observations = [];
async function exchange(op, fields = {}, expect = STATUS.OK) {
 const c = {version: 2, op, unit, unitHigh, client: 91, epoch, request: ++request, revision: 1,
            control: 0, token: 0, value: 0, ...fields};
 child.stdin.write(Buffer.from(encodeCommand(c)).toString('hex') + '\n');
 const {value, done} = await replies.next();
 assert.equal(done, false);
 if (expect === null) {
   assert.equal(value, '');
   observations.push({op, status: 'no_reply'});
   return;
 }
 const r = decodeReply(Buffer.from(value, 'hex'));
 assert.equal(r.request, c.request);
 assert.equal(r.op, op);
 assert.equal(r.client, c.client);
 assert.equal(r.status, expect);
 observations.push({op, status: r.status, control: r.control, revision: r.revision, value: r.value});
 return r;
}
try {
 const hello = await exchange(OP.HELLO, {revision: 0});
 assert.deepEqual([hello.control, hello.value, hello.revision], [1, 0xecca5979, 1]);
 ({unit, unitHigh} = hello);
 const open = await exchange(OP.OPEN, {revision: 0});
 epoch = open.epoch;
 assert.ok(epoch > 0);
 await exchange(OP.READ, {control: 2}, STATUS.UNSUPPORTED);
 await exchange(OP.SET, {control: 2, value: 64}, STATUS.UNSUPPORTED);
 await exchange(OP.DOWN, {control: 1, token: 1, value: 1}, STATUS.UNSUPPORTED);
 await exchange(OP.UP, {control: 1, token: 1}, STATUS.UNSUPPORTED);
 await exchange(OP.SET, {control: 1, value: 64, unitHigh: [(unitHigh[0] ^ 1) >>> 0, ...unitHigh.slice(1)]}, null);
 const before = await exchange(OP.READ, {control: 1});
 assert.deepEqual([before.value, before.revision], [75, 1]);
 await exchange(OP.CLOSE);
 await exchange(OP.SET, {control: 1, value: 64}, STATUS.STALE);
 const reopened = await exchange(OP.OPEN, {revision: 0, epoch: 0});
 assert.ok(reopened.epoch > epoch);
 epoch = reopened.epoch;
 const after = await exchange(OP.READ, {control: 1});
 assert.deepEqual([after.value, after.revision], [75, 1]);
 await exchange(OP.CLOSE);
 console.log(JSON.stringify({testOnly: true, observations, storedUnchanged: true,
  identityScope: 'DNR2 boot incarnation correlation with fixture entropy, not a stock raw hardware serial'}));
} finally {
 lines.close();
 child.stdin.end();
 assert.deepEqual(await exited, [0, null]);
}
