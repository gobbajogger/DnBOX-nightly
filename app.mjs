import {createReplay} from './replay.mjs';
const $=id=>document.getElementById(id),data=JSON.parse($('replay-data').textContent),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function show(frame){
 const template=$('frame-'+frame.id);if(!template)throw Error('This control example could not be loaded.');
 $('replay-display').replaceChildren(template.content.cloneNode(true));
 const held=BigInt(frame.held);document.querySelectorAll('[data-key]').forEach(e=>e.classList.toggle('active',Boolean(held&(1n<<BigInt(e.dataset.key)))));
 document.querySelectorAll('[data-pad]').forEach(e=>e.classList.toggle('active',Boolean(frame.padHeld&(1<<Number(e.dataset.pad)))));
 document.querySelectorAll('[data-knob]').forEach(e=>e.classList.toggle('active',frame.label.includes('Turn K'+e.dataset.knob)));
 document.querySelectorAll('.demo-tabs [data-demo]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.demo===frame.name)));
 $('demo-status').textContent=frame.label+'.';
}
const replay=createReplay(data,{show,reducedMotion:reduced});replay.select('voice');if(reduced)$('demo-play').textContent='Next control';
$('demo-play').onclick=()=>replay.play();$('demo-stop').onclick=()=>replay.reset();
for(const b of document.querySelectorAll('[data-demo]'))b.onclick=()=>{replay.select(b.dataset.demo);if(b.classList.contains('text-action'))$('hands').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});};
const onVisibility=()=>{if(document.hidden)replay.reset()};document.addEventListener('visibilitychange',onVisibility);
window.addEventListener('pagehide',event=>{if(event.persisted){replay.reset();return;}replay.destroy();document.removeEventListener('visibilitychange',onVisibility);$('demo-play').onclick=$('demo-stop').onclick=null;for(const b of document.querySelectorAll('[data-demo]'))b.onclick=null;});
