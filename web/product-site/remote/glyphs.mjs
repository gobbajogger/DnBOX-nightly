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
 return `<svg class="glyph" viewBox="0 0 ${GLYPH_CELL} ${GLYPH_CELL}" width="${px}" height="${px}" aria-hidden="true">${rects.join('')}</svg>`;
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

// This module owns the live readout language.
// Values copied from reference/r22.html. The gallery stylesheet is the chrome contract.
// Device text uses the embedded SVG scales 0.010, 0.012, 0.015 and 0.023.
export const R22_TOKENS=Object.freeze({
 page:'#071014',
 ink:'#dde7de',
 muted:'#a9b9b8',
 control:'#16242b',
 line:'#415052',
 canvas:'#050a0d',
 panel:'#101a1f',
 amber:'#ffb337',
 link:'#45c6f2',
 rule:'#293d42',
 fontPage:15,
 fontTitle:26,
 fontMono:12,
 scales:Object.freeze({label:0.01, compact:0.012, value:0.015, readout:0.023}),
 radii:Object.freeze({control:7,panel:7,note:4,bar:2,field:4}),
 anim:Object.freeze({
  frameMs:Object.freeze([0,8,16,24,40,60,90,120,160,220,300,420,580,800,1100,1500,2000,2600]),
  frameMin:20,
  idleDwell:160,
  endDwell:300,
  cycle:3080,
  noteOff:500,
  easing:'steps(1,end)'
 })
});

import {renderSvg} from './glyph-render.mjs';
export {render,renderSvg,morphFrames,chicagoWaveSamples,chicagoLevel,chicagoTimes,adsrWidths,bd909Hz} from './glyph-render.mjs';
// Live readout. Re-rendered from the value. No decorative motion.
export function glyphFor(id, engine='chicago', value=0.5, state={}){
 return renderSvg(id, value, engine, state);
}
export function panCell(raw){
 return `<div class="readout-cell"><span class="glyph">${renderSvg('PAN', Number(raw), 'chicago', {live:false})}</span><output>${formatPan(raw)}</output><span>PAN</span></div>`;
}
export function envelopeCurve(rows){
 const raw=name=>{const row=(rows||[]).find(c=>String(c.label).toUpperCase()===name);return Number(row?.raw??0)/127;};
 return renderSvg('ADSR', raw('ATTACK'), 'chicago', {live:false, attack:raw('ATTACK'), decay:raw('DECAY'), sustain:raw('SUSTAIN'), release:raw('RELEASE')});
}
