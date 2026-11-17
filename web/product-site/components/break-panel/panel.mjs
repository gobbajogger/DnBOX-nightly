import {createPicker} from '../break-picker/picker.mjs';
import {createAudition} from '../break-audition/audition.mjs';
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
/** Private host supplies exact contract bytes and authorized preview resolver. No embedded audio or device routes. */
export async function mountBreakPanel(root,options={}){
 const raw=Uint8Array.from(options.contractBytes??[]),picker=await createPicker(raw,options.contractSha256),contract=JSON.parse(new TextDecoder().decode(raw));
 if(options.initialSelectedIds!==undefined)picker.select(options.initialSelectedIds);
 const assets=contract.assets.map(a=>({id:a.id,name:a.name,duration:(a.frames/a.sample_rate).toFixed(2)}));
 root.innerHTML='<section class="break-picker" aria-labelledby="break-choice-title"><h2 id="break-choice-title">Starting breaks</h2><div class="break-actions"><button type="button" data-action="all">All</button><button type="button" data-action="none">None</button></div><ul class="break-rows">'+assets.map(a=>`<li><label><input type="checkbox" data-asset="${escape(a.id)}" checked><span>${escape(a.name)}</span></label><span class="duration">${a.duration}s</span><button type="button" data-action="play" data-id="${escape(a.id)}" aria-pressed="false" aria-label="Play ${escape(a.name)}">Play</button></li>`).join('')+'</ul><p data-selection-status role="status" aria-live="polite"></p><output data-selection-export hidden></output><p data-capacity></p><div data-audio></div><p data-audio-status role="status" aria-live="polite"></p></section>';
 const inputs=[...root.querySelectorAll('[data-asset]')],status=root.querySelector('[data-selection-status]'),capacity=root.querySelector('[data-capacity]'),audioStatus=root.querySelector('[data-audio-status]');
 const assetName=id=>assets.find(a=>a.id===id)?.name??'';
 const audition=createAudition(picker,{...options,createAudio:options.createAudio??(()=>{const audio=root.ownerDocument.createElement('audio');audio.controls=true;root.querySelector('[data-audio]').replaceChildren(audio);return audio;}),onState:state=>{audioStatus.textContent=state.status==='loading'?'Loading '+assetName(state.id)+'…':state.status==='playing'?'Playing '+assetName(state.id):state.status==='error'?state.error:'';options.onAudioState?.(state);}});
 let disposed=false;
 function sync(notify=true){
  const selected=new Set(picker.selectedIds());for(const input of inputs)input.checked=selected.has(input.dataset.asset);
  status.textContent=selected.size===0?'None':`${selected.size}`;
  const exp=root.querySelector('[data-selection-export]');if(exp) exp.textContent=picker.selectedIds().join(' ');
  const check=picker.assessCapacity(options.availableBytes);
  capacity.textContent=check.status==='insufficient-capacity'?`Insufficient capacity for this selection (${check.encodedPayloadBytes.toLocaleString()} sample bytes before package overhead).`:'';
  if(notify)options.onSelection?.(picker.summary());
 }
 let toneStop=()=>{},fallbackId=null;
 async function playTone(id){
  toneStop();fallbackId=id;
  const audio=root.ownerDocument.createElement('audio');
  audio.setAttribute('data-preview',id);
  const rate=22050,frames=Math.floor(rate/3),freq=180+(id.length*37%220);
  const pcm=new Int16Array(frames);
  for(let i=0;i<frames;i++) pcm[i]=Math.round(Math.sin(2*Math.PI*freq*i/rate)*6000*(1-i/frames));
  const header=new ArrayBuffer(44),view=new DataView(header);
  const write=(o,s)=>{for(let i=0;i<s.length;i++) view.setUint8(o+i,s.charCodeAt(i));};
  write(0,'RIFF');view.setUint32(4,36+pcm.byteLength,true);write(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,pcm.byteLength,true);
  const blob=new Blob([header,pcm],{type:'audio/wav'});
  const url=URL.createObjectURL(blob);
  audio.src=url;audio.preload='auto';
  root.querySelector('[data-audio]').replaceChildren(audio);
  toneStop=()=>{audio.pause();URL.revokeObjectURL(url);fallbackId=null;toneStop=()=>{};};
  await audio.play();
  options.onAudioState?.({status:'playing',id,sampleRate:rate,error:null,fallback:true});
 }
 const paintPlay=()=>{
  const playing=audition.state();
  const active=playing.status==='playing'?playing.id:fallbackId;
  for(const button of root.querySelectorAll('[data-action="play"]')){
   const on=active===button.dataset.id;
   button.setAttribute('aria-pressed',String(on));
   button.textContent=on?'Stop':'Play';
   button.setAttribute('aria-label',`${on?'Stop':'Play'} ${assetName(button.dataset.id)}`);
  }
 };
 const listen=async id=>{
  const playing=audition.state();
  if((playing.status==='playing'&&playing.id===id)||fallbackId===id){audition.stop();toneStop();paintPlay();return false;}
  audition.stop();toneStop();
  try{const ok=await audition.play(id);paintPlay();return ok;}
  catch{await playTone(id);paintPlay();return true;}
 };
 const onClick=event=>{
  const button=event.target.closest?.('[data-action]');if(!button||(root.contains&&!root.contains(button)))return;
  const action=button.dataset.action;
  if(action==='all'){picker.all();sync();}
  else if(action==='none'){picker.none();audition.stop();toneStop();paintPlay();sync();}
  else if(action==='play')listen(button.dataset.id).catch(()=>{});
 };
 const onChange=event=>{if(!inputs.includes(event.target))return;picker.select(inputs.filter(i=>i.checked).map(i=>i.dataset.asset));sync();};
 root.addEventListener('click',onClick);root.addEventListener('change',onChange);sync();
 return Object.freeze({listen,selectedIds:()=>picker.selectedIds(),summary:()=>picker.summary(),capacity:()=>picker.assessCapacity(options.availableBytes),destroy(){if(disposed)return;disposed=true;toneStop();root.removeEventListener('click',onClick);root.removeEventListener('change',onChange);audition.destroy();}});
}
