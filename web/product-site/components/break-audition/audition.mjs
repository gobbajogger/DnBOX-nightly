// Private consumer of the frozen confirmed-five picker. No fetch, samples, package or device route.
export function createAudition(picker,{resolvePrivateUrl,fetchBytes,createAudio=()=>new Audio(),createUrl=blob=>URL.createObjectURL(blob),revokeUrl=url=>URL.revokeObjectURL(url),onState=()=>{}}={}) {
 if(!picker||typeof picker.preview!=='function'||typeof resolvePrivateUrl!=='function'||typeof fetchBytes!=='function')throw new TypeError('verified picker and private preview resolver required');
 let generation=0,closed=false,active=null,pendingFetch=null,current=Object.freeze({status:'idle',id:null,sampleRate:null,error:null});
 const emit=state=>{current=Object.freeze({...state});onState({...current});};
 function cleanup(){
  const old=active;active=null;if(!old)return;
  old.audio.removeEventListener('ended',old.ended);old.audio.removeEventListener('error',old.error);
  try{old.audio.pause();old.audio.remove?.();old.audio.removeAttribute('src');old.audio.load();}finally{revokeUrl(old.url);}
 }
 function stop(){generation++;pendingFetch?.abort();pendingFetch=null;cleanup();emit({status:'idle',id:null,sampleRate:null,error:null});}
 return Object.freeze({
  state:()=>({...current}),
  stop,
  async play(id){
   if(closed)throw new Error('audition is closed');
   const own=++generation;pendingFetch?.abort();const controller=new AbortController();pendingFetch=controller;cleanup();emit({status:'loading',id,sampleRate:null,error:null});
   try{
    const preview=await picker.preview(id,{resolvePrivateUrl,fetchBytes:url=>fetchBytes(url,{signal:controller.signal})});
    if(closed||own!==generation)return false;
    if(preview.sampleRate!==22050||preview.playbackRate!==1)throw new Error('unsupported verified preview rate');
    const url=createUrl(new Blob([preview.bytes],{type:preview.mimeType}));
    let audio;
    try{audio=createAudio();}catch(error){revokeUrl(url);throw error;}
    const ended=()=>{if(own!==generation)return;generation++;cleanup();emit({status:'idle',id:null,sampleRate:null,error:null});};
    const error=()=>{if(own!==generation)return;generation++;cleanup();emit({status:'error',id,sampleRate:22050,error:'Audio decoding or playback failed.'});};
    active={audio,url,ended,error};audio.addEventListener('ended',ended);audio.addEventListener('error',error);
    audio.preload='none';audio.loop=false;audio.autoplay=false;audio.defaultPlaybackRate=1;audio.playbackRate=1;audio.src=url;
    await audio.play();
    if(closed||own!==generation)return false;
    // 'playing' is a media-interface response, not proof of audible browser output.
    emit({status:'playing',id,sampleRate:22050,error:null});return true;
   }catch(error){
    if(own!==generation||closed)return false;
    cleanup();emit({status:'error',id,sampleRate:null,error:'Could not load this preview. Please try again.'});throw error;
   }finally{if(pendingFetch===controller)pendingFetch=null;}
  },
  destroy(){if(closed)return;closed=true;stop();}
 });
}
