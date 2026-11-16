import{PAN_MIN_RAW,PAN_MAX_RAW,clampPan}from'./pan.mjs';
// Pan travel is clipped to L50..R50 (pan.mjs). Full drag maps to that range.
function panSpec(t){if(typeof t.label!=='string'||t.label.toUpperCase()!=='PAN')return t;return{...t,min:Math.max(t.min,PAN_MIN_RAW),max:Math.min(t.max,PAN_MAX_RAW),value:clampPan(t.value)};}
// One bounded parameter per direct gesture. Local draft events only: no transport,
// formatter, guest memory, native mutation or fake firmware acknowledgement.
const finite=Number.isFinite,quantize=(v,s)=>Number(Math.max(s.min,Math.min(s.max,s.min+Math.round((v-s.min)/s.step)*s.step)).toPrecision(12));
function spec(s){if(!s||typeof s.id!=='string'||!s.id||typeof s.label!=='string'||typeof s.context!=='string'||![s.value,s.min,s.max,s.step].every(finite)||s.min>=s.max||s.step<=0||s.value<s.min||s.value>s.max||Math.abs(quantize(s.value,s)-s.value)>1e-8)throw Error('Invalid bounded parameter');return Object.freeze({...s});}
function point(p){if(!p||!finite(p.x)||!finite(p.y))throw Error('Invalid pointer coordinates');return{x:p.x,y:p.y,fine:p.fine===true};}
export class ParameterGesture{
 constructor({onPreview=()=>{},onCommit=()=>{},onCancel=()=>{},span=144,threshold=6}={}){if(!finite(span)||span<=0||!finite(threshold)||threshold<0)throw Error('Invalid gesture scale');Object.assign(this,{onPreview,onCommit,onCancel,span,threshold});this.pointers=new Set();this.current=null;this.blocked=false;this.closed=false;this.history=[];}
 begin(owner,target,p){if(this.closed)return false;const t=panSpec(spec(target)),start=point(p);if(!Number.isSafeInteger(owner))throw Error('Invalid pointer owner');if(this.pointers.has(owner))return false;this.pointers.add(owner);if(this.blocked||this.pointers.size!==1){this.blocked=true;this._cancel('multitouch',true);return false;}this.current={owner,target:t,start,axis:null,value:t.value};return true;}
 state(){const g=this.current;return g?Object.freeze({id:g.target.id,label:g.target.label,context:g.target.context,revision:g.target.revision,value:g.value,axis:g.axis,kind:'local-draft'}):null;}
 move(owner,p){const g=this.current;if(!g||owner!==g.owner||this.blocked||this.pointers.size!==1)return false;p=point(p);const dx=p.x-g.start.x,up=g.start.y-p.y;if(!g.axis){if(Math.max(Math.abs(dx),Math.abs(up))<this.threshold)return false;g.axis=Math.abs(dx)>=Math.abs(up)?'horizontal':'vertical';}const delta=g.axis==='horizontal'?dx:up;const value=quantize(g.target.value+delta/this.span*(g.target.max-g.target.min)*(g.start.fine?.1:1),g.target);if(value===g.value)return false;g.value=value;this.onPreview(this.state());return true;}
 end(owner){this.pointers.delete(owner);if(this.pointers.size===0)this.blocked=false;const g=this.current;if(!g||g.owner!==owner)return false;this.current=null;if(g.value!==g.target.value){const change=Object.freeze({id:g.target.id,label:g.target.label,context:g.target.context,revision:g.target.revision,before:g.target.value,after:g.value,kind:'local-draft'});this.history.push(change);this.onCommit(change);}return true;}
 _cancel(reason,restore){const g=this.current;this.current=null;if(g)this.onCancel(Object.freeze({id:g.target.id,context:g.target.context,revision:g.target.revision,reason,restore:restore?g.target.value:null,kind:'local-draft'}));}
 cancel(reason='cancel'){this._cancel(reason,true);this.pointers.clear();this.blocked=false;}
 invalidate(){this._cancel('context-or-revision',false);this.pointers.clear();this.blocked=false;}
 destroy(){if(this.closed)return;this.closed=true;this._cancel('disposed',false);this.pointers.clear();this.blocked=false;}
}
