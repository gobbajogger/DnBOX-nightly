// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fxGlyphId,render} from '../../web/product-site/remote/glyph-render.mjs';
import {polylines} from '../../web/product-site/remote/glyph-live.mjs';
import {createMasterDraft} from '../../web/product-site/remote/master-draft.mjs';
import catalog from '../../web/product-site/remote/catalog.json' with {type:'json'};
import components from '../../web/product-site/remote/components.json' with {type:'json'};

const draw=(role,raw,state={})=>render(role,raw,'mixer',{...state,valueDomain:'raw127'});
test('only the sourced Mix control identities select the native amount drawings',()=>{
  const assignments=[
    ['mix-master.svg','Drive','1:4:0:2','MASTER DRIVE','DRIVE'],
    ['mix-master.svg','PUMP','1:6:0:6','MASTER PUMP','COMP'],
    ['fx-reverb-direct.svg','DECAY','1:4:0:4','REVERB DECAY','DECAY'],
  ];
  for(const [file,label,address,role,family] of assignments){
    const screen=components.screens.find(s=>s.path.endsWith('/'+file));
    const row=screen.controls.find(c=>c.context.name===label);
    assert.equal(row.identity,address);
    assert.equal(fxGlyphId(address),role);
    assert.equal(draw(role,64).fn,family);
    assert.notEqual(draw(role,64).d,draw(label,64).d);
  }
  for(const address of ['1:5:4:1','1:6:0:7','1:4:0:3','1:1:6:2']){
    assert.equal(fxGlyphId(address),undefined);
  }
});

test('Master COMP responds to independent threshold, ratio and blend values',()=>{
  const model=createMasterDraft(components,catalog),edits=new Map(),macro=model.id(6,12);
  const raw=model.read(macro,edits);
  const glyph=()=>draw('MASTER COMP',raw,{masterComp:model.compState(edits)});
  const base=glyph();
  assert.equal(base.fn,'COMP');
  assert.deepEqual(polylines(base.guide),[[[2,20],[38,0]]]);
  model.change(model.id(6,5),edits,0).redo();
  const dry=glyph();
  assert.notEqual(dry.d,base.d);
  model.change(model.id(6,5),edits,127).redo();
  model.change(model.id(6,1),edits,0).redo();
  assert.deepEqual(glyph(),dry);
  const ratio=model.change(model.id(6,1),edits,9);
  ratio.redo();
  assert.notEqual(glyph().d,dry.d);
  const threshold=model.change(model.id(6,0),edits,115),before=glyph();
  threshold.redo();
  assert.notEqual(glyph().d,before.d);
  threshold.undo();
  assert.deepEqual(glyph(),before);
  assert.equal(model.read(macro,edits),raw);
  assert.equal(draw('MASTER COMP',raw).d,draw('COMP',raw).d);
});

test('Master and Reverb role drawings reproduce compiled f178 amount positions',()=>{
  const hash=createHash('sha256');
  const lines=(d,ink)=>d?polylines(d).flatMap(line=>line.slice(1).map((point,index)=>[...line[index],...point,ink].join(','))):[];
  for(let raw=0;raw<=127;raw++){
    for(const role of ['MASTER DRIVE','REVERB DECAY','MASTER PUMP']){
      const {d,guide}=draw(role,raw);
      const curve=lines(d,1),reference=lines(guide,0);
      const operations=role==='REVERB DECAY'?[...reference,...curve]:[...curve,...reference];
      hash.update(role+'|'+raw+'| '+operations.join(' ')+'\n');
    }
  }
  assert.equal(hash.digest('hex'),'6163d0e0e825116beffa910e00af9fcfc9729c31c8fa47ad260bd6f290e569e1');
});

test('all thresholds and ratios reproduce pinned COMP paths at four exact blend values',()=>{
  const hash=createHash('sha256');
  for(let threshold=0;threshold<=127;threshold++){
    for(let ratio=0;ratio<=9;ratio++){
      for(const blend of [0,1,64,127]){
        const shape=draw('MASTER COMP',0,{masterComp:{threshold,ratio,blend}});
        hash.update(Buffer.from(polylines(shape.d)[0].map(point=>point[1])));
      }
    }
  }
  assert.equal(hash.digest('hex'),'1e55226fc951e11196da448a968d026e60409d71afaf11403a674a2ef75ce1bb');
});
