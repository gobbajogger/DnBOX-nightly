import {createPicker} from '../break-picker/picker.mjs';
import {createAudition} from '../break-audition/audition.mjs';
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
/** Private host supplies exact contract bytes and authorized preview resolver. No embedded audio or device routes. */
export async function mountBreakPanel(root,options={}){
 const raw=Uint8Array.from(options.contractBytes??[]),picker=await createPicker(raw,options.contractSha256),contract=JSON.parse(new TextDecoder().decode(raw));
 if(options.initialSelectedIds!==undefined)picker.select(options.initialSelectedIds);
 const assets=contract.assets.map(a=>({id:a.id,name:a.name,duration:(a.frames/a.sample_rate).toFixed(2)}));
 root.innerHTML='<section class="break-picker" aria-labelledby="break-choice-title"><h2 id="break-choice-title">Choose your starting breaks.</h2><p>Listen, choose any combination, or start with all five.</p><div class="break-actions"><button type="button" data-action="all">All five</button><button type="button" data-action="none">None</button><button type="button" data-action="stop">Stop preview</button></div><ul class="break-rows">'+assets.map(a=>`<li><label><input type="checkbox" data-asset="${escape(a.id)}" checked><span>${escape(a.name)}</span></label><span class="duration">${a.duration}s</span><button type="button" data-action="listen" data-id="${escape(a.id)}" aria-label="Listen to ${escape(a.name)}">Listen</button></li>`).join('')+'</ul><p data-selection-status role="status" aria-live="polite"></p><p data-capacity></p><div data-audio></div><p data-audio-status role="status" aria-live="polite"></p></section>';
 const inputs=[...root.querySelectorAll('[data-asset]')],status=root.querySelector('[data-selection-status]'),capacity=root.querySelector('[data-capacity]'),audioStatus=root.querySelector('[data-audio-status]');
 const assetName=id=>assets.find(a=>a.id===id)?.name??'';
 const audition=createAudition(picker,{...options,createAudio:options.createAudio??(()=>{const audio=root.ownerDocument.createElement('audio');audio.controls=true;root.querySelector('[data-audio]').replaceChildren(audio);return audio;}),onState:state=>{audioStatus.textContent=state.status==='loading'?'Loading '+assetName(state.id)+'…':state.status==='playing'?'Playing '+assetName(state.id):state.status==='error'?state.error:'';options.onAudioState?.(state);}});
 let disposed=false;
 function sync(notify=true){
  const selected=new Set(picker.selectedIds());for(const input of inputs)input.checked=selected.has(input.dataset.asset);
  status.textContent=selected.size===0?'No starting breaks selected.':`${selected.size} of 5 selected.`;
  const check=picker.assessCapacity(options.availableBytes);
  capacity.textContent=check.status==='insufficient-capacity'?`Insufficient capacity for this selection (${check.encodedPayloadBytes.toLocaleString()} sample bytes before package overhead).`:'';
  if(notify)options.onSelection?.(picker.summary());
 }
 const listen=id=>audition.play(id);
 const onClick=event=>{
  const button=event.target.closest?.('[data-action]');if(!button||(root.contains&&!root.contains(button)))return;
  const action=button.dataset.action;
  if(action==='all'){picker.all();sync();}
  else if(action==='none'){picker.none();audition.stop();sync();}
  else if(action==='stop')audition.stop();
  else if(action==='listen')listen(button.dataset.id).catch(()=>{});
 };
 const onChange=event=>{if(!inputs.includes(event.target))return;picker.select(inputs.filter(i=>i.checked).map(i=>i.dataset.asset));sync();};
 root.addEventListener('click',onClick);root.addEventListener('change',onChange);sync();
 return Object.freeze({listen,selectedIds:()=>picker.selectedIds(),summary:()=>picker.summary(),capacity:()=>picker.assessCapacity(options.availableBytes),destroy(){if(disposed)return;disposed=true;root.removeEventListener('click',onClick);root.removeEventListener('change',onChange);audition.destroy();}});
}
