import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LANE_KINDS,nextLane} from '../../web/product-site/remote/lane.mjs';
const root=new URL('../../web/product-site/remote/',import.meta.url);
test('step lane label cycles all four parameters and no selected-note inspector is mounted',()=>{
 const html=readFileSync(new URL('index.html',root),'utf8');
 assert.deepEqual(LANE_KINDS,['velocity','chance','pitch','pan']);
 let kind='velocity';for(let i=0;i<4;i++)kind=nextLane(kind);assert.equal(kind,'velocity');
 assert.match(html,/id="lane-param"/);assert.doesNotMatch(html,/id="inspector"/);
});
test('final per-step style uses thin value bars rather than mixer caps',()=>{
 const css=readFileSync(new URL('style.css',root),'utf8');
 const final=css.slice(css.lastIndexOf('/* Per-step lanes are thin'));
 assert.match(final,/#velocity \.fader::before,#velocity \.fader::after\{display:none!important/);
 assert.match(final,/width:2px;bottom:10px;height:calc\(var\(--v\)/);
});
