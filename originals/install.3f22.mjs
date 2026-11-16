import {mountPreparedChoices} from './components/installer-binding/binding.mjs';
import {SAMPLE_CONTRACT_SHA256} from './sample-pin.mjs';
const $=id=>document.getElementById(id);const SELECTION_KEY='dnbox-starting-break-selection';let panel=null,generation=0,suspended=false,disposed=false,savedSelection=undefined;
try{const stored=JSON.parse(localStorage.getItem(SELECTION_KEY)||'');if(Array.isArray(stored)) savedSelection=stored;}catch{}
for(const b of document.querySelectorAll('[data-model]'))b.onclick=()=>{document.querySelectorAll('[data-model]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('model-status').textContent=`SMK-37 ${b.dataset.model} selected. Use its matching package in the installer.`;};
// Register cancellation BEFORE either metadata/network or cryptographic admission can await.
window.addEventListener('pagehide',event=>{generation++;suspended=true;disposed=!event.persisted;if(panel)savedSelection=panel.selectedIds();panel?.destroy();panel=null;});
window.addEventListener('pageshow',event=>{if(event.persisted&&!disposed){suspended=false;initialize();}});
async function initialize(){
 const own=++generation;if(suspended||disposed)return;
 try{
  const response=await fetch(new URL('./sample-contract.json',import.meta.url),{cache:'no-store'});if(own!==generation||suspended||disposed)return;if(!response.ok)throw Error('metadata unavailable');
  const contractBytes=new Uint8Array(await response.arrayBuffer());if(own!==generation||suspended||disposed)return;
  // Build off-document so a slow obsolete digest/mount can never replace a newer panel.
  const staging=document.createElement('div');
  const candidate=await mountPreparedChoices(staging,{contractBytes,contractSha256:SAMPLE_CONTRACT_SHA256,initialSelectedIds:savedSelection,
   resolvePrivateUrl:id=>'/private-audio/'+encodeURIComponent(id),
   fetchBytes:async url=>{const r=await fetch(url,{cache:'no-store',mode:'same-origin',headers:{'X-Dnbox-Private':'confirmed-five-preview'}});if(!r.ok)throw Error('preview unavailable');return new Uint8Array(await r.arrayBuffer());},
   onSelection:s=>{if(own!==generation||suspended||disposed)return;savedSelection=[...s.selectedIds];try{localStorage.setItem(SELECTION_KEY,JSON.stringify(savedSelection));}catch{}if($('samples-status')) $('samples-status').textContent=s.count?String(s.count):'0';}});
  if(own!==generation||suspended||disposed){candidate.destroy();return;}
  panel?.destroy();panel=candidate;$('sample-picker').replaceChildren(staging);
 }catch{if(own===generation&&!suspended&&!disposed)$('samples-status').textContent='Starting breaks could not be loaded. Reload this preview to try again.';}
}
await initialize();
