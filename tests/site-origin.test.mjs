// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {SITE_ORIGIN, expandOrigin, githubRepo, pagesUrl} from '../web/product-site/site-origin.mjs';
import {R22_TOKENS} from '../web/product-site/remote/glyphs.mjs';

const root=new URL('../', import.meta.url);
const forbidden=['x0x37-for-Loopy-Pro','X0X37-for-Loopy-Pro'];
const allowed=new Set([
 'web/product-site/site-origin.mjs',
 // Exact previous homepage bytes, kept so the entry edit can be reversed. Not a live link.
 'web/product-site/ENTRY-DISCLOSURE.json'
]);
const roots=['web/product-site','web/x0x_installer.html','web/x0x_breaks.html','web/x0x_projects.html','build-status.json','docs/build-status.json','preview-catalog.json'];

function files(path){
 const abs=new URL(path, root);
 const full=abs.pathname;
 if(!statSync(full).isDirectory()) return [path];
 const out=[];
 for(const name of readdirSync(full)){
  const rel=join(path, name);
  const child=join(full, name);
  if(statSync(child).isDirectory()) out.push(...files(rel));
  else if(/\.(html|mjs|js|json|css)$/.test(name)) out.push(rel);
 }
 return out;
}

test('repo and pages links come from one origin config',()=>{
 assert.equal(githubRepo(SITE_ORIGIN.firmwareRepo), 'https://github.com/gobbajogger/X0X37-for-Loopy-Pro');
 assert.equal(githubRepo(SITE_ORIGIN.nightlyRepo, 'install/'), 'https://github.com/gobbajogger/x0x37-for-Loopy-Pro_nightly/install/');
 assert.equal(pagesUrl('install/'), 'https://gobbajogger.github.io/x0x37-for-Loopy-Pro_nightly/install/');
 assert.equal(expandOrigin('https://github.com/gobbajogger/{{firmwareRepo}}/issues'), githubRepo(SITE_ORIGIN.firmwareRepo,'issues'));
 const hits=[];
 for(const rel of roots.flatMap(files)){
  if(allowed.has(rel)) continue;
  const text=readFileSync(new URL(rel, root), 'utf8');
  for(const name of forbidden) if(text.includes(name)) hits.push(rel+' '+name);
 }
 assert.deepEqual(hits, []);
});

test('corner radii live in the R22 token module',()=>{
 const css=readFileSync(new URL('../web/product-site/remote/style.css', import.meta.url), 'utf8');
 const radii=R22_TOKENS.radii;
 assert.equal(radii.control, 7);
 assert.equal(radii.panel, 7);
 assert.equal(radii.note, 4);
 assert.equal(radii.bar, 2);
 for(const [key,value] of Object.entries({control:radii.control, panel:radii.panel, note:radii.note, bar:radii.bar})){
  assert.match(css, new RegExp(`--r-${key}:${value}px`));
 }
});
