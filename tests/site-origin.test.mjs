// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {SITE_ORIGIN, githubRepo, pagesUrl, repoLinks, isKnownRepo, LIVE_ROOTS, SEALED} from '../web/product-site/site-origin.mjs';
import {R22_TOKENS} from '../web/product-site/remote/glyphs.mjs';

const root=new URL('../', import.meta.url);
function files(path){
 const full=new URL(path, root).pathname;
 if(!statSync(full).isDirectory()) return [path];
 const out=[];
 for(const name of readdirSync(full)){
  const rel=join(path, name), child=join(full, name);
  if(statSync(child).isDirectory()) out.push(...files(rel));
  else if(/\.(html|mjs|js|json|css)$/.test(name)) out.push(rel);
 }
 return out;
}

test('repo and pages links come from one origin config',()=>{
 assert.equal(githubRepo(SITE_ORIGIN.firmwareRepo), 'https://github.com/gobbajogger/DnBOX');
 assert.equal(pagesUrl('install/'), 'https://gobbajogger.github.io/DnBOX-nightly/install/');
 const bad=[];let seen=0;
 for(const rel of LIVE_ROOTS.flatMap(files)){
  if(SEALED.has(rel)) continue;
  for(const l of repoLinks(readFileSync(new URL(rel, root), 'utf8'))){
   if(l.owner!==SITE_ORIGIN.owner) continue; // third-party links (sample sources etc.)
   seen++;
   if(!isKnownRepo(l.repo) && !(l.pages && l.repo===SITE_ORIGIN.nightlyRepo)) bad.push(rel+' '+l.repo);
  }
 }
 assert.ok(seen>0,'live links found');
 assert.deepEqual(bad, []);
});

test('no runtime link templating survives (links must work without JS)',()=>{
 const hits=LIVE_ROOTS.flatMap(files).filter(rel=>/\{\{(firmware|nightly)Repo\}\}/.test(readFileSync(new URL(rel, root),'utf8')));
 assert.deepEqual(hits, []);
});

test('a rename is one constant: links disagreeing with SITE_ORIGIN are caught',()=>{
 const links=repoLinks('<a href="https://github.com/gobbajogger/OldName/issues">');
 assert.equal(isKnownRepo(links[0].repo), false);
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
