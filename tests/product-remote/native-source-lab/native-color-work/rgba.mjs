// SPDX-License-Identifier: GPL-3.0-only
// Match the pinned native host PNG export, not bit replication.
export function nativeRgba(pixels){
 if(!(pixels instanceof Uint16Array)||pixels.length>1048576)throw Error('Bounded RGB565 words required');
 const out=new Uint8ClampedArray(pixels.length*4);
 for(let i=0;i<pixels.length;i++){const p=pixels[i];out[4*i]=Math.trunc(((p>>>11)&31)*255/31);out[4*i+1]=Math.trunc(((p>>>5)&63)*255/63);out[4*i+2]=Math.trunc((p&31)*255/31);out[4*i+3]=255;}
 return out;
}
