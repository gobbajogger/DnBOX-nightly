import {RemoteConnection,permissionMessage} from './remote.mjs';
const $=id=>document.getElementById(id);let access=null,requesting=false,generation=0,suspended=false,disposed=false;
const active=()=>!suspended&&!disposed;
function render(s){
 if(!active())return;
 $('status').textContent=({disconnected:'Not connected',connecting:'Checking firmware…',identified:s.info?.version?`Firmware replied: ${s.info.version}`:'Firmware replied',error:s.message})[s.phase];
 const busy=s.phase==='connecting'||s.phase==='identified';$('connect').disabled=busy||!access||!$('input').value||!$('output').value;$('input').disabled=$('output').disabled=busy||!access;$('disconnect').disabled=!busy;
 $('next').hidden=s.phase!=='identified';$('next').textContent='This firmware replies to identity checks. Its current protocol does not provide the remote control interface yet.';
}
const connection=new RemoteConnection({onState:render});
function ports(){if(!active()||!access)return;for(const kind of ['input','output']){const select=$(kind),previous=select.value;select.replaceChildren();for(const p of access[`${kind}s`].values())if(p.state==='connected'){const option=document.createElement('option');option.value=p.id;option.textContent=p.name||`MIDI ${kind}`;select.append(option);}if([...select.options].some(o=>o.value===previous))select.value=previous;}render(connection.state);}
function attachAccess(){if(!active()||!access)return;access.onstatechange=async()=>{if(!active())return;const own=generation;if(connection.input?.state==='disconnected'||connection.output?.state==='disconnected')await connection.disconnect();if(own===generation&&active())ports();};ports();}
$('permission').onclick=async()=>{
 if(!active()||requesting||access)return;const own=generation;requesting=true;$('permission').disabled=true;
 try{
  if(!navigator.requestMIDIAccess)throw Object.assign(Error(),{name:'NotSupportedError'});
  const result=await navigator.requestMIDIAccess({sysex:true});
  if(own!==generation||!active())return;access=result;attachAccess();
 }catch(error){if(own===generation&&active())$('status').textContent=permissionMessage(error);}
 finally{requesting=false;if(active())$('permission').disabled=Boolean(access);}
};
$('connect').onclick=()=>{if(!active()||!access)return;const own=generation;return connection.connect(access.inputs.get($('input').value),access.outputs.get($('output').value)).catch(error=>{if(own!==generation||!active())return;$('status').textContent=error?.message==='Previous MIDI connection is still closing'?'The previous connection is still closing. Wait a moment, then check again.':'Unable to check this connection. Check the selected ports and try again.';});};
$('disconnect').onclick=()=>{if(active())return connection.disconnect();};for(const id of ['input','output'])$(id).onchange=()=>ports();
window.addEventListener('pagehide',event=>{
 ++generation;suspended=true;if(!event.persisted)disposed=true;if(access)access.onstatechange=null;
 if(event.persisted)connection.disconnect();else connection.dispose();
 for(const id of ['permission','input','output','connect','disconnect'])$(id).disabled=true;
});
window.addEventListener('pageshow',event=>{if(!event.persisted||disposed)return;suspended=false;$('permission').disabled=requesting||Boolean(access);attachAccess();render(connection.state);});
