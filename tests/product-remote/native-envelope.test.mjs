import test from 'node:test';
import assert from 'node:assert/strict';
import * as native from '../../web/product-site/remote/glyphs.mjs';

// Native drum_curve_t semantics from a6815dd ui_drum_voice.inc:539-547.
const decay={delay:0,rise_tau:0,rise_end:0,hold:0,fall:100,peak:1,window:500,linear:0,elapsed:50,level:.61};
test('native partial decay envelope is a full row, not fabricated ADSR',()=>{
 assert.equal(typeof native.nativeDrumEnvelope,'function');
 const out=native.nativeDrumEnvelope(decay);
 assert.equal(out.stages.join(','),'decay');
 assert.equal(out.samples[0].level,1);
 assert.ok(Math.abs(out.samples.at(-1).level-Math.exp(-5))<1e-12);
 assert.equal(out.marker.elapsed,50);
 assert.equal(out.marker.rawLevel,.61);
});
test('native delayed rise hold and decay follow the native curve law',()=>{
 assert.equal(typeof native.nativeDrumEnvelope,'function');
 const row={...decay,delay:10,rise_tau:5,rise_end:20,hold:30,linear:1};
 const out=native.nativeDrumEnvelope(row);
 assert.deepEqual(out.stages,['delay','attack','hold','decay']);
 const at=t=>out.samples.find(p=>p.ms===t).level;
 assert.equal(at(0),0);assert.equal(at(10),0);
 assert.ok(Math.abs(at(30)-(1-Math.exp(-4)))<1e-12);
 assert.equal(at(60),at(30));
});
test('actual marker is independent of the preview and absent when observation is unavailable',()=>{
 assert.equal(typeof native.nativeDrumEnvelope,'function');
 assert.equal(native.nativeDrumEnvelope({...decay,elapsed:-1}).marker,null);
 assert.equal(native.nativeDrumEnvelope({...decay,elapsed:501}).marker,null);
 const out=native.nativeDrumEnvelope({...decay,level:1.2});
 assert.equal(out.marker.rawLevel,1.2);assert.equal(out.marker.level,1);
 assert.notEqual(out.marker.rawLevel,Math.exp(-.5));
});
test('malformed native curves fail closed',()=>{
 assert.equal(typeof native.nativeDrumEnvelope,'function');
 for(const patch of [{fall:0},{window:0},{linear:2},{rise_end:1,rise_tau:0},{delay:-1},{level:NaN},{elapsed:Infinity}])
  assert.throws(()=>native.nativeDrumEnvelope({...decay,...patch}));
});
