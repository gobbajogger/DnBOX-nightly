// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SuperJ6Banks,readSuperJ6Bank} from '../../web/product-site/remote/superj6-banks.mjs';
import {renderSuperJ6,SUPERJ6_PROGRAM,superJ6Spec} from '../../web/product-site/remote/superj6.mjs';

const bankId='1664F450-5DBE-42BB-9658-C6FFC459E67D', first='0FECC001-DB40-473D-96B7-F91BDE6BDAFE', second='E83DA9F1-4185-4E84-81E9-973CB62A5902';
function program(uid,name,fields) {
  return {uid,name,parameterValues:Object.entries(fields).map(([identifier,value])=>({identifier,value}))};
}
function example() {
  return {uuid:bankId,name:'A & B',midiBankChangeNumber:0,canDelete:true,presets:[
    program(first,'Square <one>',{neonlayer1Waveform:1,neonsubVolume:0,neonlfo1Rate:.5}),
    program(second,'Layer two',{neonlayer2Waveform:0,neonlayer2PWMEnable:0,neonlayer2PWM:0}),
  ]};
}
const asFile = value => new Blob([typeof value==='string'?value:JSON.stringify(value)]);
test('locally opened bank preserves zero, absent fields, escaped names and source-qualified identities',async()=>{
  const file=asFile(example()), bank=await readSuperJ6Bank(file);
  assert.equal(bank.digest,createHash('sha256').update(new Uint8Array(await file.arrayBuffer())).digest('hex'));
  const library=new SuperJ6Banks(), action=library.choose(0,[bank.digest,first],bank);
  const group=library.view(0).fields;
  assert.equal(group.size,3);assert.equal(group.get(202).value,0);assert.equal(group.has(78),false);
  const html=renderSuperJ6(0,new Map(),library);
  assert.match(html,/Square &lt;one&gt;/);
  assert.match(html,/data-sj6-absent="78"/);
  assert.match(html,/data-sj6-glyph="82"><\/span>/);
  assert.match(html,/data-sj6-display="88">50% position/);
  assert.doesNotMatch(html,/data-native-param|data-param=|data-sj6-field="210"/);
  const field=group.get(82);
  assert.equal(library.spec(field.id),field);
  assert.equal(library.spec(field.id.replace('|82','|082')),undefined);
  assert.equal(library.view(1),undefined);
  const select=library.choose(1,[bank.digest,second]);
  assert.equal(library.view(1).fields.get(211).value,0);
  const snapshot=library.snapshot(),restored=new SuperJ6Banks(snapshot);
  assert.equal(restored.spec(field.id).value,1);assert.deepEqual(restored.snapshot(),snapshot);
  select.undo();action.undo();assert.equal(library.snapshot(),undefined);
  action.redo();select.redo();assert.deepEqual(library.snapshot(),snapshot);
});
test('malformed and ambiguous banks fail before the active bank or owner changes',async()=>{
  const file=asFile(example()),bank=await readSuperJ6Bank(file),library=new SuperJ6Banks();
  library.choose(0,[bank.digest,first],bank);
  const before=JSON.stringify(library.snapshot());
  const mutations=[
    b=>b.presets.push(b.presets[0]), b=>b.presets[0].parameterValues.push(b.presets[0].parameterValues[0]),
    b=>b.presets[0].parameterValues[0].value=.25,b=>b.presets[0].parameterValues[0].value=-1e-9,
    b=>b.presets[0].uid='invalid',b=>delete b.canDelete,
  ];
  for(const mutate of mutations){const b=example();mutate(b);await assert.rejects(readSuperJ6Bank(asFile(b)));}
  await assert.rejects(readSuperJ6Bank(asFile(JSON.stringify(example()).replace('"uuid":','"uuid":"x","uuid":'))));
  await assert.rejects(readSuperJ6Bank(new Blob([new Uint8Array([255])])));
  assert.throws(()=>library.choose(1,[bank.digest,'unknown']));
  for(const mutate of [
    s=>s.selected[0][1]=second+'wrong',s=>s.banks[0].programs[0].values[82]=.2,
    s=>s.banks[0].programs[1].id=first,s=>s.banks[0].programs[0].values['__invalid__']=1,
  ]){const s=structuredClone(library.snapshot());mutate(s);assert.throws(()=>new SuperJ6Banks(s));}
  assert.equal(JSON.stringify(library.snapshot()),before);
});
if(process.env.DNBOX_SUPERJ6_ARCHIVE){
  test('12 original bank files open and all 640 programs retain the recorded field presence and binary32 words',async()=>{
    const archive=process.env.DNBOX_SUPERJ6_ARCHIVE;
    assert.equal(createHash('sha256').update(readFileSync(archive)).digest('hex'),'ab702e00b4cc425c9406b9b2b44e68ba0f40e1125d591fcaa422cc6a8c6272b8');
    const entries=execFileSync('unzip',['-Z1',archive],{encoding:'utf8'}).split('\n').filter(n=>/^J6presets\/[^/]+\.superj6\.bank\.json$/.test(n));
    const identifiers={78:'layer1PWM',79:'layer2PWM',82:'layer1Waveform',83:'layer2Waveform',88:'lfo1Rate',96:'lfo2Rate',
      100:'lfo3Rate',195:'lfo1HzEnable',196:'lfo2HzEnable',197:'lfo3HzEnable',202:'subVolume',210:'layer1PWMEnable',211:'layer2PWMEnable'};
    const library=new SuperJ6Banks();let count=0,present=0,complete=0;
    for(const path of entries){
      const bytes=execFileSync('unzip',['-p',archive,path],{maxBuffer:4*1024*1024});
      const bank=await readSuperJ6Bank(new Blob([bytes])),original=JSON.parse(bytes);
      library.choose(0,[bank.digest,bank.programs[0].id],bank);
      for(const [i,row] of original.presets.entries()){
        const values=new Map(row.parameterValues.map(p=>[p.identifier,p.value]));
        const program=bank.programs[i];assert.equal(program.id,row.uid);assert.equal(program.name,row.name);
        library.choose(0,[bank.digest,program.id]);
        const fields=library.view(0).fields;
        for(const [id,key] of Object.entries(identifiers)){
          const originalName='neon'+key;assert.equal(fields.has(+id),values.has(originalName));
          if(values.has(originalName)){assert.equal(fields.get(+id).value,Math.fround(values.get(originalName)));present++;}
        }
        if(program.id===SUPERJ6_PROGRAM.programId){for(const spec of fields.values())assert.equal(superJ6Spec(spec.id),spec);}
        if(fields.size===13)complete++;count++;
      }
    }
    assert.deepEqual([entries.length,count,present,complete],[12,640,5860,25]);
    const restored=new SuperJ6Banks(library.snapshot());assert.deepEqual(restored.snapshot(),library.snapshot());
  });
}
