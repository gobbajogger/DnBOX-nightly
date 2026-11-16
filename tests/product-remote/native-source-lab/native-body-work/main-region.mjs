// SPDX-License-Identifier: GPL-3.0-only
// Source-native idle drum MAIN region. Header and live state are not represented.
import{drumPanels,factoryState}from'../native-drum-inventory-work/panels.mjs';import{idleBody}from'./body.mjs';import names from'./voice-names.json'with{type:'json'};
import corners from'../native-bank-work/corners.json'with{type:'json'};import{drawText,textWidth}from'../native-font-work/font.mjs';import{nativeRaster}from'../native-bank-work/raster-onto.mjs';
const rgb=(r,g,b)=>((r>>3)<<11)|((g>>2)<<5)|(b>>3);
export function drumMain(kit,voice,page,{state=factoryState,patternIndex,patternLength,hitMask}={}){
 if(!Number.isInteger(patternIndex)||patternIndex<0||patternIndex>=32||!Number.isInteger(patternLength)||patternLength<1||patternLength>64||!Number.isInteger(hitMask)||hitMask<0||hitMask>65535)throw Error('Explicit native pattern context required');
 const frame=drumPanels(kit,voice,page,state),pixels=frame.pixels,width=240,height=240,face=rgb(16,26,31),gray=rgb(156,170,168),line=rgb(40,56,61),ink=kit===0?rgb(255,150,40):rgb(255,72,64);
 const blend=(x,y,c,a)=>{if(x<0||x>=width||y<0||y>=height||!a)return;const i=y*width+x,b=pixels[i];pixels[i]=a>=16?c:((((c>>11)*a+(b>>11)*(16-a))>>4)<<11)|(((((c>>5)&63)*a+((b>>5)&63)*(16-a))>>4)<<5)|(((c&31)*a+(b&31)*(16-a))>>4);};
 const rect=(x,y,w,h,c)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++)blend(x+i,y+j,c,16);};
 const box=(x,y,w,h,r,c)=>{r=Math.min(r,Math.trunc(w/2),Math.trunc(h/2),8);rect(x+r,y,w-2*r,h,c);rect(x,y+r,r,h-2*r,c);rect(x+w-r,y+r,r,h-2*r,c);const off=[0,0,1,5,14,30,55,91,140][r];for(let j=0;j<r;j++)for(let i=0;i<r;i++){const n=off+j*r+i,b=corners[n>>1],v=(b>>((n&1)*4))&15,a=v===8?16:v;blend(x+i,y+j,c,a);blend(x+w-1-i,y+j,c,a);blend(x+i,y+h-1-j,c,a);blend(x+w-1-i,y+h-1-j,c,a);}};
 const text=(t,x,y,c)=>drawText(pixels,{width,height,x,y,role:'T',text:t,color:c});
 const bodyY=frame.layout.endY+6,ph=Math.max(40,237-bodyY),cols=ph>=88?4:8,rows=16/cols,left=cols===4?124:118,pitch=Math.trunc((228-left)/cols),stepTop=bodyY+19,stepH=Math.trunc((ph-24)/rows),scale=ph<64?.65:1,bodyHeight=Math.trunc(Math.fround(Math.fround(47)*Math.fround(scale)));
 box(3,bodyY,234,ph,9,face);
 const body=idleBody(kit,voice,{x:10,y:bodyY+Math.trunc((ph-bodyHeight)/2),scale});nativeRaster(width,height,body.paths,{ink,width:body.width,canvas:pixels});
 text(names[String(kit)][voice],11,bodyY+3,ink);
 const rhs=`P${patternIndex+1} / ${Math.min(patternLength<1?16:patternLength,16)}`;text(rhs,226-textWidth('T',rhs),bodyY+3,gray);text(`${kit===0?'909':'808'} / ${voice+1}`,11,bodyY+ph-14,gray);
 for(let step=0;step<16;step++){const x=left+(step%cols)*pitch,y=stepTop+Math.trunc(step/cols)*stepH,hit=step<patternLength&&((hitMask>>>step)&1);rect(x,y,11,4,hit?ink:line);const number=String(step+1);text(number,x+5-Math.trunc(textWidth('T',number)/2),y+6,gray);}
 return{...frame,scope:'idle dark source main region only; header/live/current themes excluded'};
}
