// SPDX-License-Identifier: GPL-3.0-only
// DnBOX adapter for the actual MIT FunkyBeats DOM builder. The upstream methods,
// not a screenshot recreation, construct the tree. Typed captured DnBOX events
// remain authoritative; this viewport is local/offline, never a native bar schema.
import{createSequencerState,createFunkyBeatsUI}from'./vendor/funkybeats-core.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
class Element{
 constructor(tag){this.tag=tag;this.attrs={};this.style={};this.dataset={};this.children=[];this.textContent='';}
 set className(v){this.attrs.class=v;}get className(){return this.attrs.class??'';}
 get classList(){return{add:(...names)=>{this.className=[...new Set([...this.className.split(/\s+/),...names])].filter(Boolean).join(' ');},remove:(...names)=>{this.className=this.className.split(/\s+/).filter(n=>!names.includes(n)).join(' ');}};}
 addEventListener(){} // Typed app-level delegation owns the serialized tree.
 get firstChild(){return this.children[0]??null;}
 appendChild(n){this.children.push(n);return n;}
 removeChild(n){this.children.splice(this.children.indexOf(n),1);}
 setAttribute(k,v){this.attrs[k]=String(v);}
}
const css=k=>k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
function serialize(n){if(typeof n==='string')return esc(n);const attrs={...n.attrs,...Object.fromEntries(Object.entries(n.dataset).map(([k,v])=>['data-'+css(k),v]))};const style=Object.entries(n.style).map(([k,v])=>css(k)+':'+v).join(';');if(style)attrs.style=style;return'<'+n.tag+Object.entries(attrs).map(([k,v])=>' '+k+'="'+esc(v)+'"').join('')+'>'+esc(n.textContent)+n.children.map(serialize).join('')+'</'+n.tag+'>';}
export const DRUM_VOICES=Object.freeze({
 '909':Object.freeze([['BD',36],['SD',38],['LT',41],['MT',45],['HT',50],['RS',37],['CP',39],['CH',42],['OH',46],['CR',49],['RD',51]]),
 '808':Object.freeze([['BD',36],['SD',38],['LT',41],['MT',45],['HT',50],['RS',37],['CP',39],['CB',56],['CY',49],['OH',46],['CH',42]])
});
export function renderFunkyBeatsDrums({kit='909',notes,endSample,steps=16}){
 if(!DRUM_VOICES[kit]||!Array.isArray(notes)||!Number.isInteger(endSample)||endSample<=0||!Number.isInteger(steps)||steps<1||steps>64)throw Error('Invalid local drum viewport');
 const track=kit==='808'?'drum808':'drum909',color=kit==='808'?'#ff4841':'#ff9529',voices=DRUM_VOICES[kit],channels=voices.map(([name])=>({name,type:'drum',color}));
 const state=createSequencerState({channels,patternCount:1,defaultSteps:steps});
 const grid=new Element('div');grid.className='sequencer-grid';
 const document={createElement:tag=>new Element(tag),createTextNode:s=>String(s),querySelector:s=>s==='.sequencer-grid'?grid:null};
 const ui=createFunkyBeatsUI({document,channels,state});ui.buildSequencerGrid();
 for(let ch=0;ch<voices.length;ch++){
  const row=grid.children[ch],info=row.children[0];info.children=info.children.filter(n=>!n.className?.includes('seq-channel-btns'));info.setAttribute('aria-label',voices[ch][0]);
  for(let s=0;s<steps;s++){
   const start=Math.round(s*endSample/steps),event=notes.find(n=>n.track===track&&n.note===voices[ch][1]&&Math.abs(n.start-start)<2),step=ui.stepElements[ch][s];
   const modelStep=state.getStep(ch,s);if(event)Object.assign(modelStep,{on:true,velocity:event.velocity/127,note:event.note});
   Object.assign(step.dataset,{drumNote:voices[ch][1],drumStart:start,drumTrack:track});
   step.setAttribute('aria-label',`${voices[ch][0]} step ${s+1} ${event?'velocity '+event.velocity:'empty'}, toggle local hit`);
   step.setAttribute('aria-pressed',String(!!event));
   if(event){step.className+=' hit';step.dataset.hit=event.id;step.children[0].style.opacity=String(.3+modelStep.velocity*.7);step.children[1].style.height=(modelStep.velocity*100)+'%';step.textContent=String(event.velocity);}
  }
 }
 const header='<div class="seq-row seq-numbers"><span>VOICE</span>'+Array.from({length:Math.ceil(steps/4)},(_,g)=>'<div class="seq-step-group">'+Array.from({length:Math.min(4,steps-g*4)},(_,i)=>'<span>'+String(g*4+i+1)+'</span>').join('')+'</div>').join('')+'</div>';
 return'<div class="drum-scroll funkybeats-sequencer" data-upstream="809e1e78" style="--track:'+color+'">'+header+serialize(grid)+'</div>';
}

