// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runtimeClosure} from './product-runtime-closure.mjs';
const entries=['hero.mjs','site.css','tool-theme.css'];
const fixture=fileURLToPath(new URL('./fixtures/site-first-wip-runtime/',import.meta.url));
test('actual first public WIP fails closure for its two absent shared interfaces',()=>{
 const meta=JSON.parse(readFileSync(new URL('./fixtures/site-first-wip-runtime/provenance.json',import.meta.url)));
 for(const row of meta.files){const data=readFileSync(fixture+'/'+row.path);assert.equal(createHash('sha256').update(data).digest('hex'),row.sha256);assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+data.length+'\0'),data])).digest('hex'),row.gitBlob);}
 const result=runtimeClosure(fixture,entries);
 assert.deepEqual([...new Set(result.missing.map(x=>x.path))].sort(),meta.missing);
 assert.equal(result.escaped.length,0);
});
test('current local shared composition resolves all imported hero/theme inputs',()=>{
 const result=runtimeClosure(fileURLToPath(new URL('../web/product-site/',import.meta.url)),entries);
 assert.deepEqual(result.missing,[]);assert.deepEqual(result.escaped,[]);
 for(const name of ['r22-tokens.css','remote/wave-display.mjs','remote/glyph-live.mjs','remote/chicago-wave-projection.mjs'])assert.ok(result.files.some(x=>x.path===name),name);
});
