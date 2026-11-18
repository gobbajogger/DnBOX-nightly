// A failed module or source load must leave a visible recovery path, not dead controls.
export async function startWorkspace({document=globalThis.document,load=()=>import('./app.mjs'),reload=()=>globalThis.location.reload()}={}){
 const regions=[...document.querySelectorAll('header,main')];
 for(const region of regions){region.inert=true;region.setAttribute('aria-busy','true');}
 try{await load();for(const region of regions){region.inert=false;region.setAttribute('aria-busy','false');}return true;}
 catch{
  for(const control of document.querySelectorAll('button,input,select,textarea'))control.disabled=true;
  const error=document.getElementById('workspace-error'),retry=document.getElementById('workspace-retry');
  error.hidden=false;retry.disabled=false;retry.onclick=reload;retry.focus();return false;
 }
}
if(typeof document!=='undefined')void startWorkspace();
