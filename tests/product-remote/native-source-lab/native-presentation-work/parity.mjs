import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';import{spawnSync}from'node:child_process';import{fileURLToPath}from'node:url';
import t0 from'../native-drum-binding-work/target-0.json' with{type:'json'};import t1 from'../native-drum-binding-work/target-1.json' with{type:'json'};import{projectPresentedDrum}from'./presentation.mjs';
const rows=[...t0.controls,...t1.controls],key=c=>[c.kind,c.target,c.voice,c.slot].join(':'),state=Object.fromEntries(rows.map(c=>[key(c),c.storedRaw])),map=new Map(rows.map(c=>[key(c),c])),cases=[],lines=[];
for(const c of rows)for(let n=0;n<=c.maximumRaw*4;n++){
 const ev=n/4,rounded=Math.trunc(Math.fround(Math.fround(ev)+.5)),selected=c.values[rounded];
 const dep=slot=>{const d=map.get(`1:0:0:${slot}`),raw=c.target===0&&c.voice===0&&c.slot===slot?rounded:state[key(d)];return d.values[raw].value;};
 lines.push([c.target,c.slot,c.role,c.maximumRaw,c.name,ev,selected.unitId,selected.value,dep(0),dep(4),dep(5)].join(' '));cases.push({c,ev});
}
const binary=new URL('reference',import.meta.url),pin=JSON.parse(readFileSync(new URL('reference-pins.json',import.meta.url))),hash=()=>createHash('sha256').update(readFileSync(binary)).digest('hex');assert.equal(hash(),pin.binary);
const run=spawnSync(fileURLToPath(binary),[],{input:lines.join('\n')+'\n',encoding:'utf8',timeout:30000,maxBuffer:128*1024*1024});assert.equal(run.status,0,run.stderr);assert.equal(hash(),pin.binary);const output=run.stdout.trim().split('\n');assert.equal(output.length,cases.length);
let coordinates=0;for(let i=0;i<cases.length;i++){const {c,ev}=cases[i],expected=JSON.parse(output[i]).flat(2).map(Math.fround),actual=projectPresentedDrum({...c,source:t0.source},state,ev,{x:8,y:8,sx:1.375,sy:1.5}).flat(2).map(Math.fround);assert.deepEqual(actual,expected,`${key(c)} ev${ev}`);coordinates+=actual.length;}
console.log(JSON.stringify({cases:cases.length,float32Coordinates:coordinates,result:'PASS',scope:'bounded idle fractional source geometry with pinned SI table inputs; no actual app or clock lifecycle'}));
