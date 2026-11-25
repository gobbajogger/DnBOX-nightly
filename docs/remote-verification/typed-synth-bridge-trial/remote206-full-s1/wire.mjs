import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import readline from 'node:readline';
import {mountDnr3Link} from './remote/dnr3-link.mjs';
import {groupSynthRows} from './remote/dnr3-synth-catalog.mjs';
import * as d from './remote/dnr3.mjs';
const raw=[];
const replies=[];
const events=[];
const withLink=!!process.env.LINK_CABLE;
const proc=spawn(process.env.LINK_CABLE||new URL(process.argv.includes('--dual')?'./typed-cable':'./native-cable',import.meta.url).pathname);
const reader=readline.createInterface({input:proc.stdout})[Symbol.asyncIterator]();
const input=new EventTarget(); Object.assign(input,{name:'DnBOX',state:'connected'});
const output=new EventTarget(); Object.assign(output,{name:'DnBOX',state:'connected'});
let queue=Promise.resolve();
function command(line){
  const work=queue.then(async()=>{
    proc.stdin.write(line+'\n');
    for(;;){
      const r=await reader.next(); if(r.done)throw Error('Firmware subprocess exited early');
      if(r.value==='END')break;
      assert.match(r.value,/^(?:[a-f0-9]{2})+$/);
      const bytes=Buffer.from(r.value,'hex'),e=new Event('midimessage');
      replies.push(bytes); Object.defineProperty(e,'data',{value:Uint8Array.from(bytes)});
      input.dispatchEvent(e);
    }
  });
  queue=work;
  return work;
}
output.send=bytes=>{raw.push(Uint8Array.from(bytes));void command('M '+Buffer.from(bytes).toString('hex'));};
const label={dataset:{}};
let requests=[];
const link=mountDnr3Link({document:{getElementById:id=>id==='conn-state'?label:null},navigator:{
  requestMIDIAccess:async options=>{requests.push(options);return {inputs:new Map([[1,input]]),outputs:new Map([[2,output]])};}
},timeoutMs:1000});
link.onNotify(e=>events.push(e));
try{
  assert.equal(label.textContent,'Disconnected');
  await link.connect();
  assert.equal(label.textContent,'Connected');assert.equal(link.connected(),true);assert.deepEqual(requests,[{sysex:true}]);
  const ops=raw.map(d.decodeRequest); assert.deepEqual(ops.slice(0,3).map(x=>x.op),[d.OP.HELLO,d.OP.OPEN,d.OP.WATCH]);
  const watched=replies.map(d.decodeFrame).find(x=>x.op===(d.OP.WATCH|64)&&x.seq===ops[2].seq);
  assert.ok(watched); assert.equal(d.decodeReply(d.encodeFrame(watched.op,watched.seq,watched.payload)).fields.mask&(d.WATCH.VOICE|d.WATCH.POSITION),d.WATCH.VOICE|d.WATCH.POSITION);
  assert.ok(link.hello().caps & 0x1000);
  for(const [bank,slot,ids,playedEdit] of [[2,0,[2,5,16,17,19,22,23,24,25,26,27,28,29],16],[3,1,[7],7]]){
    const session=link.synthSession(slot);
    assert.equal(session.typed,true);
    const state=await session.read();
    assert.equal(state.owner.bank,bank); assert.deepEqual(state.rows.map(r=>r.id),bank===2&&withLink?[...ids,255]:ids);
    const groups=groupSynthRows(state.rows);
    assert.deepEqual(groups.map(g=>[g.title,g.rows.map(r=>r.id)]),bank===2?
      [['Oscillators',[2,5]],['Filter',withLink?[16,17,19,255]:[16,17,19]],['Filter envelope',[22,23,24,25]],['Amp envelope',[26,27,28,29]]]:[['Filter',[7]]]);
    assert.equal(new Set(groups.flatMap(g=>g.rows.map(r=>r.label))).size,ids.length+(bank===2&&withLink?1:0));
    assert.ok(!groups.some(g=>g.key==='seq-on'));
    console.log('REAL firmware reported only:',JSON.stringify({bank,slot,groups:groups.map(g=>[g.title,g.rows.map(r=>r.id)])}));
    const row=state.rows.find(r=>r.id===playedEdit);assert.ok(row.writable);
    assert.equal(row.label,'Cutoff');
    const initial=row.value,target=(initial+3)%(row.max+1),mark=raw.length;
    const hit=await session.write(row.id,target);
    assert.equal(hit.rows.find(r=>r.id===row.id).value,target);
    assert.equal(raw.slice(mark).map(d.decodeRequest).filter(x=>x.op===d.OP.PARAM_SET).length,1);
    await session.write(row.id,initial);
    assert.equal((await session.read()).rows.find(r=>r.id===row.id).value,initial);
    if(bank===2&&withLink){
      const onwire=()=>raw.map(d.decodeRequest).filter(x=>x.op===d.OP.PARAM_SET);
      const compare=rows=>rows.filter(r=>r.id!==255).map(r=>[r.id,r.value]);
      const baseline=await session.read();
      const option=baseline.rows.find(r=>r.id===255);
      assert.deepEqual(option.address,{kind:113,a:2,b:0,c:127});
      assert.equal(option.label,'Filter Link');
      assert.equal(option.presentation.originalUnit,null);
      assert.equal(option.presentation.symbol,null);
      assert.deepEqual(option.choices,['Off','On']);
      const old=option.value,next=1-old,m=onwire().length;
      const toggle=await session.write(255,next);
      assert.equal(toggle.rows.find(r=>r.id===255).value,next);
      const reread=await session.read();
      assert.equal(reread.rows.find(r=>r.id===255).value,next);
      assert.deepEqual(compare(reread.rows),compare(baseline.rows));
      await session.write(255,old);
      const fine=await session.read();
      assert.equal(fine.rows.find(r=>r.id===255).value,old);
      assert.deepEqual(compare(fine.rows),compare(baseline.rows));
      assert.deepEqual(onwire().slice(m).map(({fields:q})=>[q.kind,q.a,q.b,q.c,q.expect_bank,q.expect,q.value]),[[113,2,0,127,2,old,next],[113,2,0,127,2,next,old]]);
      console.log('PASS actual DnBOX-only Filter Link high ID255 read/toggle/independent read/restore, exact 13 authored values unchanged, one guarded SET per action',JSON.stringify({old,next,restored:old}));
    }
    session.close();
  }
  console.log('PASS actual typed app adapter parsed both provider sets, confirmed and restored one edit on each, exactly one SET per action.');

  await link.disconnect();assert.equal(label.textContent,'Disconnected');
}finally{proc.stdin.end();proc.kill();}
