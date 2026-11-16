// SPDX-License-Identifier: GPL-3.0-only
// Isolated supplementary fixture lifecycle, not production app registration.
import {NativeEaseCache} from '../native-cache-work/cache.mjs';
import {activeBdBank} from './bank.mjs';
const slots=[0,1,2,4],keys=[...slots,5].map(s=>`1:0:0:${s}`);
const capture=s=>Object.freeze(Object.fromEntries(keys.map(k=>[k,s?.[k]])));
export class BankPresentationLifecycle{
 constructor({requestFrame,cancelFrame,render}){if(![requestFrame,cancelFrame,render].every(f=>typeof f==='function'))throw Error('Explicit lifecycle adapters required');this.request=requestFrame;this.cancel=cancelFrame;this.render=render;this.generation=0;this.active=false;this.pending=null;this.cache=new NativeEaseCache();this.frame=0;}
 update(input){const state=capture(input);activeBdBank(state);this.state=state;}
 start(input){const state=capture(input);activeBdBank(state);this.stop();this.state=state;this.cache=new NativeEaseCache();this.frame=0;this.active=true;this.queue(this.generation);}
 stop(){this.active=false;this.generation++;if(this.pending!==null)this.cancel(this.pending);this.pending=null;}
 queue(g){this.pending=this.request(now=>{
  // Ownership guard precedes every mutable clock/cache/pending/render operation.
  if(!this.active||g!==this.generation)return;
  this.pending=null;
  if(!Number.isFinite(now)||now<0||now>Number.MAX_SAFE_INTEGER){this.stop();return;}
  try{
   this.cache.tick(Math.trunc(now)%4294967296);
   const presentation=Object.fromEntries(slots.map(slot=>[`1:0:0:${slot}`,this.cache.value({kind:1,a:0,b:0,c:slot},this.state[`1:0:0:${slot}`],this.frame)]));
   this.frame=(this.frame+1)>>>0;this.render(activeBdBank(this.state,presentation));
  }catch(error){this.stop();throw error;}
  if(this.active&&g===this.generation)this.queue(g);
 });}
}
