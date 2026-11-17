// SPDX-License-Identifier: GPL-3.0-only
// Unbound exact b341 presentation step; no sound/parameter mutation.
import{nativeExp2}from'../native-geometry-work/fastmath.mjs';
const f=Math.fround,a=(x,y)=>f(f(x)+f(y)),s=(x,y)=>f(f(x)-f(y)),m=(x,y)=>f(f(x)*f(y)),d=(x,y)=>f(f(x)/f(y));
export function nativeEaseStep(state,elapsed){
 if(!state||![state.y,state.vel,state.target].every(v=>Number.isFinite(v)&&Number.isFinite(f(v)))||!Number.isInteger(state.target)||state.target<0||state.target>255||!Number.isInteger(elapsed)||elapsed<0||elapsed>4294967295)throw Error('Bounded native presentation state required');
 let y=f(state.y),vel=f(state.vel);const target=state.target;if(!elapsed)return{y,vel,target};if(elapsed>=1000)return{y:target,vel:0,target};
 const omega=d(5,.12),dt=m(elapsed,.001),ex=nativeExp2(m(m(-omega,dt),1.44269504)),A=s(y,target),B=a(vel,m(omega,A)),term=a(A,m(B,dt));
 y=a(target,m(term,ex));vel=m(s(B,m(omega,term)),ex);if(!Number.isFinite(y)||!Number.isFinite(vel))throw Error('Native presentation overflow');
 if(Math.abs(s(y,target))<f(.02)&&Math.abs(vel)<f(.5)){y=target;vel=0;}return{y,vel,target};
}
