// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {buildProductSite} from '../scripts/build-product-site.mjs';

const firmware = '84a0554006b916d4a0ba32d5cfb8356f5c029f40';
const previous = '61827a714ca7b240c01a55ed347b5fd7b847c7c2';
const modules = ['fwui.wasm','routes.wasm','normal.wasm','wave.wasm','guard.wasm','synthone-patch.wasm','synthone-frame.wasm'];
const models = ['elite','pro'];
const guardStates = ['first-fault','safe-play-fault','safe-play-post-crash','safe-play-retry','safe-play-safe'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const rgb = hash(Buffer.alloc(240*240*3));
const string = s => [s.length,...Buffer.from(s)];
function fixture(t) {
 const repoRoot = mkdtempSync(join(tmpdir(),'fwui-producer-'));
 t.after(() => rmSync(repoRoot,{recursive:true,force:true}));
 const path = name => join(repoRoot,name);
 const put = (name,bytes) => { mkdirSync(join(path(name),'..'),{recursive:true}); writeFileSync(path(name),bytes); };
 const json = (name,data) => put(name,JSON.stringify(data));
 const screens = 'reference/screens/';
 const manifest = {schema:'dnbox-product-site-source/1',publicationQualified:false,files:[{path:screens+'index.html'},{path:screens+'states.json'}]};
 json('web/product-site/SOURCE-MANIFEST.json',manifest);
 put('web/product-site/'+screens+'index.html',`<a href="/commit/${previous}">${previous.slice(0,8)}</a>`);
 json('web/product-site/'+screens+'states.json',{firmware:previous});
 put('tests/firmware-reference/native-rgb.tsv','historical oracle\n');
 const wasmFiles = {};
 const states = {firmware,groups:['Screens'],kinds:['Example'],modules,states:[]};
 const hashes = new Map();
 modules.forEach((name,i) => {
  const ids = name === 'guard.wasm' ? models.flatMap((m,j) => guardStates.map((s,k) => [`guard-${m}-${s}`,j*2+(k!==0?1:0)])) : [[`fixture-${i}`,0]];
  for (const [id,family] of ids) {states.states.push([id,0,0,i,family]); hashes.set(id,rgb);}
  wasmFiles[name] = fixtureWasm(ids);
 });
 const setup = (pinRevision=firmware) => {
  const files = {...wasmFiles,'states.json':JSON.stringify(states),'native-rgb.tsv':[...hashes].map(row=>row.join('\t')).join('\n')+'\n'};
  const entries = {};
  for (const [n,v] of Object.entries(files)) {put('artifact/'+n,v); entries[n]={bytes:Buffer.byteLength(v),sha256:hash(v)};}
  json(`scripts/firmware-reference-pins/${firmware}.json`,{firmware:pinRevision,files:entries});
  json('scripts/firmware-reference-pin.json',{firmware:previous,files:Object.fromEntries(modules.map(n=>[n,entries[n]]))});
 };
 const output = path('.output/site');
 const run = (revision=firmware) => buildProductSite({repoRoot,output,firmwareReferenceRevision:revision,firmwareReferenceRuntime:path('artifact')});
 return {path,put,setup,run,states,hashes,output,repoRoot,wasmFiles};
}

function leb(value) {const bytes=[];do {bytes.push((value&127)|(value>=128?128:0));value>>>=7;}while(value);return bytes;}
// Tiny C-free fixture with the same env.capture/family ABI as the browser.
function fixtureWasm(states) {
 const sec=(n,b)=>[n,...leb(b.length),...b];
 const body=[0];
 const segments=[];
 for (const [index,[id,family]] of states.entries()) {
  const pointer=index*48+256;
  body.push(0x10,1,0x41,family,0x46,0x04,0x40,0x41,...leb(pointer),0x41,0x80,0x10,0x10,0,0x0b);
  segments.push(0,0x41,...leb(pointer),0x0b,id.length+1,...Buffer.from(id),0);
 }
 body.push(0x0b);
 return Buffer.from([0,97,115,109,1,0,0,0,
  ...sec(1,[3,0x60,2,0x7f,0x7f,0,0x60,0,0,0x60,0,1,0x7f]),
  ...sec(2,[2,...string('env'),...string('capture'),0,0,...string('env'),...string('family'),0,2]),
  ...sec(3,[1,1]),...sec(5,[1,0,2]),
  ...sec(7,[2,...string('memory'),2,0,...string('_start'),0,2]),
  ...sec(10,[1,...leb(body.length),...body]),...sec(11,[states.length,...segments])]);
}

test('explicit reviewed source admits selector, verified native pixels and all seven modules, not /emu/',t=>{
 const x=fixture(t); x.setup(); x.run();
 assert.equal(JSON.parse(readFileSync(join(x.output,'reference/screens/states.json'))).firmware,firmware);
 assert.match(readFileSync(join(x.output,'reference/screens/index.html'),'utf8'),new RegExp(firmware));
 assert.deepEqual(readFileSync(join(x.output,'reference/screens/native-rgb.tsv')),readFileSync(x.path('artifact/native-rgb.tsv')));
 assert(!existsSync(join(x.output,'emu')));
});
test('historical route still stages repository selector and oracle, ignoring candidate data',t=>{
 const x=fixture(t); x.setup();
 buildProductSite({repoRoot:x.repoRoot,output:x.output,firmwareReferenceRuntime:x.path('artifact')});
 assert.equal(JSON.parse(readFileSync(join(x.output,'reference/screens/states.json'))).firmware,previous);
 assert.equal(readFileSync(join(x.output,'reference/screens/native-rgb.tsv'),'utf8'),'historical oracle\n');
});
for (const [label,alter,pattern] of [
 ['pin revision',x=>x.setup(previous),/revision mismatch/],
 ['unreviewed request',x=>{x.requested='b'.repeat(40);},/ENOENT/],
 ['manifest revision',x=>{x.states.firmware=previous;x.setup();},/revision mismatch/],
 ['absent module',x=>rmSync(x.path('artifact/wave.wasm')),/ENOENT/],
 ['altered module contents',x=>{const buf=Buffer.from(x.wasmFiles['fwui.wasm']);buf[0]=1;x.put('artifact/fwui.wasm',buf);},/hash mismatch/],
 ['altered oracle bytes',x=>{const oracle=readFileSync(x.path('artifact/native-rgb.tsv'));oracle[0]=0x78;x.put('artifact/native-rgb.tsv',oracle);},/hash mismatch/],
 ['oracle has extra state',x=>{x.hashes.set('extra-state',rgb);x.setup();},/oracle and selector states differ/],
 ['absent native row',x=>{x.hashes.delete('fixture-0');x.setup();},/unproved.*fixture-0/],
 ['absent model',x=>{x.states.states=x.states.states.filter(row=>row[0]!=='guard-pro-first-fault');x.hashes.delete('guard-pro-first-fault');x.setup();},/model guard state/],
 ['wrong model family',x=>{x.states.states.find(row=>row[0]==='guard-pro-first-fault')[4]=0;x.setup();},/model guard state/],
 ['state not emitted',x=>{x.states.states[0][0]='not-produced';x.hashes.delete('fixture-0');x.hashes.set('not-produced',rgb);x.setup();},/state not produced/],
 ['independently pinned wrong native digest',x=>{x.hashes.set('fixture-0','f'.repeat(64));x.setup();},/Native frame digest mismatch: fixture-0/],
]) test('fails closed: '+label,t=>{ const x=fixture(t);x.setup();alter(x);assert.throws(()=>x.run(x.requested),pattern);assert(!existsSync(x.output)); });
