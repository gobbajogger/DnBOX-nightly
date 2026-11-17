// SPDX-License-Identifier: GPL-3.0-only
import {pageRecords,readHistoryFilters} from './history-filter.mjs';
const $=id=>document.getElementById(id);
const nodes=new Map([...document.querySelectorAll('[data-record-id]')].map(n=>[n.dataset.recordId,n]));
// Static source records remain a complete usable fallback when fetch is unavailable.
let records=[...nodes].map(([id,node])=>({id,channel:node.dataset.channel,models:(node.dataset.models||'').split(' ').filter(Boolean),original:node.textContent}));
let page=1;
const initial=readHistoryFilters(location.search);
$('channel').value=initial.channel;$('model').value=initial.model;$('history-search').value=initial.query;
function render({focus=false}={}){
 const view=pageRecords(records,{channel:$('channel').value,model:$('model').value,query:$('history-search').value,page,pageSize:Number($('history-page-size').value)});
 page=view.page;
 const visible=new Set(view.records.map(r=>r.id));
 for(const [id,node]of nodes)node.hidden=!visible.has(id);
 $('history-status').textContent=view.total?`${view.total} of ${records.length} records · page ${page} of ${view.pages}`:'No matching records. Try another search or filter.';
 for(const suffix of['','-bottom']){
  $('history-page'+suffix).textContent=`${page} / ${view.pages}`;
  $('history-prev'+suffix).disabled=page<=1;$('history-next'+suffix).disabled=page>=view.pages;
 }
 if(focus){$('history-status').focus({preventScroll:true});$('history-status').scrollIntoView({block:'start',behavior:'instant'});}
}
for(const id of ['channel','model','history-page-size'])$(id).addEventListener('change',()=>{page=1;render();});
$('history-search').addEventListener('input',()=>{page=1;render();});
for(const suffix of['','-bottom']){
 $('history-prev'+suffix).addEventListener('click',()=>{page--;render({focus:true});});
 $('history-next'+suffix).addEventListener('click',()=>{page++;render({focus:true});});
}
render();
try{
 const response=await fetch('../data/history.json',{cache:'no-store'});
 if(!response.ok)throw Error('History metadata unavailable');
 const data=await response.json();
 if(!Array.isArray(data)||data.length!==nodes.size||new Set(data.map(r=>r.id)).size!==nodes.size||data.some(r=>!nodes.has(r.id)||!Array.isArray(r.models)||typeof r.channel!=='string'))throw Error('History record mismatch');
 records=data;render();
}catch{
 $('history-source-status').textContent='Using the complete saved history. Search and page controls remain available.';
}
