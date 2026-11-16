// SPDX-License-Identifier: GPL-3.0-only
// Actual R22 source body arithmetic with explicit native envelope input.
// No synthesized activity or audio admission; DARK source white only.
import data from'../native-body-work/body-data.json'with{type:'json'};
const f=Math.fround,a=(x,y)=>f(f(x)+f(y)),s=(x,y)=>f(f(x)-f(y)),m=(x,y)=>f(f(x)*f(y)),d=(x,y)=>f(f(x)/f(y));
export function liveBody(kit,voice,{x=10,y=0,scale=1,envelope,ink}={}){
 if(![kit,voice,x,y].every(Number.isInteger)||kit<0||kit>1||voice<0||voice>10||Math.abs(x)>4096||Math.abs(y)>4096||![x,y,scale].every(v=>Number.isFinite(v)&&Number.isFinite(f(v)))||f(scale)<=0||scale>4)throw Error('Bounded native body context required');
 if(!Number.isFinite(envelope)||envelope<0||envelope>1||!Number.isInteger(ink)||ink<0||ink>65535)throw Error('Explicit native envelope/color required');
 const env=f(envelope),amount=Math.trunc(a(m(env,6),.5)),white=57147;
 const blend=(c,w,t)=>{const r=((c>>>11)*(16-t)+(w>>>11)*t)>>>4,g=(((c>>>5)&63)*(16-t)+((w>>>5)&63)*t)>>>4,b=((c&31)*(16-t)+(w&31)*t)>>>4;return(r<<11)|(g<<5)|b;};
 const color=env>f(.02)?blend(ink,white,amount):ink;
 const[first,count]=data.bodies[kit][voice],factor=m(m(3,scale),a(1,m(.06,env))),paths=[];
 for(let p=first;p<first+count;p++){const[off,n]=data.polys[p],points=[];for(let i=0;i<Math.min(n,64);i++){const px=d(data.xy[2*(off+i)],1000),py=d(data.xy[2*(off+i)+1],1000);const point=[a(a(x,m(s(px,11),factor)),33),a(a(y,m(s(py,5.4),factor)),m(5.4,3))];if(!point.every(Number.isFinite))throw Error('Body float32 overflow');points.push(point);}paths.push(points);}
 return{paths,width:m(3.6,scale),color};
}
