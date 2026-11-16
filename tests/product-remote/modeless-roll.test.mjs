import test from 'node:test';
import assert from 'node:assert/strict';
import {SequenceDraft} from '../../web/product-site/remote/sequence.mjs';
import {RollGesture} from '../../web/product-site/remote/roll.mjs';
function setup(){
 const model=new SequenceDraft({trace:{sampleRate:44100,endSample:16000,events:[]}});
 const id=model.add({track:'chicago',note:60,start:2000,end:3000});
 const gesture=new RollGesture(model,{select:id=>model.selectIds([id])});
 return {model,id,gesture};
}
const e={pointerId:1,clientX:10,clientY:10};
test('modeless note body moves preserving duration rather than defaulting to end resize',()=>{
 const {model,id,gesture}=setup();
 gesture.down(e,{mode:'auto',id,point:{sample:2000,note:60}});
 gesture.move({...e,clientX:40},{sample:2500,note:62});gesture.up(e);
 assert.deepEqual(model.notes.map(({start,end,note})=>({start,end,note})),[{start:2500,end:3500,note:62}]);
 model.undo();assert.equal(model.notes[0].start,2000);
});
test('explicit modeless handles still resize only the indicated endpoint',()=>{
 for(const edge of ['start','end']){
  const {model,id,gesture}=setup();
  gesture.down(e,{mode:'auto',id,edge,point:{sample:2000,note:60}});
  gesture.move({...e,clientX:40},{sample:2200,note:64});gesture.up(e);
  assert.equal(model.notes[0].start,edge==='start'?2200:2000);
  assert.equal(model.notes[0].end,edge==='end'?3200:3000);
  assert.equal(model.notes[0].note,60);
 }
});
