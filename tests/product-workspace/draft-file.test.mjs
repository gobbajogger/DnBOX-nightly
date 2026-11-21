import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{createHash}from'node:crypto';
import{WorkspaceDraftFile,installWorkspaceDraft,hasDraftChanges}from'../../web/product-site/remote/draft-file.mjs';
import{SequenceDraft,Arrangement}from'../../web/product-site/remote/sequence.mjs';import{MotionDraft}from'../../web/product-site/remote/motion.mjs';import{LaunchSelection}from'../../web/product-site/remote/workspace.mjs';import{WorkspaceTimeline}from'../../web/product-site/remote/timeline.mjs';import{SourceSounds}from'../../web/product-site/remote/sound.mjs';
const read=n=>JSON.parse(fs.readFileSync(new URL(n,new URL('../../web/product-site/remote/',import.meta.url)))),trace=read('trace.json'),catalog=read('catalog.json'),components=read('components.json'),sound=new SourceSounds(read('source-sounds.json'),catalog),identity=Object.fromEntries(['trace','catalog','components','source-sounds'].map(n=>[n,createHash('sha256').update(fs.readFileSync(new URL(n+'.json',new URL('../../web/product-site/remote/',import.meta.url)))).digest('hex')]));
const parameters=sound.entries().filter(c=>c.enabled).map(c=>({...sound.spec(c.id)}));
function setup(){const state={model:new SequenceDraft({trace}),motion:new MotionDraft(),arrangement:new Arrangement(),launch:new LaunchSelection(),parameterDraft:new Map(),parameterIdentity:new Map(),timeline:new WorkspaceTimeline(),soundBanks:['CHICAGO','MIAMI']};const codec=new WorkspaceDraftFile({trace,identity,parameters});const context={part:'chicago',view:'roll',mode:'select',lane:'velocity',zoom:1,selected:null,selection:[],drumVoice:0,motionSelected:0,multi:false,drumEdit:false};return{state,codec,context};}
function edited(){const a=setup(),s=a.state,m=s.model,n=m.notes.find(n=>!n.pulse&&n.track==='chicago');m.editNote(n.id,{velocity:53,chance:'2:3'});m.selectIds([m.notes.find(x=>x.track==='miami').id]);m.deleteSelected();const id=m.add({track:'miami',note:71,velocity:89,start:110,end:503,channel:1});m.selectIds([id]);a.context.selected=id;a.context.selection=[id];const p=parameters[0];s.parameterDraft.set(p.id,p.value===p.max?p.min:p.max);s.motion.begin(1);s.motion.draw(1,3,99);s.motion.end(1);s.launch.choose(0,31);s.arrangement.add([0,31,2,8,4],8);s.soundBanks[0]='JUNO';a.context.view='sound';return a;}
const capture=a=>a.codec.capture(a.state,a.context);
test('explicit version1 draft roundtrips every authored domain and context without native format/apply',()=>{const a=edited(),d=capture(a),text=a.codec.encode(d),decoded=a.codec.decode(text);assert.deepEqual(decoded,d);assert.equal(d.schema,'dnbox-local-workspace-draft/1');assert.equal(d.kind,'local-preview-only');assert.equal(d.motion.target,'Bass B / MIAMI / CARRIER / WAVE');assert.equal(d.notes.length,a.state.model.notes.length);assert.equal(d.notes.find(n=>n.chance)?.chance,'2:3');assert.equal(d.parameters[0].id,parameters[0].id);assert.equal(d.song[0].repeats,8);assert.equal(d.launch[0],31);assert.deepEqual(d.soundBanks,['JUNO','MIAMI']);assert.ok(!text.includes('canApply": true'));assert.equal(a.state.model.connected,false);});
test('opening validates without mutation, explicit install is atomic and clears histories without replacing originals',()=>{const a=edited(),b=setup(),original=structuredClone(b.state.model.original),doc=b.codec.decode(a.codec.encode(capture(a)));b.state.model.add({track:'chicago',note:60,start:1,end:5});b.state.timeline.record({label:'old',undo(){throw Error('old');},redo(){}});b.state.model.clipboard=[{bad:true}];const before=JSON.stringify(b.state.model.notes);b.codec.decode(a.codec.encode(capture(a)));assert.equal(JSON.stringify(b.state.model.notes),before);const context=installWorkspaceDraft(b.state,b.codec,doc);assert.deepEqual(b.state.model.notes,a.state.model.notes);assert.deepEqual(b.state.model.original,original);assert.deepEqual(b.state.motion.values,a.state.motion.values);assert.deepEqual(b.state.launch.targets,a.state.launch.targets);assert.deepEqual(b.state.arrangement.rows,a.state.arrangement.rows);assert.deepEqual([...b.state.parameterDraft], [...a.state.parameterDraft]);assert.deepEqual(b.state.soundBanks,a.state.soundBanks);assert.deepEqual(context,a.context);for(const m of[b.state.model,b.state.motion,b.state.arrangement]){assert.equal(m.history.length,0);assert.equal(m.future.length,0);}assert.equal(b.state.timeline.canUndo,false);assert.equal(b.state.model.clipboard,null);assert.deepEqual([...b.state.model.selection],a.context.selection);assert.deepEqual(capture({...b,context}),capture(a));const id=b.state.model.add({track:'miami',note:72,start:1,end:9});assert.ok(!doc.notes.some(n=>n.id===id));assert.equal(b.state.model.connected,false);assert.throws(()=>b.state.model.apply());});
test('all bad versions/identities/IDs/ranges/unknown fields are rejected before any state mutation',()=>{const a=edited(),d=capture(a),mutations=[x=>x.schema='native',x=>x.kind='native',x=>x.identity.trace='0'.repeat(64),x=>x.notes.push({...x.notes[0]}),x=>x.notes[0].sourceOrder=999,x=>x.notes[0].track='unreviewed',x=>x.notes[0].end=trace.endSample+1,x=>x.notes[0].deviceApply=true,x=>x.notes[0].id='forged',x=>x.notes[0].pulse=!x.notes[0].pulse,x=>x.notes[0].chance='101%',x=>x.parameters[0].id='unknown',x=>x.parameters[0].value=NaN,x=>x.parameters.push({...x.parameters[0]}),x=>x.motion.values[0]=128,x=>x.motion.target='another sound',x=>x.launch[0]=32,x=>x.launch.push(0),x=>x.song[0].repeats=9,x=>x.soundBanks[0]='SUPERJ6',x=>x.context.zoom=100,x=>x.context.selected='unknown',x=>x.context.selection=['unknown'],x=>x.extra='future'];for(const mutate of mutations){const bad=structuredClone(d);mutate(bad);const before=JSON.stringify(capture(a));assert.throws(()=>installWorkspaceDraft(a.state,a.codec,bad));assert.equal(JSON.stringify(capture(a)),before);}});
test('parser bounds and duplicate keys are strict, malformed/oversized/deep input cannot become a draft',()=>{const a=setup(),text=a.codec.encode(capture(a));for(const input of['{',text.replace('"schema":','"schema":"bad","schema":'),' '.repeat(12*1024*1024+1),'['.repeat(40)+'0'+']'.repeat(40),text.replace('"context": {','"context": {"__proto__":{},')])assert.throws(()=>a.codec.decode(input));});
test('draft capture cancels no gestures silently and no data alias can corrupt baselines',()=>{const a=edited(),d=capture(a),saved=a.codec.encode(d);d.notes[0].velocity=999;assert.notEqual(a.state.model.notes[0].velocity,999);const decoded=a.codec.decode(saved);decoded.parameters.length=0;assert.equal(a.state.parameterDraft.size,1);a.state.motion.begin(2);assert.throws(()=>capture(a),/gesture/i);a.state.motion.cancel();a.state.model.beginGesture(1,a.state.model.notes[0].id);assert.throws(()=>capture(a),/gesture/i);});
test('dirty content includes launch/bank and all domains, not selection context or baseline-equal preview entries',()=>{const a=setup();assert.equal(hasDraftChanges(a.state,a.codec),false);a.context.view='mix';assert.equal(hasDraftChanges(a.state,a.codec),false);a.state.parameterDraft.set(parameters[0].id,parameters[0].value);assert.equal(hasDraftChanges(a.state,a.codec),false);a.state.launch.choose(3,1);assert.equal(hasDraftChanges(a.state,a.codec),true);a.state.launch.targets.fill(null);a.state.soundBanks[0]='MIAMI';assert.equal(hasDraftChanges(a.state,a.codec),true);assert.equal(hasDraftChanges(edited().state,a.codec),true);});
test('duration editor cannot create an unsaveable zero-length non-pulse; existing source pulse stays a pulse',()=>{const a=setup(),n=a.state.model.notes.find(n=>!n.pulse);assert.throws(()=>a.state.model.editNote(n.id,{end:n.start}));const pulse=a.state.model.notes.find(n=>n.pulse);if(pulse){assert.doesNotThrow(()=>a.state.model.editNote(pulse.id,{start:12,end:12}));assert.doesNotThrow(()=>a.codec.encode(capture(a)));}});
test('maximum accepted draft ID wraps Add and Paste into unused bounded IDs, preserving imported identities',()=>{const a=setup(),d=capture(a);for(const i of[1000000000,0,2])d.notes.push({id:'draft'+i,track:'chicago',note:60,velocity:100,channel:0,start:1,end:9,sourceOrder:null,pulse:false});a.context=installWorkspaceDraft(a.state,a.codec,d);const originalIDs=a.state.model.notes.map(n=>n.id);const added=a.state.model.add({track:'chicago',note:61,start:10,end:19});assert.equal(added,'draft1');a.state.model.selectIds(['draft1000000000']);a.state.model.copy();const pasted=a.state.model.paste({track:'chicago',note:70,start:20});assert.deepEqual(pasted,['draft3']);assert.equal(new Set(a.state.model.notes.map(n=>n.id)).size,a.state.model.notes.length);for(const id of originalIDs)assert.ok(a.state.model.notes.some(n=>n.id===id));assert.doesNotThrow(()=>a.codec.encode(capture(a)));a.state.model.undo();assert.doesNotThrow(()=>a.codec.encode(capture(a)));a.state.model.redo();assert.doesNotThrow(()=>a.codec.encode(capture(a)));});
test('a group paste crossing upper ID boundary reserves the whole unique group before commit',()=>{const a=setup(),m=a.state.model;const one=m.add({track:'chicago',note:60,start:1,end:9}),two=m.add({track:'chicago',note:64,start:3,end:11});m.selectIds([one,two]);m.copy();m.next=1000000000;const added=m.paste({track:'chicago',note:65,start:20});assert.deepEqual(added,['draft1000000000','draft2']);assert.equal(new Set(m.notes.map(n=>n.id)).size,m.notes.length);assert.doesNotThrow(()=>a.codec.encode(capture(a)));});
test('per-step pan and drum pitch offset roundtrip without changing source voice',()=>{const a=setup(),n=a.state.model.notes.find(n=>n.track==='drum909');a.state.model.editNote(n.id,{pan:10,pitchOffset:7});const d=a.codec.decode(a.codec.encode(capture(a))),saved=d.notes.find(x=>x.id===n.id);assert.equal(saved.pan,10);assert.equal(saved.pitchOffset,7);assert.equal(saved.note,n.note);const b=setup();installWorkspaceDraft(b.state,b.codec,d);assert.deepEqual(b.state.model.notes,a.state.model.notes);});
test('draft rejects invalid pan and pitch offsets, or drum articulation on a bass note',()=>{const a=setup(),d=capture(a),drum=d.notes.find(n=>n.track==='drum909'),bass=d.notes.find(n=>n.track==='chicago');for(const patch of[{pan:-1},{pan:128},{pan:1.5},{pitchOffset:-25},{pitchOffset:25},{pitchOffset:0.5}]){const changed=structuredClone(d);Object.assign(changed.notes.find(n=>n.id===drum.id),patch);assert.throws(()=>a.codec.validate(changed));}bass.pitchOffset=1;assert.throws(()=>a.codec.validate(d));});

test('zoom round trips all historical quarter-steps and the three wider viewports, preserving note identity',()=>{
 const a=edited(),draft=capture(a);
 for(const zoom of [.125,.25,.5,...Array.from({length:13},(_,i)=>1+i/4)]){
  const input=structuredClone(draft);input.context.zoom=zoom;
  const decoded=a.codec.decode(a.codec.encode(input));assert.deepEqual(decoded,input);
 }
 for(const zoom of [0,.2,.375,.75,1.125,4.25]){
  const input=structuredClone(draft);input.context.zoom=zoom;assert.throws(()=>a.codec.validate(input));
 }
});

test('SuperJ6 source records and legacy JUNO survive one file, and rejected input leaves active Draft intact',async()=>{
 const {superJ6Specs,SUPERJ6_PROGRAM}=await import('../../web/product-site/remote/superj6.mjs');
 const codec=new WorkspaceDraftFile({trace,identity,parameters:[...parameters,...superJ6Specs]});
 const old=edited(),legacy=parameters.find(s=>s.id.startsWith('source-sound/JUNO/0|'));
 old.state.parameterDraft.set(legacy.id,legacy.value===legacy.min?legacy.max:legacy.min);
 const previous=old.codec.encode(capture(old));
 assert.equal(codec.encode(codec.decode(previous)),previous);
 const target=setup();target.codec=codec;installWorkspaceDraft(target.state,codec,codec.decode(previous));
 target.state.soundBanks.splice(0,2,'SuperJ6','Synth One');
 const spec=(slot,field)=>superJ6Specs.find(s=>s.slot===slot&&s.field===field);
 target.state.parameterDraft.set(spec(0,78).id,Math.fround(.67891));
 target.state.parameterDraft.set(spec(1,78).id,Math.fround(.18842));
 target.state.parameterDraft.set(spec(0,83).id,Math.fround(2/3));
 const saved=codec.encode(capture(target)),doc=codec.decode(saved);
 assert.ok(saved.includes(legacy.id));assert.ok(saved.includes(SUPERJ6_PROGRAM.programId));
 const fresh=setup();fresh.codec=codec;installWorkspaceDraft(fresh.state,codec,doc);
 assert.deepEqual(fresh.state.soundBanks,['SuperJ6','Synth One']);
 assert.equal(fresh.state.parameterDraft.get(spec(0,78).id),Math.fround(.67891));
 assert.equal(fresh.state.parameterDraft.get(spec(1,78).id),Math.fround(.18842));
 assert.equal(fresh.state.parameterDraft.get(legacy.id),target.state.parameterDraft.get(legacy.id));
 for(const change of [[spec(0,83).id,.5],[spec(0,210).id,.25],[spec(0,78).id,.1234567890123456],[spec(0,78).id.replace(SUPERJ6_PROGRAM.programId,'bad'),0]]){
  const invalid=structuredClone(doc);invalid.parameters=invalid.parameters.filter(x=>x.id!==change[0]);invalid.parameters.push({id:change[0],value:change[1]});
  const before=codec.encode(capture(fresh));
  assert.throws(()=>installWorkspaceDraft(fresh.state,codec,invalid),/unqualified parameter/);
  assert.equal(codec.encode(capture(fresh)),before);
 }
});

test('BREAK chance is stored once per local step and old Drafts clear its optional state',()=>{
 const one=setup(), previous=one.codec.encode(capture(one));
 const empty={loops:[null,null],rate:'1/16',slices:Array(16).fill(0)};
 one.state.breakSequence=structuredClone(empty);
 assert.equal(one.codec.encode(capture(one)),previous);
 one.state.model.add({track:'breaks',note:60,start:0,end:100});
 one.state.model.add({track:'breaks',note:62,start:0,end:70});
 one.state.breakSequence.chance=[95,101,102,135,...Array(12).fill(null)];
 const encoded=one.codec.encode(capture(one)), recovered=one.codec.decode(encoded);
 assert.deepEqual(recovered.breakSequence.chance,one.state.breakSequence.chance);
 assert.ok(recovered.notes.every(n=>!Object.hasOwn(n,'chance')));
 const target=setup();target.state.breakSequence=structuredClone(empty);
 installWorkspaceDraft(target.state,target.codec,recovered);
 assert.deepEqual(target.state.breakSequence,one.state.breakSequence);
 for(const invalid of [0,1,99,100,136,255,-1,'1:2',NaN]){
  const wrong=structuredClone(recovered);wrong.breakSequence.chance[0]=invalid;
  assert.throws(()=>installWorkspaceDraft(target.state,target.codec,wrong),/invalid BREAK/);
  assert.deepEqual(target.state.breakSequence,one.state.breakSequence);
 }
 const wrong=structuredClone(recovered);wrong.breakSequence.chance.pop();
 assert.throws(()=>one.codec.validate(wrong),/invalid BREAK/);
 const canonical=structuredClone(recovered);canonical.breakSequence.chance.fill(null);
 assert.ok(!Object.hasOwn(one.codec.validate(canonical).breakSequence,'chance'));
 installWorkspaceDraft(target.state,target.codec,target.codec.decode(previous));
 assert.deepEqual(target.state.breakSequence,empty);
 assert.equal(target.codec.encode(capture(target)),previous);
});
