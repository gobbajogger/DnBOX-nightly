// SPDX-License-Identifier: GPL-3.0-only
// Shared step lane under the roll and drums. Absolute slider mapping, p = 0 (bottom) .. 1 (top).
// Chance: the top 60% of travel is 100%..5%, the bottom 40% continues 1:2..8:8 in
// one drag. Values encode with sequence.mjs encodeChance (5%->5, 1:2->101, 8:8->135).
import{chanceDomain}from'./sequence.mjs';
import{formatPan,panFromFraction,fractionFromPan,PAN_CENTRE}from'./pan.mjs';
export const LANE_KINDS=Object.freeze(['velocity','chance','pitch','pan']);
export const LANE_WORDS=Object.freeze({velocity:'VELOCITY',chance:'CHANCE',pitch:'PITCH',pan:'PAN'});
export const CHANCE_SPLIT=0.4;
const PCT=chanceDomain.filter(v=>v.endsWith('%')),RATIO=chanceDomain.filter(v=>!v.endsWith('%'));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function nextLane(kind){const i=LANE_KINDS.indexOf(kind);return LANE_KINDS[(i+1)%LANE_KINDS.length];}
export function chanceFromLane(p){
 p=clamp(p,0,1);
 if(p>=CHANCE_SPLIT) return PCT[Math.round((1-p)/(1-CHANCE_SPLIT)*(PCT.length-1))];
 return RATIO[clamp(Math.round((CHANCE_SPLIT-p)/CHANCE_SPLIT*(RATIO.length-1)),0,RATIO.length-1)];
}
export function laneFromChance(v){
 const i=PCT.indexOf(v);if(i>=0) return 1-i/(PCT.length-1)*(1-CHANCE_SPLIT);
 const j=RATIO.indexOf(v);if(j>=0) return CHANCE_SPLIT-j/(RATIO.length-1)*CHANCE_SPLIT;
 return 1;
}
export const panFromLane=panFromFraction;
export const velocityFromLane=p=>1+Math.round(clamp(p,0,1)*126);
export const PITCH_RANGE=24;
export function pitchOffsetFromLane(p){return Math.round((clamp(p,0,1)-0.5)*2*PITCH_RANGE);}
const pitchDelta=(n,base)=>['drum909','drum808'].includes(n.track)?n.pitchOffset??0:n.note-base;
// Lane fraction for a note. base = the note's pitch when the stroke started.
export function laneFraction(kind,n,base=n.note){
 if(kind==='chance') return n.chance?laneFromChance(n.chance):1;
 if(kind==='pitch') return clamp(0.5+pitchDelta(n,base)/(2*PITCH_RANGE),0,1);
 if(kind==='pan') return fractionFromPan(n.pan??PAN_CENTRE);
 return (n.velocity-1)/126;
}
export function laneText(kind,n,base=n.note){
 if(kind==='chance') return n.chance??'100%';
 if(kind==='pitch'){const d=pitchDelta(n,base);return (d>0?'+':'')+d+'st';}
 if(kind==='pan') return formatPan(n.pan??PAN_CENTRE);
 return String(n.velocity);
}
// Value at a pointer y inside the lane box (travel = height minus 20).
export function laneP(y,top,height){const travel=Math.max(1,height-20);return clamp((top+height-10-y)/travel,0,1);}
// The fader rail sits 7px right of the onset x. Rail x = onset x + 7.
export const RAIL_OFFSET=7;
