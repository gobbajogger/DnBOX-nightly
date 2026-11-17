import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mountBreakPanel} from '../web/product-site/components/break-panel/panel.mjs';
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
