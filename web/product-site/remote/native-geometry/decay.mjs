// SPDX-License-Identifier: GPL-3.0-only
// Unbound b341 DG_DECAY/DG_NTAIL geometry, requiring actual numeric SI return.
import{nativeExp2,nativeSqrt}from'./fastmath.mjs';
const f=Math.fround,m=(a,b)=>f(f(a)*f(b)),a=(x,y)=>f(f(x)+f(y)),s=(x,y)=>f(f(x)-f(y)),d=(x,y)=>f(f(x)/f(y));
export function nativeDecay({target,role,raw,maximum,unitId,siValue,x=0,y=0,sx=1,sy=1}){
 if(![0,1].includes(target)||![1,2].includes(role)||!Number.isInteger(unitId)||![raw,maximum,siValue,x,y,sx,sy].every(v=>Number.isFinite(v)&&Number.isFinite(f(v)))||raw<0||raw>maximum||f(maximum)<=0||f(sx)<=0||f(sy)<=0)throw Error('Exact bounded source SI context required');
 const q=d(raw,maximum);let ms=f(siValue);if(unitId===5)ms=m(ms,1000);if(unitId!==4&&unitId!==5)ms=m(q,4000);if(role===2)ms=a(24,m(.7,ms));ms=Math.max(0,Math.min(4000,ms));const reach=a(8,m(23,nativeSqrt(d(ms,4000)))),points=[];
 for(let i=0;i<=16;i++){const t=d(i,16);let px,py;if(target===0&&(unitId===4||unitId===5)){px=a(1,m(30,t));py=m(12,s(1,nativeExp2(d(m(-16.60964047,m(2000,t)),ms>0?ms:1))));}else{px=a(1,m(t,reach));py=m(12,s(1,nativeExp2(m(-t,a(2.2,m(3,s(1,q)))))));if(m(t,reach)>s(reach,.01))py=12;}const p=[a(x,m(px,sx)),a(y,m(py,sy))];if(!p.every(Number.isFinite))throw Error('Float32 layout overflow');points.push(p);}return[points];
}
