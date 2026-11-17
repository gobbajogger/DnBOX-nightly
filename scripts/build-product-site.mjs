// SPDX-License-Identifier: GPL-3.0-only
// Assemble reviewed product sources into a separate local output. Never deploys.
import {readFileSync,writeFileSync,mkdirSync,existsSync,lstatSync,readdirSync}from'node:fs';
import {resolve,dirname,join,relative,sep}from'node:path';
import {fileURLToPath}from'node:url';import{createHash}from'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
export function buildProductSite({repoRoot=root,output=join(repoRoot,'.output/product-site'),check=false}={}){
 function noLinks(path,base){let at=base;if(existsSync(at)&&lstatSync(at).isSymbolicLink())throw Error('Build symlink refused');for(const part of relative(base,path).split(sep).filter(Boolean)){at=join(at,part);if(existsSync(at)&&lstatSync(at).isSymbolicLink())throw Error('Build symlink refused');}}
 const source=join(repoRoot,'web/product-site'),target=resolve(output),manifestPath=join(source,'SOURCE-MANIFEST.json');
 noLinks(manifestPath,repoRoot);
 if(!lstatSync(manifestPath).isFile())throw Error('Regular source manifest required');
 const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
 if(manifest.schema!=='dnbox-product-site-source/1'||manifest.publicationQualified!==false||!Array.isArray(manifest.files))throw Error('Expected reviewed source-only manifest');
 const inside=(p,base)=>p===base||p.startsWith(base+sep);
 for(const protectedPath of['docs','web','.git'])if(inside(target,join(repoRoot,protectedPath)))throw Error('Product build cannot overwrite source, Pages, catalogs or packages');
 if(target===repoRoot||inside(repoRoot,target)||inside(target,source))throw Error('Unsafe product output');
 if(!inside(target,join(repoRoot,'.output')))throw Error('Product output must remain in the scoped .output build tree');
 noLinks(target,repoRoot);
 // Only the five owner-confirmed starting-break assets may cross the audio boundary.
 // The pin is source-controlled, never supplied by a downloaded manifest.
 function admittedStartingBreak(name,data){
  const match=/^assets\/starting-breaks\/(personal-br[12]-zone[123])\.(wav|adpcm)$/.exec(name);
  if(!match)return false;
  const contractPath=join(source,'sample-contract.json');noLinks(contractPath,repoRoot);
  if(!existsSync(contractPath)||!lstatSync(contractPath).isFile())throw Error('Regular pinned sample contract required');
  const bytes=readFileSync(contractPath);
  if(createHash('sha256').update(bytes).digest('hex')!=='df61cfe067e56579ace27fc58341f722f4a7a0d9a476ad7d8e798a38413b504f')throw Error('Starting-break contract pin mismatch');
  const asset=JSON.parse(bytes).assets.find(a=>a.id===match[1]);if(!asset)return false;
  const kind=match[2]==='wav'?'preview':'adpcm';
  return data.length===asset[kind+'_bytes']&&createHash('sha256').update(data).digest('hex')===asset[kind+'_sha256'];
 }
 const seen=new Set(),inputs=[];
 for(const row of manifest.files){
  if(typeof row.path!=='string'||!row.path||row.path.includes('\\')||row.path.startsWith('/')||row.path.split('/').some(x=>!x||x==='.'||x==='..')||seen.has(row.path)||row.path==='SOURCE-MANIFEST.json')throw Error('Invalid or duplicate source path');
  seen.add(row.path);const input=join(source,row.path);noLinks(input,repoRoot);if(!lstatSync(input).isFile())throw Error('Regular product source files required');const data=readFileSync(input);
  if((/\.(?:fwsc|uf2|elf|fsmp|wav|adpcm|bin)$/i.test(row.path)||row.path.split('/').includes('firmware'))&&!admittedStartingBreak(row.path,data))throw Error('Firmware/private audio is not a product source asset');
  inputs.push([row.path,data]);
 }
 // No stale private/unrelated files may ride along in a publisher input.
 function inspectOutput(dir){if(!existsSync(dir))return;for(const name of readdirSync(dir)){const p=join(dir,name);noLinks(p,repoRoot);const stat=lstatSync(p);if(stat.isDirectory())inspectOutput(p);else{if(!stat.isFile())throw Error('Regular output files required');if(stat.nlink!==1)throw Error('Output hardlink refused');if(!seen.has(relative(target,p).split(sep).join('/')))throw Error('unexpected output file: '+relative(target,p));}}}
 inspectOutput(target);
 // Validate the COMPLETE input set before any output changes.
 for(const [name,data]of inputs){const path=join(target,name);noLinks(path,repoRoot);if(check){if(!existsSync(path)||!readFileSync(path).equals(data))throw Error('Product output differs: '+name);}else{mkdirSync(dirname(path),{recursive:true});writeFileSync(path,data);}}
 return{files:inputs.length,output:target,published:false,firmwareWrites:false,catalogMutations:[]};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),i=args.indexOf('--output');if(i!==-1&&!args[i+1])throw Error('--output requires a local directory');
 console.log(JSON.stringify(buildProductSite({output:i===-1?undefined:resolve(args[i+1]),check:args.includes('--check')})));
}
