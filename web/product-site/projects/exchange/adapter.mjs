import {exportTrace} from './smf.mjs';
const enc=new TextEncoder();
export const GUIDE=`DnBOX MIDI exchange\n\nImport project.mid into Ableton Live Arrangement using Import MIDI File or drag and drop. Accept the tempo/time-signature import when Live offers it. Assign an instrument to each track; no General MIDI drum mapping or engine sound is invented. Individual clips retain the same sample-zero origin and finite duration, so align them together at the arrangement start.\n\nIntentional source on/off pulses at the same sample are retained at the same MIDI tick, including final-boundary cleanup. They are listed in manifest.json; the exporter never lengthens them into invented notes. Their audible or visible interpretation depends on the receiving instrument/DAW.\n\nKeep annotations.json for source slide, tie, accent, probability and motion information. These annotations are not engine emulation. MIDI does not carry DnBOX FX, glide algorithms or BREAK audio. Keep the original .x0xproject for full proprietary backup/restore. No .als or audio stems are produced.\n\nAbleton documents that tempo-map import requires notes spanning the tempo-change range. This exporter never adds fake notes to satisfy that condition; compare the supplied tempo map if the source contains silent sections.\n\nhttps://help.ableton.com/hc/en-us/articles/360003387979-Importing-a-tempo-map\nhttps://www.ableton.com/en/manual/managing-files-and-sets/\nhttps://midi.org/standard-midi-files\n`;
export function canExportProjects(provider,approvedSources){
 return Boolean(provider&&typeof provider.render==='function'&&approvedSources.length>0);
}
export function createExchange({readProjectFile,provider=null,approvedSources=[],onState=()=>{}}){
 if(typeof readProjectFile!=='function')throw Error('Verified project parser required');
 let generation=0,file=null,disposed=false,state=Object.freeze({phase:'empty',canExport:false});
 const set=(phase,extra={})=>{state=Object.freeze({phase,canExport:false,...extra});onState(state);};
 const available=()=>canExportProjects(provider,approvedSources);
 return{get state(){return state;},clear(){++generation;file=null;set('empty');},dispose(){disposed=true;++generation;file=null;set('disposed');},
 async select(bytes){if(disposed)throw Error('Exchange closed');const own=++generation;file=null;set('reading');try{if(!(bytes instanceof Uint8Array))throw Error('Project bytes required');const owned=new Uint8Array(bytes);const parsed=await readProjectFile(owned);if(!(parsed?.project instanceof Uint8Array))throw Error('Project bytes required');if(own!==generation||disposed)return;file={...parsed,project:new Uint8Array(parsed.project)};set(available()?'selected':'provider-unavailable',{canExport:Boolean(available()),message:available()?'Choose the export range.':'Project checked. Browser MIDI export is unavailable.'});}catch{if(own===generation&&!disposed)set('error',{message:'This project could not be verified.'});throw Error('Project verification failed');}},
 async export({seed,endSample}){if(disposed||!file||!available()||state.phase!=='selected')throw Error('Sequence export unavailable');if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff||!Number.isSafeInteger(endSample)||endSample<1||endSample>44100*86400)throw Error('Invalid finite export request');const own=generation;const input=new Uint8Array(file.project);set('rendering');try{
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',input)),b=>b.toString(16).padStart(2,'0')).join('');
  const trace=await provider.render({project:input,seed,endSample,sampleRate:44100});
  if(own!==generation||disposed)throw Error('Selection changed');
  if(trace.authority?.kind!=='source-executed'||!approvedSources.includes(trace.authority.source)||trace.authority.projectSha256!==digest||trace.authority.seed!==seed||trace.endSample!==endSample)throw Error('Trace authority mismatch');
  const out=exportTrace(trace);const files=[{name:'project.mid',bytes:out.midi},...out.clips.map(c=>({name:'clips/'+c.filename,bytes:c.midi})),{name:'annotations.json',bytes:enc.encode(JSON.stringify(out.annotations,null,2))},{name:'manifest.json',bytes:enc.encode(JSON.stringify({...out.metadata,timing:out.timing},null,2))},{name:'READ-ME.txt',bytes:enc.encode(GUIDE)}];
  set('selected',{canExport:true,message:'MIDI files prepared.'});return files;
 }catch{if(own===generation&&!disposed)set('selected',{canExport:true,message:'Sequence export did not complete. Try the matching firmware renderer.'});throw Error('Sequence export did not complete');}}
 };
}
