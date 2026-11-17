import test from 'node:test';
import assert from 'node:assert/strict';
import {SequenceDraft} from '../../web/product-site/remote/sequence.mjs';
import {RollGesture} from '../../web/product-site/remote/roll.mjs';
const e={pointerId:1,clientX:10,clientY:10};
test('modeless draw uses upstream bounded duration with integer sample edges on fractional grids',()=>{
 for(const endSample of[16000,88200,16007]){
  const model=new SequenceDraft({trace:{sampleRate:44100,endSample,events:[]}});
  const gesture=new RollGesture(model,{select:id=>model.selectIds([id])});
  const cell=endSample/16,first=3,last=7;
  gesture.down(e,{mode:'auto',point:{sample:Math.ceil(first*cell),note:60}});
  gesture.move(e,{sample:Math.ceil(last*cell),note:60});gesture.up(e);
  assert.equal(model.notes[0].start,Math.round(first*cell));
  assert.equal(model.notes[0].end,Math.round((last+1)*cell));
  assert.equal(model.notes[0].note,60);assert.equal(model.history.length,1);
  model.undo();assert.equal(model.notes.length,0);
 }
});
