import {OriginalPresetWorkingFile,downloadOriginalPreset} from './working-file.mjs';
export function mount(root,{read=file=>file.arrayBuffer(),download}={}){
 const working=new OriginalPresetWorkingFile();let disposed=false,paused=false;const cleanups=[],q=id=>root.querySelector('#'+id),status=t=>q('status').textContent=t;
 const reset=()=>{working.clearPreview();for(const id of['keep','edit','original'])q(id).disabled=true;};
 const on=(id,type,fn)=>{const node=q(id),guarded=async(...args)=>{if(!disposed&&!paused)return fn(...args)};node.addEventListener(type,guarded);cleanups.push(()=>node.removeEventListener?.(type,guarded));};
 on('file','change',async()=>{reset();try{const doc=await working.open(q('file').files[0],q('profile').value,read);if(!doc||doc!==working.document)return;const select=q('preset');select.replaceChildren();doc.names.forEach((name,i)=>{const option=(root.ownerDocument??root).createElement('option');option.value=String(i);option.textContent=name;select.append(option);});q('name').value=doc.names[0]??'';q('keep').disabled=false;q('edit').disabled=!doc.count;q('original').disabled=false;status(`${doc.count} presets ready to preview. Original fields and sequence data stay intact. ${doc.warnings.join(" ")} Native application is unavailable.`);}catch{status('Not imported. Choose a valid file for the selected original format, up to8MiB.');}});
 on('profile','change',()=>{reset();status('Choose a file for the selected format.');});
 on('preset','change',()=>{q('name').value=working.document?.names[Number(q('preset').value)]??'';});
 on('edit','click',()=>{try{working.rename(Number(q('preset').value),q('name').value);const doc=working.document;const options=q('preset').options??q('preset').children;for(let i=0;i<options.length;i++)options[i].textContent=doc.names[i];status('Name edit staged. Choose Keep when ready.');}catch{status('Choose an existing preset and a valid name.');}});
 on('keep','click',()=>{if(!working.document)return;working.keep();q('export').disabled=false;status('Kept in this tab. Download a separate original-format copy.');});
 on('cancel','click',()=>{reset();status('Preview discarded. Your kept file is unchanged.');});
 on('original','click',()=>{working.download('original',download);});
 on('export','click',()=>{working.download('kept',download);});
 return{canApply:false,suspend(){if(disposed)return;paused=true;reset();q('export').disabled=true;},resume(){if(disposed)return;paused=false;q('export').disabled=!working.hasKept;},destroy(){if(disposed)return;disposed=true;reset();working.clear();q('export').disabled=true;for(const off of cleanups)off();}};
}
if(typeof document!=='undefined'){
 const app=mount(document,{download:downloadOriginalPreset});
 window.addEventListener('pagehide',event=>event.persisted?app.suspend():app.destroy());window.addEventListener('pageshow',event=>{if(event.persisted)app.resume();});
}
