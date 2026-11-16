// SPDX-License-Identifier: GPL-3.0-only
// Current-native idle-only remaining drum glyph families; not an app binding.
import{sourceSin,sourceCos}from'./math.mjs';import{nativeExp2,nativeSqrt}from'../native-geometry-work/fastmath.mjs';
const f=Math.fround,a=(x,y)=>f(f(x)+f(y)),s=(x,y)=>f(f(x)-f(y)),m=(x,y)=>f(f(x)*f(y)),d=(x,y)=>f(f(x)/f(y));
export function idleExtra(family,raw,maximum,{x=0,y=0,sx=1,sy=1}={}){if(!['accent','snappy','shells','sound','tone'].includes(family)||![raw,maximum,x,y,sx,sy].every(v=>Number.isFinite(v)&&Number.isFinite(f(v)))||raw<0||raw>maximum||f(maximum)<=0||f(sx)<=0||f(sy)<=0||(family==='shells'&&maximum!==127))throw Error('Bounded native idle context required');const q=d(raw,maximum),paths=[],point=(px,py)=>{const p=[a(x,m(px,sx)),a(y,m(py,sy))];if(!p.every(Number.isFinite))throw Error('Float32 layout overflow');return p;};
 if(family==='accent'){const h=a(4,m(8,q));for(let i=0;i<4;i++){const xx=a(2,m(i,8)),hh=m(h,a(.25,m(.25,i)));paths.push([point(xx,12),point(xx,s(12,hh))]);}return paths;}
 if(family==='shells'){const angle=m(raw<=64?d(raw,128):a(.5,m(s(raw,64),d(.5,63))),1.5708),g1=m(m(sourceCos(angle),12),1),g2=m(m(sourceSin(angle),12),1);return[[point(7,12),point(11,s(12,g1))],[point(11,s(12,g1)),point(15,12)],[point(17,12),point(21,s(12,g2))],[point(21,s(12,g2)),point(25,12)]];}
 const out=[];if(family==='snappy'){for(let i=0;i<=16;i++){const t=d(i,16),env=nativeExp2(m(-t,3.5)),h=m(m(m(q,1),env),12);out.push(point(a(1,m(t,30)),s(12,h)));}}
 else if(family==='sound'){for(let i=0;i<=12;i++){const t=d(i,12);out.push(point(a(1,m(t,30)),s(12,m(m(12,q),sourceSin(m(t,3.1416))))));}}
 else{const hz=m(300,nativeExp2(m(q,4.32192809))),c=s(1,nativeExp2(m(d(m(-6.28318531,hz),44100),1.44269504))),aa=s(1,c);for(let i=0;i<=24;i++){const t=d(i,24),freq=m(100,nativeExp2(m(t,7.78463485))),den=s(a(1,m(aa,aa)),m(m(2,aa),sourceCos(d(m(6.28318531,freq),44100))));let mag=den>0?d(c,nativeSqrt(den)):1;mag=Math.max(0,Math.min(1,mag));out.push(point(m(31,t),a(1,m(11,s(1,mag)))));}}
 return[out];}
