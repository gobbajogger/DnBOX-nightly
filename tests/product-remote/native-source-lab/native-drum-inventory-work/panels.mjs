// SPDX-License-Identifier: GPL-3.0-only
// Supplementary native drum BANKS only. Header/lower pictogram/step strip excluded.
import{drumBankLayout}from'./layout.mjs';import data from'./format-data.json'with{type:'json'};
import corners from'../native-bank-work/corners.json'with{type:'json'};
import{projectPresentedDrum}from'../native-presentation-work/presentation.mjs';
import{drawText,textWidth}from'../native-font-work/font.mjs';import{nativeRaster}from'../native-bank-work/raster-onto.mjs';
const rgb=(r,g,b)=>((r>>3)<<11)|((g>>2)<<5)|(b>>3);
export const factoryState=Object.freeze(Object.fromEntries(Object.entries(data.controls).map(([k,c])=>[k,c.raw])));
export function drumPanels(kit,voice,page,input=factoryState,presentation=null){
 const layout=drumBankLayout(kit,voice,page),state=Object.freeze(Object.fromEntries(Object.keys(data.controls).map(k=>[k,input[k]]))),width=240,height=240;
 const prepared=layout.rows.map(row=>({...row,controls:row.controls.map(c=>{
  const d=data.controls[c.ref],raw=state[c.ref];if(!d||!Number.isInteger(raw)||raw<0||raw>d.max)throw Error('Exact bounded source draft required');
  const[kind,target,v,slot]=c.ref.split(':').map(Number),ev=presentation?presentation[c.ref]:raw;
  const paths=projectPresentedDrum({source:'b341436ff8087c20b8ef51765f986736473611b0',kind,target,voice:v,slot,name:c.nativeName},state,ev,c.glyph);
  return{...c,paths,valueText:d.values[raw],displayName:d.displayName,targetVoice:v};
 })}));
 const colors={base:rgb(5,10,13),face:rgb(16,26,31),active:rgb(36,48,54),gray:rgb(156,170,168),white:rgb(222,231,223),ink:kit===0?rgb(255,150,40):rgb(255,72,64)};
 const pixels=new Uint16Array(width*height).fill(colors.base);
 const blend=(x,y,c,a)=>{if(x<0||x>=width||y<0||y>=height||!a)return;const i=y*width+x,b=pixels[i];pixels[i]=a>=16?c:((((c>>11)*a+(b>>11)*(16-a))>>4)<<11)|(((((c>>5)&63)*a+((b>>5)&63)*(16-a))>>4)<<5)|(((c&31)*a+(b&31)*(16-a))>>4);};
 const rect=(x,y,w,h,c)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++)blend(x+i,y+j,c,16);};
 const box=(x,y,w,h,r,c)=>{r=Math.min(r,Math.trunc(w/2),Math.trunc(h/2),8);rect(x+r,y,w-2*r,h,c);rect(x,y+r,r,h-2*r,c);rect(x+w-r,y+r,r,h-2*r,c);const off=[0,0,1,5,14,30,55,91,140][r];for(let j=0;j<r;j++)for(let i=0;i<r;i++){const n=off+j*r+i,b=corners[n>>1],v=(b>>((n&1)*4))&15,a=v===8?16:v;blend(x+i,y+j,c,a);blend(x+w-1-i,y+j,c,a);blend(x+i,y+h-1-j,c,a);blend(x+w-1-i,y+h-1-j,c,a);}};
 const text=(role,t,x,y,c)=>drawText(pixels,{width,height,x,y,role,text:t,color:c}),center=(role,t,x,y,c)=>text(role,t,x-Math.trunc(textWidth(role,t)/2),y,c);
 box(3,24,234,layout.endY-22,9,colors.face);
 for(const row of prepared){
  if(row.active)box(6,row.y,228,row.height,9,colors.active);
  const first=row.controls[0],kitRow=first.targetVoice===11,heading=kitRow?'KIT':'SOUND',counter=`${row.bank+1}/${prepared.length}`;
  text('T',heading,11,row.y+2,colors.gray);text('T',counter,232-textWidth('T',counter),row.y+2,colors.gray);
  if(kitRow||row.controls.length===1)text('T',kitRow?first.displayName.toUpperCase():first.caption,11,row.y+14,colors.gray);
  for(const c of row.controls){if(c.captionCenter)center('T',c.caption,...c.captionCenter,colors.gray);nativeRaster(width,height,c.paths,{ink:row.active?colors.ink:colors.gray,canvas:pixels});center(c.value.large?'S':'T',c.valueText,c.value.x,c.value.y,colors.white);}
 }
 return{pixels,width,height,layout,controls:prepared.flatMap(r=>r.controls.map(c=>({ref:c.ref,value:c.valueText}))),scope:'dark settled drum bank panels only, no header/lower panel/full screen'};
}
