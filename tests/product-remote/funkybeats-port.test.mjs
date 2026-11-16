import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const target=new URL('../../web/product-site/remote/vendor/funkybeats-core.mjs',import.meta.url);
test('actual FunkyBeats state and duration/velocity port is installed, not only a notice',async()=>{
 assert.ok(existsSync(target),'missing actual upstream-derived core');
 const {createSequencerState,noteDuration,velocityAt,UPSTREAM}=await import(target);
 assert.equal(UPSTREAM.commit,'809e1e78407f7bf315eee8655387eca8b7ac465b');
 const state=createSequencerState({channels:[{type:'drum'},{type:'synth'}],patternCount:32});
 assert.equal(state.patterns.length,32);assert.equal(state.getSteps(),16);
 state.pushUndo();state.getStep(1,3).on=true;state.getStep(1,3).duration=4;
 state.setPatternLength(32);assert.equal(state.getStep(1,3).duration,4);assert.equal(state.getStep(1,31).on,false);
 assert.equal(state.undo(),true);assert.equal(state.getSteps(),16);assert.equal(state.getStep(1,3).on,false);
 assert.equal(state.redo(),true);assert.equal(state.getStep(1,3).duration,4);
 state.copyPattern();state.currentPattern=31;state.pastePattern();assert.equal(state.getStep(1,3).duration,4);
 state.getStep(1,3).duration=2;state.currentPattern=0;assert.equal(state.getStep(1,3).duration,4);
 const saved=state.serialize();saved.patterns[0].channels[1][3].on=false;assert.equal(state.getStep(1,3).on,true);
 for(let steps=1;steps<=64;steps++)for(let start=0;start<steps;start++)for(const current of[-1,start,start+3,steps+1])assert.equal(noteDuration(current,start,steps),Math.max(1,Math.min(current-start+1,steps-start)));
 for(let y=-10;y<=110;y++)assert.equal(velocityAt(y,0,100),Math.round(Math.max(.05,Math.min(1,1-y/100))*100)/100);
});
test('current Remote explicitly consumes source port and drum cells toggle without a mode',()=>{
 const app=readFileSync(new URL('../../web/product-site/remote/app.mjs',import.meta.url),'utf8');
 const html=readFileSync(new URL('../../web/product-site/remote/index.html',import.meta.url),'utf8');
 assert.match(app,/renderFunkyBeatsDrums/);const adapter=readFileSync(new URL('../../web/product-site/remote/funkybeats-view.mjs',import.meta.url),'utf8');assert.match(adapter,/buildSequencerGrid/);assert.match(adapter,/funkybeats-core\.mjs/);
 assert.doesNotMatch(app,/drumEdit&&b\.dataset\.drumNote/);
});

test('ported upstream sequencer renders all typed drum cells with safe, stable identities',async()=>{
 const {renderFunkyBeatsDrums,DRUM_VOICES}=await import('../../web/product-site/remote/funkybeats-view.mjs');
 for(const kit of ['909','808']){
  const track=kit==='909'?'drum909':'drum808';
  const notes=[{id:'first',track,note:36,start:0,velocity:88},{id:'fifth',track,note:36,start:22050,velocity:104},{id:'foreign',track:'other',note:36,start:0,velocity:20}];
  const html=renderFunkyBeatsDrums({kit,notes,endSample:88200});
  assert.equal((html.match(/data-drum-note=/g)||[]).length,176);
  assert.equal((html.match(/class="seq-step-group"/g)||[]).length,48);
  assert.match(html,/BD step 1 velocity 88/);assert.match(html,/BD step 5 velocity 104/);assert.doesNotMatch(html,/data-hit="foreign"/);
  assert.equal(DRUM_VOICES[kit].length,11);assert.doesNotMatch(html,/seq-mute|seq-solo|seq-eucl|AudioContext|Not loaded/);
  const escaped=renderFunkyBeatsDrums({kit,notes:[{...notes[0],id:'"<script>'}],endSample:88200});assert.doesNotMatch(escaped,/<script>/);assert.match(escaped,/&quot;&lt;script&gt;/);
 }
});
