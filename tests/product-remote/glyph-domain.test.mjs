import test from 'node:test';
import assert from 'node:assert/strict';
import components from '../../web/product-site/remote/components.json' with {type:'json'};
import {unit,render,fxGlyphId} from '../../web/product-site/remote/glyph-render.mjs';
import {GLYPH_DRAW} from '../../web/product-site/remote/glyph-registry.mjs';
import {polylines,setGlyphValue} from '../../web/product-site/remote/glyph-live.mjs';
test('raw127 and normalized domains never infer meaning from numeric magnitude',()=>{
 for(const raw of[0,1,2,127])assert.equal(unit(raw,'raw127'),raw/127);
 assert.equal(unit(1.0,'normalized'),1);
 assert.throws(()=>unit(1,'unknown'),/domain/i);
});
test('raw low values share the normalized renderer, without raw1 jumping to max',()=>{
 for(const fn of['LEVEL','WAVE','WIDTH','TAPE'])for(const raw of[0,1,2,127])assert.deepEqual(render(fn,raw,'chicago',{valueDomain:'raw127'}),render(fn,raw/127,'chicago',{valueDomain:'normalized'}));
 assert.notEqual(render('LEVEL',1,'chicago',{valueDomain:'raw127'}).d,render('LEVEL',1,'chicago',{valueDomain:'normalized'}).d);
});
test('live update declares its domain and stores normalized renderer input',()=>{
 const el={dataset:{}};setGlyphValue(el,1,'raw127');assert.equal(Number(el.dataset.glyphValue),1/127);assert.equal(el.dataset.glyphDomain,'normalized');
 setGlyphValue(el,1.0,'normalized');assert.equal(Number(el.dataset.glyphValue),1);
});

test('the sourced Reverb Low Cut uses the shared firmware Tone drawing',()=>{
 const fx=components.screens.find(screen=>screen.path.endsWith('/fx-reverb-direct.svg'));
 const lowCut=fx.controls.find(control=>control.identity==='1:4:0:6');
 const state={valueDomain:'raw127'};
 for(let raw=0;raw<=127;raw++){
  assert.deepEqual(render(lowCut.context.name,raw,'mixer',state),render('TONE',raw,'mixer',state));
 }
});

test('R22 Delay Time keeps its ordinal pips and Feedback uses the known delay type',()=>{
 const delay=components.screens.find(screen=>screen.path.endsWith('/fx-delay-direct.svg'));
 const timeId=fxGlyphId(delay.controls.find(control=>control.context.name==='TIME').identity);
 const feedbackId=fxGlyphId(delay.controls.find(control=>control.context.name==='FEEDBACK').identity);
 assert.equal(timeId,'G052');
 assert.equal(feedbackId,'G053');
 const time=[2,3,4,4,5,5,6,6,7,8,8,9,10];
 for(const [index,gap] of time.entries()){
  const shape=render(timeId,index/12,'mixer');
  assert.equal(shape.fn,'ECHO');
  const lines=polylines(shape.d);
  assert.deepEqual(lines[1],[[2,1],[2,19]]);
  assert.deepEqual(lines.at(-1),[[2,22],[2+gap,22]]);
  assert.deepEqual(lines.slice(2,-1).map(line=>line[0][0]),Array.from({length:Math.floor(36/gap)},(_,tap)=>2+(tap+1)*gap));
 }
 const feedback=(raw,delayType)=>render(feedbackId,raw/127,'mixer',{delayType});
 for(const [mode,heights] of [[0,[10,3,1]],[1,[10,5,2,1]]]){
  const shape=feedback(52,mode);
  assert.equal(shape.fn,'ECHO');
  assert.deepEqual(polylines(shape.d).slice(1).map(([a,b])=>b[1]-a[1]),heights);
 }
 assert.equal(polylines(feedback(0,1).d).length,2);
 assert.notEqual(feedback(52,0).d,feedback(52,1).d);
 for(const mode of [0,1]){
  for(let raw=0;raw<=127;raw++){
   const ratio=raw/127*(mode===1?1.15:0.85);
   const heights=Array.from({length:4},(_,tap)=>Math.floor(10*ratio**tap+0.5)).filter(Boolean);
   assert.deepEqual(polylines(feedback(raw,mode).d).slice(1).map(([a,b])=>b[1]-a[1]),heights);
  }
 }
 assert.equal(feedback(52,undefined).d,render('FEEDBACK',52/127,'mixer').d);
 assert.equal(render('TIME',7/12,'mixer').d,render('FEEDBACK',7/12,'mixer').d);
});

test('the sourced FX return encoders keep separate reverb and delay drawings',()=>{
 const bindings=[
  ['fx-reverb-direct.svg','REV RETURN','1:4:0:7','G059','r22-primitive:REV RETURN',[2,4,6,8,10,12,14]],
  ['fx-delay-direct.svg','DLY RETURN','1:4:0:11','G056','r22-primitive:DLY',[16,13,10,7]]
 ];
 for(const [file,label,address,expectedGlyph,source,steps] of bindings){
  const screen=components.screens.find(row=>row.path.endsWith('/'+file));
  const control=screen.controls.find(row=>row.context.name===label);
  assert.equal(control.identity,address);
  const glyph=fxGlyphId(control.identity);
  assert.equal(glyph,expectedGlyph);
  assert.equal(GLYPH_DRAW[glyph].source,source);
  for(let raw=0;raw<=127;raw++){
   const heights=raw?steps.map(step=>Math.floor((step*raw+126)/127)):[];
   const strokes=polylines(render(glyph,raw/127,'mixer').d);
   assert.deepEqual(strokes[0],[[2,20],[38,20]]);
   assert.deepEqual(strokes.slice(1).map(([a,b])=>b[1]-a[1]),heights);
  }
 }
 assert.equal(fxGlyphId('1:5:4:1'),undefined,'part send fader');
 assert.equal(fxGlyphId('1:5:4:2'),undefined,'part send fader');
});

test('Master Filter picture follows its Draft detail state instead of the macro pot',async()=>{
 const {createMasterDraft}=await import('../../web/product-site/remote/master-draft.mjs');
 const {default:catalog}=await import('../../web/product-site/remote/catalog.json',{with:{type:'json'}});
 const m=createMasterDraft(components,catalog), edits=new Map();
 const draw=()=>render('MASTER FILTER',m.read(m.id(6,13),edits)/127,'mixer',{masterFilter:m.filterState(edits)});
 const off=draw();
 assert.equal(off.fn,'FILTER');
 assert.deepEqual(polylines(off.d),[[[1,10],[39,10]]]);
 assert.equal(off.muted,true);
 const change=m.change(m.id(6,13),edits,0);
 change.redo();
 assert.notEqual(draw().d,off.d);
 assert.equal(draw().muted,false);
 const low=draw().d;
 m.change(m.id(6,10),edits,127).redo();
 assert.notEqual(draw().d,low);
 assert.equal(m.read(m.id(6,13),edits),0);
 change.undo();
 assert.deepEqual(draw(),off);
});
