export const PARTS=Object.freeze(['909','808','Bass A','Bass B','BREAK']);
export const DESTINATIONS=Object.freeze([['Projects','../projects/'],['Samples','../breaks/'],['Presets','../presets/'],['MIDI exchange','../projects/#project-exchange-root']]);
export class LaunchSelection{
 constructor(){this.targets=Array(5).fill(null);}
 choose(part,pattern){if(!Number.isInteger(part)||part<0||part>=5||!Number.isInteger(pattern)||pattern<0||pattern>=32)throw Error('Invalid launch target');this.targets[part]=pattern;return this.state(part);}
 state(part){return{part:PARTS[part],selected:this.targets[part],loaded:false,playing:false,pending:false};}
}
// Capture on the stable viewport before any callback can replace a note node.
export function bindRollPointers(viewport,{gesture,mode,point,paint}){
 const handlers={pointerdown(e){if(e.button!==0)return;viewport.setPointerCapture(e.pointerId);const id=e.target.closest('[data-note]')?.dataset.note;gesture.down(e,{mode:e.target.closest('[data-edge]')?'length':mode(),edge:e.target.closest('[data-edge]')?.dataset.edge,id,point:point(e),scroll:{x:viewport.scrollLeft,y:viewport.scrollTop}});e.preventDefault();paint();},pointermove(e){const p=gesture.move(e,point(e));if(p){viewport.scrollLeft=p.x;viewport.scrollTop=p.y;}},pointerup(e){gesture.up(e);if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);},pointercancel(e){gesture.cancelPointer(e);if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);},lostpointercapture(e){if(gesture.pointers.has(e.pointerId))gesture.cancelPointer(e);}};
 for(const[k,fn]of Object.entries(handlers))viewport.addEventListener(k,fn);
 return()=>{gesture.cancel();for(const[k,fn]of Object.entries(handlers))viewport.removeEventListener(k,fn);};
}
