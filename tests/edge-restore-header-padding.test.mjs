import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {pack78, unpack78} from '../web/x0x_breaks.js';

// Execute the real writers with a simulated erased flash protocol, never MIDI.
// A short header commit intentionally leaves bytes 480..511 erased.
function extract(source, name) {
  const start=source.indexOf(`async function ${name}(`);
  assert.ok(start>=0, `missing ${name}`);
  const end=source.indexOf('\n}',start);
  assert.ok(end>start);
  return source.slice(start,end+2);
}
const sources=[
  ['web/x0x_breaks.js',['writeSlotImage']],
  ['web/x0x_breaks.html',['writeImage']],
  ['web/product-site/breaks/index.html',['writeSlotImage','writeImage']],
  ['web/product-site/install/index.html',['writeSlotImage']],
  ['web/product-site/projects/exchange/vendor/x0x_breaks.js',['writeSlotImage']],
  ['docs/breaks/index.html',['writeSlotImage','writeImage']],
  ['docs/install/index.html',['writeSlotImage']],
  ['docs/projects/index.html',['writeSlotImage']],
  ['.output/product-site/breaks/index.html',['writeSlotImage','writeImage']],
  ['.output/product-site/install/index.html',['writeSlotImage']],
  ['.output/product-site/projects/exchange/vendor/x0x_breaks.js',['writeSlotImage']],
];
for(const [path,names] of sources) for(const name of names) for(const programmed of [false,true]) {
  test(`${path} ${name} preserves ${programmed?'programmed':'erased'} padding`,async()=>{
    const img=new Uint8Array(512+513).fill(255);
    for(let i=0;i<480;i++)img[i]=(i*17+3)&255;
    if(programmed)for(let i=480;i<512;i++)img[i]=(i*13+9)&255;
    for(let i=512;i<img.length;i++)img[i]=(i*7+1)&255;
    const flash=new Uint8Array(img.length).fill(255),commits=[];
    async function req(cmd,args){
      if(cmd===11){flash.fill(255);return[args[0],0];}
      if(cmd===12){const off=args[1]|args[2]<<7|args[3]<<14;flash.set(unpack78(args.slice(4)),off);return[args[0],args[1],args[2],args[3],0];}
      if(cmd===13){const header=unpack78(args.slice(1));assert.ok(header.length===480||header.length===512);commits.push(header.length);flash.set(header);return[args[0],0];}
      assert.fail(`unexpected command ${cmd}`);
    }
    const link={req,retry:req};
    const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
    const writer=runInNewContext(extract(source,name)+`;${name}`,{SLOT_HDR_LEN:480,SLOT_HDR_AREA:512,SLOT_DATA_OFF:512,pack78,slotReq:(_link,...args)=>req(...args),link});
    if(name==='writeImage')await writer(0,img);else await writer(link,0,img);
    assert.deepEqual(commits,[programmed?512:480]);
    assert.deepEqual(flash,img,'entire restored image must match, including padding');
  });
}
