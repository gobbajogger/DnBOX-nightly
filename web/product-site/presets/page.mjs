import {inspect,edit} from './interchange.mjs';
function exportName(name,doc){const suffix=doc.profile==='synthone'?(doc.container==='bank'?'.json':'.synth1'):'.superj6.bank.json';name=String(name??'presets').replace(/[\x00/\\]/g,'_');return name.toLowerCase().endsWith(suffix)?name:name.replace(/\.[^.]*$/,'')+suffix;}
export function mount(root,{read=file=>file.arrayBuffer(),download}={}){
 const document = root.ownerDocument ?? root;
 let revision=0,disposed=false,paused=false,doc=null,original=null,kept=null,originalName=null,keptName=null,keptWarnings=[];
 const cleanups=[],q=id=>root.querySelector('#'+id),status=t=>q('status').textContent=t;
 const text=(id,value)=>{const node=q(id);if(node)node.textContent=value;};
 const reset=()=>{doc=null;original=null;for(const id of ['keep','edit','original','preset','name'])q(id).disabled=true;q('preset').replaceChildren();q('name').value='';text('file-status','No file open.');text('format-notes',keptWarnings.join(' '));};
 const on=(id,type,fn)=>{const node=q(id),guarded=async(...args)=>{if(!disposed&&!paused)return fn(...args);};node.addEventListener(type,guarded);cleanups.push(()=>node.removeEventListener?.(type,guarded));};
 on('file','change',async()=>{
  const own=++revision;reset();const file=q('file').files[0],profile=q('profile').value;if(!file)return;status('Opening '+file.name+'…');
  try{
   if(file.size!==undefined&&(!Number.isSafeInteger(file.size)||file.size<0||file.size>8*1024*1024))throw Error('File too large');
   const bytes=new Uint8Array(await read(file));if(own!==revision||disposed||paused)return;
   doc=inspect(bytes,profile);original=doc.original();originalName=file.name;
   const select=q('preset');doc.names.forEach((name,i)=>{const option=(document??root).createElement('option');option.value=String(i);option.textContent=name;select.append(option);});
   select.value='0';q('name').value=doc.names[0]??'';
   q('keep').disabled=false;q('edit').disabled=!doc.count;q('name').disabled=!doc.count;q('preset').disabled=!doc.count;q('original').disabled=false;
   text('file-status',`${file.name} · ${doc.count} ${doc.count===1?'preset':'presets'}`);text('format-notes',doc.warnings.join(' '));
   status(doc.count?'File open. Rename a preset if you like, then keep this version.':'Bank open. There are no presets to rename; you can keep or download the original file.');
  }catch{if(own===revision&&!disposed&&!paused)status('Not imported. Choose a valid file for the selected format, up to 8 MiB.'+(kept?' Your kept copy is unchanged.':''));}
 });
 on('profile','change',()=>{++revision;reset();q('file').value='';status('Open a file for the selected format.');});
 on('preset','change',()=>{q('name').value=doc?.names[Number(q('preset').value)]??'';});
 on('edit','click',()=>{
  try{doc=inspect(edit(doc,Number(q('preset').value),'name',q('name').value),doc.profile);const options=q('preset').options??q('preset').children;for(let i=0;i<options.length;i++)options[i].textContent=doc.names[i];status('Name changed in this open file. Keep this version when ready.');}
  catch{status('Choose an existing preset and a valid name.');}
 });
 on('keep','click',()=>{if(!doc)return;kept=doc.original();keptName=exportName(originalName,doc);keptWarnings=[...doc.warnings];q('export').disabled=false;text('kept-status','Ready to download: '+keptName);status('Version kept in this tab. Download your copy to save it outside this page.');});
 on('cancel','click',()=>{++revision;reset();q('file').value='';status(kept?'Open file closed. Your kept copy is still ready to download.':'Open file closed. Choose another file when ready.');});
 on('original','click',()=>{if(original)download?.(Uint8Array.from(original),'original',originalName);});
 on('export','click',()=>{if(kept)download?.(Uint8Array.from(kept),'kept',keptName);});
 reset();
 return {canApply:false,suspend(){if(disposed)return;paused=true;++revision;reset();q('export').disabled=true;},resume(){if(disposed)return;paused=false;q('export').disabled=!kept;},destroy(){if(disposed)return;disposed=true;++revision;kept=null;keptWarnings=[];reset();q('export').disabled=true;for(const off of cleanups)off();}};
}
if(typeof document!=='undefined'){
 const app=mount(document,{download(bytes,kind,name){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([bytes],{type:'application/octet-stream'}));a.href=url;a.download=kind+'-'+name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}});
 window.addEventListener('pagehide',event=>event.persisted?app.suspend():app.destroy());window.addEventListener('pageshow',event=>{if(event.persisted)app.resume();});
}
