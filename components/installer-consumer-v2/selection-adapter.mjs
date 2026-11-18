// SPDX-License-Identifier: GPL-3.0-only
// Adapter for mountBreakPanel options.onSelection(summary). No DOM replacement or audio transport.
export function createSelectionAdapter(consumer,onState=()=>{}){
 let revision=0,disposed=false,current=null;
 const notify=(status,extra={})=>onState({status,canInstall:false,deviceWriteQualified:false,...extra});
 const cancel=()=>{revision++;consumer.cancel();current=null;notify('cancelled');};
 return Object.freeze({
  async onSelection(summary){
   if(disposed)throw Error('selection adapter disposed');
   const my=++revision;consumer.cancel();current=null;notify('preparing');
   try{const ids=summary?.selectedIds;if(!Array.isArray(ids))throw Error('selectedIds required');const plan=await consumer.prepare([...ids]);if(my!==revision||disposed)return;current=plan;notify('prepared',{plan,selectedIds:[...plan.selected_ids],writes:plan.writes.map(w=>({slotIndex:w.slot_index,bytes:w.image.length,assetIds:[...w.asset_ids]}))});}
   catch(error){if(my!==revision||disposed)return;current=null;notify('error',{error:error.message});}
  },
  cancel,
  get current(){return current;},
  destroy(){if(disposed)return;disposed=true;cancel();}
 });
}
