import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import readline from 'node:readline';
import {mountDnr3Link} from './web-typed/remote/dnr3-link.mjs';
import * as d from './web-typed/remote/dnr3.mjs';
const raw=[];
const replies=[];
const events=[];
const proc=spawn(new URL(process.argv.includes('--dual')?'./dual-cable':'./native-cable',import.meta.url).pathname);
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
  const client=link.drumClient();
  const pre=await client.state();
  assert.equal(await link.writeTempo(104.5),1045);
  assert.equal(await link.readTempo(),1045);
  const epoch=ops[2].fields.epoch;
  const mark=raw.length;
  await command('M '+Buffer.from(d.encodeRequest(d.OP.TEMPO,14000,{epoch,bpm_x10:1357})).toString('hex'));
  await command('T 70');
  assert.equal(await link.readTempo(),1357);
  assert.ok(events.some(x=>x.kind===d.NOTIFY_KIND.TRANSPORT&&x.fields.bpm_x10===1357),JSON.stringify(events));
  const note=36,v=107;
  await command('M '+Buffer.from([0x90|pre.ch[0],note,v]).toString('hex'));
  await command('T 45');
  assert.ok(events.some(e=>e.kind===d.NOTIFY_KIND.VOICE&&e.fields.part===0&&e.fields.note===note&&e.fields.velocity===v),JSON.stringify(events));
  const evt=events.length;
  await command('M fa');
  await command('T 300');
  await command('T 300');
  const started=events.slice(evt).filter(e=>e.kind===d.NOTIFY_KIND.POSITION).map(e=>e.fields.step_pos);
  assert.ok(started.some(a=>a[0]!==127),JSON.stringify(events.slice(evt)));
  await command('M fc');
  await command('T 60');
  assert.ok(events.slice(evt).some(e=>e.kind===d.NOTIFY_KIND.POSITION&&e.fields.step_pos.every(v=>v===127)),JSON.stringify(events.slice(evt)));
  assert.ok(raw.slice(mark).every(x=>[d.OP.STATE,d.OP.KEEPALIVE].includes(d.decodeRequest(x).op)));
  if(process.argv.includes('--dual')){
    const edits=[];
    for(const [slot,bank] of [[0,2],[1,3]]){
      const addr={kind:1,a:2,b:slot,c:2};
      const desc=await client.describe(addr);
      const [before]=await client.paramGet([addr]); console.log('PROVIDER',slot,bank,JSON.stringify({desc,before}));
      assert.ok(before.max>1&&before.value<=before.max);
      const target=(before.value+1)%(before.max+1);
      assert.equal((await client.paramSet(addr,target,before.value,{bank})).fields.value,target);
      assert.equal((await client.paramGet([addr]))[0].value,target);
      await assert.rejects(client.paramSet(addr,before.value,target,{bank:slot?2:3}));
      assert.equal((await client.paramGet([addr]))[0].value,target);
      assert.equal((await client.paramSet(addr,before.value,target,{bank})).fields.value,before.value);
      const supported=[];
      for(let base=0;base<128;base+=16){
        const params=Array.from({length:16},(_,i)=>({...addr,c:base+i}));
        const records=await client.paramGet(params);
        assert.equal(records.length,params.length);
        supported.push(...records.filter(x=>x.max>0&&x.value!==d.KEEP).map(x=>x.c));
      }
      edits.push({slot,bank,edit:addr.c,from:before.value,to:target,readback:target,wrongBankRefused:true,restored:true,supported,labels:await Promise.all(supported.map(c=>client.describe({...addr,c}).then(x=>x.name)))});
    }
    console.log(JSON.stringify({optInDualProviders:edits}));
  }
  const good=[];
  assert.ok(link.hello().caps & 0x1000);
  for (const [bank,slot,ids,edit,status] of [[2,0,[2,5,16,17,19,22,23,24,25,26,27,28,29],16,d.STATUS.QUEUED],[3,1,[7],7,d.STATUS.OK]]) {
    const addr=(id)=>({kind:id<128?112:113,a:bank,b:slot,c:id&127});
    const seen=[];
    for(let n=0;n<256;n+=16){
      const params=Array.from({length:16},(_,i)=>addr(n+i));
      const rows=await client.paramGet(params);
      assert.equal(rows.length,params.length);
      for (let k=0;k<16;k++){
        const q=rows[k], p=params[k];
        assert.deepEqual([q.kind,q.a,q.b,q.c],[p.kind,p.a,p.b,p.c]);
        if(q.value!==d.KEEP)seen.push(n+k);
      }
    }
    assert.deepEqual(seen,ids);
    const des=await client.describe(addr(edit));
    assert.equal(des.unit,0x60);assert.ok(des.max>1);
    const read=async (p=addr(edit))=>(await client.paramGet([p]))[0].value;
    const original=await read(), next=(original+5)%(des.max+1);
    for(const [value,expect,guard] of [[next,original,bank===2?3:2],[next,d.KEEP,bank],[next,next,bank],[des.max+1,original,bank]]){
      await assert.rejects(client.paramSet(addr(edit),value,expect,{bank:guard}));
      assert.equal(await read(),original);
    }
    assert.equal(await read({...addr(edit),b:1-slot}),d.KEEP);
    await assert.rejects(client.describe(addr(200)));
    assert.equal(await read(),original);
    const ack=await client.paramSet(addr(edit),next,original,{bank});
    assert.equal(ack.status,status);assert.equal(ack.fields.value,next);
    await command('T 75');
    assert.equal(await read(),next);
    const lastSet=raw.findLast(x=>d.decodeRequest(x).op===d.OP.PARAM_SET);
    const num=replies.length;
    await command('M '+Buffer.from(lastSet).toString('hex'));
    const replay=d.decodeReply(replies[num]);assert.equal(replay.status,status);
    assert.equal(replay.fields.value,next);assert.equal(await read(),next);
    await client.paramSet(addr(edit),original,next,{bank});
    await command('T 75');assert.equal(await read(),original);
    const panel=link.synthSession(slot);
    assert.ok(panel?.typed);
    const visible=await panel.read();
    assert.deepEqual(visible.rows.map(r=>r.id),seen);
    assert.ok(visible.rows.every(r=>r.writable));
    const path=visible.rows.find(r=>r.id===edit);
    const panelOriginal=path.value;
    const panelNext=(path.value+7)%(path.max+1);
    const panelReceipt=await panel.write(edit,panelNext);
    assert.equal(panelReceipt.rows.find(r=>r.id===edit).value,panelNext);
    assert.equal(await read(),panelNext);
    await panel.write(edit,panelOriginal);
    assert.equal(await read(),panelOriginal);
    panel.close();
    const allSet=[];
    for(const id of seen){
      const a=addr(id), dsc=await client.describe(a);
      assert.equal(dsc.unit,0x60);
      const initial=await read(a);
      const added=(initial+19)%(dsc.max+1);
      const put=await client.paramSet(a,added,initial,{bank});
      assert.equal(put.status,status);
      await command('T 50'); assert.equal(await read(a),added);
      await client.paramSet(a,initial,added,{bank});
      await command('T 50'); assert.equal(await read(a),initial);
      allSet.push(id);
    }
    const preReload=await read();
    await command('P '+slot);
    // The same bank and preset reloads with the exact same displayed value.
    // No intervening GET: the previous observed owner cannot accept the write.
    await assert.rejects(client.paramSet(addr(edit),next,preReload,{bank}),
      e=>e.status===d.STATUS.CONFLICT);
    assert.equal(await read(),preReload);
    good.push({bank,slot,ids:seen,playedEdit:edit,ack:status,old:original,readback:next,originalRestored:true,staleAndInvalidRefused:true,retryDedup:true,actualPanelEdit:true,samePresetReloadRefused:true,allSet});
  }
  console.log(JSON.stringify({typed:good}));
  console.log(JSON.stringify({transport:'actual #206 JS Web MIDI selector/link + restored native C full-app host over raw-byte cable; no authored protocol replies',handshake:ops.slice(0,3).map(x=>x.op),caps:link.hello().caps,tempos:[pre.bpm_x10,1045,1357],pad:{part:0,note,v},nativePositions:started.length,stopCleared:true,externalStimuliNoPageEdits:true}));
  await link.disconnect();assert.equal(label.textContent,'Disconnected');
}finally{proc.stdin.end();proc.kill();}
