// SPDX-License-Identifier: GPL-3.0-only
// Executable bodies from the shipped Product installer, with mocked MIDI transport only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {makePackage} from './fixtures/bundled-synthetic.mjs';
import {withInstallSnapshot} from './fixtures/install-snapshot.mjs';

const html=readFileSync(new URL('../web/product-site/install/index.html',import.meta.url),'utf8');
const body=html.slice(html.indexOf('const BLOCKS = 20'),html.indexOf('const $ = (id)',html.indexOf('const BLOCKS = 20')));
const ctx={TextEncoder,TextDecoder,crypto:globalThis.crypto,setTimeout:fn=>globalThis.setTimeout(fn,0),clearTimeout};
runInNewContext(body+'\nthis.api={Updater,installKeepingSlots,verifyFactoryData,logicalImage,packageSlotMap,userSlotRaw,pack78};',ctx);
const {Updater,installKeepingSlots,verifyFactoryData,logicalImage,packageSlotMap,userSlotRaw,pack78}=ctx.api;
const product='SMK-37 Pro_900';
const nativeMap=[[0xC2000,0x14000],[0xD6000,0xF000],[0xB3000,0x8000]];
const fdata=Buffer.alloc(0xF000,0xff); fdata.write('S1PK'); fdata[4]=1;
const image=logicalImage(makePackage('pro',{slotMap:nativeMap,extraFiles:[[103,'fdata.bin',fdata]]}));
const liveHeader=[...fdata.subarray(0,32)].flatMap(b=>[b&127,b>>7]);
const protocol=[0xf0,0x7d,0x46,0x4c];
const info=(command,bytes)=>[...protocol,command,...bytes,0xf7];
const UPGRADE=[0xf0,0x22,0x24,0x35,0x7f,0xf7];
const bytes=[1,2,3,4];
const rawSample=userSlotRaw('long',[{adpcm:Uint8Array.from(bytes),n:8,rate:22050}],0x1E000);
const slot=new Uint8Array(512+rawSample.data.length).fill(255);
slot.set(rawSample.hdr);slot.set(rawSample.data,512);
const zeroSlots=()=>[3,80,0,0,0,0,0,0,0,0,0];
const emptyExtended=()=>[...zeroSlots(),0x58,1,0x42,1,20,0,0,0,0x56,1,15,0,0,0,0x33,1,8,0,0,0];
function occupiedSlots(){
  return [3,80,0,0,0,1,108,111,110,103,0,70,0,0,0,
    0x58,1,0x42,1,20,0,0,0,0x56,1,30,0,70,0,0x33,1,8,0,0,0];
}
function fixture(mode){
  const trace=[];
  let reply=null;
  const input={name:'SMK',state:'connected'},output={name:'SMK',state:'connected'};
  const link={input,output,drain(){reply=null;},close(){},send(frame){
    trace.push([...frame]);
    if(frame[4]===15)reply=info(15,mode==='bad-layout'?[0,0]:mode.startsWith('occupied')?occupiedSlots():mode.startsWith('fresh')?emptyExtended():zeroSlots());
    if(frame[4]===16){
      const addr=frame.slice(5,9), data=new Uint8Array(frame[9]*2).fill(255);
      if(mode==='fresh-dirty-header')data[0]=1;
      if(mode==='fresh-wrong-address')addr[0]^=1;
      reply=info(16,[...addr,...pack78(data)]);
    }
    if(frame[4]===52)reply=info(52,mode==='bad-readback'?[0,...liveHeader]:[1,...liveHeader]);
    return true;
  },read:async()=>{const out=reply;reply=null;return out;}};
  const dev={name:'SMK',id:{model:'SMK-37 Pro',text:product},link};
  const loader={...dev,id:{model:'ota-SMK-37 Pro',text:'ota-'+product}};
  const up=new Updater({inputs:new Map([['in',input]]),outputs:new Map([['out',output]])},()=>{});
  up.find=async filter=>filter(dev.id)?dev:null;
  up.waitFor=async filter=>filter(loader.id)?loader:filter(dev.id)?dev:null;
  up.serve=async()=>({finished:true,served:1});
  const snapshot=mode==='no-snapshot'?null:withInstallSnapshot(link);
  return {up, snapshot, trace};
}
// Read the real restore/backup hooks but substitute no sample data during
// mode-specific archive tests. The actual archive serialization/verification stays live.
function assignBackup(fn){ctx.syntheticBackup=fn;runInNewContext('backupSlots=syntheticBackup;',ctx);}
test('strict package refuses missing atomic capability and malformed layout before any update',async()=>{
 for(const mode of ['no-snapshot','bad-layout']){
   const {up,trace,snapshot}=fixture(mode);
   await assert.rejects(installKeepingSlots(up,image,product,'smk',{factoryData:true}),e=>e.code==='slotbackup');
   assert.equal(up.verified,false);
   assert.equal(trace.some(x=>x.join()===UPGRADE.join()),false);
   if (snapshot) assert.deepEqual(snapshot.operations,[1,2]);
 }
});
test('exact valid factory-data readback is needed before reporting verified',async()=>{
 for(const mode of ['empty','bad-readback']){
  const {up,trace,snapshot}=fixture(mode), steps=[];
  const result=installKeepingSlots(up,image,product,'smk',{factoryData:true,step:k=>steps.push(k)});
  if(mode==='bad-readback')await assert.rejects(result,e=>e.code==='fdata');
  else assert.equal((await result).unprotected,false);
  assert.deepEqual(snapshot.operations,[1,3]);
  assert.equal(trace.filter(x=>x.join()===UPGRADE.join()).length,1,'only the loader gets legacy UPGRADE');
  assert.equal(trace.filter(x=>x[4]===52).length,1);
  assert.equal(steps.includes('done'),mode==='empty');
  assert.equal(up.verified,mode==='empty');
 }
});
test('unretained archive and dirty snapshot stop; retained archive plus unchanged snapshot can proceed',async()=>{
 for(const mode of ['occupied-unretained','occupied-dirty','occupied-retained']){
  const state=fixture(mode);
  const saveEvents=[];
  const oldLayout={count:3,size:81920,ext:true,slots:[
   {nz:0,used:0,size:81920,off:0xC2000},{nz:1,used:70,size:122880,off:0xD6000},{nz:0,used:0,size:32768,off:0xB3000}
  ]};
  assignBackup(async()=>({layout:oldLayout,images:[null,slot,null]}));
  const realFinish=state.up.finishApplication.bind(state.up);
  // Stop after exact application verification, before the separate sample
  // restoration exchange. The restore/map check runs in its own integration gate.
  state.up.finishApplication=async(...args)=>{await realFinish(...args);throw Error('post-write test boundary');};
  const install=installKeepingSlots(state.up,image,product,'smk',{factoryData:true,
   saveStrict:(file,name)=>{saveEvents.push([file.length,name]);if(mode==='occupied-dirty')state.snapshot.changed();return mode!=='occupied-unretained';}});
  await assert.rejects(install,mode==='occupied-retained'?/post-write test boundary/:e=>e.code==='slotbackup'||e.code==='slotbackupconfirm');
  assert.equal(saveEvents.length,1);
  assert.equal(state.trace.some(x=>x.join()===UPGRADE.join()),mode==='occupied-retained');
  assert.equal(state.snapshot.commits,mode==='occupied-retained'?1:0);
 }
});
test('strict slot bounds reject a package that overlaps reserved FDATA',async()=>{
 const {up,trace}=fixture('empty');
 const bad=logicalImage(makePackage('pro',{slotMap:[[0xC2000,0x14000],[0xD6000,0x1E000]],extraFiles:[[103,'fdata.bin',fdata]]}));
 await assert.rejects(installKeepingSlots(up,bad,product,'smk',{factoryData:true}),e=>e.code==='fdata');
 assert.deepEqual(trace,[]);
});
test('malformed and wrong bank replies never count as FDATA verification',async()=>{
 for(const payload of [[0,...liveHeader],[1,...liveHeader.slice(0,-1)],[1,1,2,...liveHeader.slice(2)],[1,1,...liveHeader.slice(1)]]){
  let next=info(52,payload);
  const link={drain(){},send(){return true;},read:async()=>{const result=next;next=null;return result;}};
  await assert.rejects(verifyFactoryData(link,fdata),e=>e.code==='fdata');
 }
});

test('retention UI checks the actual saved bytes instead of accepting a download click',async()=>{
 const make=()=>({hidden:true,textContent:'',value:'',scrollIntoView(){},removeAttribute(key){delete this[key];}});
 const ids=['strict-backup-panel','strict-backup-download','strict-backup-file','strict-backup-cancel','strict-backup-status'];
 const [panel,download,input,cancel,status]=ids.map(make);
 let revoke=0;
 const retention=html.slice(html.indexOf('async function saveVerifiedSlotBackup'),html.indexOf('async function run(img'));
 const save=runInNewContext(retention+'\nsaveVerifiedSlotBackup;',{
   $:id=>[panel,download,input,cancel,status][ids.indexOf(id)], window:new EventTarget(), Blob,
   URL:{createObjectURL:()=> 'blob:synthetic',revokeObjectURL(){revoke++;}},setTimeout,clearTimeout
 });
 const expected=Uint8Array.from([0,9,2]);
 let answered=false;
 const task=save(expected,'sample-backup.x0xslots').then(v=>{answered=true;return v;});
 assert.equal(panel.hidden,false);assert.equal(download.download,'sample-backup.x0xslots');assert.equal(answered,false);
 input.files=[{size:3,arrayBuffer:async()=>Uint8Array.from([1,9,2]).buffer}];
 await input.onchange();assert.equal(answered,false);assert.match(status.textContent,/different/);
 input.files=[{size:3,arrayBuffer:async()=>expected.buffer}];
 await input.onchange();assert.equal(await task,true);assert.equal(panel.hidden,true);assert.equal(revoke,1);
 const cancelled=save(expected,'sample-backup.x0xslots');
 cancel.onclick();assert.equal(await cancelled,false);assert.equal(revoke,2);
});

test('fresh starter permission is established under the snapshot before OTA, never from reboot alone',async()=>{
  for(const mode of ['fresh-ok','fresh-dirty-header','fresh-wrong-address','no-snapshot','bad-readback']){
    const {up,trace,snapshot}=fixture(mode), opts={factoryData:true,startingBreaks:true,sameBreaks:()=>true};
    const operation=installKeepingSlots(up,image,product,'smk',opts);
    if(['fresh-wrong-address','no-snapshot','bad-readback'].includes(mode)){
      await assert.rejects(operation);
      if(mode!=='bad-readback')assert.equal(trace.some(f=>f.join()===UPGRADE.join()),false);
      continue;
    }
    const got=await operation;
    assert.equal(got.freshBreaks,mode==='fresh-ok');
    assert.deepEqual(snapshot.operations,[1,3]);
    const read=trace.findIndex(f=>f[4]===16), upgrade=trace.findIndex(f=>f.join()===UPGRADE.join());
    assert.ok(read>=0 && read<upgrade,mode);
    assert.ok(trace.findIndex(f=>f[4]===52)>upgrade,mode);
  }
});
