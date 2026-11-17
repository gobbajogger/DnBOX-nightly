// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';import assert from 'node:assert/strict';import {hygieneAudit}from'./product-site-hygiene.mjs';
const sample=(foreground,layers)=>hygieneAudit(null,{colorTest:{foreground,layers}});
test('WCAG luminance yields21:1 for black and white',()=>{assert.equal(sample([0,0,0,1],[{color:[255,255,255,1],opacity:1}]).ratio,21);});
test('R22 label contrast includes the actual opaque panel',()=>{assert.ok(sample([153,170,169,1],[{color:[16,26,31,1],opacity:1}]).ratio>=4.5);});
test('ancestor opacity dims both label and background as one group',()=>{const r=sample([28,30,25,1],[{color:[200,223,167,1],opacity:.48},{color:[27,33,28,1],opacity:1}]);assert.ok(r.ratio<4.5);assert.equal(r.fg[3],1);assert.equal(r.bg[3],1);});
test('transparent final canvas is not silently assumed to have a qualified background',()=>{assert.equal(sample([153,170,169,1],[{color:[0,0,0,0],opacity:1}]).ratio,null);});
