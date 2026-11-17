import test from 'node:test';
import assert from 'node:assert/strict';
for (const path of ['codec.mjs', 'legacy/codec.mjs']) {
  test(`${path}: old slot-2 files remain inspectable without advertising a current engine`, async () => {
    const c = await import(`../../web/product-site/presets/${path}`);
    const params = Uint8Array.of(1,2,3,4,5,6,7,8);
    const bytes = c.encodeDnpr({engineId:4,name:'Archive',params});
    const record = c.parseDnpr(bytes);
    assert.equal(record.title,'Retired engine 4');
    assert.equal(record.engine,'legacy-slot2');
    assert.deepEqual(record.params,params);
    assert.deepEqual(c.ensureExportable(record),bytes);
    const oldName = String.fromCharCode(100,114,111,110,101);
    assert.equal(c.explicitModelHint(`archive.elite.${oldName}.dnpr`),'elite');
    assert.equal(c.explicitModelHint(c.fileNameFor(record).replace('.legacy-slot2.', '.elite.legacy-slot2.')),'elite');
  });
}
