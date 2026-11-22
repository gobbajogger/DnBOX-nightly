import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mountBreakPanel} from '../web/product-site/components/break-panel/panel.mjs';
import {emptyBreakSequence,mountBreakSequence} from '../web/product-site/remote/break-sequence.mjs';
import {SAMPLE_CONTRACT_SHA256} from '../web/product-site/sample-pin.mjs';
test('preview failure never substitutes a generated tone or reports playing',async()=>{
 let audioCreated=0;const states=[];const nodes=new Map();
 const node=()=>({textContent:'',replaceChildren(){},setAttribute(){}});
 const root={ownerDocument:{createElement(){audioCreated++;return{...node(),play:async()=>{},pause(){}};}},querySelectorAll(){return[];},querySelector(s){if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);},addEventListener(){},removeEventListener(){}};
 const panel=await mountBreakPanel(root,{contractBytes:readFileSync(new URL('../web/product-site/sample-contract.json',import.meta.url)),contractSha256:SAMPLE_CONTRACT_SHA256,resolvePrivateUrl:()=>'/missing.wav',fetchBytes:async()=>{throw Error('404');},onAudioState:s=>states.push(s)});
 const before=panel.selectedIds();
 await assert.rejects(panel.listen('personal-br1-zone1'));
 assert.equal(audioCreated,0);assert.equal(states.some(s=>s.status==='playing'),false);assert.equal(states.at(-1).status,'error');assert.deepEqual(panel.selectedIds(),before);panel.destroy();
});

test('Remote bulk-selection cues follow all, none, partial and remounted previews',async t=>{
 const bytes=readFileSync(new URL('../web/product-site/sample-contract.json',import.meta.url));
 const previous={document:globalThis.document,Option:globalThis.Option,fetch:globalThis.fetch};
 t.after(()=>Object.assign(globalThis,previous));
 class Node {
  constructor(){this.children=[];this.dataset={};this.listeners={};this.bySelector={};}
  append(...nodes){this.children.push(...nodes);}
  add(node){this.append(node);}
  replaceChildren(...nodes){this.children=nodes;}
  setAttribute(key,value){this[key]=value;}
  addEventListener(type,listener){this.listeners[type]=listener;}
  removeEventListener(type){delete this.listeners[type];}
  set innerHTML(html){
   this.inputs=Array.from(html.matchAll(/data-asset="([^"]+)"/g),match=>({dataset:{asset:match[1]}}));
  }
  querySelectorAll(selector){
   if(selector==='[data-asset]'&&this.inputs)return this.inputs;
   return this.children.flatMap(child=>child.querySelectorAll?.(selector)??[]);
  }
  querySelector(selector){return (this.bySelector[selector]??=new Node());}
 }
 globalThis.document={createElement:()=>new Node()};
 globalThis.Option=class {};
 globalThis.fetch=async()=>new Response(bytes);
 const root=new Node(),state=emptyBreakSequence();
 const remote=mountBreakSequence(root,state,()=>assert.fail('Preview selection changed the BREAK sequence'));
 const preview=()=>root.children[1];
 const pressed=()=>['all','none'].map(action=>preview().querySelector(`[data-action="${action}"]`)['aria-pressed']);
 const click=action=>preview().listeners.click({target:{closest:()=>({dataset:{action}})}});
 await remote.show();
 assert.equal(preview().inputs.filter(input=>input.checked).length,5);
 assert.deepEqual(pressed(),['true','false']);
 click('none');
 assert.equal(preview().inputs.filter(input=>input.checked).length,0);
 assert.deepEqual(pressed(),['false','true']);
 const sample=preview().inputs[2];
 sample.checked=true;
 preview().listeners.change({target:sample});
 assert.deepEqual(pressed(),['false','false']);
 remote.stop();
 await remote.show();
 assert.equal(preview().inputs.filter(input=>input.checked).length,1);
 assert.deepEqual(pressed(),['false','false']);
 click('all');
 assert.equal(preview().inputs.filter(input=>input.checked).length,5);
 assert.deepEqual(pressed(),['true','false']);
 remote.stop();
});
