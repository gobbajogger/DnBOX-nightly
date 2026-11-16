// SPDX-License-Identifier: GPL-3.0-only
// Explicit idle DARK palette1 or LIGHT palette5 saved header only; no general live header admission.
import{drumThemedMain}from'./main-region.mjs';import theme from './materials.json' with {type:'json'};import names from'../native-body-work/voice-names.json'with{type:'json'};import{drawText,textWidth}from'../native-font-work/font.mjs';
const rgb=(r,g,b)=>((r>>3)<<11)|((g>>2)<<5)|(b>>3);
export function drumThemedIdleFrame(kit,voice,page,context){
 const h=context?.header;if(!h||typeof h.light!=='boolean'||h.palette!==(h.light?5:1)||h.playing!==false||h.recording!==false||h.saveState!=='saved'||h.pendingCue!==false||!Number.isInteger(h.battery)||h.battery<0||h.battery>3||!Number.isInteger(h.tempo)||h.tempo<1||h.tempo>999)throw Error('Explicit qualified idle header context required');
 const frame=drumThemedMain(kit,voice,page,{...context,light:h.light}),row=theme.materials[Number(h.light)],pixels=frame.pixels,face=row[1],edge=row[2],side=row[4],left=row[3],shadow=row[5],gray=row[11],white=row[10],lineColor=row[13],ink=theme.parts[Number(h.light)][kit],hi=h.light?row[14]:rgb(255,184,70);
 const put=(x,y,c)=>{if(x>=0&&x<240&&y>=0&&y<20)pixels[y*240+x]=c;},rect=(x,y,w,h,c)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++)put(x+i,y+j,c);};
 const line=(x0,y0,x1,y1,c)=>{const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let err=dx+dy;for(let guard=0;guard<2000;guard++){put(x0,y0,c);if(x0===x1&&y0===y1)return;const e=2*err;if(e>=dy){err+=dy;x0+=sx;}if(e<=dx){err+=dx;y0+=sy;}}};
 // Native inactive surface_panel(0,0,240,20,...), preserving exact bevel order.
 for(let row=0;row<20;row++){const inset=row<4?4-row:row>=16?row-15:0;rect(inset,row,240-2*inset,1,face);}
 rect(4,0,232,1,edge);line(0,4,4,0,edge);rect(0,4,1,12,left);line(235,0,239,4,edge);rect(239,4,1,12,side);line(239,15,235,19,side);rect(4,19,232,1,shadow);line(0,15,4,19,side);rect(6,1,60,1,left);
 const text=(role,t,x,y,color,clipLeft=0,clipRight=240)=>drawText(pixels,{width:240,height:240,x,y,role,text:t,color,left:clipLeft,right:clipRight,y0:0,y1:20});
 text('B',`${kit===0?'909':'808'} ${names[String(kit)][voice]}`,4,2,ink,4,125);text('T',`P${context.patternIndex+1}`,132,4,white);const tempo=String(h.tempo);text('T',tempo,200-textWidth('T',tempo),3,hi);rect(170,7,5,5,gray);
 // Battery's radius1 face is completely covered at its edges by outline.
 rect(219,5,14,8,face);rect(219,5,14,1,gray);rect(219,12,14,1,gray);rect(219,5,1,8,gray);rect(232,5,1,8,gray);rect(233,7,2,4,gray);for(let i=0;i<3;i++)rect(221+i*4,7,3,4,i<h.battery?gray:lineColor);
 return{...frame,scope:'explicit34ad idle DARK/amber or LIGHT saved source frame; not live/general header or final UI qualification'};
}
