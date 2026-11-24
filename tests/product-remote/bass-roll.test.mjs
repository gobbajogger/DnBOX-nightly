// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {KEEP} from '../../web/product-site/remote/dnr3.mjs';
import {readBassRoll,writeBassStep,writeBassLength} from '../../web/product-site/remote/dnr3-bass-roll.mjs';

function harness(){
  const part=2;
  let pat=20,crc=319,len=2;
  let rec={note:72,gate:1,accent:0,slide:1,velocity:94,end:15};
  const writes=[];
  const rpc={
    async state(){const pattern_crc=Array(32).fill(0);pattern_crc[pat]=crc;return {ppat:[0,2,pat,1,0],pattern_crc};},
    async paramGet([pref]){return [{...pref,value:len-1,max:63}];},
    async stepGet(part,pat,step){return {part,pat,step,record:{...rec}};},
    async stepSet(part,pat,step,record,expected){writes.push([part,pat,step,record,expected]);rec={...record};return {fields:{part,pat,step,record}};},
    async paramSet(pref,value,expected){writes.push([pref,value,expected]);len=value+1;return {fields:{...pref,value}};}
  };
  return {part,rpc,writes,setPat:n=>pat=n,setCrc:n=>crc=n};
}

test('load real address and preserve every non-edited step field in a guarded write',async()=>{
  const h=harness();
  const snap=await readBassRoll(h.rpc,h.part);
  assert.equal(snap.pat,20);
  await writeBassStep(h.rpc,snap,1,'accent',1);
  assert.deepEqual(h.writes,[[2,20,1,{...snap.steps[1],accent:1},319]]);
});

test('pattern length writes the addressed R_BLEN CAS and not a placeholder',async()=>{
  const h=harness();
  const snap=await readBassRoll(h.rpc,h.part);
  await writeBassLength(h.rpc,snap,17);
  assert.deepEqual(h.writes,[[{kind:5,a:0,b:21,c:0},16,1]]);
});

test('reject stale CRC, placeholder switch, invalid sentinel, stale session and destructive pitch/gate change',async()=>{
  const h=harness(), snap=await readBassRoll(h.rpc,h.part);
  for(const field of ['note','gate','chance','start']) await assert.rejects(writeBassStep(h.rpc,snap,1,field,1));
  await assert.rejects(writeBassStep(h.rpc,{...snap,crc:KEEP},1,'slide',1));
  await assert.rejects(writeBassStep(h.rpc,snap,1,'slide',1,()=>false));
  h.setCrc(320);
  await assert.rejects(writeBassStep(h.rpc,snap,1,'end',4));
  h.setCrc(319); h.setPat(0);
  await assert.rejects(writeBassStep(h.rpc,snap,1,'velocity',22));
  await assert.rejects(writeBassLength(h.rpc,snap,17));
  assert.deepEqual(h.writes,[]);
});

test('successful reply without matching independent readback is not confirmed',async()=>{
  const h=harness(), snap=await readBassRoll(h.rpc,h.part);
  h.rpc.stepSet=async(part,pat,step,record)=>({fields:{part,pat,step,record}});
  await assert.rejects(writeBassStep(h.rpc,snap,0,'end',1),/read back/);
});
