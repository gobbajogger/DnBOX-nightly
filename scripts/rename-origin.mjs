// SPDX-License-Identifier: GPL-3.0-only
// Usage: edit SITE_ORIGIN, then: node scripts/rename-origin.mjs oldOwner/oldRepo [oldOwner/oldRepo2]
import{readdirSync,readFileSync,statSync,writeFileSync}from'node:fs';
import{join}from'node:path';
import{SITE_ORIGIN,LIVE_ROOTS,SEALED}from'../web/product-site/site-origin.mjs';
const olds=process.argv.slice(2);if(!olds.length){console.error('usage: rename-origin.mjs oldOwner/oldRepo ...');process.exit(2);}
const walk=p=>statSync(p).isDirectory()?readdirSync(p).flatMap(n=>walk(join(p,n))):/\.(html|mjs|js|json|css)$/.test(p)?[p]:[];
const target=old=>{const repo=old.split('/')[1];return repo.toLowerCase().endsWith('_nightly')?SITE_ORIGIN.nightlyRepo:SITE_ORIGIN.firmwareRepo;};
let n=0;
for(const f of LIVE_ROOTS.flatMap(walk)){if(SEALED.has(f)||f.endsWith('site-origin.mjs'))continue;let t=readFileSync(f,'utf8'),o=t;
 for(const old of olds){const[ow,repo]=old.split('/');t=t.replaceAll(`github.com/${ow}/${repo}`,`github.com/${SITE_ORIGIN.owner}/${target(old)}`).replaceAll(`${ow}.github.io/${repo}`,`${SITE_ORIGIN.owner}.github.io/${target(old)}`);}
 if(t!==o){writeFileSync(f,t);n++;console.log('rewrote',f);}}
console.log(n+' files');
