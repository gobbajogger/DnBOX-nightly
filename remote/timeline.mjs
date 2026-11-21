// One chronological local command history; never a native undo/transaction bridge.
export class WorkspaceTimeline{
 constructor({limit=100}={}){if(!Number.isInteger(limit)||limit<1||limit>10000)throw Error('Invalid local history bound');this.limit=limit;this.past=[];this.future=[];this.busy=false;}
 get canUndo(){return this.past.length>0;}
 get canRedo(){return this.future.length>0;}
 record(command){if(!command||typeof command.label!=='string'||!command.label||typeof command.undo!=='function'||typeof command.redo!=='function')throw Error('Reversible local command required');if(this.busy)return false;this.past.push(Object.freeze({...command}));if(this.past.length>this.limit)this.past.shift();this.future=[];return true;}
 undo(){return this.replay(this.past,this.future,'undo');}
 redo(){return this.replay(this.future,this.past,'redo');}
 replay(from,to,method){if(this.busy||!from.length)return null;const command=from.at(-1);this.busy=true;try{command[method]();from.pop();to.push(command);return command.label;}finally{this.busy=false;}}
}
