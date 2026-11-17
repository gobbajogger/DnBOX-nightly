// SPDX-License-Identifier: GPL-3.0-only
// Real HTTP asset admission at a nested deploy prefix; not a deployed-site receipt.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildProductSite} from '../scripts/build-product-site.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
test('built five previews survive nested HTTP hosting with exact pinned bytes',async t=>{
 const parent=fileURLToPath(new URL('../.output/',import.meta.url));
 mkdirSync(parent,{recursive:true});
 const target=mkdtempSync(parent+'break-http-test-');
 t.after(()=>rmSync(target,{recursive:true,force:true}));
 const {output}=buildProductSite({output:target});
 const {createStartingBreakPreview}=await import(pathToFileURL(`${output}/starting-break-preview.mjs`));
 const contract=JSON.parse(await readFile(new URL('../web/product-site/sample-contract.json',import.meta.url)));
 const routes=new Map(contract.assets.map(a=>[`/dnbox/assets/starting-breaks/${a.id}.wav`,`${output}/assets/starting-breaks/${a.id}.wav`]));
 const server=createServer(async(req,res)=>{const path=routes.get(req.url);if(!path){res.writeHead(404).end();return;}try{const b=await readFile(path);res.writeHead(200,{'Content-Type':'audio/wav','Content-Length':b.length});res.end(b);}catch{res.writeHead(500).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const base=`http://127.0.0.1:${server.address().port}/dnbox/starting-break-preview.mjs`;
  const preview=createStartingBreakPreview({baseURL:base});
  for(const a of contract.assets){const url=preview.resolvePrivateUrl(a.id);assert.ok(!url.includes('/private-audio/'));const bytes=await preview.fetchBytes(url);assert.equal(bytes.length,a.preview_bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),a.preview_sha256);}
  assert.equal((await fetch(new URL('/private-audio/personal-br1-zone1',base))).status,404);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
