// SPDX-License-Identifier: GPL-3.0-only
// Assemble reviewed product sources into a separate local output. Never deploys.
import {readFileSync,writeFileSync,mkdirSync,existsSync,lstatSync,readdirSync}from'node:fs';
import {resolve,dirname,join,relative,sep}from'node:path';
import {fileURLToPath}from'node:url';import{createHash}from'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
export function buildProductSite({repoRoot=root,output=join(repoRoot,'.output/product-site'),check=false}={}){
 function noLinks(path,base){let at=base;if(existsSync(at)&&lstatSync(at).isSymbolicLink())throw Error('Build symlink refused');for(const part of relative(base,path).split(sep).filter(Boolean)){at=join(at,part);if(existsSync(at)&&lstatSync(at).isSymbolicLink())throw Error('Build symlink refused');}}
 const source=join(repoRoot,'web/product-site'),target=resolve(output),manifestPath=join(source,'SOURCE-MANIFEST.json');
 const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
 if(manifest.schema!=='dnbox-product-site-source/1'||manifest.publicationQualified!==false||!Array.isArray(manifest.files))throw Error('Expected reviewed source-only manifest');
 const inside=(p,base)=>p===base||p.startsWith(base+sep);
 for(const protectedPath of['docs','web','.git'])if(inside(target,join(repoRoot,protectedPath)))throw Error('Product build cannot overwrite source, Pages, catalogs or packages');
 if(target===repoRoot||inside(repoRoot,target)||inside(target,source))throw Error('Unsafe product output');
 if(!inside(target,join(repoRoot,'.output')))throw Error('Product output must remain in the scoped .output build tree');
 noLinks(target,repoRoot);
 // Owner-designated public previews are a narrow pinned exception, never arbitrary audio.
 let startingPreviews=null;
 function pinnedStartingPreview(row,data){
  if(!/^assets\/stock-breaks\/personal-br(?:1-zone[1-3]|2-zone[1-2])\.wav$/.test(row.path))return false;
  if(startingPreviews===null){
   const path=join(source,'sample-contract.json');noLinks(path,repoRoot);
   if(!lstatSync(path).isFile())throw Error('Regular starting-break contract required');
   const raw=readFileSync(path);
   if(createHash('sha256').update(raw).digest('hex')!=='df61cfe067e56579ace27fc58341f722f4a7a0d9a476ad7d8e798a38413b504f')throw Error('Starting-break contract pin mismatch');
   const contract=JSON.parse(raw);
   if(contract.schema!=='dnbox-owner-confirmed-break-set/1'||!Array.isArray(contract.assets))throw Error('Starting-break contract required');
   startingPreviews=new Map(contract.assets.map(a=>['assets/stock-breaks/'+a.id+'.wav',a]));
  }
  const asset=startingPreviews.get(row.path);
  return !!asset&&data.length===asset.preview_bytes&&createHash('sha256').update(data).digest('hex')===asset.preview_sha256;
 }
 const seen=new Set(),inputs=[];
 for(const row of manifest.files){
  if(typeof row.path!=='string'||!row.path||row.path.includes('\\')||row.path.startsWith('/')||row.path.split('/').some(x=>!x||x==='.'||x==='..')||seen.has(row.path)||row.path==='SOURCE-MANIFEST.json')throw Error('Invalid or duplicate source path');
  seen.add(row.path);const input=join(source,row.path);noLinks(input,repoRoot);if(!lstatSync(input).isFile())throw Error('Regular product source files required');const data=readFileSync(input);
  if(data.length!==row.bytes||createHash('sha256').update(data).digest('hex')!==row.sha256)throw Error('Product source drift: '+row.path);
  if((/\.(?:fwsc|uf2|elf|fsmp|wav|adpcm|bin)$/i.test(row.path)||row.path.split('/').includes('firmware'))&&!pinnedStartingPreview(row,data))throw Error('Firmware/binary or unpinned audio is not a product source asset');
  inputs.push([row.path,data]);
 }
 // No stale private/unrelated files may ride along in a publisher input.
 function inspectOutput(dir){if(!existsSync(dir))return;for(const name of readdirSync(dir)){const p=join(dir,name);noLinks(p,repoRoot);const stat=lstatSync(p);if(stat.isDirectory())inspectOutput(p);else{if(!stat.isFile())throw Error('Regular output files required');if(stat.nlink!==1)throw Error('Output hardlink refused');if(!seen.has(relative(target,p).split(sep).join('/')))throw Error('unexpected output file: '+relative(target,p));}}}
 inspectOutput(target);
 // Validate the COMPLETE input set before any output changes, including drift.
 for(const [name,data]of inputs){const path=join(target,name);noLinks(path,repoRoot);if(check){if(!existsSync(path)||!readFileSync(path).equals(data))throw Error('Product output differs: '+name);}else{mkdirSync(dirname(path),{recursive:true});writeFileSync(path,data);}}
 return{files:inputs.length,output:target,published:false,firmwareWrites:false,catalogMutations:[]};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),i=args.indexOf('--output');if(i!==-1&&!args[i+1])throw Error('--output requires a local directory');
 console.log(JSON.stringify(buildProductSite({output:i===-1?undefined:resolve(args[i+1]),check:args.includes('--check')})));
}
