// SPDX-License-Identifier: GPL-3.0-only
// Real panel -> exact byte consumer. No invented device context or flash writer.
import {mountBreakPanel}from'../break-panel/panel.mjs';
import {createConfirmedConsumer}from'../installer-consumer-v2/composer.mjs';
import {createSelectionAdapter}from'../installer-consumer-v2/selection-adapter.mjs';
export async function mountPreparedChoices(root,options={}){
 let disposed=false,generation=0,adapter=null,controller=null,last=null,task=Promise.resolve();
 const notify=state=>{if(!disposed)options.onState?.(state)};
 const panelOptions=options.panelOptions??options;
 const panel=await(options.mountPanel??mountBreakPanel)(root,{...panelOptions,onSelection(summary){last={...summary,selectedIds:[...(summary.selectedIds??[])]};panelOptions.onSelection?.(last);if(adapter)void adapter.onSelection(last);}});
 async function refreshContext(){
  if(disposed)throw Error('prepared choices disposed');const own=++generation;adapter?.destroy();adapter=null;controller?.abort();controller=new AbortController();
  if(!options.acquireContext){notify({status:'choices-only',canInstall:false,deviceWriteQualified:false});return;}
  try{
   const context=await options.acquireContext({signal:controller.signal});if(disposed||own!==generation)return;
   const consumer=await(options.makeConsumer??createConfirmedConsumer)(context);if(disposed||own!==generation){consumer.cancel();return;}
   adapter=createSelectionAdapter(consumer,notify);if(last)await adapter.onSelection(last);
  }catch(error){if(!disposed&&own===generation)notify({status:'context-unavailable',error:error.message,canInstall:false,deviceWriteQualified:false});}
 }
 task=refreshContext();
 return Object.freeze({canInstall:false,deviceWriteQualified:false,selectedIds:()=>panel.selectedIds(),summary:()=>panel.summary?.(),listen:id=>panel.listen?.(id),get current(){return adapter?.current??null},ready:()=>task,refreshContext(){task=refreshContext();return task;},destroy(){if(disposed)return;disposed=true;generation++;controller?.abort();adapter?.destroy();adapter=null;panel.destroy();}});
}
