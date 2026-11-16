// SPDX-License-Identifier: GPL-3.0-only
// One swappable Remote glyph family.
// Spacing and type live in style.css :root (--u, --fs, --fs-value, --hit).
//
// Taken from public firmware notes (read-only, not vendored):
// - PR #887 e8f2f1f6 docs/engineering-delivery/f4-smc-mixer-remainder/UI_GLYPHS.md
//   9×9 atlas, integer scale, compact pictograms, keep names and exact values.
// - PR #887 e8f2f1f6 docs/ui-shared-glyph-20261027.md
//   one shared control family; bipolar pan uses exact centre and endpoints.
// - PR #887 e8f2f1f6 docs/mockups/glyph-polish/README.md
//   nearest-neighbour pixels; Chicago bipolar centre is pot 64.
// - PR #944 d0ace9fa docs/design/dnbox-whole-instrument-20261114/r5/evidence/glyph-reuse-contract.md
//   Chicago keeps its row family; current Juno cells are a label plus a neutral bar.
//   These marks are that shared compact family, not new Juno instrument pictograms.
// - PR #944 d0ace9fa experiments/dnbox-ui-model-20261115/README.md
//   Chicago glyph raster is the reference family. This module is not device UI.

export const GLYPH_CELL=9;
export const GLYPH_SCALE=2;

// 9×9 on/off cells. Integer scale only. One family for lane marks.
const ATLAS=Object.freeze({
 velocity:[
  '000000001',
  '000000011',
  '000000111',
  '000001111',
  '000011111',
  '000111111',
  '001111111',
  '011111111',
  '111111111'
 ],
 chance:[
  '000000000',
  '011000110',
  '011000110',
  '000111000',
  '000111000',
  '011000110',
  '011000110',
  '000000000',
  '000000000'
 ],
 pitch:[
  '000011100',
  '000010000',
  '000010000',
  '000010000',
  '000010000',
  '001110000',
  '011110000',
  '011100000',
  '001000000'
 ],
 pan:[
  '000010000',
  '000010000',
  '100010001',
  '110010011',
  '111111111',
  '110010011',
  '100010001',
  '000010000',
  '000010000'
 ]
});

export const STEP_LANES=Object.freeze([
 {id:'velocity',label:'Velocity',glyph:'velocity'},
 {id:'chance',label:'Chance',glyph:'chance'},
 {id:'pitch',label:'Pitch',glyph:'pitch'}
]);

export function glyphMarkup(name){
 const rows=ATLAS[name];
 if(!rows||rows.length!==GLYPH_CELL||rows.some(row=>row.length!==GLYPH_CELL)) return '';
 const px=GLYPH_CELL*GLYPH_SCALE;
 const rects=[];
 rows.forEach((row,y)=>{[...row].forEach((bit,x)=>{if(bit==='1')rects.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);});});
 return `<svg class="glyph" viewBox="0 0 ${GLYPH_CELL} ${GLYPH_CELL}" width="${px}" height="${px}" aria-hidden="true" shape-rendering="crispEdges">${rects.join('')}</svg>`;
}

// Mixer/voice pan is a stored 0–127 integer. Firmware shows L64 … C … R63.
// Centre raw 64 is display "C" (manual/original/index.html; remote/components.json).
export function formatPan(raw){
 const n=Number(raw);
 if(!Number.isInteger(n)||n<0||n>127) return String(raw);
 if(n===64) return 'C';
 if(n<64) return 'L'+(64-n);
 return 'R'+(n-64);
}

export function isPanLabel(label){
 return typeof label==='string'&&label.toUpperCase()==='PAN';
}

export function formatParameterValue(label,value){
 return isPanLabel(label)?formatPan(value):String(value);
}
