import test from'node:test';
import assert from'node:assert/strict';
import{GLYPH_CELL,GLYPH_SCALE,formatPan,formatParameterValue,glyphMarkup,isPanLabel,STEP_LANES}from'../../web/product-site/remote/glyphs.mjs';

test('pan notation matches firmware L64 / C / R63',()=>{
 assert.equal(formatPan(0),'L64');
 assert.equal(formatPan(52),'L12');
 assert.equal(formatPan(64),'C');
 assert.equal(formatPan(94),'R30');
 assert.equal(formatPan(127),'R63');
 assert.equal(formatParameterValue('PAN',64),'C');
 assert.equal(formatParameterValue('Pan',94),'R30');
 assert.equal(formatParameterValue('Level',64),'64');
 assert.equal(isPanLabel('pan'),true);
 assert.deepEqual(STEP_LANES.map(l=>l.id),['velocity','chance','pitch']);
 assert.equal(GLYPH_CELL,9);
 assert.equal(GLYPH_SCALE,2);
 for(const lane of STEP_LANES){
  const svg=glyphMarkup(lane.glyph);
  assert.match(svg,/viewBox="0 0 9 9"/);
  assert.match(svg,/width="18" height="18"/);
  assert.match(svg,/shape-rendering="crispEdges"/);
  assert.equal((svg.match(/<rect /g)||[]).length>0,true);
 }
 assert.equal(glyphMarkup('juno-invented'),'');
});
