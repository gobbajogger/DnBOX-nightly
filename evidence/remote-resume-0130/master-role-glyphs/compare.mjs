import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const [remote,amountPath,compPath]=process.argv.slice(2);
assert.ok(remote&&amountPath&&compPath,'usage: node compare.mjs Remote-checkout native-amount-path native-transfer-path');
const moduleUrl=name=>pathToFileURL(resolve(remote,'web/product-site/remote',name)).href;
const {render}=await import(moduleUrl('glyph-render.mjs'));
const {polylines}=await import(moduleUrl('glyph-live.mjs'));

const receipt={amountCases:0,compCases:0,compMismatchedStates:0,compMismatchedPoints:0,firstCompMismatches:[]};
const digest=data=>createHash('sha256').update(data).digest('hex');
const amounts=readFileSync(amountPath,'utf8');
function segments(path,color){
  return path?polylines(path).flatMap(line=>line.slice(1).map((end,i)=>[...line[i],...end,color])):[];
}
for(const row of amounts.trim().split('\n')){
  const [role,raw,rawLines]=row.split('|');
  const expected=rawLines.trim().split(' ').map(line=>line.split(',').map(Number));
  const shape=render(role,+raw,'mixer',{valueDomain:'raw127'});
  assert.deepEqual([...segments(shape.d,1),...segments(shape.guide,0)].sort(),expected.sort(),row);
  receipt.amountCases++;
}
assert.equal(receipt.amountCases,384);
receipt.amountSha256=digest(amounts);
const native=readFileSync(compPath);
assert.equal(native.length,128*10*128*37);
const candidate=Buffer.alloc(native.length);
let offset=0;
for(let threshold=0;threshold<=127;threshold++){
  for(let ratio=0;ratio<=9;ratio++){
    for(let blend=0;blend<=127;blend++){
      const masterComp={threshold,ratio,blend};
      const shape=render('MASTER COMP',0,'mixer',{masterComp});
      const primary=polylines(shape.d)[0];
      assert.equal(primary.length,37);
      assert.equal(shape.guide,'M2.0 20.0 L38.0 0.0');
      let points=0;
      for(const [i,[x,y]] of primary.entries()){
        assert.equal(x,2+i);
        candidate[offset]=y;
        const original=native[offset++];
        if(y!==original){
          points++;
          if(receipt.firstCompMismatches.length<12)receipt.firstCompMismatches.push({threshold,ratio,blend,x,original,y});
        }
      }
      receipt.compCases++;
      if(points){
        receipt.compMismatchedStates++;
        receipt.compMismatchedPoints+=points;
      }
    }
  }
}
receipt.nativeCompSha256=digest(native);
receipt.remoteCompSha256=digest(candidate);
console.log(JSON.stringify(receipt,null,2));
assert.deepEqual(candidate,native);
