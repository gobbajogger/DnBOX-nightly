import test from 'node:test';
import assert from 'node:assert/strict';
import {unit,render} from '../../web/product-site/remote/glyph-render.mjs';
import {setGlyphValue} from '../../web/product-site/remote/glyph-live.mjs';
test('raw127 and normalized domains never infer meaning from numeric magnitude',()=>{
 for(const raw of[0,1,2,127])assert.equal(unit(raw,'raw127'),raw/127);
 assert.equal(unit(1.0,'normalized'),1);
 assert.throws(()=>unit(1,'unknown'),/domain/i);
});
test('raw low values share the normalized renderer, without raw1 jumping to max',()=>{
 for(const fn of['LEVEL','WAVE','WIDTH','TAPE'])for(const raw of[0,1,2,127])assert.deepEqual(render(fn,raw,'chicago',{valueDomain:'raw127'}),render(fn,raw/127,'chicago',{valueDomain:'normalized'}));
 assert.notEqual(render('LEVEL',1,'chicago',{valueDomain:'raw127'}).d,render('LEVEL',1,'chicago',{valueDomain:'normalized'}).d);
});
test('live update declares its domain and stores normalized renderer input',()=>{
 const el={dataset:{}};setGlyphValue(el,1,'raw127');assert.equal(Number(el.dataset.glyphValue),1/127);assert.equal(el.dataset.glyphDomain,'normalized');
 setGlyphValue(el,1.0,'normalized');assert.equal(Number(el.dataset.glyphValue),1);
});
