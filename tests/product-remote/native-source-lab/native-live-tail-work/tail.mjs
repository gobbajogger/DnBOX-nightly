// SPDX-License-Identifier: GPL-3.0-only
// af56 R22 tail primitives for explicit native activity inputs. Not audio admission.
import{nativeDecay}from'../native-geometry-work/decay.mjs';
import{nativeExp2,nativeSqrt}from'../native-geometry-work/fastmath.mjs';
import{sourceLog2}from'../native-pitch-work/math.mjs';
const f=Math.fround,a=(x,y)=>f(f(x)+f(y)),s=(x,y)=>f(f(x)-f(y)),m=(x,y)=>f(f(x)*f(y)),d=(x,y)=>f(f(x)/f(y));
const blend=(c,w,t)=>{const r=((c>>>11)*(16-t)+(w>>>11)*t)>>>4,g=(((c>>>5)&63)*(16-t)+((w>>>5)&63)*t)>>>4,b=((c&31)*(16-t)+(w&31)*t)>>>4;return(r<<11)|(g<<5)|b;};
const rnd=i=>{let h=Math.imul(i,2654435761)>>>0;h=(h^(h>>>13))>>>0;return h%100;};
export function liveTail(context){
 const{target,role,raw,maximum,unitId,siValue,x=0,y=0,sx=1,sy=1,live,envelope,age,back,ink,lineColor,whiteColor}=context;
 if(typeof live!=='boolean'||!Number.isFinite(envelope)||envelope<0||envelope>1||!Number.isInteger(age)||age<0||age>4294967295||!Number.isFinite(back)||back<0||back>1||![ink,lineColor,whiteColor].every(c=>Number.isInteger(c)&&c>=0&&c<=65535))throw Error('Explicit native activity and color context required');
 const ghost=nativeDecay({target,role,raw,maximum,unitId,siValue,x,y,sx,sy})[0],out=[{points:ghost,ink:live?lineColor:back<1?blend(lineColor,ink,Math.trunc(m(16,back))):ink}];
 if(!live)return out;
 const q=d(raw,maximum);let ms=f(siValue);if(unitId===5)ms=m(ms,1000);if(unitId!==4&&unitId!==5)ms=m(q,4000);if(role===2)ms=a(24,m(.7,ms));ms=Math.max(0,Math.min(4000,ms));
 const reach=a(8,m(23,nativeSqrt(d(ms,4000)))),level=Math.max(f(.001),Math.min(1,f(envelope))),noisy=role===2,xe=(noisy||unitId===4||unitId===5)?2+Math.trunc(a(m(23,nativeSqrt(d(ms,4000))),.5)):2+Math.trunc(a(m(q,23),.5)),shift=d(m(xe,sourceLog2(level)),-9.966),seed=noisy?Math.floor(age/40):0,points=[];
 for(let i=0;f(i)<=s(xe,shift);i++){
  const amplitude=nativeExp2(d(m(-9.966,a(i,shift)),xe));let height=Math.trunc(a(m(amplitude,16),.5));
  if(noisy)height=Math.trunc(height*(40+rnd((i+Math.trunc(shift))*7+seed))/140);
  if(height>0){const px=a(x,m(a(1,d(m(s(reach,1),i),xe)),sx)),py=a(y,m(m(12,s(1,d(height,16))),sy)),point=[px,py];if(!point.every(Number.isFinite))throw Error('Live tail float32 layout overflow');points.push(point);if(i===0||(noisy&&i%5===0))out.push({points:[point,[px,a(y,m(12,sy))]],ink:i?ink:whiteColor});}
 }
 if(points.length>1)out.push({points,ink});return out;
}
