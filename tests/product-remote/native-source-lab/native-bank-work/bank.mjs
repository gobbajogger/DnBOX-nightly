// SPDX-License-Identifier: GPL-3.0-only
// Supplementary current-native active BD bank, not a full screen or app replacement.
import corners from './corners.json' with {type:'json'};
import formatters from './bd-formatters.json' with {type:'json'};
import {projectDrum} from '../native-drum-binding-work/drum.mjs';
import {drawText,textWidth} from '../native-font-work/font.mjs';
import {nativeRaster} from './raster-onto.mjs';
const rgb=(r,g,b)=>((r>>3)<<11)|((g>>2)<<5)|(b>>3);
const colors={base:rgb(5,10,13),face:rgb(16,26,31),active:rgb(36,48,54),gray:rgb(156,170,168),white:rgb(222,231,223),ink:rgb(255,150,40)};
const roles=[{slot:0,name:'Tune',caption:'TUNE'},{slot:1,name:'Attack',caption:'ATTACK'},{slot:2,name:'Decay',caption:'DECAY'},{slot:4,name:'P.Dpth',caption:'DEPTH'}];
export function activeBdBank(state){
 const width=240,height=110,pixels=new Uint16Array(width*height).fill(colors.base),key=s=>`1:0:0:${s}`;
 const paths=roles.map((r,k)=>projectDrum({source:'b341436ff8087c20b8ef51765f986736473611b0',kind:1,target:0,voice:0,slot:r.slot,name:r.name},state,{x:6+Math.trunc(228*(2*k+1)/8)-22,y:54,sx:1.375,sy:1.5}));
 const values=roles.map(r=>{const c=formatters.controls.find(c=>c.slot===r.slot),v=c.values[state[key(r.slot)]];if(!v)throw Error('Bounded source value');return v.number+v.unit;});
 const blend=(x,y,c,a)=>{if(x<0||x>=width||y<0||y>=height||!a)return;const i=y*width+x,b=pixels[i];pixels[i]=a>=16?c:((((c>>11)*a+(b>>11)*(16-a))>>4)<<11)|(((((c>>5)&63)*a+((b>>5)&63)*(16-a))>>4)<<5)|(((c&31)*a+(b&31)*(16-a))>>4);};
 const rect=(x,y,w,h,c)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++)blend(x+i,y+j,c,16);};
 const box=(x,y,w,h,r,c)=>{r=Math.min(r,Math.trunc(w/2),Math.trunc(h/2),8);rect(x+r,y,w-2*r,h,c);rect(x,y+r,r,h-2*r,c);rect(x+w-r,y+r,r,h-2*r,c);const off=[0,0,1,5,14,30,55,91,140][r];for(let j=0;j<r;j++)for(let i=0;i<r;i++){const n=off+j*r+i,b=corners[n>>1],v=(b>>((n&1)*4))&15,a=v===8?16:v;blend(x+i,y+j,c,a);blend(x+w-1-i,y+j,c,a);blend(x+i,y+h-1-j,c,a);blend(x+w-1-i,y+h-1-j,c,a);}};
 // Native main origin is screen20; active bank y=26, height72.
 box(3,24,234,140,9,colors.face);box(6,26,228,72,9,colors.active);
 const text=(role,t,x,y,c)=>drawText(pixels,{width,height,x,y,role,text:t,color:c});
 text('T','SOUND',11,28,colors.gray);text('T','1/3',232-textWidth('T','1/3'),28,colors.gray);
 for(let k=0;k<4;k++){
  const cx=6+Math.trunc(228*(2*k+1)/8);
  text('T',roles[k].caption,cx-Math.trunc(textWidth('T',roles[k].caption)/2),40,colors.gray);
  nativeRaster(width,height,paths[k],{ink:colors.ink,canvas:pixels});
  text('S',values[k],cx-Math.trunc(textWidth('S',values[k])/2),82,colors.white);
 }
 return {pixels,width,height,scope:'active factory BD bank only; not full screen',controls:roles.map((r,k)=>({...r,value:values[k]}))};
}
