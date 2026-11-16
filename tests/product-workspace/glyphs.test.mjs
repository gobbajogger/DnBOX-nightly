import test from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{GLYPH_CELL,GLYPH_SCALE,R22_TOKENS,formatPan,formatParameterValue,glyphMarkup,isPanLabel,panCell,STEP_LANES}from'../../web/product-site/remote/glyphs.mjs';

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
  assert.doesNotMatch(svg,/crispEdges/);
  assert.equal((svg.match(/<rect /g)||[]).length>0,true);
 }
 assert.equal(glyphMarkup('juno-invented'),'');
});

test('R22 gallery tokens and pan notation',()=>{
 const html=readFileSync(new URL('../../web/product-site/reference/r22.html',import.meta.url),'utf8');
 const style=html.match(/<style>([\s\S]*?)<\/style>/)[1];
 const pick=(re)=>style.match(re)[1];
 assert.equal(R22_TOKENS.page, pick(/background:(#[0-9a-f]{6})/));
 assert.equal(R22_TOKENS.ink, pick(/color:(#[0-9a-f]{6})/));
 assert.equal(R22_TOKENS.fontPage, Number(pick(/font:(\d+)px/)));
 assert.equal(R22_TOKENS.fontTitle, Number(pick(/h1\{font-size:(\d+)px/)));
 assert.equal(R22_TOKENS.muted, pick(/p,small\{color:(#[0-9a-f]{6})/));
 assert.equal(R22_TOKENS.control, pick(/button,select,input\{background:(#[0-9a-f]{6})/));
 assert.equal(R22_TOKENS.line, pick(/border:1px solid (#[0-9a-f]{6})/));
 assert.equal(R22_TOKENS.radii.control, Number(pick(/border-radius:(\d+)px/)));
 assert.equal(R22_TOKENS.radii.panel, R22_TOKENS.radii.control);
 assert.equal(R22_TOKENS.canvas, pick(/#screen\{[^}]*background:(#[0-9a-f]{6})/));
 assert.equal(R22_TOKENS.panel, pick(/pre\{[^}]*background:(#[0-9a-f]{6})/));
 assert.equal(R22_TOKENS.fontMono, Number(pick(/font:(\d+)px ui-monospace/)));
 assert.equal(R22_TOKENS.amber, pick(/summary\{[^}]*color:(#[0-9a-f]{6})/));
 assert.equal(R22_TOKENS.link, pick(/a\{color:(#[0-9a-f]{6})/));
 assert.deepEqual(R22_TOKENS.scales, {label:0.01,compact:0.012,value:0.015,readout:0.023});
 assert.deepEqual([...R22_TOKENS.anim.frameMs], [0,8,16,24,40,60,90,120,160,220,300,420,580,800,1100,1500,2000,2600]);
 assert.equal(R22_TOKENS.anim.frameMin, 20);
 assert.equal(R22_TOKENS.anim.idleDwell, 160);
 assert.equal(R22_TOKENS.anim.endDwell, 300);
 assert.equal(R22_TOKENS.anim.cycle, 3080);
 assert.equal(R22_TOKENS.anim.noteOff, 500);
 assert.equal(R22_TOKENS.anim.easing, 'steps(1,end)');
 assert.equal(panCell(0).includes('>L64<'), true);
 assert.equal(panCell(64).includes('>C<'), true);
 assert.equal(panCell(127).includes('>R63<'), true);
});
