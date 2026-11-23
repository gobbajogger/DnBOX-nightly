// SPDX-License-Identifier: GPL-3.0-only
// Run with the already-reviewed local-miami WASI pilot; no provider admission.
// Usage: node panel-level.mjs ADMISSION_PILOT_WASM NIGHTLY_WASI_MJS
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const [bin,wasi]=process.argv.slice(2), bytes=fs.readFileSync(bin);
const kernel='db1d79bc8bfb5ab3fa9a8fdb78518e42abf99674253b1cb16a602da1e2e28f4e';
assert.equal(createHash('sha256').update(bytes).digest('hex'),kernel);
assert.equal(createHash('sha256').update(fs.readFileSync(wasi)).digest('hex'),'a1fdc47f5b2abd23374101bdac49067c1fb5d60ac397cd19e2780e3d6d6c0dc1');
const {createKernelWasi}=await import(pathToFileURL(wasi));
let n; n=new WebAssembly.Instance(new WebAssembly.Module(bytes),{wasi_snapshot_preview1:createKernelWasi(()=>n.memory)}).exports;
n._initialize(); assert.equal(n.web_boot(),0);
const step=ms=>{const t=n.web_time()+ms;while(n.web_time()<t)assert.equal(n.web_render(128),0);};
const turn=(role,delta)=>{assert.equal(n.web_turn(role,delta),0);step(240);};
const buttons=(mask)=>{assert.equal(n.web_buttons(mask),0);step(65);};
const tap=(b)=>{buttons(1<<b);buttons(0);};
const sound=()=>{
 const len=n.web_snapshot();assert.ok(len>=8);
 const buf=Buffer.from(new Uint8Array(n.memory.buffer,n.web_store_buffer(),len));
 assert.equal(buf.toString('ascii',0,4),'DBX1');assert.equal(buf.readUInt32LE(4),7);
 let pos=8;
 for(let i=0;i<7;i++){
  const count=buf.readUInt32LE(pos);pos+=4;
  if(count===0xffffffff)continue;
  assert.ok(pos+count<=len);
  if(i===1){assert.equal(count,4+7*12*32+2*12);assert.equal(buf.readUInt32LE(pos),1);return Buffer.from(buf.subarray(pos+4,pos+count));}
  pos+=count;
 }
 throw Error('Missing native Sound object');
};
step(1300);
assert.equal(n.web_pilot_miami_read_snapshot(0,0,1),127);
for(let i=0;i<4;i++)turn(1,1);
tap(4);
step(700);
const before=sound();
const carrierLevel=2*12*32+1, editMask=2*12*32+22, editedTag=7*12*32+10;
assert.equal(before[carrierLevel],115);
turn(4,-1);step(800);
const after=sound();
const touched=Array.from(after.keys()).filter(i=>after[i]!==before[i]);
assert.deepEqual(touched,[carrierLevel,editMask,editedTag]);assert.equal(after[editMask],before[editMask]|2);
assert.equal(after[editedTag],before[editedTag]|1);assert.equal(after[carrierLevel],114);
assert.equal(n.web_pilot_miami_read_snapshot(0,0,1),127);
buttons(1<<6);buttons((1<<6)|(1<<11));buttons(1<<6);buttons(0);step(850);
const restored=sound();
assert.deepEqual(restored,before);
assert.equal(n.web_pilot_miami_read_snapshot(0,0,1),127);
assert.equal(n.web_sound_read(1),20);
console.log(JSON.stringify({kernel,control:'Bass A / MIAMI / CARRIER LEVEL',readback:'fresh native project OBJ_SOUND storage, not native provider/audio observer',raw:[before[carrierLevel],after[carrierLevel],restored[carrierLevel]],changedSoundByteOffsets:touched,waveRaw:127,peerChicagoControls:20,allNativeSoundBytesRestored:true},null,2));
