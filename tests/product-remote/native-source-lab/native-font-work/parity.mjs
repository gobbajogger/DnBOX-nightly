import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {fonts,drawText,textWidth} from './font.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const root=new URL('./',import.meta.url),pins=JSON.parse(readFileSync(new URL('reference-pins.json',root)));
const verify=()=>{assert.equal(hash(readFileSync(new URL('reference',root))),pins.binary);for(const [p,h]of Object.entries(pins.inputs))assert.equal(hash(readFileSync(new URL(p,root))),h);};
verify();let cases=0;
for(const [roleIndex,role]of Object.keys(fonts).entries())for(const text of [...Array.from({length:95},(_,i)=>String.fromCharCode(32+i)),'TUNE ATTACK DECAY DEPTH','100ms 4.0s L50 C R50','a?z'])for(const clipped of [false,true]){
 if(role==='L'&&[...Buffer.from(text)].some(c=>c<32||c>57))continue;
 const width=96,height=40,x=clipped?-2:3,y=clipped?-4:2,color=0xfc60,bg=0x18e3,left=clipped?7:0,right=clipped?61:96,y0=clipped?4:0,y1=clipped?23:40;
 const canvas=new Uint16Array(width*height).fill(bg);
 const end=drawText(canvas,{width,height,x,y,role,text,color,left,right,y0,y1});
 const result=execFileSync(fileURLToPath(new URL('reference',root)),[roleIndex,width,height,x,y,color,bg,left,right,y0,y1,text].map(String),{encoding:'utf8',timeout:2000,maxBuffer:100000});
 const [metrics,pixels]=result.split('\n');assert.equal(metrics,`${end} ${textWidth(role,text)}`);
 assert.equal(Array.from(canvas,v=>v.toString(16).padStart(4,'0')).join(''),pixels,`${role}/${text}/${clipped}`);cases++;
}
verify();console.log(JSON.stringify({cases,fonts:6,result:'PASS',scope:'source RGB565 text decoder, fixed colors, full and partial clips; not browser/layout'}));
