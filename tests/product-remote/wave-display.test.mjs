import test from 'node:test';
import assert from 'node:assert/strict';
import {waveDisplay,parseWaveDisplay} from '../../web/product-site/remote/wave-display.mjs';
test('Chicago continuous source uses names without changing scalar endpoints',()=>{
 assert.equal(waveDisplay('CHICAGO',0),'SAW');
 assert.equal(waveDisplay('CHICAGO',127),'SQR');
 for(let raw=1;raw<127;raw++)assert.equal(waveDisplay('CHICAGO',raw),'BLEND');
 assert.equal(parseWaveDisplay('CHICAGO','SAW'),0);
 assert.equal(parseWaveDisplay('CHICAGO','SQR'),127);
 assert.equal(parseWaveDisplay('CHICAGO','BLEND 50%'),64);
});
test('unsupported engines and invalid raw values do not invent wave mappings',()=>{
 for(const bank of ['SUPERJ6','JUNO','MIAMI',''])assert.equal(waveDisplay(bank,0),null);
 for(const raw of [-1,128,NaN,Infinity])assert.equal(waveDisplay('CHICAGO',raw),null);
 assert.equal(parseWaveDisplay('CHICAGO','BLEND 101%'),null);
 assert.equal(parseWaveDisplay('SUPERJ6','SAW'),null);
});
