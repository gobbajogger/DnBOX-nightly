import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const [remote,rows]=process.argv.slice(2);
const url=file=>pathToFileURL(resolve(remote,'web/product-site/remote',file)).href;
const contents=file=>JSON.parse(readFileSync(new URL(url(file))));
const {render,fxGlyphId}=await import(url('glyph-render.mjs'));
const {polylines}=await import(url('glyph-live.mjs'));
const {createMasterDraft}=await import(url('master-draft.mjs'));
const model=createMasterDraft(contents('components.json'),contents('catalog.json'));
const specs=new Map(model.more.map(c=>[c.target+':'+c.parameter,c]));
const counts={scalarStates:0,namedStates:0,readouts:0,fxToneStates:0};
const digest=createHash('sha256');
const rects=s=>s.trim()?s.trim().split(' ').map(v=>v.split(',').map(Number)):[];
for(const row of readFileSync(rows,'utf8').trim().split('\n')){
  const [kind,value,a,b,display,list,knob]=row.split('|');
  if(kind==='TONE'){
    const [guide,first,second]=rects(a);
    const expected=[first.slice(0,2),first.slice(2,4),second.slice(2,4)].map(([x,y])=>[x,y-28]);
    for(const id of ['1:4:0:5','1:4:0:6','1:4:0:10']){
      const v=render(fxGlyphId(id),Number(value)/127,'mixer');
      assert.equal(v.fn,'TONE');
      assert.deepEqual(polylines(v.d),[expected],row);
      assert.deepEqual(polylines(v.guide),[[[guide[0],guide[1]-28],[guide[2],guide[3]-28]]],row);
      counts.fxToneStates++;
    }
    digest.update('TONE|'+value+'|'+JSON.stringify(expected)+'\n');
    continue;
  }
  assert.equal(kind,'MORE');
  const raw=Number(a),max=Number(b),spec=specs.get(value);
  assert.ok(spec,value);
  assert.equal(spec.max,max);
  assert.equal(model.display(spec.id,raw),display,row);
  counts.readouts++;
  const nativeList=rects(list),nativePips=rects(knob);
  const {rects:drawn}=render(spec.glyph,raw/max,'mixer');
  let expected;
  if(nativePips.length){
    assert.equal(nativeList.length,0);
    const span=nativePips.at(-1)[0]+nativePips.at(-1)[2]-nativePips[0][0];
    const scale=Math.min(1,36/span);
    expected=nativePips.map(([x,y,w,h,r,ink])=>({x:20+(x-20)*scale,y:y-28,w:w*scale,h,ink:ink?'primary':'guide',radius:r*scale}));
    counts.namedStates++;
  }else{
    expected=nativeList.map(([x,y,w,h,r,ink])=>({x:2+(x-108)*36/70,y:y-7,w:36*w/70,h,ink:ink?'primary':'guide',radius:r}));
    counts.scalarStates++;
  }
  assert.deepEqual(drawn,expected,row);
  digest.update(value+'|'+raw+'|'+display+'|'+JSON.stringify(expected)+'\n');
}
assert.deepEqual(counts,{scalarStates:1024,namedStates:23,readouts:1047,fxToneStates:384});
console.log(JSON.stringify({...counts,sourceProjectionSha256:digest.digest('hex')},null,2));
