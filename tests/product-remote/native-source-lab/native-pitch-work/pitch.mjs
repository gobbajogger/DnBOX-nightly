// SPDX-License-Identifier: GPL-3.0-only
// Unbound native b341 BD frequency and dependent glyph geometry.
import{sourceExp,sourceLog2,sourceSin}from'./math.mjs';
const f=Math.fround,a=(x,y)=>f(f(x)+f(y)),s=(x,y)=>f(f(x)-f(y)),m=(x,y)=>f(f(x)*f(y)),d=(x,y)=>f(f(x)/f(y));
export function bdHz(tau,depth,pitch,time){if(![tau,depth,pitch,time].every(v=>Number.isFinite(v)&&Number.isFinite(f(v))))throw Error('Finite source context required');tau=Math.max(6,Math.min(32,f(tau)));depth=Math.max(0,Math.min(1,f(depth)));pitch=f(pitch);if(!(pitch>0))pitch=1;const base=m(49,a(1,m(depth,s(pitch,1)))),df=m(m(4.6,tau),a(1,m(1.2,depth)));time=s(time,16);return a(base,time>0?m(df,sourceExp(d(-time,tau))):df);}
export function dependentGlyph(family,{tau,depthPercent,pitch,x=0,y=0,sx=1,sy=1}){if(!['depth','pitch'].includes(family)||![tau,depthPercent,pitch,x,y,sx,sy].every(v=>Number.isFinite(v)&&Number.isFinite(f(v)))||f(sx)<=0||f(sy)<=0)throw Error('Exact bounded SI/layout context required');const depth=m(.01,depthPercent),out=[],point=(px,py)=>{const p=[a(x,m(px,sx)),a(y,m(py,sy))];if(!p.every(Number.isFinite))throw Error('Float32 layout overflow');return p;};
 if(family==='pitch'){const hz=bdHz(tau,depth,pitch,100);for(let i=0;i<=32;i++){const t=d(i,32);out.push(point(a(1,m(30,t)),s(6,m(5,sourceSin(m(m(m(6.28318531,hz),.04),t))))));}}
 else for(let i=0;i<=24;i++){const time=d(m(i,100),24),hz=bdHz(tau,depth,pitch,time);let v=d(sourceLog2(d(hz,40)),3.32);v=Math.max(0,Math.min(1,v));out.push(point(d(m(31,i),24),m(12,s(1,v))));}
 return[out];}
