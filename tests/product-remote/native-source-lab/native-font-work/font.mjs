// SPDX-License-Identifier: GPL-3.0-only
// Source-derived from firmware/src/gfx.c, Leo Kuroshita / Hügelton Instruments.
// Font data is Barlow, SIL OFL 1.1; preserve Barlow-OFL.txt with distribution.
import source from './fonts.json' with {type:'json'};
export const fonts=source.fonts;
function index(f,ch){if(ch>=97&&ch<=122&&f.last<97)ch-=32;if(ch<f.first||ch>f.last||(ch>=127&&ch<160))ch=63;if(ch<f.first||ch>f.last)throw Error('unsupported character in numeric-only font');return ch-f.first;}
const bytes=text=>{if(typeof text!=='string'||text.length>1024)throw Error('bounded font text');return new TextEncoder().encode(text);};
export function textWidth(role,text){const f=fonts[role];if(!f)throw Error('font role');let w=0;for(const ch of bytes(text))w+=f.adv[index(f,ch)];return w;}
// Canvas holds logical RGB565 words, unlike native byte-swapped panel storage.
export function drawText(canvas,{width,height,x,y,role,text,color,left=0,right=width,y0=0,y1=height,originY=0}){
 const f=fonts[role];if(!f||!(canvas instanceof Uint16Array)||canvas.length!==width*height)throw Error('font canvas');
 for(const v of [width,height,x,y,color,left,right,y0,y1,originY])if(!Number.isSafeInteger(v))throw Error('font bounds');
 if(width<1||height<1||width>480||height>480||color<0||color>65535||y0<0||y1>height||y0>y1)throw Error('font bounds');
 const chars=bytes(text);for(const ch of chars)index(f,ch);
 const r=color>>>11,g=(color>>>5)&63,b=color&31;
 for(const ch of chars){
  const gi=index(f,ch);let pos=f.off[gi];const data=f.data,rect=data[pos++]|(data[pos++]<<8)|(data[pos++]<<16);
  const cx=rect&63,cy=(rect>>>6)&63,w=(rect>>>12)&63,h=rect>>>18;
  const history=new Uint8Array(256);let written=0,remaining=0,distance=0,byte=0;
  for(let gy=0;gy<h;gy++)for(let gx=0;gx<w;gx++){
   if(!(gx&1)){if(!remaining){const token=data[pos++];distance=(token&128)?data[pos++]:0;remaining=(token&127)+(distance?3:1);}
    byte=distance?history[(written-distance)&255]:data[pos++];history[written++&255]=byte;remaining--;}
   const a=(gx&1)?byte&15:byte>>>4,px=x-f.pad+gx+cx,py=y+gy+cy+originY;
   if(!a||px<left||px>=right||px<0||px>=width||py<y0||py>=y1)continue;
   const i=py*width+px;if(a===15){canvas[i]=color;continue;}
   const bg=canvas[i],blend=(fg,bg)=>Math.floor((fg*a+bg*(15-a))*0x8889/524288);
   canvas[i]=(blend(r,bg>>>11)<<11)|(blend(g,(bg>>>5)&63)<<5)|blend(b,bg&31);
  }
  x+=f.adv[gi];
 }
 return x;
}
