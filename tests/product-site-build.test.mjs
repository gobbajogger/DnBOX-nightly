// SPDX-License-Identifier: GPL-3.0-only
import test from'node:test';import{execFileSync,spawn}from'node:child_process';import assert from'node:assert/strict';import{mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,symlinkSync,linkSync,unlinkSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';import{createHash}from'node:crypto';import{buildProductSite}from'../scripts/build-product-site.mjs';
function fixture(){const root=mkdtempSync(join(tmpdir(),'dnbox-product-source-')),src=join(root,'web/product-site');mkdirSync(src,{recursive:true});writeFileSync(join(src,'index.html'),'<h1>DnBOX</h1>');const m={schema:'dnbox-product-site-source/1',publicationQualified:false,files:[{path:'index.html',bytes:14,sha256:createHash('sha256').update('<h1>DnBOX</h1>').digest('hex')}]};writeFileSync(join(src,'SOURCE-MANIFEST.json'),JSON.stringify(m));return{root,src,m,save(){writeFileSync(join(src,'SOURCE-MANIFEST.json'),JSON.stringify(m))}}}
test('normal deterministic source build/check never changes Pages/catalog/source',()=>{const f=fixture();mkdirSync(join(f.root,'docs'));writeFileSync(join(f.root,'docs/versions.json'),'protected');const r=buildProductSite({repoRoot:f.root});assert.equal(r.files,1);assert.equal(r.published,false);assert.equal(readFileSync(join(f.root,'docs/versions.json'),'utf8'),'protected');assert.equal(buildProductSite({repoRoot:f.root,check:true}).files,1)});
test('all source identities checked before first output write',()=>{const f=fixture();writeFileSync(join(f.src,'index.html'),'changed');assert.throws(()=>buildProductSite({repoRoot:f.root}),/drift/);assert.equal(existsSync(join(f.root,'.output/product-site/index.html')),false)});
test('unsafe destinations and malformed paths fail closed',()=>{for(const dest of['docs','docs/sub','web','web/sub','.git','']){const f=fixture();assert.throws(()=>buildProductSite({repoRoot:f.root,output:join(f.root,dest)}),/Unsafe|cannot/)}for(const p of['../bad','/bad','a/../b','a\\b','a//b']){const f=fixture();f.m.files[0].path=p;f.save();assert.throws(()=>buildProductSite({repoRoot:f.root}),/path/);}});
test('private/binary assets, duplicate inputs and symlinks are refused',()=>{for(const ext of['wav','fwsc','fsmp','elf','bin']){const f=fixture();f.m.files[0].path='secret.'+ext;writeFileSync(join(f.src,'secret.'+ext),'<h1>DnBOX</h1>');f.save();assert.throws(()=>buildProductSite({repoRoot:f.root}),/private/);}const f=fixture();f.m.files.push(f.m.files[0]);f.save();assert.throws(()=>buildProductSite({repoRoot:f.root}),/duplicate/);const g=fixture();symlinkSync('/etc/hosts',join(g.src,'other'));g.m.files[0].path='other';g.save();assert.throws(()=>buildProductSite({repoRoot:g.root}),/symlink/)});
test('source ancestor symlink and output symlink never escape the scoped build tree',()=>{const f=fixture(),outside=mkdtempSync(join(tmpdir(),'dnbox-build-outside-'));writeFileSync(join(outside,'index.html'),'<h1>DnBOX</h1>');symlinkSync(outside,join(f.src,'linked'));f.m.files[0].path='linked/index.html';f.save();assert.throws(()=>buildProductSite({repoRoot:f.root}),/symlink/);const g=fixture();mkdirSync(join(g.root,'.output'));symlinkSync(outside,join(g.root,'.output/product-site'));assert.throws(()=>buildProductSite({repoRoot:g.root}),/symlink/);assert.throws(()=>buildProductSite({repoRoot:g.root,output:outside}),/scoped/)});
test('a stale unrelated output is not silently carried into a later publisher input',()=>{const f=fixture(),out=join(f.root,'.output/product-site');mkdirSync(out,{recursive:true});writeFileSync(join(out,'unrelated-private.wav'),'private');assert.throws(()=>buildProductSite({repoRoot:f.root}),/unexpected output/);assert.equal(existsSync(join(out,'index.html')),false);assert.equal(readFileSync(join(out,'unrelated-private.wav'),'utf8'),'private')});
test('recognized output hardlink cannot overwrite a protected synthetic catalog',()=>{const f=fixture(),out=join(f.root,'.output/product-site');mkdirSync(out,{recursive:true});mkdirSync(join(f.root,'docs'));const catalog=join(f.root,'docs/versions.json');writeFileSync(catalog,'protected');linkSync(catalog,join(out,'index.html'));assert.throws(()=>buildProductSite({repoRoot:f.root}),/hardlink/);assert.equal(readFileSync(catalog,'utf8'),'protected')});

test('recognized output special files refuse without opening or blocking',()=>{const f=fixture(),out=join(f.root,'.output/product-site');mkdirSync(out,{recursive:true});execFileSync('mkfifo',[join(out,'index.html')]);assert.throws(()=>buildProductSite({repoRoot:f.root}),/Regular output/);});

// Startup/import readiness is independent of the blocked-I/O operation budget.
// A loaded machine may take longer than500ms to start Node; that is not a FIFO read.
async function manifestOperation(module,repoRoot,{startupMs=15000,operationMs=500,startupDelayMs=0}={}){
 const code=`const {buildProductSite}=await import(${JSON.stringify(module)});if(${startupDelayMs})await new Promise(r=>setTimeout(r,${startupDelayMs}));process.send({phase:'ready'});process.once('message',m=>{if(m.phase!=='go'){process.exitCode=2;process.disconnect();return;}process.send({phase:'operation-start'},()=>{try{buildProductSite({repoRoot:${JSON.stringify(repoRoot)}});process.send({phase:'result',outcome:'returned'});}catch(e){process.send({phase:'result',outcome:'threw',message:e.message});}finally{process.disconnect();}});});`;
 return await new Promise((resolve,reject)=>{
  const start=performance.now(),child=spawn(process.execPath,['--input-type=module','-e',code],{stdio:['ignore','pipe','pipe','ipc']});
  let readyAt=null,operationAt=null,result=null,timedOut=null,stderr='',timer;
  const expire=phase=>{timedOut=phase;child.kill('SIGKILL');};
  timer=setTimeout(()=>expire('startup'),startupMs);
  child.stderr.on('data',b=>{stderr+=b;});child.stdout.resume();
  child.on('message',m=>{
   if(m.phase==='ready'){readyAt=performance.now();clearTimeout(timer);timer=setTimeout(()=>expire('operation-start'),startupMs);child.send({phase:'go'});}
   else if(m.phase==='operation-start'){operationAt=performance.now();clearTimeout(timer);timer=setTimeout(()=>expire('operation'),operationMs);}
   else if(m.phase==='result'){result=m;clearTimeout(timer);timer=setTimeout(()=>expire('shutdown'),startupMs);}
  });
  child.on('error',e=>{clearTimeout(timer);reject(e);});
  child.on('close',(code,signal)=>{clearTimeout(timer);resolve({code,signal,result,timedOut,stderr,ready:readyAt!==null,operationStarted:operationAt!==null,startupElapsedMs:readyAt===null?null:readyAt-start,operationElapsedMs:operationAt===null?null:performance.now()-operationAt});});
 });
}
function fifoManifest(){const f=fixture(),manifest=join(f.src,'SOURCE-MANIFEST.json');unlinkSync(manifest);execFileSync('mkfifo',[manifest]);return f;}
// The actual manifest must be checked before readFileSync, not just its assets.
test('FIFO manifest rejects after import-ready without blocking the operation',async t=>{
 const f=fifoManifest(),module=new URL('../scripts/build-product-site.mjs',import.meta.url).href,run=await manifestOperation(module,f.root);
 t.diagnostic(JSON.stringify(run));assert.equal(run.ready,true,JSON.stringify(run));assert.equal(run.operationStarted,true,JSON.stringify(run));assert.equal(run.timedOut,null,JSON.stringify(run));assert.equal(run.code,0,JSON.stringify(run));assert.equal(run.result?.outcome,'threw');assert.match(run.result?.message,/Regular source manifest/);assert.equal(existsSync(join(f.root,'.output')),false);
});
test('slow child startup does not consume the500ms FIFO operation watchdog',async t=>{
 const f=fifoManifest(),module=new URL('../scripts/build-product-site.mjs',import.meta.url).href,run=await manifestOperation(module,f.root,{startupDelayMs:650});
 t.diagnostic(JSON.stringify(run));assert.ok(run.startupElapsedMs>=650,JSON.stringify(run));assert.equal(run.timedOut,null,JSON.stringify(run));assert.match(run.result?.message,/Regular source manifest/);assert.equal(existsSync(join(f.root,'.output')),false);
});
test('controlled missing-guard fixture is exact current code minus the declared preflight, never claimed historical',()=>{
 const meta=JSON.parse(readFileSync(new URL('fixtures/build-product-site-missing-guard-mutant.json',import.meta.url))),current=readFileSync(new URL('../scripts/build-product-site.mjs',import.meta.url),'utf8'),mutant=readFileSync(new URL('fixtures/build-product-site-missing-guard-mutant.mjs',import.meta.url),'utf8');
 assert.equal(meta.kind,'CONTROLLED_MUTANT_NOT_HISTORICAL_ORIGINAL');assert.equal(createHash('sha256').update(current).digest('hex'),meta.sourceSHA256);assert.equal(createHash('sha256').update(mutant).digest('hex'),meta.fixtureSHA256);assert.equal(current.replace(meta.removedText,''),mutant);
});
test('controlled missing-guard mutant blocks after readiness and trips only the operation watchdog',async t=>{
 const f=fifoManifest(),module=new URL('fixtures/build-product-site-missing-guard-mutant.mjs',import.meta.url).href,run=await manifestOperation(module,f.root);
 t.diagnostic(JSON.stringify(run));assert.equal(run.ready,true,JSON.stringify(run));assert.equal(run.operationStarted,true,JSON.stringify(run));assert.equal(run.timedOut,'operation',JSON.stringify(run));assert.equal(run.signal,'SIGKILL');assert.equal(run.result,null);assert.ok(run.operationElapsedMs>=490,JSON.stringify(run));assert.equal(existsSync(join(f.root,'.output')),false);
});
test('symlink manifest refuses without reading an outside manifest',()=>{
 const f=fixture(),manifest=join(f.src,'SOURCE-MANIFEST.json'),outside=join(f.root,'outside.json');writeFileSync(outside,JSON.stringify(f.m));unlinkSync(manifest);symlinkSync(outside,manifest);
 assert.throws(()=>buildProductSite({repoRoot:f.root}),/symlink/);assert.equal(existsSync(join(f.root,'.output')),false);
});

test('starting-break admission rejects forged manifest bytes and non-contract IDs',()=>{
 for(const id of ['personal-br1-zone1','personal-br2-zone3']){
  const f=fixture(),name=`assets/starting-breaks/${id}.wav`,bytes=Buffer.from('not authorized audio');
  mkdirSync(join(f.src,'assets/starting-breaks'),{recursive:true});writeFileSync(join(f.src,name),bytes);
  writeFileSync(join(f.src,'sample-contract.json'),readFileSync(new URL('../web/product-site/sample-contract.json',import.meta.url)));
  f.m.files=[{path:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}];f.save();
  assert.throws(()=>buildProductSite({repoRoot:f.root}),/Firmware\/private audio/);assert.equal(existsSync(join(f.root,'.output')),false);
 }
});
test('starting-break contract cannot be replaced, linked or special-file opened',()=>{
 for(const kind of ['changed','symlink','fifo']){
  const f=fixture(),name='assets/starting-breaks/personal-br1-zone1.wav';mkdirSync(join(f.src,'assets/starting-breaks'),{recursive:true});writeFileSync(join(f.src,name),'a');
  f.m.files=[{path:name,bytes:1,sha256:createHash('sha256').update('a').digest('hex')}];f.save();
  const contract=join(f.src,'sample-contract.json');
  if(kind==='changed')writeFileSync(contract,'{}');else if(kind==='symlink')symlinkSync('/etc/hosts',contract);else execFileSync('mkfifo',[contract]);
  assert.throws(()=>buildProductSite({repoRoot:f.root}),/pin mismatch|symlink|Regular pinned/);assert.equal(existsSync(join(f.root,'.output')),false);
 }
});

test('all ten exact contract-pinned starting-break assets build byte-identically',()=>{
 const f=fixture(),contractBytes=readFileSync(new URL('../web/product-site/sample-contract.json',import.meta.url)),contract=JSON.parse(contractBytes);
 writeFileSync(join(f.src,'sample-contract.json'),contractBytes);mkdirSync(join(f.src,'assets/starting-breaks'),{recursive:true});
 f.m.files=[];
 for(const asset of contract.assets)for(const ext of ['wav','adpcm']){
  const name=`assets/starting-breaks/${asset.id}.${ext}`,bytes=readFileSync(new URL('../web/product-site/'+name,import.meta.url));
  writeFileSync(join(f.src,name),bytes);f.m.files.push({path:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
 f.save();assert.equal(buildProductSite({repoRoot:f.root}).files,10);
 for(const row of f.m.files)assert.deepEqual(readFileSync(join(f.root,'.output/product-site',row.path)),readFileSync(join(f.src,row.path)));
});
