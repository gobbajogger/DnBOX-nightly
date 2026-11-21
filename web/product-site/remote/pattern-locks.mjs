// Stock 76040daa: ui.c lockable/lock_turn and seq/motion.h lane_t.
// The local roll authors the first sixteen steps of an explicitly selected part pattern.
const raw = Object.freeze(Array.from({length:128},(_,i)=>i));
const spec = (id,part,owner,bank,parameter,label) => Object.freeze({
  id,part,owner,bank,parameter,label,domain:raw,text:value=>value+' raw',
});
export const patternLockSpecs = Object.freeze([
  spec(4098,2,'Bass A','CHICAGO',2,'Cutoff lock'),
  spec(4130,3,'Bass B','CHICAGO',2,'Cutoff lock'),
  spec(1153,4,'BREAK','BREAK',0,'Level lock'),
]);
export function lockField(part,banks,view){
  if(view!=='roll' && view!=='locks')return;
  if(part==='breaks')return patternLockSpecs[2];
  const slot=part==='chicago'?0:part==='miami'?1:-1;
  if(slot>=0 && banks[slot]==='CHICAGO')return patternLockSpecs[slot];
}
const patternOK=n=>Number.isInteger(n)&&n>=0&&n<32;
const fail=()=>{throw Error('Local draft: invalid pattern lock');};
export function checkedPatternLocks(rows){
  if(!Array.isArray(rows)||rows.length>3*32)fail();
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
