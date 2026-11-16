// SPDX-License-Identifier: GPL-3.0-only
// Source-derived drum bank placement only. No whole-screen/theme admission.
import inventory from './inventory.json' with {type:'json'};
for(const v of inventory.voices)for(const c of v.controls)if(!/^[\x20-\x7e]{1,12}$/.test(c.nativeName))throw Error('Reviewed ASCII native label domain required');
const nativeCaption=name=>name==='P.Dpth'?'DEPTH':name.slice(0,14).replace(/[a-z]/g,c=>String.fromCharCode(c.charCodeAt(0)-32));
export function drumBankLayout(kit,voice,page){
 if(![kit,voice,page].every(Number.isInteger))throw Error('Typed page required');
 const entry=inventory.voices.find(v=>v.kit===kit&&v.voice===voice);
 if(!entry||!entry.observedPages.includes(page))throw Error('Observed native page required');
 let y=26;const rows=[];
 for(const bank of [...entry.observedPages].sort((a,b)=>a-b)){
  const controls=entry.controls.filter(c=>c.page===bank).sort((a,b)=>a.knob-b.knob),cells=controls.length,active=bank===page;
  const height=active?(cells===1?56:72):(cells>1?42:32);
  const mapped=controls.map((c,k)=>{
   const caption=nativeCaption(c.nativeName);
   if(active&&cells>=2){const cx=6+Math.trunc(228*(2*k+1)/(2*cells));return{...c,caption,captionCenter:[cx,y+14],glyph:{x:cx-22,y:y+28,sx:1.375,sy:1.5},value:{x:cx,y:y+height-16,large:true}};}
   if(active)return{...c,caption,glyph:{x:92,y:y+25,sx:1.8,sy:1.8},value:{x:214,y:y+35,large:true}};
   if(cells>1){const gx=6+Math.trunc(228*(2*k+1)/(2*cells))-22;return{...c,caption,captionCenter:[gx+22,y+14],glyph:{x:gx,y:y+29,sx:.62,sy:.76},value:{x:gx+40,y:y+29,large:false}};}
   return{...c,caption,glyph:{x:98,y:y+5,sx:1.3,sy:1.5},value:{x:214,y:y+15,large:true}};
  });rows.push({bank,y,height,active,controls:mapped});y+=height;
 }
 return{kit,voice,page,rows,endY:y};
}
