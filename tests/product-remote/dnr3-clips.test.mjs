// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {CAP, NOTIFY_KIND} from '../../web/product-site/remote/dnr3.mjs';
import {createLiveClips} from '../../web/product-site/remote/dnr3-clips.mjs';

const state={ppat:[0,0,0,0,0],pcue:[127,127,127,127,127],clip_mode:0};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function setup(overrides={}) {
  const shown=[];
  const link={connected:()=>true,hello:()=>({caps:CAP.CUE|CAP.WATCH}),readClips:async()=>state,
    confirmClip:async()=>{throw Error('Unexpected live write');},...overrides};
  const controller=createLiveClips({link:()=>link,onChange:s=>shown.push(s)});
  return {controller,shown,link};
}

test('Disconnected, unadvertised, and clip-mode states cannot issue a live write',async()=>{
  for (const [overrides,source] of [
    [{connected:()=>false},'draft'],[{hello:()=>({caps:CAP.CUE})},'unsupported'],
    [{readClips:async()=>({...state,clip_mode:1})},'unsupported'],
  ]) {
    const {controller,shown}=setup(overrides);
    controller.activate();await settle();
    assert.equal(shown.at(-1).source,source);
    assert.equal(await controller.cue(2,3),false);
  }
});
test('No optimistic selection and no double writes while confirmation is in flight',async()=>{
  let release, count=0;
  const {controller,shown}=setup({confirmClip:()=>{++count;return new Promise(ok=>{release=ok;});}});
  controller.activate();await settle();
  const pending=controller.cue(2,3);
  assert.equal(shown.at(-1).firmware.ppat[2],0);
  assert.equal(shown.at(-1).busy,true);
  assert.equal(await controller.cue(2,4),true);
  assert.equal(count,1);
  release({...state,pcue:[127,127,3,127,127]});
  await pending;
  assert.equal(shown.at(-1).busy,false);
  assert.equal(shown.at(-1).firmware.pcue[2],3);
  controller.notify({kind:NOTIFY_KIND.PATTERN,fields:{...state,ppat:[0,0,3,0,0]}});
  assert.equal(shown.at(-1).firmware.ppat[2],3);
});
test('Leaving the view retires late reads',async()=>{
  let release;
  const {controller,shown}=setup({readClips:()=>new Promise(ok=>{release=ok;})});
  controller.activate();controller.close();release(state);await settle();
  assert.deepEqual(shown.map(x=>x.source),['loading']);
});

test('A clip-mode transition never falls through to an optimistic or disabled Draft',async()=>{
  const {controller,shown}=setup({confirmClip:async()=>({blocked:true})});
  controller.activate();await settle();
  assert.equal(await controller.cue(0,3),true);
  assert.equal(shown.at(-1).source,'unsupported');
  assert.equal(shown.at(-1).busy,false);
  assert.equal(shown.at(-1).firmware,null);
  assert.match(shown.at(-1).message,/Draft selections/);
});
