// SPDX-License-Identifier: GPL-3.0-only
// "The panning must clip at 50": L50..C..R50. PROVISIONAL raw mapping 64±50
// (14..114) until Lead's lead/pan-clip-50-20261116 storage mapping lands.
import test from 'node:test';
import assert from 'node:assert/strict';
import {clampPan, formatPan, panFromFraction, fractionFromPan, PAN_MIN_RAW, PAN_MAX_RAW} from '../../web/product-site/remote/pan.mjs';
import {panFromLane, laneFraction} from '../../web/product-site/remote/lane.mjs';
test('incoming raw values clamp to L50..R50',()=>{
 const cases={0:[14,'L50'],13:[14,'L50'],14:[14,'L50'],64:[64,'C'],114:[114,'R50'],115:[114,'R50'],127:[114,'R50']};
 for(const [raw,[want,txt]] of Object.entries(cases)){assert.equal(clampPan(+raw),want,raw);assert.equal(formatPan(+raw),txt,raw);}
 assert.equal(PAN_MIN_RAW,14);assert.equal(PAN_MAX_RAW,114);
});
test('drag extremes never send beyond ±50',()=>{
 for(const p of [-1,-0.2,0,0.5,1,1.3,2]){const raw=panFromFraction(p);assert.ok(raw>=14&&raw<=114,p+'→'+raw);}
 assert.equal(panFromFraction(0),14);assert.equal(panFromFraction(1),114);assert.equal(panFromFraction(0.5),64);
 assert.equal(panFromLane(0),14);assert.equal(panFromLane(1),114);
 assert.equal(fractionFromPan(0),0);assert.equal(fractionFromPan(127),1);
});
