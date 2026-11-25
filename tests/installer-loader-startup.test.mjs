// SPDX-License-Identifier: GPL-3.0-only
// Execute the product run() entry point, recording mocked adapter calls only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {makePackage} from './fixtures/bundled-synthetic.mjs';
const html = readFileSync(process.env.DNBOX_INSTALLER_HTML || new URL('../web/product-site/install/index.html', import.meta.url), 'utf8');
const begin=html.indexOf('async function run(img, product, opts = {})');
const end=html.indexOf('// Never ignore an Install press silently',begin);
assert.ok(begin>=0&&end>begin);
for(const factoryData of [false,true])for(const foreign of (factoryData?[false]:[false,true])) {
  test(`loader is closed and no updater starts for factoryData=${factoryData} foreign=${foreign}`,async()=>{
    const calls=[], ui=new Map();
    const cx={
      $:key=>{if(!ui.has(key))ui.set(key,{checked:true});return ui.get(key);},
      workspaceActive:true,writing:false,scanSerial:0,ctlLoadSerial:0,stockLoadSerial:0,stock:null,
      slotPackageFiles:()=>factoryData?{'fdata.bin':true}:{},
      getSampleWorkspace:()=>null,getProjectWorkspace:()=>null,log(){},led(){},updateInstallGate(){},
      midiAccess:async()=>({}),
      sayK:(a,b)=>calls.push(['message',a,b]),
      Updater:class {
        async find(p){const id={model:'ota-SMK-37 Pro'};assert.equal(p(id),true);
          return {id,link:{close(){calls.push('loader close');}}};}
        close(){calls.push('updater close');}
        async resume(){calls.push('resume');}
      },
      async installKeepingSlots(){calls.push('install');},
      async scan(){calls.push('scan');},
    };
    const run=runInNewContext(html.slice(begin,end)+'\nrun',cx);
    for (let attempt=0; attempt<3; attempt++) {
      calls.length=0;
      await run(new Uint8Array(1),'SMK-37 Pro_900',{factoryData,foreign,admitted:()=>true});
    assert.deepEqual(calls,['loader close',['message','error',
      'An atomic sample snapshot cannot start in update mode. No browser update was started; use the matching recovery instructions and retain your backup.'],'updater close']);
      assert.equal(cx.writing,false);
    }
  });
}

test('all supported locales explain loader recovery without offering a browser resume',()=>{
  const start=html.indexOf('const TEXT = {'), end=html.indexOf('function t(',start);
  const messages=html.slice(start,end);
  for (const old of ['Interrupted updates can be resumed.','finish (or resume)',
    'again to resume.','中断した更新は再開できます','続きから書けます','挿し直して同じファイルでもう一度'])
    assert.ok(!messages.includes(old),old);
  assert.match(messages,/browser cannot resume the write/);
  assert.match(messages,/ブラウザーでは再開できません/);
});
test('run rejects unreadable packages, FDATA without opt-in and non-FDATA with opt-in before MIDI',async()=>{
  for(const [files,opts] of [[null,{}],[{'fdata.bin':true},{}],[{'fdata.bin':true},{foreign:true}],[{},{factoryData:true}]]) {
    const log=[];
    const cx={writing:false,workspaceActive:true,
      slotPackageFiles:()=>files,$:()=>({}),updateInstallGate(){},sayK:(key,msg)=>log.push([key,msg]),
      midiAccess:async()=>{log.push(['MIDI']);throw Error('should not request MIDI');},
    };
    const run=runInNewContext(html.slice(begin,end)+'\nrun',cx);
    await run(new Uint8Array(1),'SMK-37 Pro_900',opts);
    assert.deepEqual(log,[['fdata','No update was started. Choose the verified build again.']]);
  }
});
test('local/stock intake uses the actual package parser and refuses a valid FDATA-bearing package',async()=>{
  const parserStart=html.indexOf('const BLOCKS = 20'),parserEnd=html.indexOf('const $ = (id)',parserStart);
  const a=html.indexOf('async function acceptStock('),b=html.indexOf('async function selectStockFile(',a);
  const cx={TextEncoder,TextDecoder,crypto:globalThis.crypto,setTimeout,clearTimeout,
    $:()=>({}),stock:null,stockLoadSerial:1,writing:false,lastId:null,STOCK_SHA256_FM1:'',
    sha256Hex:async()=>'different',sayK:(...x)=>cx.messages.push(x),messages:[]};
  const ingest=runInNewContext(html.slice(parserStart,parserEnd)+'\n'+html.slice(a,b)+'\nacceptStock',cx);
  const fdata=Buffer.alloc(0xf000,0xff);fdata.write('S1PK');fdata[4]=1;
  // Product parser must accept both logical containers, but stock may admit only the first.
  const map=[[0xC2000,0x14000],[0xD6000,0xF000],[0xB3000,0x8000]];
  for(const [name,bytes,approved] of [
    ['plain',makePackage('pro',{slotMap:map}),true],
    ['fdata',makePackage('pro',{slotMap:map,extraFiles:[[103,'fdata.bin',fdata]]}),false],
  ]) {
    cx.stock=null;cx.messages=[];
    await ingest(Uint8Array.from(bytes),1);
    assert.equal(Boolean(cx.stock),approved,name);
    if(approved) assert.equal(cx.messages.at(-1)[0],'stockok');
    else assert.match(cx.messages.at(-1).join(' '),/command-line installer.*factory data/);
  }
});
