import test from 'node:test';
import assert from 'node:assert/strict';
for (const path of ['codec.mjs', 'legacy/codec.mjs']) {
  test(`${path}: historical model hints remain guarded during init adoption`, async () => {
    const c = await import(`../../web/product-site/presets/${path}`);
    const bytes = c.encodeDnpr({engineId:4,name:'Archive',params:Uint8Array.of(1,2,3,4,5,6,7,8)});
    const before = bytes.slice();
    const oldName = String.fromCharCode(100,114,111,110,101);
    for (const suffix of [oldName, 'synthone']) for (const model of ['elite', 'pro']) {
      const fileName = `archive.${model}.${suffix}.dnpr`;
      const record = c.parseDnpr(bytes,{fileName,targetModel:model,expectedEngine:'synthone'});
      assert.equal(record.adoptedInit,true);
      assert.equal(record.filenameModelHint,model);
      assert.ok(record.params.every(v=>v===0));
      assert.throws(()=>c.parseDnpr(bytes,{fileName,targetModel:model==='elite'?'pro':'elite'}),e=>e.code==='WRONG MODEL');
    }
    assert.deepEqual(bytes,before);
    assert.throws(()=>c.parseDnpr(bytes,{expectedEngine:'chicago'}),e=>e.code==='WRONG ENGINE');
  });
}
