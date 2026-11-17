// SPDX-License-Identifier: GPL-3.0-only
// Unbound source cache model; bank tags are fixture identity, not admitted engines.
import{nativeEaseStep}from'../native-ease-work/ease.mjs';
const uint=x=>Number.isInteger(x)&&x>=0&&x<=4294967295,f=Math.fround;
export class NativeEaseCache{
 constructor(){this.slots=Array(16).fill(null);this.last=0;this.clockOn=false;}
 reset(now){if(!uint(now))throw Error('Unsigned source clock required');this.slots.fill(null);this.last=now;this.clockOn=true;}
 tick(now){if(!uint(now))throw Error('Unsigned source clock required');const elapsed=(now-this.last)>>>0;this.last=now;if(!this.clockOn){this.clockOn=true;return;}if(!elapsed)return;for(const e of this.slots)if(e){const step=nativeEaseStep(e,elapsed);e.y=step.y;e.vel=step.vel;}}
 value(r,target,frame,bank=0){if(!r||![r.kind,r.a,r.b,r.c].every(x=>Number.isInteger(x)&&x>=0&&x<=255)||!Number.isInteger(target)||target<0||target>255||!uint(frame)||!Number.isInteger(bank)||bank<0||bank>254)throw Error('Bounded native cache identity required');const family=r.kind===1&&r.a===2?bank+1:0;let pick=0;
 for(let i=0;i<16;i++){const e=this.slots[i];if(e&&e.r.kind===r.kind&&e.r.a===r.a&&e.r.b===r.b&&e.r.c===r.c&&e.family===family){e.target=target;e.seen=frame;return e.y;}if(!e){if(this.slots[pick])pick=i;}else if(this.slots[pick]&&((e.seen-this.slots[pick].seen)|0)<0)pick=i;}
 this.slots[pick]={y:f(target),vel:0,target,r:{...r},seen:frame,family};return f(target);}
 signature(){let h=0;for(const e of this.slots)if(e)h=(Math.imul(h,31)+(Math.trunc(f(f(e.y*16)+.5))>>>0))>>>0;return h;}
}
