import test from'node:test';
import assert from'node:assert/strict';
import{GLYPH_CELL,GLYPH_SCALE,R23_DRAFT,formatPan,formatParameterValue,glyphMarkup,isPanLabel,r23DelayStrip,r23Glyph,r23PanCell,r23SuperJ6Amp,r23SynthOne,STEP_LANES}from'../../web/product-site/remote/glyphs.mjs';

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

test('R23 draft keeps pan, tape, three type sizes and SuperJ6 without L/R',()=>{
 assert.equal(R23_DRAFT.status,'DRAFT');
 assert.equal(R23_DRAFT.pan.centre,64);
 assert.equal(R23_DRAFT.pan.min,0);
 assert.equal(R23_DRAFT.pan.max,127);
 assert.deepEqual([R23_DRAFT.type.title,R23_DRAFT.type.value,R23_DRAFT.type.label],[10.5,10.5,7]);
 assert.equal(R23_DRAFT.grid.step,2);
 assert.equal(R23_DRAFT.grid.columns,4);
 const tape=r23Glyph('tape');
 assert.equal((tape.match(/<circle /g)||[]).length,4);
 assert.match(tape,/<rect /);
 assert.match(tape,/data-r23-draft="R23 draft"/);
 const j6=r23SuperJ6Amp();
 assert.match(j6,/ADSR/);
 assert.match(j6,/LINK/);
 assert.match(j6,/is-active/);
 assert.equal([...j6.matchAll(/<output class="r23-value">([^<]*)<\/output>/g)].map(m=>m[1]).join(''),'');
 assert.doesNotMatch(j6,/RAW|>PAN</);
 assert.equal([...r23SynthOne().matchAll(/<output class="r23-value">([^<]*)<\/output>/g)].map(m=>m[1]).join(''),'');
 assert.doesNotMatch(r23SynthOne(),/RAW|>PAN</);
 const delay=r23DelayStrip([{glyph:'time',label:'TIME',value:'1/8.'}]);
 assert.match(delay,/>TAPE</);
 assert.match(delay,/>TIME</);
 assert.equal(r23PanCell(0).includes('>L64<'),true);
 assert.equal(r23PanCell(64).includes('>C<'),true);
 assert.equal(r23PanCell(127).includes('>R63<'),true);
 assert.equal(r23Glyph('missing'),'');
});
