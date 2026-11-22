import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const [remoteModule,nativeOutput]=process.argv.slice(2);
assert.ok(remoteModule&&nativeOutput,'usage: node compare.mjs <Remote module> <native rows>');
const {clapStageCharts,clapStageReadout}=await import(pathToFileURL(resolve(remoteModule)).href);
const output=readFileSync(nativeOutput,'utf8').trim().split('\n');
const receipt={source:'f1786ebec2616477163b62b029c7e77405a9c3de',sourceStage:'firmware/src/app/ui_drum_voice.inc',sourceUnits:'firmware/src/app/ui.c',cases:0,charts:0,points:0,maxAbsoluteError:0,witness:null,quantize16Matches:0};
const oracle=createHash('sha256'),candidate=createHash('sha256');
let index=0;
function hashCase(hash, selection, parameter, raw, readout) {
  hash.update([selection,parameter,raw,readout.display,readout.stageLabel,readout.nominalLabel??''].join('|')+'\n');
}
function hashChart(hash, windowMs, points) {
  hash.update(windowMs+'|'+points.flat().map(v=>Math.round(v*16)).join(',')+'\n');
}
while(index<output.length){
  const [header,display,stageLabel,nominal]=output[index++].split('|');
  const [selection,parameter,raw,attack,decay]=header.slice(5).split(' ').map(Number);
  const readout=clapStageReadout(parameter,raw,selection);
  assert.deepEqual([readout.display,readout.stageLabel,readout.nominalLabel??''],[display,stageLabel,nominal],header);
  hashCase(oracle,selection,parameter,raw,{display,stageLabel,nominalLabel:nominal});
  hashCase(candidate,selection,parameter,raw,readout);
  const charts=clapStageCharts(selection,attack,decay);
  for(const chart of charts){
    const [keyword,len,...rawCoords]=output[index++].split(' ');
    assert.equal(keyword,'curve');
    assert.equal(chart.points.length,Number(len));
    assert.equal(output[index++],'end '+chart.windowMs+'ms');
    const values=rawCoords.map(Number);
    assert.equal(values.length,2*Number(len));
    assert.ok(values.every(Number.isFinite));
    const points=Array.from({length:Number(len)},(_,i)=>values.slice(2*i,2*i+2));
    hashChart(oracle,chart.windowMs,points);
    hashChart(candidate,chart.windowMs,chart.points);
    receipt.quantize16Matches+=Number(points.flat().map(v=>Math.round(v*16)).join()===chart.points.flat().map(v=>Math.round(v*16)).join());
    for(const [i,value] of chart.points.flat().entries()){
      const diff=Math.abs(value-values[i]);
      if(diff>receipt.maxAbsoluteError){
        receipt.maxAbsoluteError=diff;
        receipt.witness={selection,parameter,raw,chart:chart.kind,i,original:values[i],remote:value};
      }
    }
    receipt.charts++;
    receipt.points+=Number(len);
  }
  receipt.cases++;
}
assert.equal(receipt.cases,512);
assert.equal(receipt.charts,768);
assert.equal(receipt.points,25600);
assert.equal(receipt.quantize16Matches,768);
assert.ok(receipt.maxAbsoluteError<0.0001,JSON.stringify(receipt));
receipt.nativeQuantized16Sha256=oracle.digest('hex');
receipt.remoteQuantized16Sha256=candidate.digest('hex');
assert.equal(receipt.nativeQuantized16Sha256,'7060c2b488ae4f61b1c7d6f2f42aa6ac7b88290e48f54651e5fc63e675f1e8b6');
assert.equal(receipt.remoteQuantized16Sha256,receipt.nativeQuantized16Sha256);
console.log(JSON.stringify(receipt,null,2));
