// Stock 76040daa: ui.c lockable/lock_turn and seq/motion.h lane_t.
// The local roll authors the first sixteen steps of an explicitly selected part pattern.
import {unipolarPercent} from './sound.mjs';

// BREAK Level uses pot/127 gain. Stock unit_value shows tenths below 10 dB
// of attenuation and rounds larger losses to whole decibels.
function breakLevel(raw) {
  if (raw === 0) return 'OFF';
  const tenths = Math.round(-200 * Math.log10(raw / 127));
  const number = tenths >= 100 ? -Math.round(tenths / 10) : (-tenths / 10).toFixed(1);
  return number + 'dB';
}

const raw = Object.freeze(Array.from({length:128},(_,i)=>i));
const spec = (id,part,owner,bank,parameter,label) => Object.freeze({
  id,part,owner,bank,parameter,label,domain:raw,text:part === 4 ? breakLevel : unipolarPercent,
});
export const patternLockSpecs = Object.freeze([
  spec(4098,2,'Bass A','CHICAGO',2,'Cutoff lock'),
  spec(4130,3,'Bass B','CHICAGO',2,'Cutoff lock'),
  spec(1153,4,'BREAK','BREAK',0,'Level lock'),
  spec(4169,2,'Bass A','MIAMI',9,'Cutoff lock'),
  spec(4201,3,'Bass B','MIAMI',9,'Cutoff lock'),
]);
export function lockField(part,banks,view){
  if(view!=='roll' && view!=='locks')return;
  const partIndex = {chicago:2, miami:3, breaks:4}[part];
  const bank = partIndex === 4 ? 'BREAK' : banks[partIndex - 2];
  return patternLockSpecs.find(field => field.part === partIndex && field.bank === bank);
}
const patternOK=n=>Number.isInteger(n)&&n>=0&&n<32;
const fail=()=>{throw Error('Local draft: invalid pattern lock');};
export function checkedPatternLocks(rows){
  if(!Array.isArray(rows)||rows.length>patternLockSpecs.length*32)fail();
  const result=[],seen=new Set();
  for(const row of rows){
    if(!row||typeof row!=='object'||Object.keys(row).length!==3||
       !['catalogId','pattern','values'].every(key=>Object.hasOwn(row,key))||
       !patternLockSpecs.some(s=>s.id===row.catalogId)||!patternOK(row.pattern)||
       !Array.isArray(row.values)||row.values.length!==16||
       !Array.from(row.values).every(v=>v===null||(Number.isInteger(v)&&v>=0&&v<=127)))fail();
    const key=row.catalogId+'/'+row.pattern;
    if(seen.has(key))fail();seen.add(key);
    if(row.values.some(v=>v!==null))result.push({catalogId:row.catalogId,pattern:row.pattern,values:[...row.values]});
  }
  return result.sort((a,b)=>a.catalogId-b.catalogId||a.pattern-b.pattern);
}
export function putPatternLock(rows,catalogId,pattern,values){
  return checkedPatternLocks([...rows.filter(r=>r.catalogId!==catalogId||r.pattern!==pattern),{catalogId,pattern,values}]);
}
