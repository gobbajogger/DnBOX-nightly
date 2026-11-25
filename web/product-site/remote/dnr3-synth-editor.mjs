// SPDX-License-Identifier: GPL-3.0-only
import {groupSynthRows} from './dnr3-synth-catalog.mjs';

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const title=bank=>bank===2?'Synth One':bank===3?'SuperJ6':null;
const order=[['pitch','Pitch'],['octave','Octave'],['on','Enable']];

function field(x,busy){
 const common=' aria-label="'+esc(x.label)+'" data-live-typed-synth="'+x.id+'" '+(busy?'disabled':'');
 if(x.presentation?.type==='action')return x.writable?
  '<button type="button"'+common+' data-live-typed-action="1">'+esc(x.label)+'</button>':
  '<small>Reset requires verified tuning readback.</small>';
 const offset=x.presentation?.offset??0;
 if(!x.writable)return '<output aria-label="'+esc(x.label)+'">'+esc(x.choices?.[x.value]??x.value+offset)+'</output> <small>Read only</small>';
 if(x.choices&&!offset)return '<select'+common+'>'+x.choices.map((name,n)=>'<option value="'+n+'" '+(n===x.value?'selected':'')+'>'+esc(name)+'</option>').join('')+'</select>';
 return '<input type="number" min="'+offset+'" max="'+(x.max+offset)+'" step="1"'+common+' value="'+(x.value+offset)+'">';
}
function group(rows,busy){
 return groupSynthRows(rows).map(g=>'<h3>'+esc(g.title)+'</h3><div class="encoder-grid">'+g.rows.map(x=>
   x.presentation?.type==='action'?'<div class="mix-panel">'+field(x,busy)+'</div>':'<label class="mix-panel"><span>'+esc(x.label)+'</span> '+field(x,busy)+'</label>').join('')+'</div>').join('');
}
function matrix(rows,busy){
 const steps=new Map(rows.map(x=>[x.presentation.step+':'+x.presentation.stepRole,x]));
 const roles=order.filter(([key])=>rows.some(x=>x.presentation.stepRole===key));
 if(!roles.length)return '';
 return '<div class="synth-step-scroll"><table class="synth-step-grid"><caption>16-step pattern</caption><thead><tr><th scope="col">Step</th>'+
  roles.map(([,label])=>'<th scope="col">'+label+'</th>').join('')+'</tr></thead><tbody>'+
  Array.from({length:16},(_,n)=>'<tr><th scope="row">'+(n+1)+'</th>'+
   roles.map(([key])=>{const x=steps.get(n+':'+key);return '<td>'+(x?field(x,busy):'<span aria-label="Not reported by firmware">—</span>')+'</td>';}).join('')+'</tr>').join('')+'</tbody></table></div>';
}
export function renderSynthEditor(state,section='sound'){
 const engine=title(state.owner?.bank);
 if(!engine||section==='sequence'&&!state.typed)return null;
 const rows=state.rows??[];
 const controls=!state.typed?rows:rows.filter(row=>(row.presentation?.section??'sound')===section);
 const label=section==='sound'?'Sound':'ARP &amp; steps';
 const slot=state.slot===1?' · Bass B':state.slot===0?' · Bass A':'';
 let content='';
 if(controls.length){
   if(section==='sequence'){
    content=group(controls.filter(x=>x.presentation.step===undefined),state.busy)+matrix(controls.filter(x=>x.presentation.step!==undefined),state.busy);
   }else if(!state.typed){
    content='<div class="encoder-grid">'+controls.map(x=>'<label class="mix-panel"><span>'+esc(x.label)+'</span> '+field(x,state.busy)+'</label>').join('')+'</div>';
   }else content=group(controls,state.busy);
 }
 const caption=state.busy?'Verifying firmware readback…':controls.length?controls.length+' controls confirmed':'No controls for this view were reported by this firmware.';
 return '<section data-synth-editor="'+section+'" data-sound-source="firmware"><h2>'+label+' · '+engine+slot+'</h2><p role="status">'+esc(caption)+'</p>'+
   (state.typed&&state.ownerGuard===false?'<p>Read only: this firmware cannot confirm which synth owns an edit.</p>':'')+
   (state.message?'<p role="status">'+esc(state.message)+'</p>':'')+
   (state.typed&&controls.length?'<p>Controls reported by this firmware. Numeric values are device detents.</p>':'')+
   content+'</section>';
}
