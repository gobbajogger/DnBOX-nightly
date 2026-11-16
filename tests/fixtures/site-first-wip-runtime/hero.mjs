// SPDX-License-Identifier: GPL-3.0-only
// Shared source preview. Local parameter edits, never native/device commands.
import {GlyphAnimator,drawGlyph} from './remote/glyph-live.mjs';
import {waveDisplay} from './remote/wave-display.mjs';
export const heroPercent=raw=>`${Math.round(Math.max(0,Math.min(127,Number(raw)||0))*100/127)}%`;
export const stepPreviewValue=(raw,delta)=>Math.max(0,Math.min(127,Math.round(Number(raw)||0)+Math.round(Number(delta)||0)));
export function heroReadout(control,raw){
 if(control.label==='WAVE')return waveDisplay(String(control.engine||'chicago').toUpperCase(),raw,127)??'—';
 return heroPercent(raw);
}
export const heroControls=Object.freeze([
 {label:'WAVE',raw:0,section:'OSCILLATOR'},{label:'GLIDE',raw:18,section:'OSCILLATOR'},
 {label:'CUTOFF',raw:32,section:'FILTER 1'},{label:'PEAK',raw:95,section:'FILTER 1'}
]);
export function heroState(label,value){
 if(label==='CUTOFF')return {cutoff:value,res:0};
 if(label==='PEAK')return {cutoff:32/127,res:value};
 return {};
}
// Observation027-JUNO-b0-p0-list: raw64 /50%. Archived, never SuperJ6.
export const sourcePreviewControls=Object.freeze([{label:'WIDTH',raw:64,engine:'juno'}]);
export const previewFrameValue=glyph=>glyph.glyphAnimator?.value??Number(glyph.dataset.glyphValue);
let sequence=0;
function mountPreview(host,controls,defaultEngine='chicago'){
 if(!host)return;
 const grid=document.createElement('div');grid.className='hero-live';const painters=[],groups=new Map();
 for(const control of controls){
  const {label,raw,engine=defaultEngine,section=''}=control;
  if(!groups.has(section)){
   const group=document.createElement('section');group.className='hero-parameter-group';
   if(section){const heading=document.createElement('h3');heading.className='hero-group-label';heading.textContent=section;group.append(heading);}
   const row=document.createElement('div');row.className='hero-control-row';group.append(row);grid.append(group);groups.set(section,row);
  }
  const id='source-parameter-'+(++sequence),card=document.createElement('div');card.className='hero-parameter';card.setAttribute('role','group');card.setAttribute('aria-labelledby',id+'-label');
  const title=document.createElement('span');title.id=id+'-label';title.className='hero-parameter-label';title.textContent=label;
  const glyph=document.createElement('span');glyph.className='hero-parameter-glyph';Object.assign(glyph.dataset,{glyphFn:label,glyphEngine:engine,glyphValue:String(raw/127)});
  const output=document.createElement('output');output.id=id+'-value';output.setAttribute('for',id);
  const input=document.createElement('input');input.id=id;input.type='range';input.min='0';input.max='127';input.step='1';input.value=String(raw);input.setAttribute('aria-labelledby',title.id);
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');glyph.append(canvas,input);
  const actions=document.createElement('div');actions.className='hero-parameter-buttons';
  const minus=document.createElement('button'),plus=document.createElement('button');
  for(const [button,delta,name,text]of [[minus,-1,'Decrease ','−'],[plus,1,'Increase ','+']]){
   button.type='button';button.dataset.step=String(delta);button.setAttribute('aria-label',name+label);button.textContent=text;
   button.addEventListener('click',()=>{input.value=String(stepPreviewValue(input.value,delta));input.dispatchEvent(new Event('input',{bubbles:true}));});actions.append(button);
  }
  const state=value=>engine==='chicago'?heroState(label,value):{};let animator;
  const paintValue=()=>{const value=Number(input.value);output.textContent=heroReadout({label,engine},value);input.setAttribute('aria-valuetext',output.textContent);glyph.dataset.glyphValue=String(value/127);minus.disabled=value<=0;plus.disabled=value>=127;return value;};
  input.addEventListener('input',()=>animator.set(paintValue()/127));paintValue();
  card.append(title,glyph,output,actions);groups.get(section).append(card);
  painters.push(()=>{animator=new GlyphAnimator({value:raw/127,draw:value=>drawGlyph(canvas,label,value,engine,state(value))});glyph.glyphAnimator=animator;});
 }
 host.append(grid);for(const paint of painters)paint();host.classList.add('has-live-glyphs');
 const repaint=()=>{for(const glyph of grid.querySelectorAll('[data-glyph-fn]')){const value=previewFrameValue(glyph);drawGlyph(glyph.querySelector('canvas'),glyph.dataset.glyphFn,value,glyph.dataset.glyphEngine,glyph.dataset.glyphEngine==='chicago'?heroState(glyph.dataset.glyphFn,value):{});}};
 new ResizeObserver(repaint).observe(grid);
}
if(typeof document!=='undefined'){
 mountPreview(document.querySelector('.hero-ui'),heroControls);
 mountPreview(document.querySelector('.source-preview-live'),sourcePreviewControls,'juno');
}
