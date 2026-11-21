// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {createGitHub, NIGHTLY, MAIN} from '../web/product-site/admin/github.mjs';

const hex = x => createHash('sha256').update(x).digest('hex');
const git = x => createHash('sha1').update('blob '+x.length+'\0').update(x).digest('hex');
const token = ['github','pat','example'].join('_');
const source = 'a'.repeat(40), root='b'.repeat(40), tree='c'.repeat(40), commit='d'.repeat(40);
const api='https://api.github.com';
const repoPath=r=>'/repos/gobbajogger/'+r;
const json=value=>Buffer.from(JSON.stringify(value));
const models=['elite','pro'];
function fixture(){
  const files = {[NIGHTLY]:new Map(),[MAIN]:new Map()}, calls=[], blobs=new Map();
  const row={version:'nightly-test',display_version:'0.0.27',source_commit:source,source_tree:tree,status:'dev-checked',models:{}};
  for(const [i,m] of models.entries()){
    const bytes=Buffer.alloc(1034+i,54+i), sha=hex(bytes);
    const path='artifacts/nightly-dev/'+sha+'/'+m+'.fwsc';
    row.models[m]={size:bytes.length,sha256:sha,controller_sha256:'e'.repeat(64),product:'SMK-37 '+(m==='pro'?'Pro':'Elite')+'_900',pkg:'https://gobbajogger.github.io/DnBOX-nightly/'+path};
    files[NIGHTLY].set(path,bytes);
  }
  const selection={id:row.version,source,model:'elite',digests:Object.fromEntries(models.map(m=>[m,row.models[m].sha256]))};
  const reports=models.map(model=>({version:'0.0.27',source_commit:source,model,package_sha256:row.models[model].sha256,controller_sha256:row.models[model].controller_sha256,startup:true,restart:true,evidence_url:'https://github.com/gobbajogger/DnBOX/issues/9',reported_by:'owner'}));
  const main={installer_promotion_schema:1,latest:'fallback',versions:[{version:'fallback'}]};
  const f={user:'gobbajogger',row,reports,calls,blobs,files,main,selection,ref:root};
  files[NIGHTLY].set('versions.json',json({latest:row.version,versions:[row]}));
  files[NIGHTLY].set('hardware-tests.json',json({schema:1,reports}));
  files[MAIN].set('versions.json',json(main));
  let notes='Current notes';
  f.github=createGitHub(async(url,options)=>{
    const u=new URL(url),path=u.pathname,method=options.method;
    const body=options.body?JSON.parse(options.body):null;
    calls.push({url,method,body,options});
    assert.equal(u.origin,api);assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');
    assert.equal(options.referrerPolicy,'no-referrer');assert.equal(options.cache,'no-store');
    assert.ok(!url.includes(token));assert.ok(!JSON.stringify(body).includes(token));
    const send=(result,status=200)=>({ok:status<300,status,json:async()=>result});
    if(path==='/user')return send({login:f.user});
    const repo=path.split('/')[3];assert.ok([MAIN,NIGHTLY].includes(repo));
    const p=path.slice(repoPath(repo).length);
    if(p==='/git/ref/heads/gh-pages')return send({object:{sha:repo===NIGHTLY?f.ref:root}});
    if(p.startsWith('/contents/')){
      const filename=p.slice('/contents/'.length),bytes=files[repo].get(filename);
      if(method==='PUT'){
        assert.equal(repo,NIGHTLY);assert.equal(filename,'hardware-tests.json');assert.equal(body.branch,'gh-pages');
        if(f.conflict||body.sha!==git(bytes))return send({},409);
        files[repo].set(filename,Buffer.from(body.content,'base64'));return send({});
      }
      assert.equal(u.searchParams.get('ref'),root);
      if(!bytes)return send({},404);
      return send({path:filename,type:'file',size:bytes.length,sha:git(bytes),encoding:'base64',content:bytes.toString('base64')});
    }
    if(p==='/git/commits/'+root)return send({tree:{sha:root}});
    if(p==='/git/blobs'){const bytes=Buffer.from(body.content,'base64');blobs.set(git(bytes),bytes);return send({sha:git(bytes)});}
    if(p==='/git/trees'){f.tree=body;return send({sha:tree});}
    if(p==='/git/commits'){assert.deepEqual(body.parents,[root]);if(f.racedSource)f.ref=commit;return send({sha:commit});}
    if(p==='/git/refs/heads/gh-pages'){assert.equal(repo,MAIN);assert.equal(body.force,false);return send({},f.conflict?422:200);}
    if(p==='/releases/tags/v0.0.27')return send({id:26,tag_name:'v0.0.27',body:f.changedNotes||notes,updated_at:'2026-11-21T01:02:03Z'});
    if(p==='/releases/26'){assert.deepEqual(Object.keys(body),['body']);notes=body.body;return send({body:notes});}
    if(p==='/pulls')return send([{number:5,title:'Web install',head:{sha:source,ref:'lane/web',repo:{full_name:'gobbajogger/'+repo}},draft:true}]);
    if(p==='/commits/'+source+'/status')return send({statuses:[]});
    if(p==='/commits/'+source+'/check-runs')return send({check_runs:[]});
    if(p==='/issues/5/comments')return send([{author_association:'OWNER',body:'DNBOX-GATE RESULT PASS sha='+source+' lane=web'}]);
    throw Error('Unexpected endpoint '+method+' '+path);
  });
  return f;
}
test('exact owner token is used only in the API header and disconnect removes write access',async()=>{
  const f=fixture();await assert.rejects(f.github.connect('other'),/fine-grained/);
  f.user='someone-else';await assert.rejects(f.github.connect(token),/owner/);
  assert.equal(f.calls.find(c=>c.url.endsWith('/user')).options.headers.Authorization,'Bearer '+token);
  await assert.rejects(f.github.snapshot('foreign'),/repository/);
  f.user='gobbajogger';await f.github.connect(token);f.github.lock();
  const notes=await f.github.release(MAIN,'v0.0.27');
  await assert.rejects(f.github.saveNotes(notes,'Updated'),/Connect/);
  assert.ok(!f.calls.at(-1).options.headers.Authorization);
});
test('mark tested writes only the nightly ledger with expected blob, preserves peers and handles retries/conflicts',async()=>{
  const f=fixture(),evidence='https://github.com/gobbajogger/DnBOX/issues/9';
  f.files[NIGHTLY].set('hardware-tests.json',json({schema:1,reports:[f.reports[1]]}));
  await f.github.connect(token);
  await assert.rejects(f.github.markTested(f.selection,'https://example.com/'),/evidence/);
  f.conflict=true;await assert.rejects(f.github.markTested(f.selection,evidence),/409/);
  f.conflict=false;await f.github.markTested(f.selection,evidence);await f.github.markTested(f.selection,evidence);
  const receipts=JSON.parse(f.files[NIGHTLY].get('hardware-tests.json')).reports;
  assert.deepEqual(receipts[0],f.reports[1]);assert.equal(receipts[1].package_sha256,f.selection.digests.elite);
  assert.equal(f.calls.filter(c=>c.method!=='GET').length,2);
});
test('promotion atomically stages both verified files and retains fallback with a fast-forward ref update',async()=>{
  const f=fixture();
  Object.assign(f.row.models.elite,{status:'dev-checked',hardware_tested:false});
  f.files[NIGHTLY].set('versions.json',json({latest:f.row.version,versions:[f.row]}));
  await f.github.connect(token);await f.github.promote(f.selection);
  assert.equal(f.tree.base_tree,root);assert.equal(f.tree.tree.length,3);
  const catalog=JSON.parse(f.blobs.get(f.tree.tree.find(e=>e.path==='versions.json').sha));
  const promoted=catalog.versions[0];
  assert.equal(promoted.models.elite.status,promoted.status,'MAIN requires any explicit model status to match the promoted release');
  assert.equal(promoted.models.elite.hardware_tested,false);
  assert.ok(!Object.hasOwn(promoted.models.pro,'status'));
  assert.ok(!Object.hasOwn(promoted.models.pro,'hardware_tested'));
  assert.deepEqual(catalog.versions[1],f.main.versions[0]);assert.equal(catalog.latest,f.row.version);
  for(const m of models){
    const p=catalog.versions[0].models[m],path='artifacts/releases/'+p.sha256+'/'+m+'.fwsc';
    assert.equal(p.pkg,'https://gobbajogger.github.io/DnBOX/'+path);
    assert.equal(hex(f.blobs.get(f.tree.tree.find(e=>e.path===path).sha)),p.sha256);
  }
  assert.equal(f.calls.filter(c=>c.method==='PATCH').length,1);
});
test('promotions reject corrupt bytes, missing tests, withdrawn rows, mismatched sources and races',async()=>{
  for(const fault of ['corrupt','untested','withdrawn','id','incompatible','source changed','concurrent destination']){
    const f=fixture();await f.github.connect(token);
    if(fault==='corrupt')f.files[NIGHTLY].set([...f.files[NIGHTLY].keys()][0],Buffer.alloc(f.row.models.elite.size));
    if(fault==='untested')f.files[NIGHTLY].set('hardware-tests.json',json({schema:1,reports:f.reports.slice(0,1)}));
    if(fault==='withdrawn'){f.row.withdrawn=true;f.files[NIGHTLY].set('versions.json',json({latest:f.row.version,versions:[f.row]}));}
    if(fault==='id')f.selection.source=tree;
    if(fault==='incompatible')f.files[MAIN].set('versions.json',json({latest:'fallback',versions:f.main.versions}));
    if(fault==='source changed')f.racedSource=true;
    if(fault==='concurrent destination')f.conflict=true;
    await assert.rejects(f.github.promote(f.selection),undefined,fault);
    assert.equal(f.calls.filter(c=>c.method==='PATCH').length,fault==='concurrent destination'?1:0,fault);
  }
});
test('promotion uses the installer’s exact legacy or seven-digit numeric model identity',async()=>{
  for (const [suffix,accepted] of [['9010203',true],['9001',false],['900000000',false]]) {
    const f=fixture();await f.github.connect(token);
    f.row.models.pro.product='SMK-37 Pro_'+suffix;
    f.files[NIGHTLY].set('versions.json',json({latest:f.row.version,versions:[f.row]}));
    if(accepted) await f.github.promote(f.selection);
    else await assert.rejects(f.github.promote(f.selection),/unavailable/);
  }
});
test('promotion validates both model controller contracts before changing MAIN', async () => {
  for (const model of models) {
    for (const [metadata, accepted] of [
      [{}, true],
      [{controller_strategy:'owner-supplied'}, true],
      [{controller_strategy:'bundled', controller_size:68}, true],
      [{controller_strategy:'bundled', controller_size:65536}, true],
      [{controller_strategy:'bundled'}, false],
      [{controller_strategy:'bundled', controller_size:67}, false],
      [{controller_strategy:'bundled', controller_size:65537}, false],
      [{controller_strategy:'bundled', controller_size:'68'}, false],
      [{controller_strategy:'unrecognized'}, false]
    ]) {
      const f=fixture();
      Object.assign(f.row.models[model],metadata);
      f.files[NIGHTLY].set('versions.json',json({latest:f.row.version,versions:[f.row]}));
      await f.github.connect(token);
      if (accepted) {
        await f.github.promote(f.selection);
        const catalog=JSON.parse(f.blobs.get(f.tree.tree.find(e=>e.path==='versions.json').sha));
        const entry=catalog.versions[0].models[model];
        assert.equal(entry.controller_strategy, metadata.controller_strategy);
        assert.equal(entry.controller_size, metadata.controller_size);
      } else {
        await assert.rejects(f.github.promote(f.selection),/unavailable/);
        assert.ok(f.calls.every(c=>c.method==='GET'));
      }
    }
  }
});
test('promotion preserves the source and controller identity of an existing MAIN build ID', async () => {
  for (const change of [r=>r.source_tree=root, r=>r.display_version='0.0.28',
      r=>r.models.elite.controller_sha256='a'.repeat(64),
      r=>r.models.pro.controller_size=68, r=>r.models.elite.controller_strategy='owner-supplied',
      r=>r.models.pro.product='SMK-37 Pro_9000001', r=>r.models.elite.size++]) {
    const f=fixture();
    const prior=structuredClone(f.row);
    change(prior);
    f.main.versions.unshift(prior);
    f.files[MAIN].set('versions.json',json(f.main));
    await f.github.connect(token);
    await assert.rejects(f.github.promote(f.selection),/existing build ID/);
    assert.ok(f.calls.every(c=>c.method==='GET'));
  }
});
test('promotion rejects a release filename without a basename', async () => {
  const f=fixture();
  const entry=f.row.models.pro;
  entry.pkg=entry.pkg.replace(/[^/]+$/, '.fwsc');
  f.files[NIGHTLY].set('versions.json',json({latest:f.row.version,versions:[f.row]}));
  await f.github.connect(token);
  await assert.rejects(f.github.promote(f.selection),/immutable firmware package path/);
  assert.ok(f.calls.every(c=>c.method==='GET'));
});
test('withheld model entries cannot be marked or promoted',async()=>{
  for (const flags of [{lifecycle:'withdrawn'},{status:'failed'},{fromRelease:true},{device_verified:true},{qualified:false}]) {
    const f=fixture();await f.github.connect(token);
    Object.assign(f.row.models.elite,flags);
    f.files[NIGHTLY].set('versions.json',json({latest:f.row.version,versions:[f.row]}));
    await assert.rejects(f.github.promote(f.selection),/unavailable/);
    await assert.rejects(f.github.markTested(f.selection,'https://github.com/gobbajogger/DnBOX/issues/9'),/unavailable/);
    assert.equal(f.calls.filter(c=>c.method!=='GET').length,0);
  }
});
test('lane overview includes the Local gate for the PR head and release editing changes only notes',async()=>{
  const f=fixture();const [pr]=await f.github.lanePRs(NIGHTLY);
  assert.deepEqual(await f.github.checks(pr.repo,pr.sha,pr.number),[['Local gate','PASS']]);
  await f.github.connect(token);const before=await f.github.release(MAIN,'v0.0.27');
  f.changedNotes='Other editor';await assert.rejects(f.github.saveNotes(before,'New'),/changed/);
  f.changedNotes=null;await f.github.saveNotes(before,'New');
  assert.equal((await f.github.release(MAIN,'v0.0.27')).body,'New');
});
test('admin has a hash-pinned CSP, blocks framing before credentials, and has no storage or telemetry sinks',()=>{
  const read=p=>readFileSync(new URL('../web/product-site/admin/'+p,import.meta.url),'utf8');
  const html=read('index.html'),app=read('admin.mjs');
  const sri=createHash('sha256').update(read('admin.bundle.js')).digest('base64');
  for(const value of ["default-src 'none'","script-src 'sha256-"+sri+"';","connect-src https://api.github.com","base-uri 'none'","form-action 'none'",'integrity="sha256-'+sri+'"','id="workspace" hidden'])assert.ok(html.includes(value),value);
  assert.match(app,/if \(self === top\) initialize\(\)/);
  assert.doesNotMatch(app+read('github.mjs'),/localStorage|sessionStorage|indexedDB|document\.cookie|sendBeacon|innerHTML|console\./);
});
