// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {paintClapStageGlyph} from '../../web/product-site/remote/drum-strip.mjs';
import {polylines} from '../../web/product-site/remote/glyph-live.mjs';
import {clapStageCharts,clapStageReadout} from '../../web/product-site/remote/drum-clap-stages.mjs';

test('808 Clap projects one fixed Maracas Attack and the selected Decay owner',()=>{
  assert.deepEqual(clapStageReadout(3,32,0),clapStageReadout(3,32,1));
  assert.deepEqual(clapStageReadout(3,32,0),{
    owner:'MARACAS',display:'6ms',stageLabel:'K6 A 25%',nominalLabel:'99% 5.5ms'
  });
  assert.deepEqual(clapStageReadout(2,64,0),{
    owner:'CLAP',display:'50%',stageLabel:'K8 D 50%',nominalLabel:'99% 177ms'
  });
  assert.deepEqual(clapStageReadout(2,51,1),{
    owner:'MARACAS',display:'40%',stageLabel:'K8 D 40%',nominalLabel:null
  });
  assert.equal(clapStageReadout(2,64,2),null);
  assert.equal(clapStageReadout(2,128,0),null);
  assert.equal(clapStageReadout(4,0,0),null);
});

test('the native stage page keeps its three time axes and real owner topology',()=>{
  const clap=clapStageCharts(0,32,64), maracas=clapStageCharts(1,32,51);
  assert.deepEqual(clap.map(({title,windowMs,width,height,points})=>[title,windowMs,width,height,points.length]),[
    ['MARACAS ATTACK',90,214,20,33],['CLAP DECAY',650,214,20,33]
  ]);
  assert.deepEqual(maracas.map(({title,windowMs,width,height,points})=>[title,windowMs,width,height,points.length]),[
    ['MARACAS AD',350,214,48,34]
  ]);
  assert.equal(clap[0].points[0][1],20);
  assert.ok(clap[0].points.at(-1)[0]<clap[0].width);
  assert.equal(clap[1].points.at(-1)[0],clap[1].width);
  assert.equal(maracas[0].points.at(-1)[0],maracas[0].width);
  assert.deepEqual(clapStageCharts(0,32,0)[0],clapStageCharts(0,32,127)[0]);
  assert.deepEqual(clapStageCharts(0,0,64)[1],clapStageCharts(0,127,64)[1]);
  assert.notEqual(clapStageCharts(1,0,51)[0].d,clapStageCharts(1,127,51)[0].d);
  assert.notEqual(clapStageCharts(1,32,0)[0].d,clapStageCharts(1,32,127)[0].d);
  assert.deepEqual(clapStageCharts(0,32,undefined),[]);
  assert.deepEqual(clapStageCharts(1,128,51),[]);
  assert.deepEqual(clapStageCharts(2,32,51),[]);
  for(const row of [...clap,...maracas]){
    assert.equal('elapsed' in row,false);
    assert.equal('level' in row,false);
  }
});

test('512 owner/parameter points reproduce the pinned native stage and unit sweep',()=>{
  const witness=createHash('sha256');
  for(const selection of [0,1]){
    for(const parameter of [2,3]){
      for(let raw=0;raw<=127;raw++){
        const attack=parameter===3?raw:32;
        const decay=parameter===2?raw:selection===1?51:64;
        const {display,stageLabel,nominalLabel}=clapStageReadout(parameter,raw,selection);
        witness.update([selection,parameter,raw,display,stageLabel,nominalLabel??''].join('|')+'\n');
        for(const {windowMs,points} of clapStageCharts(selection,attack,decay)){
          witness.update(windowMs+'|'+points.flat().map(v=>Math.round(v*16)).join(',')+'\n');
        }
      }
    }
  }
  // f1786ebe unmodified engine preview outputs passed into compiled dv_bound_stage,
  // ui.c unit_value, physical_stage_label, and the native nominal 99% formatter.
  assert.equal(witness.digest('hex'),'7060c2b488ae4f61b1c7d6f2f42aa6ac7b88290e48f54651e5fc63e675f1e8b6');
});


test('the retained Clap glyph projects the selected native stage and reacts to its real dependencies',()=>{
 let drawing;const attributes={};
 const path={setAttribute(name,value){assert.equal(name,'d');drawing=value;}};
 const glyph={setAttribute(name,value){attributes[name]=value;},querySelector:()=>path};
 const root={querySelectorAll:selector=>{assert.ok(selector.includes('1:1:6:2'));return [glyph];}};
 for(const selection of [0,1])for(const parameter of ['attack','decay'])for(let raw=0;raw<=127;raw++){
  const state={selection,attack:parameter==='attack'?raw:32,decay:parameter==='decay'?raw:selection?51:64};
  paintClapStageGlyph(root,state);
  const chart=clapStageCharts(state.selection,state.attack,state.decay).at(-1);
  const points=polylines(drawing).flat();
  assert.equal(points.length,selection?34:33);
  points.forEach(([x,y],i)=>{
   assert.ok(Math.abs(x-(1+30*chart.points[i][0]/chart.width))<=.000051);
   assert.ok(Math.abs(y-12*chart.points[i][1]/chart.height)<=.000051);
  });
 }
 paintClapStageGlyph(root,{selection:0,attack:0,decay:64});const clap=drawing;
 paintClapStageGlyph(root,{selection:0,attack:127,decay:64});assert.equal(drawing,clap);
 paintClapStageGlyph(root,{selection:1,attack:0,decay:51});const maracas=drawing;
 paintClapStageGlyph(root,{selection:1,attack:127,decay:51});assert.notEqual(drawing,maracas);
 paintClapStageGlyph(root,{selection:0,attack:32,decay:64});assert.equal(drawing,clap);
 assert.equal(attributes['data-glyph-origin'],'firmware dv_cp_stage_page affine projection');
});


test('a queued old-owner glyph frame cannot overwrite the newly selected owner',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'requestAnimationFrame'),queue=[];
 globalThis.requestAnimationFrame=fn=>{queue.push(fn);return queue.length;};
 try{
  let drawing;const glyph={setAttribute(){},querySelector:()=>({setAttribute(name,value){drawing=value;}})};
  const root={querySelectorAll:()=>[glyph]};
  paintClapStageGlyph(root,{selection:0,attack:32,decay:64});
  paintClapStageGlyph(root,{selection:0,attack:32,decay:127});
  assert.ok(queue.length);
  const pending=queue.splice(0);
  paintClapStageGlyph(root,{selection:1,attack:32,decay:51});
  const maracas=drawing;
  for(const callback of pending)callback(10);
  assert.equal(drawing,maracas);
 }finally{if(previous)Object.defineProperty(globalThis,'requestAnimationFrame',previous);else delete globalThis.requestAnimationFrame;}
});
