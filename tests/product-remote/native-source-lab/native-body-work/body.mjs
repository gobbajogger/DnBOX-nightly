// SPDX-License-Identifier: GPL-3.0-only
// Actual R22 source polyline data and idle dv_body_pictogram arithmetic.
import data from'./body-data.json'with{type:'json'};
const f=Math.fround,a=(x,y)=>f(f(x)+f(y)),s=(x,y)=>f(f(x)-f(y)),m=(x,y)=>f(f(x)*f(y)),d=(x,y)=>f(f(x)/f(y));
export function idleBody(kit,voice,{x=10,y=0,scale=1}={}){
 if(![kit,voice,x,y].every(Number.isInteger)||kit<0||kit>1||voice<0||voice>10||Math.abs(x)>4096||Math.abs(y)>4096||![x,y,scale].every(v=>Number.isFinite(v)&&Number.isFinite(f(v)))||f(scale)<=0||scale>4)throw Error('Bounded native body context required');
 const[first,count]=data.bodies[kit][voice],factor=m(3,scale),paths=[];
 for(let p=first;p<first+count;p++){const[off,n]=data.polys[p],points=[];for(let i=0;i<Math.min(n,64);i++){const px=d(data.xy[2*(off+i)],1000),py=d(data.xy[2*(off+i)+1],1000);const point=[a(a(x,m(s(px,11),factor)),33),a(a(y,m(s(py,5.4),factor)),m(5.4,3))];if(!point.every(Number.isFinite))throw Error('Body float32 overflow');points.push(point);}paths.push(points);}
 return{paths,width:m(3.6,scale)};
}
