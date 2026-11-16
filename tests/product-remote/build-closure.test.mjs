// SPDX-License-Identifier: GPL-3.0-only
// Static source/assembly closure only, not browser or native qualification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {posix} from 'node:path';
const root=new URL('../../web/product-site/',import.meta.url);
test('standalone Remote manifest retains every static app module dependency',()=>{
 const manifest=JSON.parse(readFileSync(new URL('SOURCE-MANIFEST.json',root)));
 const included=new Set(manifest.files.map(r=>r.path)),seen=new Set(),queue=['remote/app.mjs'];
 while(queue.length){const path=queue.shift();if(seen.has(path))continue;seen.add(path);assert.ok(included.has(path),`Remote dependency absent from output manifest: ${path}`);
  if(!path.endsWith('.mjs'))continue;
  const source=readFileSync(new URL(path,root),'utf8');
  for(const m of source.matchAll(/\b(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){const next=posix.normalize(posix.join(posix.dirname(path),m[1]));assert.ok(!next.startsWith('../'),'dependency outside product source');queue.push(next);}
 }
 assert.ok(seen.has('remote/firmware-link.mjs'));assert.ok(seen.size>20);
});
