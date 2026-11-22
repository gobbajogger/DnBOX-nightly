import {MidiBroker,RemoteClient} from './vendor/client.mjs';
import {RemoteSurfaceSession,validateBundle} from './session.mjs';
import {PortConnection} from './connection.mjs';
import {mountControls} from './view.mjs';
export function startRemote({document,window,navigator,bundle,randomClient=()=>{let n;do{n=crypto.getRandomValues(new Uint32Array(1))[0]&0x0fffffff;}while(!n);return n;}}){
 const $=id=>document.getElementById(id);let admitted;try{admitted=validateBundle(bundle);}catch{$('status').textContent='The native remote binding is awaiting review. No device controls are enabled in this source preview.';$('permission').disabled=true;return{destroy(){}};}
 let access=null,session=null,view=null,pendingPermission=false,generation=0,suspended=false,disposed=false,closing=null;
 const chosen={input:null,output:null};
 const readOnly=admitted.admission.testOnly!==true;
 const active=()=>!disposed&&!suspended;
 function render(state){if(!active())return;view?.update(state);$('status').textContent=state.message||({connecting:'Connecting to the instrument…',refreshing:'Reading the instrument…',editing:'Waiting for the instrument…',ready:admitted.admission.testOnly?'Synthetic test fixture connected.':'Connected for read-only inspection.',disconnected:'Disconnected.',closing:'Releasing controls…'})[state.phase]||'Refresh or reconnect to continue.';const occupied=['ready','refreshing','editing','connecting','refresh-required'].includes(state.phase);$('connect').disabled=occupied||Boolean(closing)||!access||!$('input').value||!$('output').value;$('refresh').disabled=!['ready','refresh-required'].includes(state.phase);$('disconnect').disabled=!occupied&&!closing;$('input').disabled=$('output').disabled=occupied||Boolean(closing)||!access;}
 const link=new PortConnection({make:(input,output)=>{const own=generation,broker=new MidiBroker({input,output});session=new RemoteSurfaceSession({bundle:admitted,readOnly,createClient:o=>new RemoteClient({...o,client:randomClient()}),onState:s=>{if(own===generation){render(s);if(['connection-lost','release-unconfirmed'].includes(s.phase))close();}}});return{broker,session};}});
 const action=(method,...args)=>{if(!active()||!session||closing||(readOnly&&method!=='refresh'))return;return session[method](...args).catch(()=>{});};
 view=mountControls($('surface'),admitted,{set:(...a)=>action('set',...a),down:(...a)=>action('down',...a),up:(...a)=>action('up',...a)},{readOnly});
 function ports(){
  if(!active()||!access)return;
  const connected=kind=>[...access[kind+'s'].values()].filter(port=>port.state==='connected');
  const portsByKind={input:connected('input'),output:connected('output')};
  const ambiguous=Object.values(portsByKind).some(ports=>ports.length>1);
  for(const [kind,ports] of Object.entries(portsByKind)){
   const node=$(kind);
   node.replaceChildren();
   if(!ports.some(port=>port.id===chosen[kind]))chosen[kind]=null;
   if(ambiguous){
    const placeholder=document.createElement('option');
    placeholder.value='';placeholder.textContent=`Choose MIDI ${kind}`;
    node.append(placeholder);
   }
   for(const port of ports){
    const option=document.createElement('option');
    option.value=port.id;option.textContent=(port.name||`MIDI ${kind}`)+` [${port.id}]`;
    node.append(option);
   }
   node.value=chosen[kind]??(ambiguous?'':ports[0]?.id??'');
  }
  render({phase:'disconnected',values:[]});
 }
 function close(){if(closing)return closing;++generation;view.update({phase:'closing',values:[]});$('connect').disabled=true;closing=(async()=>{const result=await link.close();session=null;closing=null;if(active())render({phase:result.released?'disconnected':'release-unconfirmed',message:result.released?'Disconnected.':'Release was not confirmed. Wait for the firmware lease to expire before reconnecting.',values:[]});return result;})();return closing;}
 const listen=[];const on=(target,type,fn)=>{target.addEventListener(type,fn);listen.push(()=>target.removeEventListener(type,fn));};
 $('permission').onclick=async()=>{if(!active()||pendingPermission||access)return;const own=generation;pendingPermission=true;$('permission').disabled=true;try{if(!navigator.requestMIDIAccess)throw Error('unsupported');const result=await navigator.requestMIDIAccess({sysex:true});if(own!==generation||!active())return;access=result;access.onstatechange=()=>{if(!active())return;if(link.current&&(link.current.input.state==='disconnected'||link.current.output.state==='disconnected'))close();else if(!link.current)ports();};ports();}catch{if(active()&&own===generation)$('status').textContent='MIDI access was not granted or is unavailable. Check browser permissions and try again.';}finally{pendingPermission=false;if(active())$('permission').disabled=Boolean(access);}};
 $('connect').onclick=async()=>{if(!active()||!access||closing||!$('input').value||!$('output').value)return;const own=++generation;render({phase:'connecting',values:[]});try{await link.connect(access.inputs.get($('input').value),access.outputs.get($('output').value));}catch{if(own===generation&&active())render({phase:'error',message:'Connection was not confirmed. Check the port pair. If it is still closing, wait and retry.',values:[]});}};
 $('refresh').onclick=()=>action('refresh');$('disconnect').onclick=close;for(const id of ['input','output'])$(id).onchange=()=>{if(!link.current){chosen[id]=$(id).value||null;ports();}};
 on(window,'blur',()=>{if(link.current)close();});on(document,'visibilitychange',()=>{if(document.hidden&&link.current)close();});
 on(window,'pagehide',event=>{suspended=true;close();if(!event.persisted){disposed=true;view.destroy();if(access)access.onstatechange=null;for(const f of listen)f();for(const id of ['permission','connect','refresh','disconnect'])$(id).onclick=null;}for(const id of ['permission','connect','refresh','disconnect','input','output'])$(id).disabled=true;});
 on(window,'pageshow',event=>{if(event.persisted&&!disposed){suspended=false;ports();$('permission').disabled=pendingPermission||Boolean(access);}});
 render({phase:'disconnected',values:[]});return{close,destroy(){disposed=true;view.destroy();if(access)access.onstatechange=null;for(const f of listen)f();return close();}};
}
