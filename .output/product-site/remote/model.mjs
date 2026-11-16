// New local workspace prototype, not a firmware state machine or device transaction API.
const clone=v=>structuredClone(v),int=(v,lo,hi)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
export function notesFromTrace(trace){
 if(trace?.sampleRate!==44100||!int(trace.endSample,1,44100*86400)||!Array.isArray(trace.events)||trace.events.length>2000000)throw Error('Invalid finite source trace');
 const active=new Map(),notes=[];let order=-1,sample=-1;
 for(const e of trace.events){if(!int(e.sample,0,trace.endSample)||!int(e.order,0,Number.MAX_SAFE_INTEGER)||e.sample<sample||e.order<=order||typeof e.track!=='string'||!int(e.note,0,127)||!int(e.channel,0,15))throw Error('Invalid ordered source event');sample=e.sample;order=e.order;const key=JSON.stringify([e.track,e.channel,e.note]);
  if(e.type==='noteOn'){if(!int(e.velocity,1,127)||active.has(key))throw Error('Ambiguous source note ownership');const note={id:'n'+notes.length,track:e.track,note:e.note,velocity:e.velocity,channel:e.channel,start:e.sample,end:null,sourceOrder:e.order,pulse:false};notes.push(note);active.set(key,note);}
  else if(e.type==='noteOff'){const note=active.get(key);if(!note)throw Error('Unowned source note release');note.end=e.sample;note.pulse=note.end===note.start;active.delete(key);}else throw Error('Unsupported source event');
 }
 if(active.size)throw Error('Unclosed source note');return notes;
}
export function groupsFromCatalog({controls}={}){
 if(!Array.isArray(controls))throw Error('Source descriptors required');const groups=new Map(),ids=new Set();
 for(const d of controls){if(!int(d.id,0,16383)||ids.has(d.id))throw Error('Invalid descriptor identity');ids.add(d.id);if(d.kind==='HELD')continue;if(!['U32','F32'].includes(d.kind)||typeof d.targetLabel!=='string'||typeof d.voiceLabel!=='string'||typeof d.label!=='string')throw Error('Invalid scalar descriptor');const key=JSON.stringify([d.targetLabel,d.voiceLabel,d.bankLabel??'']);if(!groups.has(key))groups.set(key,{target:d.targetLabel,voice:d.voiceLabel,bank:d.bankLabel??'',controls:[]});groups.get(key).controls.push(clone(d));}return [...groups.values()];
}
export class DraftWorkspace{
 constructor({trace}){this.endSample=trace.endSample;this.original=notesFromTrace(trace);this._notes=clone(this.original);this.history=[];this.future=[];this.gesture=null;this.pointers=new Set();this.connected=false;this.reason='example';}
 get notes(){return clone(this._notes);}
 status(){return Object.freeze({phase:this.changes().length?'example-draft':'example',connected:false,deviceWrites:0,changes:this.changes().length,reason:this.reason});}
 validate(id,patch){const old=this._notes.find(n=>n.id===id);if(!old)throw Error('Select a source note');if(!patch||Object.keys(patch).some(k=>!['note','velocity','start','end'].includes(k)))throw Error('Unsupported note field');const n={...old,...patch};if(!int(n.note,0,127)||!int(n.velocity,1,127)||!int(n.start,0,this.endSample)||!int(n.end,n.start+(old.pulse?0:1),this.endSample)||(old.pulse&&n.start!==n.end))throw Error('Note outside source range');return n;}
 push(before){if(JSON.stringify(before)===JSON.stringify(this._notes))return false;this.history.push(clone(before));if(this.history.length>100)this.history.shift();this.future=[];return true;}
 editNote(id,patch){if(this.gesture)throw Error('Finish or cancel the current gesture');const n=this.validate(id,patch),before=clone(this._notes);this._notes=this._notes.map(x=>x.id===id?n:x);return this.push(before);}
 beginGesture(owner,id){if(!this._notes.some(n=>n.id===id)||this.pointers.has(owner))return false;this.pointers.add(owner);if(this.pointers.size>1){if(this.gesture)this._notes=this.gesture.before;this.gesture=null;return false;}if(!this._notes.some(n=>n.id===id))return false;this.gesture={owner,id,before:clone(this._notes)};return true;}
 previewGesture(owner,patch){if(!this.gesture||this.gesture.owner!==owner||this.pointers.size!==1)return false;const n=this.validate(this.gesture.id,patch);this._notes=this._notes.map(x=>x.id===n.id?n:x);return true;}
 commitGesture(owner){this.pointers.delete(owner);if(!this.gesture||this.gesture.owner!==owner)return false;const before=this.gesture.before;this.gesture=null;return this.push(before);}
 cancelGesture(owner){this.pointers.delete(owner);if(!this.gesture||this.gesture.owner!==owner)return false;this._notes=this.gesture.before;this.gesture=null;return true;}
 cancelAll(){if(this.gesture)this._notes=this.gesture.before;this.gesture=null;this.pointers.clear();}
 undo(){this.cancelAll();if(!this.history.length)return false;this.future.push(clone(this._notes));this._notes=this.history.pop();return true;}
 redo(){this.cancelAll();if(!this.future.length)return false;this.history.push(clone(this._notes));this._notes=this.future.pop();return true;}
 changes(){return this._notes.flatMap((n,i)=>JSON.stringify(n)===JSON.stringify(this.original[i])?[]:[{id:n.id,track:n.track,before:clone(this.original[i]),after:clone(n),status:'local-draft'}]);}
 invalidate(reason){this.cancelAll();this.reason=reason;this.connected=false;}
 apply(){throw Error('A reviewed typed source transaction is required; this example never writes a device');}
}
