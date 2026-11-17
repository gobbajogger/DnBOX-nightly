// SPDX-License-Identifier: GPL-3.0-only
// Static local module/theme closure only; not a browser or export qualification.
// Recognises this repository's literal from/import and CSS @import syntax.
// It does not execute modules or claim to parse arbitrary JavaScript.
import {readFileSync,existsSync,lstatSync} from 'node:fs';
import {resolve,relative,dirname,sep,extname} from 'node:path';
import {createHash} from 'node:crypto';
export function runtimeClosure(root,entries){
 root=resolve(root);const seen=new Set(),result={files:[],missing:[],escaped:[]};
 const name=path=>relative(root,path).split(sep).join('/');
 function visit(path,importer){
  path=resolve(path);
  if(path!==root&&!path.startsWith(root+sep)){result.escaped.push({importer,path:name(path)});return;}
  if(!existsSync(path)){result.missing.push({importer,path:name(path)});return;}
  // Read-only probe still refuses links/non-files rather than following them.
  let at=root;for(const part of relative(root,path).split(sep)){at=resolve(at,part);if(lstatSync(at).isSymbolicLink()){result.escaped.push({importer,path:name(path),reason:'symlink'});return;}}
  if(seen.has(path))return;seen.add(path);
  if(!lstatSync(path).isFile()){result.missing.push({importer,path:name(path),reason:'not-regular-file'});return;}
  const data=readFileSync(path),text=data.toString('utf8');
  result.files.push({path:name(path),bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
  const pattern=extname(path)==='.css'?/@import\s+(?:url\(\s*)?['"]([^'"]+)['"]/g:/(?:\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g;
  for(const match of text.matchAll(pattern)){
   const ref=match[1];if(!ref.startsWith('.'))continue;
   visit(resolve(dirname(path),ref.split(/[?#]/,1)[0]),name(path));
  }
 }
 for(const entry of entries)visit(resolve(root,entry),'entry');
 result.files.sort((a,b)=>a.path.localeCompare(b.path));
 return result;
}
