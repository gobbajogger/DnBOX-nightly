// SPDX-License-Identifier: GPL-3.0-only
// Checklist integrity only. Passing these tests does not pass the product gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const actual=JSON.parse(readFileSync(new URL('../docs/lanes/web-finish-line.json',import.meta.url)));
const clone=()=>structuredClone(actual);
function problems(r){
 const errors=[],states=new Set(['PASS','FAIL','NOT_RUN']);
 if(r.schema!=='dnbox-web-finish-line/1'||r.lane!=='web')errors.push('schema/lane');
 if(r.routes.length!==19||new Set(r.routes.map(x=>x.route)).size!==19)errors.push('19 unique routes');
 if(JSON.stringify(r.viewports.map(x=>[x.width,x.height]))!==JSON.stringify([[1440,900],[390,844],[844,390]]))errors.push('three exact viewports');
 if(r.gates.length<21||new Set(r.gates.map(x=>x.id)).size!==r.gates.length)errors.push('unique complete gates');
 for(const g of r.gates)if(!states.has(g.status)||!g.required||!g.source||!g.scope||!g.evidenceOrNext)errors.push('gate record '+g.id);
 if(r.decision==='FINISHED'){
  if(r.gates.some(g=>g.status!=='PASS'||g.qualifiedFinalSHA!==r.latestPushedSHA))errors.push('all final gates must pass on exact head');
  if(r.sources.some(x=>x.state!=='READ'))errors.push('all required inputs consumed');
  if(r.routes.some(x=>x.currentCaptureStatus!=='PASS'||x.currentIndependentScore!==10))errors.push('all actual screens reviewed');
 }else if(r.decision!=='NOT_FINISHED')errors.push('explicit unfinished decision');
 return errors;
}
test('current source-linked finish line is complete metadata, not an acceptance claim',()=>{assert.deepEqual(problems(actual),[]);assert.equal(actual.decision,'NOT_FINISHED');});
test('controlled false completion cannot hide FAIL/NOT_RUN or a different evidence SHA',()=>{const r=clone();r.decision='FINISHED';assert.ok(problems(r).includes('all final gates must pass on exact head'));});
test('controlled missing page and landscape size are not silently narrowed coverage',()=>{const r=clone();r.routes.pop();r.viewports.pop();assert.ok(problems(r).includes('19 unique routes'));assert.ok(problems(r).includes('three exact viewports'));});
