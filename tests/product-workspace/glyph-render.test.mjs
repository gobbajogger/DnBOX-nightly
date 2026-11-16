import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {chicagoWaveSamples, chicagoTimes, adsrWidths, bd909Hz, render, morphFrames} from '../../web/product-site/remote/glyph-render.mjs';

test('Chicago WAVE matches the firmware saw-to-square crossfade at 0, 50 and 100 percent',()=>{
 // ui.c draw_wave_glyph: mix 0 is the falling saw, mix 127 is the square.
 const saw=chicagoWaveSamples(0), mid=chicagoWaveSamples(64), square=chicagoWaveSamples(127);
 assert.ok(saw[0]>saw[13], '0% falls across the ramp');
 assert.equal(square[0], square[6]);
 assert.ok(square[0]>square[7]);
 assert.ok(mid[3]>saw[3] && mid[3]<square[3], '50% sits between saw and square');
 for(let mix=0;mix<127;mix++){
  const a=chicagoWaveSamples(mix)[10], b=chicagoWaveSamples(mix+1)[10];
  assert.ok(b<=a+1e-9, 'a late-ramp sample falls toward the square');
 }
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
