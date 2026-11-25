// The source SVG remains an immutable example, not a rerendered native/draft state.
const BODY={x:0,y:20,width:240,height:220};
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sourceFrame(screen){
 if(!screen||screen.runtime_admitted!==false||typeof screen.path!=='string'||typeof screen.body_svg!=='string'||!Array.isArray(screen.controls))throw Error('Immutable source frame required');
 if(!/^<svg\b[^>]*\bviewBox="0 20 240 220"/.test(screen.body_svg))throw Error('Complete source body viewport required');
 const buttons=screen.controls.map((c,index)=>{
  const b=c.bounds;if(!Array.isArray(b)||b.length!==4||!b.every(Number.isFinite)||b[2]<=b[0]||b[3]<=b[1])throw Error('Invalid source-control bounds');
  const[l,t,r,bottom]=b;
  if(l<BODY.x||r>BODY.x+BODY.width||t<BODY.y||bottom>BODY.y+BODY.height)throw Error('Source control outside complete native body');
  const percent=v=>Number(v.toPrecision(12));
  return `<button type="button" class="parameter source-hit" data-param="${esc(screen.path+'|'+c.identity)}" data-param-occurrence="${index}" aria-label="${esc(c.context.name)}, source example ${esc(c.context.display??'')}" style="left:${percent((l-BODY.x)/BODY.width*100)}%;top:${percent((t-BODY.y)/BODY.height*100)}%;width:${percent((r-l)/BODY.width*100)}%;height:${percent((bottom-t)/BODY.height*100)}%"></button>`;
 }).join('');
 return `<div class="source-scene" data-source-frame="${esc(screen.path)}" data-runtime-admitted="false">${screen.body_svg}${buttons}</div>`;
}
