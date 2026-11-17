export function matchesRecord(record,{channel='all',model='all',query=''}={}){if(channel!=='all'&&record.channel!==channel)return false;if(model!=='all'&&record.models.length&&!record.models.includes(model))return false;return JSON.stringify(record.original).toLowerCase().includes(query.trim().toLowerCase());}

/** Filter first, then page. The complete source history is never mutated or truncated. */
export function pageRecords(records,{page=1,pageSize=20,...filters}={}){
 const size=Number.isSafeInteger(pageSize)&&pageSize>0?Math.min(pageSize,100):20;
 const matched=records.filter(record=>matchesRecord(record,filters));
 const pages=Math.max(1,Math.ceil(matched.length/size));
 const current=Math.min(pages,Math.max(1,Number.isSafeInteger(page)?page:1));
 return {records:matched.slice((current-1)*size,current*size),page:current,pageSize:size,pages,total:matched.length};
}

/** Only supported filter identities are admitted from a shareable build URL. */
export function readHistoryFilters(search=''){
 const p=new URLSearchParams(search),channel=p.get('channel'),model=p.get('model');
 return {channel:['main','night'].includes(channel)?channel:'all',model:['elite','pro'].includes(model)?model:'all',query:(p.get('query')??'').slice(0,500)};
}
