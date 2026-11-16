// SPDX-License-Identifier: GPL-3.0-only
// Source-only b341 fastmath helpers needed by native decay geometry.
const f=Math.fround,m=(a,b)=>f(f(a)*f(b)),s=(a,b)=>f(f(a)-f(b));
const bytes=new ArrayBuffer(4),floats=new Float32Array(bytes),words=new Uint32Array(bytes);
export function nativeExp2(x){x=f(x);if(!Number.isFinite(x))throw Error('Finite float32 required');if(x<-126)return 0;if(x>127)x=127;const n=Math.floor(f(x+.5)),r=s(x,n);let p=f(1.534580891e-4);for(const a of [1.339993158e-3,9.618488972e-3,5.550328776e-2,2.402264689e-1,6.931472057e-1,1])p=f(m(p,r)+f(a));floats[0]=p;words[0]=(words[0]+((n<<23)>>>0))>>>0;return floats[0];}
export function nativeSqrt(x){x=f(x);if(!Number.isFinite(x))throw Error('Finite float32 required');if(x<=0)return 0;floats[0]=x;words[0]=(0x5f375a86-(words[0]>>>1))>>>0;let y=floats[0];for(let i=0;i<3;i++)y=m(y,s(1.5,m(m(m(.5,x),y),y)));return m(x,y);}
