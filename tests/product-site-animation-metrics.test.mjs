// SPDX-License-Identifier: GPL-3.0-only
import test from'node:test';import assert from'node:assert/strict';import{pixelMetrics}from'./product-site-animation-metrics.mjs';
const face=[16,26,31],white=[222,231,223],rgba=(...cs)=>new Uint8ClampedArray(cs.flatMap(c=>[...c,255]));
test('flat face and current solid white are not falsely called antialiased edges',()=>{const r=pixelMetrics(rgba(face,face),rgba(face,white),face,white);assert.equal(r.softEdgePixels,0);assert.equal(r.solidStrokePixels,1);assert.equal(r.changedPixels,1);});
test('real intermediate opaque coverage qualifies while wrong historical solid ink does not',()=>{const r=pixelMetrics(rgba(face,face),rgba([119,128,127],[224,235,214]),face,white);assert.equal(r.softEdgePixels,1);assert.equal(r.offPalettePixels,1);});
test('transparent samples and nonpalette pixels cannot establish rounded AA coverage',()=>{const after=new Uint8ClampedArray([119,128,127,128,0,0,0,255]),r=pixelMetrics(rgba(face,face),after,face,white);assert.equal(r.softEdgePixels,0);assert.equal(r.nonOpaquePixels,1);assert.equal(r.offPalettePixels,1);});
