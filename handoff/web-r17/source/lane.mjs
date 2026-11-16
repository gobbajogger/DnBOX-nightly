// Exact-onset local lane: one direct target plus explicit access to every chord tone.
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const LANE_TAIL=88;
export function groupsForLane(notes,selected){
 if(!Array.isArray(notes))throw Error('Finite lane notes required');const groups=new Map(),ids=new Set();
 for(const n of notes){if(typeof n?.id!=='string'||!n.id||ids.has(n.id)||!Number.isSafeInteger(n.start)||n.start<0||!Number.isInteger(n.note)||n.note<0||n.note>127||!Number.isInteger(n.velocity)||n.velocity<1||n.velocity>127)throw Error('Invalid lane note');ids.add(n.id);if(!groups.has(n.start))groups.set(n.start,[]);groups.get(n.start).push(structuredClone(n));}
 return[...groups].sort((a,b)=>a[0]-b[0]).map(([start,members])=>{members.sort((a,b)=>a.note-b.note||a.id.localeCompare(b.id));return{start,notes:members,selectedId:members.some(n=>n.id===selected)?selected:members[0].id};});
}
export function renderLane(notes,selected,{endSample,width,kind='velocity',pitchName}){
 if(!Number.isSafeInteger(endSample)||endSample<1||!Number.isFinite(width)||width<=0||!['velocity','chance'].includes(kind)||typeof pitchName!=='function')throw Error('Exact lane timeline required');
 return'<div class="lane-track" style="width:'+(width+LANE_TAIL)+'px">'+groupsForLane(notes,selected).map(g=>{
  if(g.start>endSample)throw Error('Lane onset outside source');const n=g.notes.find(n=>n.id===g.selectedId),condition=n.chance&&!n.chance.endsWith('%'),text=kind==='velocity'?n.velocity:n.chance??'—',height=kind==='velocity'?Math.max(6,n.velocity/127*72):n.chance?(condition?24:Math.max(6,Number(n.chance.slice(0,-1))/100*72)):6,description=kind==='velocity'?'velocity '+n.velocity:n.chance?(condition?'condition ':'chance ')+n.chance:'chance not set';
  const unavailable=kind==='chance'&&!['chicago','miami','drum909','drum808'].includes(n.track);
  const picker=g.notes.length>1?'<select class="lane-tone-picker" data-lane-onset="'+g.start+'" aria-label="Choose chord tone at '+g.start+' samples, '+g.notes.length+' notes">'+g.notes.map((c,i)=>'<option value="'+esc(c.id)+'"'+(c.id===n.id?' selected':'')+'>'+esc(pitchName(c.note))+' · tone '+(i+1)+' · velocity '+c.velocity+'</option>').join('')+'</select>':'';
  return'<div class="lane-group" data-lane-start="'+g.start+'" style="left:'+(g.start/endSample*width)+'px">'+picker+'<button data-select="'+esc(n.id)+'"'+(unavailable?' disabled title="Chance unavailable for this source part"':'')+' style="height:100%" aria-label="'+esc(pitchName(n.note))+', '+esc(description)+', local draft'+(g.notes.length>1?', chosen tone of '+g.notes.length:'')+'" aria-pressed="'+(n.id===selected)+'"><span class="lane-fill" style="height:'+Number((height/72*100).toFixed(6))+'%" aria-hidden="true"></span><span class="lane-readout">'+esc(text)+'</span></button></div>';
 }).join('')+'</div>';
}
