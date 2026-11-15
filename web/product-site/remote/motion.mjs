// Local MIAMI Wave study, 16 points/raw0..127; no native state or transaction.
export class MotionDraft{
 constructor(){this.values=Array(16).fill(null);this.history=[];this.future=[];this.pointers=new Set();this.gesture=null;}
 begin(owner){this.pointers.add(owner);if(this.pointers.size!==1){if(this.gesture)this.values=this.gesture.before;this.gesture=null;return false;}this.gesture={owner,before:[...this.values]};return true;}
 draw(owner,step,value){if(!this.gesture||this.gesture.owner!==owner||this.pointers.size!==1)return;if(!Number.isInteger(step)||step<0||step>=16||!Number.isInteger(value)||value<0||value>127)throw Error('Invalid motion point');this.values[step]=value;}
 end(owner){this.pointers.delete(owner);if(!this.gesture||this.gesture.owner!==owner)return;const before=this.gesture.before;this.gesture=null;if(JSON.stringify(before)!==JSON.stringify(this.values)){this.history.push(before);this.future=[];}}
 cancel(){if(this.gesture)this.values=this.gesture.before;this.gesture=null;this.pointers.clear();}
 clear(step){if(!Number.isInteger(step)||step<0||step>=16)throw Error('Invalid step');this.cancel();this.history.push([...this.values]);this.values[step]=null;this.future=[];}
 undo(){this.cancel();if(this.history.length){this.future.push([...this.values]);this.values=this.history.pop();}}
 redo(){this.cancel();if(this.future.length){this.history.push([...this.values]);this.values=this.future.pop();}}
}
