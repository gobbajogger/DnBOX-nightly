// SPDX-License-Identifier: GPL-3.0-only
// The admin CSP admits one integrity-pinned script. Keep shared modules as the editable sources.
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const product=fileURLToPath(new URL('../web/product-site/',import.meta.url));
export const adminInputs=['hardware-tests.mjs','install-reports.mjs','admin/github.mjs','admin/admin.mjs'];
export function adminAssets(read) {
  const bodies=adminInputs.map(path=>{
    const module=read(path).toString();
    const body=module.replace(/^import [^\n]* from ['"][^'"]+['"];\r?\n/gm,'').replace(/^export /gm,'');
    if(/^\s*(?:import\s|export\s)/m.test(body))throw Error('Unsupported admin module import in '+path);
    return '// '+path+'\n'+body.trimEnd();
  });
  const bundle="'use strict';\n(()=>{\n"+bodies.join('\n\n')+'\n})();\n';
  const integrity='sha256-'+createHash('sha256').update(bundle).digest('base64');
  const source=read('admin/index.html').toString();
  const html=source.replace(/(script-src ')sha256-[a-zA-Z0-9+/=]+(')/,'$1'+integrity+'$2')
    .replace(/(integrity=")sha256-[a-zA-Z0-9+/=]+(")/,'$1'+integrity+'$2');
  if(!html.includes("script-src '"+integrity+"';")||!html.includes('integrity="'+integrity+'"'))throw Error('Missing admin CSP or script integrity.');
  return {bundle,html};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const read=path=>readFileSync(join(product,path),'utf8');
  const {bundle,html}=adminAssets(read);
  if(process.argv.includes('--check')){
    if(read('admin/admin.bundle.js')!==bundle||read('admin/index.html')!==html)throw Error('Admin bundle or CSP differs from source.');
  }else{
    writeFileSync(join(product,'admin/admin.bundle.js'),bundle);
    writeFileSync(join(product,'admin/index.html'),html);
  }
}
