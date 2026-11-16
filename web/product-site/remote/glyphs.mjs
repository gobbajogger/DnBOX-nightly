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

// R23 draft (not approved firmware). Dot owns Remote/website layout.
// This module owns the swappable glyph and value language.
export const R23_DRAFT=Object.freeze({
 status:'DRAFT',
 follows:'R23 draft',
 palette:Object.freeze({canvas:'#050a0d',panel:'#101a1f',field:'#263137',track:'#293839',rail:'#415052',ink:'#dde7de',ink2:'#99aaa9',dim:'#657c7d',amber:'#ffb337',section:'#203829',sectionBar:'#8bbe7b',rec:'#ff4841'}),
 type:Object.freeze({title:10.5,value:10.5,label:7,readout:16}),
 grid:Object.freeze({step:2,margin:4,inset:6,columns:4,cell:58,radius:8}),
 states:Object.freeze({idle:'ink',focused:'amber',activeSection:'section',selected:'field',touch:'readout',unsaved:'amber',unknown:'ink2',recording:'rec',muted:'crossed',disabled:'ink2'}),
 pan:Object.freeze({min:0,centre:64,max:127,display:'L64..C..R63'}),
 superJ6Pan:'unproven — no L/R values'
});

const MONO=Object.freeze({
 wave:'<path d="M4 18 L14 6 V18 L24 6 V18 L36 6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>',
 glide:'<path d="M4 16 H14 L22 8 H36" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>',
 cutoff:'<path d="M4 16 H14 L26 8 H36" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>',
 filter:'<path d="M4 16 H14 L26 8 H36" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>',
 peak:'<path d="M4 16 H12 L20 6 L28 16 H36" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>',
 env:'<path d="M4 18 L10 6 H16 L26 16 H36" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>',
 adsr:'<path d="M4 18 L10 6 H16 L26 16 H36" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>',
 a2:'<path d="M6 18 L28 6 H34" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>',
 d2:'<path d="M6 8 H12 C20 8 24 18 34 18" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>',
 link:'<rect x="6" y="8" width="12" height="8" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="22" y="8" width="12" height="8" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M16 12 H24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
 level:'<path d="M6 18 V16 M11 18 V14 M16 18 V12 M21 18 V10 M26 18 V8 M31 18 V6 M36 18 V4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
 pan:'<path d="M4 12 H36 M4 8 V16 M36 8 V16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="20" cy="12" r="2.2" fill="currentColor"/>',
 tape:'<circle cx="10" cy="9" r="6.5" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="30" cy="9" r="6.5" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="10" cy="9" r="1.6" fill="currentColor"/><circle cx="30" cy="9" r="1.6" fill="currentColor"/><path d="M3.5 9 L8 18 H32 L36.5 9" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><rect x="17" y="16.5" width="6" height="3" rx="0.6" fill="currentColor"/>',
 time:'<path d="M8 18 V8 M8 18 H32 M16 18 V12 M24 18 V14 M32 18 V10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
 feedback:'<path d="M8 18 V8 M15 18 V12 M22 18 V15 M29 18 V17" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
 tone:'<path d="M4 16 H16 L28 8 H36" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>',
 res:'<path d="M4 16 H14 L20 6 L26 16 H36" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>',
 width:'<path d="M8 6 V18 M14 10 V18 M26 10 V18 M32 6 V18" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
 sub:'<path d="M6 8 H34 M6 16 H34" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
 lfo:'<path d="M4 12 C8 4 12 4 16 12 S24 20 28 12 S36 4 36 4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
 chorus:'<path d="M6 8 C14 4 18 16 26 12 S34 8 34 8 M6 16 C14 12 18 20 26 16 S34 16 34 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
 attack:'<path d="M8 18 L28 6 H34" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
 decay:'<path d="M6 8 H14 C22 8 26 18 34 18" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
 release:'<path d="M6 8 H18 C26 8 30 18 34 18" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
 sustain:'<path d="M6 14 H34" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
 tune:'<path d="M20 4 V16 M14 16 H26 M16 20 H24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
 wobble:'<path d="M4 12 C8 6 12 18 16 12 S24 6 28 12 S36 18 36 12" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
 hpf:'<path d="M4 16 L16 8 H36" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>',
 bite:'<path d="M8 16 L14 8 L20 16 L26 8 L32 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>',
 gnaw:'<path d="M6 14 H12 L16 8 L20 16 L24 10 L28 16 H34" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>'
});

const LABEL_GLYPH=Object.freeze({
 WAVE:'wave',GLIDE:'glide',CUTOFF:'cutoff',FILTER:'filter',PEAK:'peak',ENV:'env',RES:'res',HPF:'hpf',
 LEVEL:'level',PAN:'pan',TAPE:'tape',TIME:'time',FEEDBACK:'feedback',TONE:'tone',WIDTH:'width',SUB:'sub',
 'LFO RATE':'lfo','LFO DEPTH':'lfo','CHO RATE':'chorus',CHORUS:'chorus',ATTACK:'attack',DECAY:'decay',
 RELEASE:'release',SUSTAIN:'sustain',TUNE:'tune',WOBBLE:'wobble',BITE:'bite',GNAW:'gnaw','DLY RETURN':'level'
});

export function r23Glyph(name){
 const body=MONO[name];
 if(!body) return '';
 return `<svg class="glyph r23" viewBox="0 0 40 24" width="40" height="24" aria-hidden="true" data-r23-draft="R23 draft">${body}</svg>`;
}

export function r23GlyphForLabel(label){
 return r23Glyph(LABEL_GLYPH[String(label??'').toUpperCase()]);
}

export function r23StateClass(state){
 return R23_DRAFT.states[state]?'is-'+state:'is-idle';
}

function cell(c){
 const value=c.value??'';
 return `<div class="r23-cell ${r23StateClass(c.state||'idle')}"><span class="r23-glyph">${r23Glyph(c.glyph)}</span><output class="r23-value">${value}</output><span class="r23-label">${c.label}</span></div>`;
}

export function r23Section(title,cells,{active=false,mode=''}={}){
 const modeMark=mode?`<span class="r23-mode">${r23Glyph(mode==='TAPE'?'tape':mode)}<span class="r23-label">${mode}</span></span>`:'';
 return `<section class="r23-section${active?' is-active':''}" data-r23-draft="R23 draft"><h3 class="r23-label">${title}</h3>${modeMark}<div class="r23-grid">${cells.map(cell).join('')}</div></section>`;
}

export function r23ChicagoCard(){
 return ['wave','glide','cutoff','env'].map(r23Glyph).join('');
}

// SuperJ6 uses Juno sections. Its global pan formatter is unproven, so this section has no L/R values.
export function r23SuperJ6Amp(){
 return r23Section('AMP',[
  {glyph:'adsr',label:'ADSR',value:'',state:'idle'},
  {glyph:'a2',label:'A2',value:'',state:'idle'},
  {glyph:'d2',label:'D2',value:'',state:'idle'},
  {glyph:'link',label:'LINK',value:'',state:'focused'}
 ],{active:true});
}

// Synth One is glyph-first. autoPan is not a static bipolar pan, so it stays off this strip.
export function r23SynthOne(){
 return r23Section('OSCILLATOR',[
  {glyph:'wave',label:'WAVE',value:'',state:'idle'},
  {glyph:'filter',label:'FILTER',value:'',state:'idle'},
  {glyph:'level',label:'LEVEL',value:'',state:'idle'},
  {glyph:'env',label:'ENV',value:'',state:'idle'}
 ]);
}

export function r23DelayStrip(cells){
 return r23Section('DELAY',cells,{mode:'TAPE'});
}

export function r23PanCell(raw){
 return `<div class="r23-cell is-idle" data-r23-draft="R23 draft"><span class="r23-glyph">${r23Glyph('pan')}</span><output class="r23-value">${formatPan(raw)}</output><span class="r23-label">PAN</span></div>`;
}
