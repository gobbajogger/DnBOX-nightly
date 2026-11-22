// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {createMasterDraft} from '../../web/product-site/remote/master-draft.mjs';
import {render,fxGlyphId} from '../../web/product-site/remote/glyph-render.mjs';
import {polylines} from '../../web/product-site/remote/glyph-live.mjs';
import catalog from '../../web/product-site/remote/catalog.json' with {type:'json'};
import components from '../../web/product-site/remote/components.json' with {type:'json'};

const model=createMasterDraft(components,catalog);
const named=new Map([['6:1',[9,'4:1']],['6:7',[2,'909']],['6:11',[1,'ON']],['4:1',[7,'Off']]]);
const scalar=new Set(['6:0','6:2','6:3','6:4','6:5','6:10','4:3','4:0']);
test('the twelve More bindings reuse scalar bars and use the native named-selector geometry',()=>{
  assert.equal(model.more.length,named.size+scalar.size);
  for(const spec of model.more){
    const address=spec.target+':'+spec.parameter;
    if(named.has(address)){
      const [max,display]=named.get(address);
      assert.equal(spec.max,max);
      assert.equal(spec.glyph,'MASTER MORE CHOICE '+(max+1),address);
      for(let raw=0;raw<=max;raw++){
        const {rects}=render(spec.glyph,raw/max,'mixer');
        assert.equal(rects.length,max+1);
        assert.equal(rects.findIndex(rect=>rect.ink==='primary'),raw);
        assert.equal(rects.filter(rect=>rect.ink==='primary').length,1);
        assert.ok(rects.every(rect=>rect.x>=2 && rect.x+rect.w<=38));
      }
      assert.equal(model.display(spec.id,spec.value),display);
    }else{
      assert.ok(scalar.has(address),address);
      assert.equal(spec.max,127);
      assert.equal(spec.glyph,'MASTER MORE AMOUNT',address);
    }
  }
  assert.equal(model.spec(model.id(6,12)).glyph,'COMP');
  assert.equal(model.spec(model.id(6,6)).glyph,'PUMP');
});

test('the stored-pot bar has the pinned zero, first and end fills',()=>{
  const view=raw=>render('MASTER MORE AMOUNT',raw/127,'mixer').rects;
  assert.equal(view(0).length,1);
  assert.equal(view(1).length,2);
  assert.equal(view(1)[1].w,36*3/70);
  assert.equal(view(127)[1].w,view(127)[0].w);
  assert.ok(view(64)[1].w>view(32)[1].w);
});

test('only the three FX lowpass addresses share the original Tone drawing',()=>{
  const ids=['1:4:0:5','1:4:0:6','1:4:0:10'];
  for(const identity of ids)assert.equal(fxGlyphId(identity),'FX TONE');
  assert.equal(fxGlyphId('1:4:0:12'),undefined);
  const draw=raw=>render('FX TONE',raw/127,'mixer');
  assert.equal(draw(64).fn,'TONE');
  assert.notEqual(draw(64).d,render('TONE',64/127,'mixer').d);
  assert.deepEqual(polylines(draw(0).d),[[[2,4],[9,4],[38,18]]]);
  assert.deepEqual(polylines(draw(127).d),[[[2,4],[29,4],[38,18]]]);
});

test('all More states and the three FX Tone bindings match the pinned source digest',()=>{
  const hash=createHash('sha256');
  for(const spec of model.more){
    const address=spec.target+':'+spec.parameter;
    for(let raw=0;raw<=spec.max;raw++){
      const display=model.display(spec.id,raw);
      const {rects}=render(spec.glyph,raw/spec.max,'mixer');
      hash.update(address+'|'+raw+'|'+display+'|'+JSON.stringify(rects)+'\n');
    }
  }
  for(let raw=0;raw<=127;raw++){
    const paths=['1:4:0:5','1:4:0:6','1:4:0:10'].map(identity=>render(fxGlyphId(identity),raw/127,'mixer'));
    assert.deepEqual(paths[0],paths[1]);
    assert.deepEqual(paths[0],paths[2]);
    hash.update('TONE|'+raw+'|'+JSON.stringify(polylines(paths[0].d)[0])+'\n');
  }
  assert.equal(hash.digest('hex'),'058ca17ee62c42708eaa3e1c16d4ae2646042b993f786f44d5e0c07da322af9e');
});
