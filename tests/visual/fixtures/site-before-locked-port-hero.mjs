// SPDX-License-Identifier: GPL-3.0-only
// The same renderer as Remote. Parameter edits, not ornamental animation.
import {GlyphAnimator,drawGlyph} from './remote/glyph-live.mjs';
export const heroPercent=raw=>`${Math.round(Math.max(0,Math.min(127,Number(raw)||0))*100/127)}%`;
export const heroControls=Object.freeze([
 {label:'WAVE',raw:0},{label:'GLIDE',raw:18},{label:'CUTOFF',raw:32},
 {label:'PEAK',raw:95}
]);
export function heroState(label,value){
 // Isolate the displayed function: cutoff uses a neutral resonance.
 if(label==='CUTOFF')return {cutoff:value,res:0};
 if(label==='PEAK')return {cutoff:32/127,res:value};
 return {};
}
// Original Juno oscillator observation027-JUNO-b0-p0-list: WIDTH raw64, readout50%.
// This is a local source specimen, not a native device state or connected control.
export const sourcePreviewControls=Object.freeze([{label:'WIDTH',raw:64,engine:'juno'}]);
function mountPreview(host,controls,defaultEngine='chicago'){
 if(!host)return;
 const grid=document.createElement('div');grid.className='hero-live';
 const painters=[];
 for(const {label,raw,engine=defaultEngine}of controls){
  const card=document.createElement('label');card.className='hero-parameter';
  const title=document.createElement('span');title.className='hero-parameter-label';title.textContent=label;
  const glyph=document.createElement('span');glyph.className='hero-parameter-glyph';Object.assign(glyph.dataset,{glyphFn:label,glyphEngine:engine,glyphValue:String(raw/127)});
  const output=document.createElement('output');output.textContent=heroPercent(raw);
  const input=document.createElement('input');input.type='range';input.min='0';input.max='127';input.step='1';input.value=String(raw);input.setAttribute('aria-label',label);input.setAttribute('aria-valuetext',heroPercent(raw));
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');glyph.append(canvas);
  const state=value=>engine==='chicago'?heroState(label,value):{};
  let animator;
  input.addEventListener('input',()=>{const value=Number(input.value);output.textContent=heroPercent(value);input.setAttribute('aria-valuetext',output.textContent);glyph.dataset.glyphValue=String(value/127);animator.set(value/127);});
  card.append(title,glyph,output,input);grid.append(card);
  painters.push(()=>{animator=new GlyphAnimator({value:raw/127,draw:value=>drawGlyph(canvas,label,value,engine,state(value))});glyph.glyphAnimator=animator;});
 }
 host.append(grid);for(const paint of painters)paint();host.classList.add('has-live-glyphs');
 const repaint=()=>{for(const glyph of grid.querySelectorAll('[data-glyph-fn]'))drawGlyph(glyph.querySelector('canvas'),glyph.dataset.glyphFn,Number(glyph.dataset.glyphValue),glyph.dataset.glyphEngine,glyph.dataset.glyphEngine==='chicago'?heroState(glyph.dataset.glyphFn,Number(glyph.dataset.glyphValue)):{});};
 new ResizeObserver(repaint).observe(grid);
}
if(typeof document!=='undefined'){
 mountPreview(document.querySelector('.hero-ui'),heroControls);
 mountPreview(document.querySelector('.source-preview-live'),sourcePreviewControls,'juno');
}
