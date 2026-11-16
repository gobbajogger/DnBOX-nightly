// SPDX-License-Identifier: GPL-3.0-only
// Unbound source port of b341 rounded AA stroke and RGB565 px_blend.
import{nativeSqrt}from'../native-geometry-work/fastmath.mjs';
const f=Math.fround,a=(x,y)=>f(f(x)+f(y)),s=(x,y)=>f(f(x)-f(y)),m=(x,y)=>f(f(x)*f(y)),d=(x,y)=>f(f(x)/f(y));
export function nativeRaster(w,h,paths,{background=8582,ink=64677,width=2,canvas=null}={}){
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>512||h>512||!Number.isFinite(width)||width<=0||f(width)<=0||width>64||![background,ink].every(x=>Number.isInteger(x)&&x>=0&&x<=65535))throw Error('Bounded source canvas required');
 if(canvas!==null&&(!(canvas instanceof Uint16Array)||canvas.length!==w*h))throw Error('Bounded canvas required');
 for(const path of paths)for(const point of path)if(!Array.isArray(point)||point.length!==2||!point.every(x=>Number.isFinite(x)&&Math.abs(x)<=4096))throw Error('Bounded native path required');
 const pixels=canvas??new Uint16Array(w*h).fill(background);
 function blend(x,y,c,alpha){if(x<0||x>=w||y<0||y>=h||!alpha)return;const i=y*w+x;if(alpha>=16){pixels[i]=c;return;}const bg=pixels[i];pixels[i]=((((c>>>11)*alpha+(bg>>>11)*(16-alpha))>>>4)<<11)|(((((c>>>5)&63)*alpha+((bg>>>5)&63)*(16-alpha))>>>4)<<5)|(((c&31)*alpha+(bg&31)*(16-alpha))>>>4);}
 function line(x0,y0,x1,y1){const dx=s(x1,x0),dy=s(y1,y0),len2=a(m(dx,dx),m(dy,dy)),r=m(width,.5);const xmin=Math.max(0,Math.floor(s(s(Math.min(x0,x1),r),.5))),xmax=Math.min(w-1,Math.floor(a(a(Math.max(x0,x1),r),.5))),ymin=Math.max(0,Math.floor(s(s(Math.min(y0,y1),r),.5))),ymax=Math.min(h-1,Math.floor(a(a(Math.max(y0,y1),r),.5)));
 for(let y=ymin;y<=ymax;y++)for(let x=xmin;x<=xmax;x++){let t=len2>0?d(a(m(s(x,x0),dx),m(s(y,y0),dy)),len2):0;t=Math.max(0,Math.min(1,t));const ax=s(s(x,x0),m(t,dx)),ay=s(s(y,y0),m(t,dy)),alpha=s(a(r,.5),nativeSqrt(a(m(ax,ax),m(ay,ay))));if(alpha>0)blend(x,y,ink,alpha>=1?16:Math.trunc(a(m(alpha,16),.5)));}}
 for(const path of paths){for(const point of path)if(!Array.isArray(point)||point.length!==2||!point.every(x=>Number.isFinite(x)&&Math.abs(x)<=4096))throw Error('Bounded native path required');for(let i=1;i<path.length;i++)line(...path[i-1].map(f),...path[i].map(f));}return pixels;
}
