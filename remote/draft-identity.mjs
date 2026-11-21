// Shared bounded identity law for LOCAL draft files and every note allocation path.
export const MAX_DRAFT_ID=1_000_000_000;
export function allocateDraftIds(notes,count,next=0){
 if(!Array.isArray(notes)||!Number.isSafeInteger(count)||count<1||count>MAX_DRAFT_ID+1)throw Error('Invalid local identity allocation');
 const used=new Set(notes.map(n=>n.id)),occupied=[...used].filter(id=>typeof id==='string'&&/^draft(?:0|[1-9]\d*)$/.test(id)&&Number(id.slice(5))<=MAX_DRAFT_ID).length;if(count+occupied>MAX_DRAFT_ID+1)throw Error('No free local draft identities');
 let at=Number.isSafeInteger(next)&&next>=0&&next<=MAX_DRAFT_ID?next:0;const ids=[];
 for(let i=0;i<count;i++){
  while(used.has('draft'+at))at=at===MAX_DRAFT_ID?0:at+1;
  const id='draft'+at;ids.push(id);used.add(id);at=at===MAX_DRAFT_ID?0:at+1;
 }
 return{ids,next:at};
}
