// SPDX-License-Identifier: GPL-3.0-only
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBreakSteps} from '../../web/product-site/remote/dnr3-break-steps.mjs';
import {CAP, KEEP} from '../../web/product-site/remote/dnr3.mjs';
const delay=()=>new Promise(r=>setTimeout(r,0));
function instrument(){
  let pat=2, crc=100, playing=0, fields={on:0,slice:0}, sends=[], pending;
  const c={epoch:1,has:x=>x===CAP.STEP,state:async()=>({playing,ppat:[0,0,0,0,pat],pattern_crc:{[pat]:crc}}),
    stepGet:async(part,p,s)=>({part,pat:p,step:s,record:s===0?fields:{on:0,slice:0}}),
    stepSet:async(part,pat,step,record,expect)=>{sends.push({part,pat,step,record,expect});
      await new Promise(r=>pending=r);fields=record;crc++;
      return {status:0,fields:{part,pat,step,record,pattern_crc:crc}};}};
  return {c, sends,setPat:n=>{pat=n;},setCrc:n=>{crc=n;},setPlaying:n=>{playing=n;},complete:()=>pending?.()};
}
test('blocks stale and unguardable patterns, never displays proposed edits',async()=>{
  const f=instrument(), ui=createBreakSteps(()=>f.c,()=>{});
  try{
    ui.start();await delay();
    assert.equal(ui.state().snapshot.rows[0].slice,0);
    f.setPat(3);
    await ui.edit(0,r=>({...r,slice:11}));
    assert.equal(f.sends.length,0);
    assert.equal(ui.state().snapshot.rows,null);
    await ui.refresh();
    f.setCrc(KEEP);
    await ui.refresh();
    await ui.edit(0,r=>({...r,slice:11}));
    assert.equal(f.sends.length,0);
    f.setCrc(100);await ui.refresh();
    const work=ui.edit(0,r=>({...r,slice:11}));
    await delay();
    assert.deepEqual(f.sends,[{part:4,pat:3,step:0,record:{on:0,slice:11},expect:100}]);
    assert.equal(ui.state().snapshot.rows[0].slice,0);
    f.complete();await work;
    assert.equal(ui.state().snapshot.rows[0].slice,11);
    f.setPlaying(1);await ui.refresh();
    await ui.edit(0,r=>({...r,slice:15}));
    assert.equal(f.sends.length,1);
  }finally{ui.stop();}
});
