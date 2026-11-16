let failures=0;function check(name,fn){try{fn();console.log('PASS',name);}catch(e){failures++;console.log('FAIL',name,e.message);}}
import fs from 'node:fs';import assert from 'node:assert/strict';
const base=new URL('../../web/product-site/remote/',import.meta.url);
// Deterministic source-event shim only. No DOM engine, browser, server or rendering.
class E{constructor(id=''){this.id=id;this.handlers={};this.captureHandlers={};this.dataset={};this.style={setProperty(){}};this.innerHTML='';this.textContent='';this.value='';this.scrollLeft=0;this.scrollTop=0;this.clientHeight=300;this.captures=new Set();this.classList={toggle:()=>false};this.attrs={};}appendChild(child){child.parentElement=this;return child;}addEventListener(k,f,options){if(options?.capture)this.captureHandlers[k]=f;else this.handlers[k]=f;}removeEventListener(k){delete this.handlers[k];}setPointerCapture(id){this.captures.add(id);}hasPointerCapture(id){return this.captures.has(id);}releasePointerCapture(id){this.captures.delete(id);}setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}getBoundingClientRect(){return{left:0,top:0,width:100,height:100};}closest(s){if(s==='button')return this;return (s==='[data-note]'&&this.dataset.note)||(s==='[data-select]'&&this.dataset.select)||(s==='[data-param]'&&this.dataset.param)?this:null;}focus(){document.activeElement=this;}showModal(){}querySelector(s){const match=s.match(/data-(note|select)="([^"]+)"/);if(match){const n=new E();n.dataset[match[1]]=match[2];return n;}if(s==='span')return(this.span??=new E());return null;}}
const nodes=new Map(),views=['roll','drums','locks','sound','mix','patterns','song','files'].map(view=>{const e=new E();e.dataset.view=view;return e;}),modes=['select','move','draw','length','pan'].map(mode=>{const e=new E();e.dataset.mode=mode;return e;});
globalThis.document={activeElement:null,getElementById:id=>{if(!nodes.has(id))nodes.set(id,new E(id));return nodes.get(id);},querySelectorAll:s=>s==='[data-view]'?views:s==='[data-mode]'?modes:[],querySelector:()=>new E(),addEventListener(){}};const windowEvents=new Map();globalThis.window={addEventListener(k,f){const list=windowEvents.get(k)??[];list.push(f);windowEvents.set(k,list);}};globalThis.fetch=async path=>({ok:true,text:async()=>fs.readFileSync(new URL(path,base),'utf8'),json:async()=>JSON.parse(fs.readFileSync(new URL(path,base),'utf8'))});
const $=document.getElementById;$('zoom').value='1';$('lane-kind').value='velocity';$('part').value='chicago';$('part').selectedOptions=[{textContent:'Bass A Chicago'}];const sharedLaneNode=new E('shared-lane');$('roll-view').appendChild(sharedLaneNode);const originalQuery=document.querySelector;document.querySelector=s=>s==='.lane'?sharedLaneNode:originalQuery(s);await import(new URL('app.mjs',base));
// Repro 1: existing focus A, pointer selects B, repaint restores A, keyboard edits A.
const a=new E();a.dataset.note='n1';document.activeElement=a;const b=new E();b.dataset.note='n5';const down={button:0,pointerId:1,clientX:0,clientY:0,target:b,preventDefault(){}};$('roll-scroll').handlers.pointerdown(down);$('roll-scroll').handlers.pointerup(down);
const selectedBefore=$('inspector').innerHTML.split('</h2>')[0],focusAfter=document.activeElement.dataset.note;
$('roll-scroll').handlers.keydown({key:'ArrowUp',target:document.activeElement,preventDefault(){}});const selectedAfter=$('inspector').innerHTML.split('</h2>')[0];
assert.match(selectedBefore,/G3 /);check('selected pointer owns keyboard',()=>{assert.equal(focusAfter,'n5');assert.match(selectedAfter,/G♯3 /);});
console.log('CORRECTED_POINTER_SELECTION_FOCUS',JSON.stringify({selectedBefore,focusAfter,selectedAfter}));
// Repro 2: edit real example drum velocity, show drums, Undo leaves stale drums.
$('part').value='drum909';$('part').selectedOptions=[{textContent:'909'}];$('part').onchange();$('inspector').handlers.change({target:{dataset:{field:'velocity'},value:'120'}});views.find(e=>e.dataset.view==='drums').onclick();const beforeUndo=$('other-view').innerHTML;assert.match(beforeUndo,/step 1 velocity 120/);$('undo').onclick();const afterUndo=$('other-view').innerHTML,statusAfterUndo=$('status').textContent;check('undo repaints current drums',()=>assert.match(afterUndo,/step 1 velocity 88/));$('part').onchange();const afterRefresh=$('other-view').innerHTML;assert.match(afterRefresh,/step 1 velocity 88/);console.log('CORRECTED_UNDO_DRUM_RENDER',JSON.stringify({staleVelocity120:afterUndo.includes('step 1 velocity 120'),statusAfterUndo,refreshedVelocity88:afterRefresh.includes('step 1 velocity 88')}));
// Repro 3: Sound for Bass A includes Bass B's same-bank descriptors too.
$('part').value='chicago';$('part').selectedOptions=[{textContent:'Bass A Chicago'}];views.find(e=>e.dataset.view==='sound').onclick();const sound=$('other-view').innerHTML,cardCount=(sound.match(/data-param="source-sound\/CHICAGO\/0\|1:/g)||[]).length,waveCount=(sound.match(/<span>WAVE<\/span>/g)||[]).length;check('selected bass has only own controls',()=>{assert.equal(cardCount,20);assert.equal(waveCount,1);assert.doesNotMatch(sound,/data-param="source-sound\/CHICAGO\/1\|/);});assert.match(sound,/Sound · Bass A Chicago/);console.log('CORRECTED_SELECTED_BASS_VOICE',JSON.stringify({selectedPart:'Bass A Chicago',shownCards:cardCount,expectedBassACards:20,WaveLabels:waveCount}));

assert.equal(failures,0);

// Actual-app event-shim action result, not DOM/browser proof.
$('part').value='chicago';$('part').onchange();views.find(e=>e.dataset.view==='roll').onclick();
// Lane is absolute (value follows the finger), shared lane.mjs mapping.
const L=await import(new URL('lane.mjs',base));const vAt=y=>L.velocityFromLane(L.laneP(y,0,100)),cAt=y=>L.chanceFromLane(L.laneP(y,0,100));
const bar=new E();bar.dataset.select='n1';const laneDown={button:0,pointerId:7,clientX:0,clientY:20,target:bar,preventDefault(){}};
$('velocity').handlers.pointerdown(laneDown);$('velocity').handlers.pointermove({...laneDown,clientY:12});$('velocity').handlers.pointerup(laneDown);
assert.match($('inspector').innerHTML,new RegExp('data-field="velocity"[^>]*value="'+vAt(12)+'"'));$('undo').onclick();assert.match($('inspector').innerHTML,/data-field="velocity"[^>]*value="93"/);
$('velocity').handlers.pointerdown(laneDown);$('velocity').handlers.pointermove({...laneDown,clientY:2});$('velocity').handlers.pointercancel(laneDown);assert.match($('inspector').innerHTML,/data-field="velocity"[^>]*value="93"/);console.log('PASS actual-app aligned velocity 93→'+vAt(12)+', Undo93, cancel93');
views.find(e=>e.dataset.view==='mix').onclick();const surface=new E();surface.dataset.param='current-state-and-reference/mix-master.svg|1:4:0:2';const paramDown={button:0,pointerId:8,clientX:0,clientY:50,target:surface,preventDefault(){}};
$('other-view').handlers.pointerdown(paramDown);$('other-view').handlers.pointermove({...paramDown,clientX:14});$('other-view').handlers.pointerup(paramDown);assert.equal($('parameter-value').value,53);$('parameter-undo').onclick();assert.equal($('parameter-value').value,41);
$('other-view').handlers.pointerdown(paramDown);$('other-view').handlers.pointermove({...paramDown,clientY:30});$('other-view').handlers.pointercancel(paramDown);assert.equal($('parameter-value').value,41);console.log('PASS actual-app Drive raw41→53, Undo41, cancel41');

views.find(e=>e.dataset.view==='patterns').onclick();for(let i=0;i<5;i++){const b=new E();b.dataset={launchPart:String(i),pattern:String(i)};$('other-view').handlers.click({target:b});}views.find(e=>e.dataset.view==='song').onclick();const add=new E('song-add');$('other-view').handlers.click({target:add});assert.match($('other-view').innerHTML,/<td>P5<\/td>/);$('other-view').handlers.change({target:{dataset:{songRow:'0'},value:'8'}});assert.match($('other-view').innerHTML,/value="8"/);console.log('PASS actual-app five launch selections→song row→8 repeats');
views.find(e=>e.dataset.view==='locks').onclick();const mg=$('motion-grid'),me={button:0,pointerId:9,clientX:1,clientY:100,preventDefault(){}};mg.onpointerdown(me);for(let i=1;i<6;i++)mg.onpointermove({...me,clientX:i*6.25+1,clientY:100-i*15});mg.onpointerup(me);assert.match(mg.innerHTML,/Step 6, 95/);$('motion-undo').onclick();assert.doesNotMatch(mg.innerHTML,/Step 6, 95/);$('motion-redo').onclick();assert.match(mg.innerHTML,/Step 6, 95/);console.log('PASS actual-app six motion points→Undo empty→Redo');
$('part').value='drum909';$('part').selectedOptions=[{textContent:'909'}];views.find(e=>e.dataset.view==='drums').onclick();const toggle=new E('drum-edit');$('other-view').handlers.click({target:toggle});const hit=new E();hit.dataset={drumNote:'36',drumStart:'0',drumTrack:'drum909'};$('other-view').handlers.click({target:hit});assert.doesNotMatch($('other-view').innerHTML,/BD step 1 velocity/);$('undo').onclick();assert.match($('other-view').innerHTML,/BD step 1 velocity 88/);console.log('PASS actual-app explicit drum toggle→Undo');
$('part').value='chicago';$('part').selectedOptions=[{textContent:'Bass A Chicago'}];$('part').onchange();views.find(e=>e.dataset.view==='roll').onclick();$('inspector').handlers.change({target:{id:'chance-value',value:'1:2',dataset:{}}});assert.match($('inspector').innerHTML,/option selected>1:2/);$('undo').onclick();assert.doesNotMatch($('inspector').innerHTML,/option selected>1:2/);console.log('PASS actual-app exact conditional1:2→Undo unset');

// R9 regression: clear must remove a prior explicit condition, not silently ignore it.
$('inspector').handlers.change({target:{id:'chance-value',value:'1:2',dataset:{}}});
$('inspector').handlers.change({target:{id:'chance-value',value:'',dataset:{}}});
check('actual-app Not set removes a condition',()=>assert.doesNotMatch($('inspector').innerHTML,/option selected>1:2/));
$('undo').onclick();check('actual-app Undo clear restores condition',()=>assert.match($('inspector').innerHTML,/option selected>1:2/));
$('redo').onclick();check('actual-app Redo clear restores unset',()=>assert.doesNotMatch($('inspector').innerHTML,/option selected>1:2/));
// R9 regression: conditional cycles are categorical, never bar-height probability.
$('lane-kind').value='chance';$('lane-kind').onchange();
$('inspector').handlers.change({target:{id:'chance-value',value:'1:2',dataset:{}}});
const laneHeight=()=>Number($('velocity').innerHTML.match(/data-select="n1"[^>]*height:([0-9.]+)px/)?.[1]);
const half=laneHeight();$('inspector').handlers.change({target:{id:'chance-value',value:'8:8',dataset:{}}});
check('conditional chips do not map their ordinal to height',()=>assert.equal(laneHeight(),half));
check('conditional lane is correctly announced',()=>assert.match($('velocity').innerHTML,/aria-label="C3, condition 8:8, local draft"/));
// Explicit percentage supports direct aligned drag, with one Undo and safe cancel.
$('inspector').handlers.change({target:{id:'chance-value',value:'50%',dataset:{}}});
$('velocity').handlers.pointerdown({...laneDown,pointerId:70});$('velocity').handlers.pointermove({...laneDown,pointerId:70,clientY:30});$('velocity').handlers.pointerup({...laneDown,pointerId:70});
check('chance drag sets the percentage under the finger',()=>assert.match($('inspector').innerHTML,new RegExp('option selected>'+cAt(30)+'<')));
$('undo').onclick();check('chance drag is one undoable action',()=>assert.match($('inspector').innerHTML,/option selected>50%/));
$('velocity').handlers.pointerdown({...laneDown,pointerId:71});$('velocity').handlers.pointermove({...laneDown,pointerId:71,clientY:0});$('velocity').handlers.pointercancel({...laneDown,pointerId:71});
check('chance drag cancellation restores percentage',()=>assert.match($('inspector').innerHTML,/option selected>50%/));
assert.equal(failures,0);

// R10 group is changed as one pointer-owned action, not one selected note.
$('multi').onclick();
function rollPress(id,pointerId){const target=new E();target.dataset.note=id;const e={button:0,pointerId,clientX:0,clientY:0,target,preventDefault(){}};$('roll-scroll').handlers.pointerdown(e);$('roll-scroll').handlers.pointerup(e);}
rollPress('n1',81);rollPress('n5',82);modes.find(x=>x.dataset.mode==='move').onclick();
const groupTarget=new E();groupTarget.dataset.note='n1';const groupDown={button:0,pointerId:83,clientX:0,clientY:0,target:groupTarget,preventDefault(){}};
$('roll-scroll').handlers.pointerdown(groupDown);$('roll-scroll').handlers.pointermove({...groupDown,clientX:10});$('roll-scroll').handlers.pointerup(groupDown);
check('actual-app group pointer moves both onsets',()=>{assert.match($('roll-grid').innerHTML,/data-note="n1"[^>]*left:10px/);assert.ok(Math.abs(Number($('roll-grid').innerHTML.match(/data-note="n5"[^>]*left:([0-9.]+)px/)[1])-360)<1e-9);});
$('undo').onclick();check('actual-app group pointer is one Undo',()=>{assert.match($('roll-grid').innerHTML,/data-note="n1"[^>]*left:0px/);assert.match($('roll-grid').innerHTML,/data-note="n5"[^>]*left:350px/);});
$('part').value='drum909';$('part').selectedOptions=[{textContent:'909'}];$('part').onchange();$('part').value='chicago';$('part').selectedOptions=[{textContent:'Bass A Chicago'}];$('part').onchange();
check('part change clears hidden group membership',()=>assert.match($('roll-grid').innerHTML,/data-note="n5" aria-selected="false"/));
assert.equal(failures,0);

// Keyboard lane alternative operates the same source-domain value, not a new scale.
$('lane-kind').value='chance';$('lane-kind').onchange();$('inspector').handlers.change({target:{id:'chance-value',value:'50%',dataset:{}}});
const keyTarget=new E();keyTarget.dataset.select='n1';document.activeElement=keyTarget;
$('velocity').handlers.keydown?.({key:'ArrowUp',target:keyTarget,preventDefault(){}});
check('lane keyboard increments explicit percentage by5',()=>assert.match($('inspector').innerHTML,/option selected>55%/));
check('lane keyboard repaint restores replacement-button focus',()=>{assert.equal(document.activeElement?.dataset.select,'n1');assert.notEqual(document.activeElement,keyTarget)});
$('velocity').handlers.keydown?.({key:'Enter',target:keyTarget,preventDefault(){}});
check('lane keyboard opens exact chance chooser',()=>assert.equal(document.activeElement?.id,'chance-value'));
assert.equal(failures,0);

views.find(e=>e.dataset.view==='mix').onclick();check('R21 app uses whole transparent source frame, not recaptioned cards',()=>{assert.match($('other-view').innerHTML,/data-source-frame/);assert.doesNotMatch($('other-view').innerHTML,/<span>Drive<\/span>/)});
$('part').value='drum909';$('part').selectedOptions=[{textContent:'909'}];$('part').onchange();views.find(e=>e.dataset.view==='sound').onclick();check('all11 captured909voice contexts available',()=>assert.match($('other-view').innerHTML,/<option value="10">RD<\/option>/));
$('other-view').handlers.change({target:{id:'sound-voice',value:'10',dataset:{}}});check('choosing909RD changes whole captured source context',()=>assert.match($('other-view').innerHTML,/909-voice-10.svg/));
assert.equal(failures,0);

views.find(e=>e.dataset.view==='mix').onclick();const aliasSurface=new E();aliasSurface.dataset={param:'current-state-and-reference/mix-parts-live.svg|1:5:0:0',paramOccurrence:'5'};const aliasDown={button:0,pointerId:119,clientX:0,clientY:50,target:aliasSurface,preventDefault(){}};$('other-view').handlers.pointerdown(aliasDown);$('other-view').handlers.pointerup(aliasDown);check('same-target alias preserves actual touched occurrence name',()=>assert.match($('parameter-inspector').querySelector('span').textContent,/LEVEL/));assert.equal(failures,0);

views.find(e=>e.dataset.view==='mix').onclick();check('no connection caption text in views (state shown only by Connect)',()=>assert.equal(($('other-view').innerHTML.match(/class="source-caption"/g)||[]).length,0));assert.equal(failures,0);

$('part').value='chicago';$('part').selectedOptions=[{textContent:'Bass A Chicago'}];$('part').onchange();views.find(e=>e.dataset.view==='roll').onclick();
check('modeless Delete removes the focused note and Undo restores it',()=>{
 const before=$('roll-grid').innerHTML;
 const id=before.match(/data-note="([^"]+)"/)[1];
 const target=new E();target.dataset.note=id;
 $('roll-scroll').handlers.keydown({key:'Delete',target,preventDefault(){}});
 assert.ok(!$('roll-grid').innerHTML.includes(`data-note="${id}"`));
 $('undo').onclick();assert.ok($('roll-grid').innerHTML.includes(`data-note="${id}"`));
});assert.equal(failures,0);

await $('connect').handlers.click({preventDefault(){}});
assert.match($('conn-state').textContent,/Apply stays off/);assert.equal($('apply').disabled,true);
console.log('PASS actual page Connect fails closed without admitted simulator catalog');

check('actual app binds vertical pitch pinch independently of time zoom',()=>{
 const el=$('roll-scroll'),h=el.captureHandlers;
 const event=(id,y)=>({button:0,pointerId:id,clientX:100,clientY:y,preventDefault(){},stopImmediatePropagation(){}});
 const initial=Number.parseFloat($('roll-grid').style.height)/128,width=$('roll-grid').style.width;
 h.pointerdown(event(500,100));h.pointerdown(event(501,200));
 h.pointermove(event(500,50));h.pointermove(event(501,250));
 assert.equal(Number.parseFloat($('roll-grid').style.height)/128,Math.min(80,initial*2));
 assert.equal($('roll-grid').style.width,width);
 h.pointerup(event(500,50));h.pointerup(event(501,250));
});assert.equal(failures,0);

check('actual drum page reuses live lane controls and returns them intact on leaving',()=>{
 $('lane-kind').value='velocity';$('part').value='chicago';views.find(e=>e.dataset.view==='drums').onclick();
 assert.equal($('part').value,'drum909');assert.equal(sharedLaneNode.parentElement.id,'drum-lane-slot');
 assert.match($('velocity').innerHTML,/C2, velocity/);
 assert.doesNotMatch($('velocity').innerHTML,/D2, velocity/);
 const before=$('velocity').innerHTML;
 const id=before.match(/data-select="([^"]+)"/)[1],step=new E();step.dataset.select=id;
 const stroke={button:0,pointerId:800,clientX:12,clientY:10,target:step,preventDefault(){}};
 $('velocity').handlers.pointerdown(stroke);$('velocity').handlers.pointerup(stroke);
 assert.notEqual($('velocity').innerHTML,before);$('undo').onclick();assert.equal($('velocity').innerHTML,before);
 const handler=$('velocity').handlers.pointerdown;
 views.find(e=>e.dataset.view==='sound').onclick();assert.equal(sharedLaneNode.parentElement.id,'roll-view');
 views.find(e=>e.dataset.view==='drums').onclick();assert.equal(sharedLaneNode.parentElement.id,'drum-lane-slot');
 assert.equal($('velocity').handlers.pointerdown,handler);
 views.find(e=>e.dataset.view==='roll').onclick();assert.equal(sharedLaneNode.parentElement.id,'roll-view');
});assert.equal(failures,0);
check('shipped pointer binding preserves note geometry through small touch jitter',()=>{
 $('part').value='chicago';$('part').onchange();views.find(e=>e.dataset.view==='roll').onclick();
 const id=$('roll-grid').innerHTML.match(/data-note="([^"]+)"/)[1],target=new E();target.dataset.note=id;
 const geometry=()=>$('roll-grid').innerHTML.match(new RegExp('data-note="'+id+'"[^>]*style="([^"]+)"'))[1];
 const before=geometry(),e={button:0,pointerId:990,pointerType:'touch',clientX:100,clientY:100,target,preventDefault(){}};
 $('roll-scroll').handlers.pointerdown(e);$('roll-scroll').handlers.pointermove({...e,clientX:103,clientY:104});$('roll-scroll').handlers.pointerup(e);
 assert.equal(geometry(),before);
});assert.equal(failures,0);
check('shipped typed synth slider previews cancel and change commits one source-domain Undo',()=>{
 $('part').value='chicago';$('part').onchange();views.find(e=>e.dataset.view==='sound').onclick();
 const group=JSON.parse(fs.readFileSync(new URL('source-sounds.json',base))).contexts.find(g=>g.bank==='CHICAGO'&&g.bassSlot===0);
 const c=group.controls.find(c=>c.kind===1&&c.parameter===0),id='source-sound/CHICAGO/0|'+[c.kind,c.target,c.voice,c.parameter,c.sourceBank].join(':');
 assert.equal(($('other-view').innerHTML.match(/data-native-param=/g)||[]).length,1);
 assert.match($('other-view').innerHTML,/class="parameter encoder"/);
 const input=new E();input.dataset={param:id,nativeParam:id};input.value=String(c.raw===c.max?c.raw-1:c.raw+1);
 $('review').onclick();const before=$('changes').textContent;
 let prevented=false;$('other-view').handlers.pointerdown({button:0,pointerId:991,target:input,preventDefault(){prevented=true}});assert.equal(prevented,false);
 $('other-view').handlers.input({target:input});assert.doesNotMatch(input.attrs['aria-valuetext'],/raw|%/);$('other-view').handlers.pointercancel();assert.equal(Number(input.value),c.raw);
 $('review').onclick();assert.equal($('changes').textContent,before);
 input.value=String(c.raw===c.max?c.raw-1:c.raw+1);$('other-view').handlers.input({target:input});$('other-view').handlers.change({target:input});
 $('review').onclick();assert.notEqual($('changes').textContent,before);$('undo').onclick();$('review').onclick();assert.equal($('changes').textContent,before);
 input.value=String(c.max+1);$('other-view').handlers.change({target:input});$('review').onclick();assert.equal($('changes').textContent,before);
});assert.equal(failures,0);
check('shipped mixer has all source controls and typed faders sync LEVEL alias with source units and Undo',()=>{
 views.find(e=>e.dataset.view==='mix').onclick();const html=$('other-view').innerHTML;
 assert.equal((html.match(/class="mixer-fader"/g)||[]).length,5);assert.equal((html.match(/data-native-param=/g)||[]).length,9);
 assert.match(html,/mix-master.svg/);assert.match(html,/fx-reverb-direct.svg/);assert.match(html,/fx-delay-direct.svg/);assert.doesNotMatch(html,/mixer-vu|mixer-eq|bus-channel/);
 const id='current-state-and-reference/mix-parts-live.svg|1:5:0:0',input=new E(),alias=new E();input.dataset={param:id,nativeParam:id,paramOccurrence:'0'};alias.dataset={param:id,nativeParam:id,paramOccurrence:'5'};
 const old=document.querySelectorAll;document.querySelectorAll=s=>s==='[data-native-param]'?[input,alias]:old(s);
 $('review').onclick();const before=$('changes').textContent;
 input.value='100';$('other-view').handlers.input({target:input});assert.equal(input.attrs['aria-valuetext'],'0dB');assert.equal(alias.value,'100');assert.equal(alias.attrs['aria-valuetext'],'0dB');$('other-view').handlers.pointercancel();assert.equal(input.value,'75');assert.equal(alias.value,'75');assert.equal(alias.attrs['aria-valuetext'],'-5dB');$('review').onclick();assert.equal($('changes').textContent,before);input.value='100';$('other-view').handlers.input({target:input});$('other-view').handlers.change({target:input});assert.equal(alias.value,'100');assert.equal(alias.attrs['aria-valuetext'],'0dB');
 $('review').onclick();assert.notEqual($('changes').textContent,before);$('undo').onclick();$('review').onclick();assert.equal($('changes').textContent,before);assert.match($('other-view').innerHTML,/aria-valuetext="-5dB"/);
 document.querySelectorAll=old;
});assert.equal(failures,0);
check('shipped touch roll draws, resizes and cancels through actual pointer handlers with exact Undo',()=>{
 $('part').value='chicago';$('part').onchange();views.find(e=>e.dataset.view==='roll').onclick();
 const grid=$('roll-grid'),viewport=$('roll-scroll'),ids=()=>[...grid.innerHTML.matchAll(/data-note="([^"]+)"/g)].map(m=>m[1]);const before=ids();
 const empty=new E(),down={button:0,pointerId:1200,pointerType:'touch',clientX:200,clientY:100,target:empty,preventDefault(){}};
 viewport.handlers.pointerdown(down);viewport.handlers.pointermove({...down,clientX:300});viewport.handlers.pointerup(down);
 const added=ids().filter(id=>!before.includes(id));assert.equal(added.length,1);const id=added[0];
 const geometry=()=>grid.innerHTML.match(new RegExp('data-note="'+id+'"[^>]*style="([^"]+)"'))[1];const drawn=geometry();
 const note=new E();note.dataset.note=id;const move={...down,pointerId:1203,target:note};viewport.handlers.pointerdown(move);viewport.handlers.pointermove({...move,clientX:250});viewport.handlers.pointerup(move);assert.notEqual(geometry(),drawn);$('undo').onclick();assert.equal(geometry(),drawn);const edge=new E();edge.dataset.edge='end';edge.closest=s=>s==='[data-note]'?note:s==='[data-edge]'?edge:null;
 const resize={...down,pointerId:1201,target:edge,clientX:300};viewport.handlers.pointerdown(resize);viewport.handlers.pointermove({...resize,clientX:360});viewport.handlers.pointerup(resize);assert.notEqual(geometry(),drawn);
 $('undo').onclick();assert.equal(geometry(),drawn);$('undo').onclick();assert.deepEqual(ids(),before);
 const canceled={...down,pointerId:1202};viewport.handlers.pointerdown(canceled);viewport.handlers.pointermove({...canceled,clientX:400});viewport.handlers.pointercancel(canceled);assert.deepEqual(ids(),before);assert.equal(viewport.hasPointerCapture(1202),false);
});assert.equal(failures,0);
check('shipped mixer uses approved part order and source-catalog roles, not captured engine aliases',()=>{
 views.find(e=>e.dataset.view==='mix').onclick();const html=$('other-view').innerHTML;
 const roleNames=[...html.matchAll(/class="mixer-channel-name">([^<]+)</g)].map(m=>m[1]);assert.deepEqual(roleNames,['909','808','BASS A','BASS B','BREAK']);
 const ids=[...html.matchAll(/class="mixer-fader"[^>]*data-native-param="([^"]+)"/g)].map(m=>m[1].split('|')[1]);assert.deepEqual(ids,['1:5:0:0','1:5:1:0','1:5:2:0','1:5:3:0','1:5:4:0']);
});assert.equal(failures,0);

check('shipped drum lane resizes with its viewport and roll restores its own width',()=>{
 const emit=k=>{for(const fn of windowEvents.get(k)??[])fn({});};
 const slot=$('drum-lane-slot'),roll=$('roll-scroll');slot.clientWidth=600;roll.clientWidth=700;$('zoom').value='1';
 views.find(e=>e.dataset.view==='drums').onclick();assert.match($('velocity').innerHTML,/lane-track" style="width:600px/);
 slot.clientWidth=320;emit('resize');assert.match($('velocity').innerHTML,/lane-track" style="width:320px/);
 slot.clientWidth=740;emit('resize');assert.match($('velocity').innerHTML,/lane-track" style="width:740px/);
 views.find(e=>e.dataset.view==='roll').onclick();assert.match($('velocity').innerHTML,/lane-track" style="width:700px/);
 assert.equal($('roll-grid').style.width,'700px');
});assert.equal(failures,0);
