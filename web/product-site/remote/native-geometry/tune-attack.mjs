// SPDX-License-Identifier: GPL-3.0-only
// Exact b341 native dv_tune_fork / DG_ATTACK geometry. Source-only, not UI admission.
const f=Math.fround,add=(a,b)=>f(f(a)+f(b)),sub=(a,b)=>f(f(a)-f(b)),mul=(a,b)=>f(f(a)*f(b)),div=(a,b)=>f(f(a)/f(b));
export function nativeTuneAttack(family,raw,maximum,{x=0,y=0,sx=1,sy=1}={}){
 if(!['tune','attack'].includes(family)||![raw,maximum,x,y,sx,sy].every(v=>Number.isFinite(v)&&Number.isFinite(f(v)))||maximum<=0||f(maximum)<=0||raw<0||raw>maximum||sx<=0||sy<=0||f(sx)<=0||f(sy)<=0)throw Error('Bounded native geometry context required');
 const q=Math.max(0,Math.min(1,div(raw,maximum))),point=(a,b)=>{const p=[add(x,mul(a,sx)),add(y,mul(b,sy))];if(!p.every(Number.isFinite))throw Error("Native geometry exceeds float32 layout bounds");return p;};
 if(family==='attack')return[[point(1,12),point(add(1,mul(30,q)),0),point(31,0)]];
 const mid=f(16),half=mul(7,add(.62,mul(.76,q))),drop=add(11,mul(2,sub(q,.27))),tip=add(17,mul(1.5,sub(q,.27))),L=sub(mid,half),R=add(mid,half),path=[point(L,0),point(L,6)];
 for(let i=1;i<=8;i++){const t=div(i,8),mt=sub(1,t);path.push(point(add(add(mul(mul(mt,mt),L),mul(mul(mul(2,mt),t),L)),mul(mul(t,t),mid)),add(add(mul(mul(mt,mt),6),mul(mul(mul(2,mt),t),drop)),mul(mul(t,t),drop))));}
 for(let i=1;i<=8;i++){const t=div(i,8),mt=sub(1,t);path.push(point(add(add(mul(mul(mt,mt),mid),mul(mul(mul(2,mt),t),R)),mul(mul(t,t),R)),add(add(mul(mul(mt,mt),drop),mul(mul(mul(2,mt),t),drop)),mul(mul(t,t),6))));}
 path.push(point(R,0));return[path,[point(mid,drop),point(mid,tip)]];
}
