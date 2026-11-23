import {canExportProjects,createExchange} from './adapter.mjs';
// Inject existing Projects readProjectFile; no new binary layout or automatic device read.
export function mountExchange(root,{readProjectFile,provider=null,approvedSources=[],availabilityNotice=null,onFiles=()=>{}}){
 const d=root.ownerDocument;root.replaceChildren();const make=(tag,text)=>{let x=d.createElement(tag);if(text)x.textContent=text;root.append(x);return x;};
 const admitted=canExportProjects(provider,approvedSources);
 if(availabilityNotice)availabilityNotice.hidden=admitted;
 if(admitted){make('h2','Take your sequences into Live');make('p','Export a project as MIDI tracks, with timing and pattern markers.');}
 else make('h2','Check a project file');
 const label=make('label',admitted?'Choose a DnBOX project ':'Choose a DnBOX project file to check '),file=d.createElement('input');file.type='file';file.accept='.x0xproject';label.append(file);
 let button=null,seconds=null;
 if(admitted){
  const range=make('label','Export length in seconds ');seconds=d.createElement('input');seconds.type='number';seconds.min='1';seconds.max='86400';seconds.value='60';range.append(seconds);
  button=make('button','Prepare MIDI export');button.disabled=true;
 }
 const status=make('p');status.setAttribute('role','status');
 const exchange=createExchange({readProjectFile,provider,approvedSources,onState:s=>{if(button)button.disabled=!s.canExport;status.textContent=s.message||({reading:'Checking project…',rendering:'Rendering sequence…',empty:'Choose a project to begin.',disposed:''}[s.phase]||'');}});
 let generation=0,dead=false;
 file.onchange=async()=>{const own=++generation;exchange.clear();let selected=file.files?.[0];if(!selected)return;if(selected.size>4*1024*1024){status.textContent='Choose a project smaller than 4 MiB.';return;}try{const bytes=new Uint8Array(await selected.arrayBuffer());if(own!==generation||dead)return;await exchange.select(bytes);}catch{if(own===generation&&!dead)status.textContent='This project could not be verified.';}};
 if(button)button.onclick=async()=>{const own=generation;try{let n=Number(seconds.value);if(!Number.isInteger(n)||n<1||n>86400)throw Error();const files=await exchange.export({seed:0,endSample:n*44100});if(own===generation&&!dead)onFiles(files);}catch{if(!dead)status.textContent='MIDI export needs a valid range and the matching firmware renderer.';}};
 return{dispose(){if(dead)return;dead=true;++generation;exchange.dispose();file.onchange=null;if(button){button.onclick=null;button.disabled=true;}}};
}
