// SPDX-License-Identifier: GPL-3.0-only
// "The panning must clip at 50": Lead's final DISPLAY-only mapping. Raw 0..127 stays unclamped.
import test from 'node:test';
import assert from 'node:assert/strict';
import {panDisplay, rawFromDisplay, formatPan, panFromFraction, fractionFromPan} from '../../web/product-site/remote/pan.mjs';
import {panFromLane} from '../../web/product-site/remote/lane.mjs';
import fs from 'node:fs';
import {SequenceDraft} from '../../web/product-site/remote/sequence.mjs';
const rha=x=>Math.sign(x)*Math.floor(Math.abs(x)+0.5);
test('exhaustive raw 0..127 -> display',()=>{
 for(let raw=0;raw<=127;raw++){const want=Math.max(-50,Math.min(50,rha((raw-64)*50/63)));assert.equal(panDisplay(raw),want,'raw '+raw);}
 // Note: Lead's example listed 1→L49, but the formula Lead gave yields exactly -50 for raw 1
 // ((1-64)*50/63 = -50). The formula is implemented bit for bit; flagged to Lead.
 const t={0:'L50',1:'L50',2:'L49',63:'L1',64:'C',65:'R1',127:'R50',3:'L48'};
 for(const [r,s] of Object.entries(t))assert.equal(formatPan(+r),s,r);
});
test('display -> raw round trip for every d, extremes 0/127',()=>{
 for(let d=-50;d<=50;d++)assert.equal(panDisplay(rawFromDisplay(d)),d,'d '+d);
 assert.equal(rawFromDisplay(-50),0);assert.equal(rawFromDisplay(50),127);assert.equal(rawFromDisplay(0),64);
});
test('drag edits in display units, extremes send 0/127; marker from the same d',()=>{
 assert.equal(panFromFraction(0),0);assert.equal(panFromFraction(1),127);assert.equal(panFromFraction(0.5),64);
 assert.equal(panFromLane(0),0);assert.equal(panFromLane(1),127);
 assert.equal(fractionFromPan(0),0);assert.equal(fractionFromPan(127),1);assert.equal(fractionFromPan(3),(panDisplay(3)+50)/100);
});
test('import keeps raw untouched (raw 3 stays 3, shows L48)',async()=>{
 const trace=JSON.parse(fs.readFileSync(new URL('../../web/product-site/remote/trace.json',import.meta.url)));
 const m=new SequenceDraft({trace}),n=m.notes.find(n=>n.track==='chicago');
 m.editNote(n.id,{pan:3});const got=m.notes.find(x=>x.id===n.id);
 assert.equal(got.pan,3,'raw kept');assert.equal(formatPan(got.pan),'L48');
 m.editNote(n.id,{pan:127});assert.equal(m.notes.find(x=>x.id===n.id).pan,127,'not clamped');
});
