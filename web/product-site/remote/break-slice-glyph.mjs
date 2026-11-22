// SPDX-License-Identifier: GPL-3.0-only
// f1786ebe ui.c BRKSLICE_P and the named-switch fallback: four filled
// 6×9 boxes, gap2, radius2. Source cx=0/y33 projects to cx20/y5 here.
const names=Object.freeze(['4','8','16','32']);
export function isBreakSliceControl(row){
 return row?.kind===11&&(row.target===0||row.target===1)&&row.voice===0&&
  row.parameter===0&&row.sourceBank===-1&&
  row.id==='source-sound/BREAK/-1|11:'+row.target+':0:0:-1';
}
export const breakSliceRole=row=>isBreakSliceControl(row)?'BREAK SLICES':null;
export function breakSliceText(row,raw){
 return isBreakSliceControl(row)&&Number.isInteger(raw)&&raw>=0&&raw<=3?names[raw]:null;
}
export function breakSliceGlyph(raw){
 if(!Number.isInteger(raw)||raw<0||raw>3)throw RangeError('Invalid BREAK slice selector');
 return {d:'',rects:Array.from({length:4},(_,index)=>({
  x:5+8*index,y:5,w:6,h:9,radius:2,ink:index===raw?'primary':'guide'
 }))};
}
