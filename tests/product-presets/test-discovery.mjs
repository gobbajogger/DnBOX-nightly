import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('Tools distinguishes original-format editor from earlier DNPR ZIP workflow',()=>{
 const html=readFileSync(new URL('../../web/product-site/tools/index.html',import.meta.url),'utf8');
 assert.match(html,/Rename presets in original Synth One or SuperJ6 files/);
 assert.match(html,/href="\.\.\/presets\/">Open preset editor/);
 assert.match(html,/href="\.\.\/presets\/legacy\/">Earlier DnBOX \.dnpr and ZIP files/);
 assert.doesNotMatch(html,/Preview and organize DnBOX user presets\. Download individual files or a ZIP/);
});
