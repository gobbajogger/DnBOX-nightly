// SPDX-License-Identifier: GPL-3.0-only
// W5 read-only preservation guard. Never publishes or qualifies a release.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const plan=JSON.parse(readFileSync(new URL('docs/lanes/web-publication-state.json',root)));
const read=p=>readFileSync(new URL(p,root));
const blob=data=>createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');

test('product catalog and build history retain exact recorded gh-pages bytes',()=>{
 assert.deepEqual(plan.critical.map(x=>x.path).sort(),['build-status.json','versions.json']);
 for(const row of plan.critical){
  assert.equal(row.byteIdentical,true);
  assert.equal(blob(read('web/product-site/'+row.path)),row.existingSha,row.path);
 }
 const catalog=JSON.parse(read('web/product-site/versions.json'));
 assert.equal(catalog.versions.length,37);
 assert.ok(catalog.versions.some(v=>v.version===catalog.latest));
 for(const artifact of plan.retainedSameOriginArtifacts){
  assert.equal(artifact.retained,true,artifact.path);
  assert.match(artifact.gitBlob,/^[0-9a-f]{40}$/);
  assert.ok(artifact.bytes>0);
 }
 assert.equal(plan.retainedSameOriginArtifacts.length,18);
});

test('empty preview catalog and edited release claims cannot replace retained catalog',()=>{
 const expected=plan.critical.find(x=>x.path==='versions.json').existingSha;
 assert.notEqual(blob(read('preview-catalog.json')),expected);
 const candidate=JSON.parse(read('web/product-site/versions.json'));
 candidate.versions[0].hardware_tested=true;
 assert.notEqual(blob(Buffer.from(JSON.stringify(candidate))),expected);
});

test('read-only publication inventory never claims a gate or performs deletion',()=>{
 assert.equal(plan.published,false);
 assert.equal(plan.status,'BLOCKED_NOT_PUBLISHED');
 assert.deepEqual(plan.deletePaths,[]);
 assert.equal(plan.baseBlobCount,561);
 assert.equal(plan.productCount,187);
 assert.equal(plan.productCount,JSON.parse(read('web/product-site/SOURCE-MANIFEST.json')).files.length);
 for(const path of [...plan.addedPaths,...plan.changedPaths])assert.doesNotMatch(path,/^(artifacts|firmware|packages)\//);
});
