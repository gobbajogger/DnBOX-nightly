import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {chicagoWaveSamples, chicagoWaveZ, cdiv, readoutYs, chicagoTimes, adsrWidths, bd909Hz, render, morphFrames} from '../../web/product-site/remote/glyph-render.mjs';

const FIX=JSON.parse(readFileSync(new URL('../product-remote/fixtures/glyph-fixtures-102x26.json', import.meta.url),'utf8'));
const ZFIX=JSON.parse(readFileSync(new URL('../product-remote/fixtures/chicago-wave-z-ctrunc.json', import.meta.url),'utf8'));

test('WAVE and WIDTH readouts equal the golden 102x26 fixture at every sweep step',()=>{
 for(const [key,engine,fn] of [['juno_wave','juno','WAVE'],['chicago_wave','chicago','WAVE'],['juno_width','juno','WIDTH']]){
  assert.deepEqual(Object.keys(FIX[key]),['0','16','32','48','64','80','96','112','127']);
  for(const [midi,ys] of Object.entries(FIX[key])) assert.deepEqual(readoutYs(fn,engine,Number(midi)),ys,`${key} ${midi}`);
 }
});

test('Chicago WAVE raw samples use C truncating division from ui_original_wave.h',()=>{
 assert.match(ZFIX.source,/ui_original_wave\.h/);
 for(const [midi,z] of Object.entries(ZFIX.z)) assert.deepEqual(chicagoWaveZ(56,Number(midi)/127),z,`midi ${midi}`);
 assert.equal(cdiv(-7,4),-1);
 const saw=chicagoWaveSamples(0), square=chicagoWaveSamples(127);
 assert.ok(saw[1]<saw[0] && saw[27]<saw[1], '0% is a falling saw');
 assert.equal(square[5],square[20], '100% holds flat like a pulse');
 assert.ok(Number.isFinite(saw[3]), 'gain constant is a number');
});

test('Juno pulse width grows with the value and Chicago ADSR stage widths follow the RC law',()=>{
 const narrow=render('PWM',0.1,'juno',{});
 const wide=render('PWM',0.9,'juno',{});
 assert.notEqual(wide.d, narrow.d);
 const narrowT=chicagoTimes(0,0.5,0.5), wideT=chicagoTimes(1,0.5,0.5);
 assert.ok(wideT.A>narrowT.A);
 const share=(a)=>adsrWidths({...chicagoTimes(a,0.5,0.5), S:0.6})[0];
 assert.ok(share(1)>share(0));
 const idle=render('ADSR',0.2,'chicago',{live:false, age:40, attack:0.2, decay:0.5, sustain:0.6, release:0.4});
 const again=render('ADSR',0.2,'chicago',{live:false, age:90, attack:0.2, decay:0.5, sustain:0.6, release:0.4});
 assert.equal(idle.d, again.d);
});

test('909 tune follows drum909_bd_hz and idle or zero-depth motion does not decorate',()=>{
 const early=bd909Hz(20,0.5,1,0), later=bd909Hz(20,0.5,1,80);
 assert.ok(early>later, 'pitch drops after the 16 ms hold');
 const flat=render('LFO',0.8,'chicago',{live:true, depth:0});
 assert.equal(flat.d, render('LFO',0.2,'chicago',{live:true, depth:0}).d);
 const held=morphFrames('WAVE',0,1,'chicago',{live:false});
 assert.equal(held.length, 1);
 const moving=morphFrames('WAVE',0,1,'chicago',{live:true, depth:1});
 assert.ok(moving.length>2);
 assert.notEqual(moving[0].d, moving.at(-1).d);
});

test('no r23 token, class or glyph remains in the Remote or site UI',()=>{
 const root=new URL('../../web/product-site/', import.meta.url);
 const skip=new Set(['reference/r22.html','builds/index.html','data/history.json','ENTRY-DISCLOSURE.json']);
 const hits=[];
 function walk(rel){
  const abs=new URL(rel, root);
  const st=statSync(abs);
  if(st.isDirectory()){
   if(rel.startsWith('reference')) return;
   for(const name of readdirSync(abs)) walk(join(rel, name));
   return;
  }
  if(!/\.(mjs|css|html|js)$/.test(rel) || skip.has(rel)) return;
  const text=readFileSync(abs,'utf8');
  if(/\br23\b/i.test(text)) hits.push(rel);
 }
 walk('');
 assert.deepEqual(hits, []);
});
