// SPDX-License-Identifier: GPL-3.0-only
// Assemble reviewed product sources into a separate local output. Never deploys.
import {readFileSync,writeFileSync,mkdirSync,existsSync,lstatSync,readdirSync}from'node:fs';
import {resolve,dirname,join,relative,sep}from'node:path';
import {fileURLToPath}from'node:url';import{createHash}from'node:crypto';
import {SITE_ORIGIN,githubRepo,pagesUrl} from '../web/product-site/site-origin.mjs';

const oldNightly = 'gobbajogger/x0x37-for-Loopy-Pro_nightly';
const oldFirmware = 'gobbajogger/X0X37-for-Loopy-Pro';
const renamedRoots = new Map([
 ['https://github.com/'+oldNightly, githubRepo(SITE_ORIGIN.nightlyRepo)],
 ['https://github.com/'+oldFirmware, githubRepo(SITE_ORIGIN.firmwareRepo)],
 ['https://raw.githubusercontent.com/'+oldFirmware, 'https://raw.githubusercontent.com/'+SITE_ORIGIN.owner+'/'+SITE_ORIGIN.firmwareRepo],
 ['https://api.github.com/repos/'+oldNightly, 'https://api.github.com/repos/'+SITE_ORIGIN.owner+'/'+SITE_ORIGIN.nightlyRepo],
 ['https://gobbajogger.github.io/x0x37-for-Loopy-Pro_nightly', pagesUrl().replace(/\/$/,'')],
]);
function renamedUrl(url) {
 if (typeof url !== 'string') return url;
 for (const [oldRoot, newRoot] of renamedRoots) {
  if (url === oldRoot || url.startsWith(oldRoot + '/')) return newRoot + url.slice(oldRoot.length);
 }
 return url;
}
// Keep the sealed source record intact. Only public transport addresses follow a repository rename.
function buildCatalog(source) {
 const catalog = JSON.parse(source);
 if ('repo' in catalog) catalog.repo = renamedUrl(catalog.repo);
 if ('pages' in catalog) catalog.pages = renamedUrl(catalog.pages);
 for (const row of catalog.versions) {
  if ('evidence_url' in row) row.evidence_url = renamedUrl(row.evidence_url);
  for (const model of Object.values(row.models ?? {})) {
   if (model && 'pkg' in model) model.pkg = renamedUrl(model.pkg);
  }
 }
 return Buffer.from(JSON.stringify(catalog,null,2)+'\n');
}
import {readEmulatorRuntime,readEmulatorPin} from './emulator-runtime.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export function buildProductSite({repoRoot=root,output=join(repoRoot,'.output/product-site'),check=false,emulatorRuntime}={}){
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
  inputs.push([row.path,row.path==='versions.json'?buildCatalog(data):data]);
 }
 // Keep historical preview URLs working without admitting arbitrary private audio.
 // Aliases reuse only WAV bytes that passed the pinned five-sample admission above.
 for(const [name,data]of [...inputs]){
  const match=/^assets\/starting-breaks\/(personal-br[12]-zone[123])\.wav$/.exec(name);
  if(!match)continue;
  for(const alias of [`private-audio/${match[1]}`,`private-audio/${match[1]}.wav`]){
   if(seen.has(alias))throw Error('Starting-break alias collision');
   seen.add(alias);inputs.push([alias,data]);
  }
 }
 // Explicit qualified runtime staging. Absence remains unavailable, never a fake emulator.
 if(emulatorRuntime){
  const pin=readEmulatorPin(join(repoRoot,'scripts/emulator-runtime-pin.json'));
  for(const [name,data] of readEmulatorRuntime({directory:emulatorRuntime,pin})){
   if(seen.has(name))throw Error('Native runtime output collision');seen.add(name);inputs.push([name,data]);
  }
 }
 // No stale private/unrelated files may ride along in a publisher input.
 function inspectOutput(dir){if(!existsSync(dir))return;for(const name of readdirSync(dir)){const p=join(dir,name);noLinks(p,repoRoot);const stat=lstatSync(p);if(stat.isDirectory())inspectOutput(p);else{if(!stat.isFile())throw Error('Regular output files required');if(stat.nlink!==1)throw Error('Output hardlink refused');if(!seen.has(relative(target,p).split(sep).join('/')))throw Error('unexpected output file: '+relative(target,p));}}}
 inspectOutput(target);
 // Validate the COMPLETE input set before any output changes.
 for(const [name,data]of inputs){const path=join(target,name);noLinks(path,repoRoot);if(check){if(!existsSync(path)||!readFileSync(path).equals(data))throw Error('Product output differs: '+name);}else{mkdirSync(dirname(path),{recursive:true});writeFileSync(path,data);}}
 return{files:inputs.length,output:target,emulator:Boolean(emulatorRuntime),published:false,firmwareWrites:false,catalogMutations:[]};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),i=args.indexOf('--output');if(i!==-1&&!args[i+1])throw Error('--output requires a local directory');
 console.log(JSON.stringify(buildProductSite({output:i===-1?undefined:resolve(args[i+1]),check:args.includes('--check'),emulatorRuntime:process.env.DNBOX_EMULATOR_RUNTIME})));
}
