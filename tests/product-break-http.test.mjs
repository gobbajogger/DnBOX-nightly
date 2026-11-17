// SPDX-License-Identifier: GPL-3.0-only
// Real HTTP asset admission at a nested deploy prefix; not a deployed-site receipt.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {buildProductSite} from '../scripts/build-product-site.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {join,dirname,basename} from 'node:path';
// Use Python's unmodified file routing and MIME inference, not a test route table.
async function serve(directory){
 const script=`import functools,http.server,sys
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=sys.argv[1]))
print(server.server_port,flush=True)
server.serve_forever()
`;
 const child=spawn('python3',['-u','-c',script,directory],{stdio:['ignore','pipe','pipe']});
 let stderr='';child.stderr.on('data',data=>{stderr+=data;});
 const closed=new Promise(resolve=>child.once('close',resolve));
 try{
  const port=await new Promise((resolve,reject)=>{
   let stdout='';const timer=setTimeout(()=>reject(Error('Static server startup timeout: '+stderr)),15000);
   child.once('error',error=>{clearTimeout(timer);reject(error);});
   child.once('exit',code=>{clearTimeout(timer);reject(Error('Static server exited '+code+': '+stderr));});
   child.stdout.on('data',data=>{stdout+=data;const line=stdout.split('\n')[0];if(/^\d+$/.test(line)&&stdout.includes('\n')){clearTimeout(timer);resolve(Number(line));}});
  });
  return{origin:`http://127.0.0.1:${port}`,async close(){child.kill();await closed;}};
 }catch(error){child.kill();await closed;throw error;}
}
test('built five previews survive real static hosting at root and nested paths',async t=>{
 const outRoot=fileURLToPath(new URL('../.output/',import.meta.url));await mkdir(outRoot,{recursive:true});
 const output=await mkdtemp(join(outRoot,'http-'));t.after(()=>rm(output,{recursive:true,force:true}));
 buildProductSite({output});
 const {createStartingBreakPreview}=await import(pathToFileURL(`${output}/starting-break-preview.mjs`));
 const contract=JSON.parse(await readFile(new URL('../web/product-site/sample-contract.json',import.meta.url)));
 for(const [directory,prefix]of [[output,''],[dirname(output),'/'+basename(output)]]){
  const server=await serve(directory);
  try{
   const base=`${server.origin}${prefix}/starting-break-preview.mjs`;
   const preview=createStartingBreakPreview({baseURL:base});
   for(const a of contract.assets){const bytes=await preview.fetchBytes(preview.resolvePrivateUrl(a.id));assert.equal(bytes.length,a.preview_bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),a.preview_sha256);}
   for(const a of contract.assets)for(const suffix of ['', '.wav']){
    const response=await fetch(`${server.origin}${prefix}/private-audio/${a.id}${suffix}`);
    assert.equal(response.status,200);
    // Extensionless legacy URLs are downloads. WAV URLs retain an audio MIME type.
    assert.match(response.headers.get('content-type'),suffix?/^audio\//:/^application\/octet-stream/);
    const bytes=new Uint8Array(await response.arrayBuffer());
    assert.equal(bytes.length,a.preview_bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),a.preview_sha256);
   }
   for(const unknown of ['personal-br2-zone3','personal-br1-zone9','unrelated.wav'])assert.equal((await fetch(`${server.origin}${prefix}/private-audio/${unknown}`)).status,404);
  }finally{await server.close();}
 }
 assert.equal(buildProductSite({output,check:true}).files,JSON.parse(await readFile(new URL('../web/product-site/SOURCE-MANIFEST.json',import.meta.url))).files.length+10);
});

test('historical aliases cannot bypass pinned audio admission or overwrite hardlinks',async()=>{
 const {mkdtemp,mkdir,writeFile,link,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');
 const root=await mkdtemp(join(tmpdir(),'break-alias-'));
 try{
  const source=join(root,'web/product-site'),id='personal-br1-zone1',name=`assets/starting-breaks/${id}.wav`;
  await mkdir(join(source,'assets/starting-breaks'),{recursive:true});
  const contract=await readFile(new URL('../web/product-site/sample-contract.json',import.meta.url));
  const wav=await readFile(new URL(`../web/product-site/${name}`,import.meta.url));
  await writeFile(join(source,'sample-contract.json'),contract);await writeFile(join(source,name),wav);
  const manifest={schema:'dnbox-product-site-source/1',publicationQualified:false,files:[{path:name}]};
  await writeFile(join(source,'SOURCE-MANIFEST.json'),JSON.stringify(manifest));
  const {output}=buildProductSite({repoRoot:root});
  assert.deepEqual(await readFile(join(output,`private-audio/${id}`)),wav);
  await rm(join(output,`private-audio/${id}`));
  const protectedFile=join(root,'protected');await writeFile(protectedFile,'untouched');await link(protectedFile,join(output,`private-audio/${id}`));
  assert.throws(()=>buildProductSite({repoRoot:root}),/hardlink/);
  assert.equal(await readFile(protectedFile,'utf8'),'untouched');
  await rm(join(output,`private-audio/${id}`));
  const corrupt=Buffer.from(wav);corrupt[corrupt.length-1]^=1;await writeFile(join(source,name),corrupt);
  assert.throws(()=>buildProductSite({repoRoot:root}),/private audio/);
  await writeFile(join(source,name),wav);manifest.files.push({path:`private-audio/${id}`});
  await mkdir(join(source,'private-audio'));await writeFile(join(source,`private-audio/${id}`),'unrelated');
  await writeFile(join(source,'SOURCE-MANIFEST.json'),JSON.stringify(manifest));
  assert.throws(()=>buildProductSite({repoRoot:root}),/alias collision/);
 }finally{await rm(root,{recursive:true,force:true});}
});
