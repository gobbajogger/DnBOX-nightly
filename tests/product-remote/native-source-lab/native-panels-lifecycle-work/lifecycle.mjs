// SPDX-License-Identifier: GPL-3.0-only
// Isolated supplementary fixture lifecycle, not production app registration.
import {NativeEaseCache} from '../native-cache-work/cache.mjs';
import {drumPanels,factoryState} from '../native-drum-inventory-work/panels.mjs';
import {drumBankLayout} from '../native-drum-inventory-work/layout.mjs';
const keys=Object.keys(factoryState);
const capture=s=>Object.freeze(Object.fromEntries(keys.map(k=>[k,s?.[k]])));
export class PanelsPresentationLifecycle{
 constructor({requestFrame,cancelFrame,render}){if(![requestFrame,cancelFrame,render].every(f=>typeof f==='function'))throw Error('Explicit lifecycle adapters required');this.request=requestFrame;this.cancel=cancelFrame;this.render=render;this.generation=0;this.active=false;this.pending=null;this.cache=new NativeEaseCache();this.frame=0;}
 update(input){const state=capture(input);drumPanels(...this.identity,state);this.state=state;}
 start(kit,voice,page,input){const identity=Object.freeze([kit,voice,page]),state=capture(input);drumPanels(...identity,state);const controls=drumBankLayout(...identity).rows.flatMap(r=>r.controls);this.stop();this.identity=identity;this.controls=controls;this.state=state;this.cache=new NativeEaseCache();this.frame=0;this.active=true;this.queue(this.generation);}
 stop(){this.active=false;this.generation++;if(this.pending!==null)this.cancel(this.pending);this.pending=null;}
 queue(g){this.pending=this.request(now=>{
  // Ownership guard precedes every mutable clock/cache/pending/render operation.
  if(!this.active||g!==this.generation)return;
  this.pending=null;
  if(!Number.isFinite(now)||now<0||now>Number.MAX_SAFE_INTEGER){this.stop();return;}
  try{
   this.cache.tick(Math.trunc(now)%4294967296);
   const presentation=Object.fromEntries(this.controls.map(c=>{const[kind,a,b,slot]=c.ref.split(':').map(Number);return[c.ref,this.cache.value({kind,a,b,c:slot},this.state[c.ref],this.frame)];}));
   this.frame=(this.frame+1)>>>0;this.render(drumPanels(...this.identity,this.state,presentation));
  }catch(error){this.stop();throw error;}
  if(this.active&&g===this.generation)this.queue(g);
 });}
}
