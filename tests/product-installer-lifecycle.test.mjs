// Actual installer orchestration with DOM/network/media admission boundaries mocked.
// No browser, Web MIDI, installation or physical device claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../web/product-site/install.mjs',import.meta.url),'utf8');
const body=source.replace(/^import .*;\n/gm,'');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const tick=()=>new Promise(r=>setImmediate(r));
function harness({fetcher,mounter,stored}={}) {
 const events={},nodes=new Map(),mounts=[],panels=[],storage=new Map();
 if(stored!==undefined)storage.set('dnbox-starting-break-selection',JSON.stringify(stored));
 const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',children:[],replaceChildren(...c){this.children=c;}});return nodes.get(id);};
 const document={getElementById:node,querySelectorAll:()=>[],createElement:()=>({})};
 const window={addEventListener:(name,fn)=>events[name]=fn};
 const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 const mount=async(staging,options)=>{
  mounts.push({staging,options});
  if(mounter)return mounter(staging,options);
  const p={destroyed:0,selection:options.initialSelectedIds||[],selectedIds(){return this.selection;},destroy(){this.destroyed++;}};panels.push(p);return p;
 };
 // Replace only import.meta URL, whose resolved value is an injected module boundary.
 const run=new AsyncFunction('document','window','localStorage','fetch','mountPreparedChoices','SAMPLE_CONTRACT_SHA256','createStartingBreakPreview','URL',body.replaceAll('import.meta.url',JSON.stringify('https://example.invalid/install.mjs')));
 const done=run(document,window,localStorage,fetcher||(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(2)})),mount,'pinned-contract',()=>({}),URL);
 return {done,events,node,mounts,panels,storage};
}
test('pagehide before metadata completes never mounts a stale panel',async()=>{
 const pending=deferred();const h=harness({fetcher:()=>pending.promise});
 h.events.pagehide({persisted:false});pending.resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(2)});
 await h.done;assert.equal(h.mounts.length,0);assert.equal(h.node('sample-picker').children.length,0);
});
test('pagehide during cryptographic mounting destroys late candidate without attaching it',async()=>{
 const pending=deferred();let destroyed=0;const h=harness({mounter:()=>pending.promise});
 await tick();assert.equal(h.mounts.length,1);h.events.pagehide({persisted:false});
 pending.resolve({destroy(){destroyed++;},selectedIds:()=>[]});await h.done;
 assert.equal(destroyed,1);assert.equal(h.node('sample-picker').children.length,0);
});
test('BFCache restores selected IDs and old callbacks cannot mutate current storage',async()=>{
 const h=harness({stored:['personal-br1-zone1']});await h.done;
 assert.deepEqual(h.mounts[0].options.initialSelectedIds,['personal-br1-zone1']);
 h.panels[0].selection=['personal-br2-zone2'];h.events.pagehide({persisted:true});
 assert.equal(h.panels[0].destroyed,1);h.events.pageshow({persisted:true});await tick();
 assert.deepEqual(h.mounts[1].options.initialSelectedIds,['personal-br2-zone2']);
 h.mounts[1].options.onSelection({selectedIds:['personal-br1-zone2']});
 const current=h.storage.get('dnbox-starting-break-selection');
 h.mounts[0].options.onSelection({selectedIds:['personal-br1-zone3']});
 assert.equal(h.storage.get('dnbox-starting-break-selection'),current);
 assert.equal(h.node('sample-picker').children[0],h.mounts[1].staging);
});
test('network errors disclose failure without mounting or claiming device writes',async()=>{
 const h=harness({fetcher:async()=>({ok:false})});await h.done;
 assert.equal(h.mounts.length,0);assert.match(h.node('samples-status').textContent,/could not be loaded/);
 h.events.pagehide({persisted:false});h.events.pageshow({persisted:true});await tick();assert.equal(h.mounts.length,0);
});
test('pagehide while metadata body waits never calls mount after body arrives',async()=>{
 const pending=deferred();const h=harness({fetcher:async()=>({ok:true,arrayBuffer:()=>pending.promise})});
 await tick();h.events.pagehide({persisted:true});pending.resolve(new ArrayBuffer(2));await h.done;
 assert.equal(h.mounts.length,0);
});
test('overlapping restore destroys obsolete candidate and retains newest panel',async()=>{
 const old=deferred();let first=true,oldDestroyed=0,newDestroyed=0;
 const h=harness({mounter:()=>{if(first){first=false;return old.promise;}return {destroy(){newDestroyed++;},selectedIds:()=>[]};}});
 await tick();h.events.pagehide({persisted:true});h.events.pageshow({persisted:true});await tick();
 assert.equal(h.mounts.length,2);assert.equal(h.node('sample-picker').children[0],h.mounts[1].staging);
 old.resolve({destroy(){oldDestroyed++;},selectedIds:()=>[]});await h.done;
 assert.equal(oldDestroyed,1);assert.equal(newDestroyed,0);
 assert.equal(h.node('sample-picker').children[0],h.mounts[1].staging);
});
