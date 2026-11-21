// Only plays captured C-host responses. No firmware model, MIDI or device commands.
export function createReplay(traces,{show,schedule=f=>setTimeout(f,850),cancel=id=>clearTimeout(id),reducedMotion=false}={}){
 const keys=Object.keys(traces);if(!keys.length||typeof show!=='function')throw Error('Invalid replay');
 for(const name of keys){const frames=traces[name];if(!Array.isArray(frames)||!frames.length||frames.some(f=>typeof f.id!=='string'||!Number.isSafeInteger(f.held)||f.held<0||f.held>=2**37||!Number.isInteger(f.padHeld)||f.padHeld<0||f.padHeld>65535||typeof f.label!=='string')||frames.at(-1).held||frames.at(-1).padHeld)throw Error('Invalid replay');}
 let name=keys[0],index=0,timer=null,generation=0,disposed=false,playing=false;
 const alive=()=>{if(disposed)throw Error('Replay disposed');};
 const stop=()=>{generation++;playing=false;if(timer!==null)cancel(timer);timer=null;};
 const display=()=>show(Object.freeze({...traces[name][index],name,index,total:traces[name].length}));
 function select(next){alive();if(!keys.includes(next))throw Error('Unknown replay');stop();name=next;index=0;display();}
 function reset(){alive();stop();index=0;display();}
 function play(){alive();stop();const own=generation;if(reducedMotion){index=(index+1)%traces[name].length;display();return;}
  index=0;display();playing=true;
  const next=()=>{if(disposed||own!==generation)return;index++;display();if(index===traces[name].length-1){playing=false;timer=null;}else timer=schedule(next);};
  timer=schedule(next);
 }
 return Object.freeze({select,reset,play,get playing(){return playing},destroy(){if(disposed)return;stop();disposed=true;}});
}
