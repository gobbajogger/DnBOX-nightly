import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {join,resolve,dirname,extname,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildProductSite} from '../../scripts/build-product-site.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
test('shipped Remote recursively resolves relative modules and literal fetched assets',t=>{
 const parent=join(root,'.output');mkdirSync(parent,{recursive:true});
 const output=mkdtempSync(join(parent,'remote-closure-'));t.after(()=>rmSync(output,{recursive:true,force:true}));
 buildProductSite({repoRoot:root,output});
 const seen=new Set(),pending=[join(output,'remote/app.mjs')];
 while(pending.length){
  const file=pending.pop();if(seen.has(file))continue;seen.add(file);
  assert.ok(existsSync(file),`Missing shipped dependency: ${relative(output,file)}`);
  if(extname(file)!=='.mjs')continue;
  const text=readFileSync(file,'utf8');
  for(const match of text.matchAll(/(?:from\s*|import\s*\(|fetch\s*\()\s*['"](\.[^'"]+)['"]/g)){
   const target=resolve(dirname(file),match[1]);
   assert.ok(target.startsWith(output+sep),'Dependency must remain in shipped tree');
   pending.push(target);
  }
 }
 assert.ok(seen.has(join(output,'remote/vendor/funkybeats-core.mjs')),'Traversed nested vendor module');
 assert.ok(seen.has(join(output,'remote/mixer-format.json')),'Traversed fetched mixer data');
});
