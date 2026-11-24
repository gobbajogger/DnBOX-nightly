// SPDX-License-Identifier: GPL-3.0-only
import {CAP, KEEP, NOTIFY_KIND} from './dnr3.mjs';

const PART = {chicago: 2, miami: 3};
const RULES = {velocity:127, accent:1, slide:1, end:15};
const RECORD = {note:127, gate:2, ...RULES};
const bounded = (x, max) => Number.isInteger(x) && x >= 0 && x <= max;
const validRecord = r => r && Object.entries(RECORD).every(([field,max]) => bounded(r[field],max));
const sameRecord = (a,b) => validRecord(a) && validRecord(b) && Object.keys(RECORD).every(k=>a[k]===b[k]);
const getPref = (part,pat) => ({kind:5,a:part-2,b:pat+1,c:0}); // native R_BLEN, explicitly addressed
const getAddress = (reply,part) => {
  const pat = reply?.ppat?.[part];
  const crc = reply?.pattern_crc?.[pat];
  if (!bounded(pat,31) || !bounded(crc,KEEP)) throw Error('No confirmed active pattern');
  return {part,pat,crc};
};
const sameAddress = (a,b) => a.part===b.part && a.pat===b.pat && a.crc===b.crc;
function validStep(reply, address, step) {
  return reply?.part===address.part && reply?.pat===address.pat && reply?.step===step && validRecord(reply.record);
}
async function readLength(rpc, address) {
  const pref = getPref(address.part,address.pat);
  const [len] = await rpc.paramGet([pref]);
  if (!len || !Object.keys(pref).every(k=>pref[k]===len[k]) || !bounded(len.value,63) || len.max!==63)
    throw Error('No confirmed bass pattern length');
  return len.value+1;
}
export async function readBassRoll(rpc, part, stepLimit=64) {
  const address = getAddress(await rpc.state(),part);
  const length = await readLength(rpc,address);
  if (length > stepLimit) throw Error('Bass length exceeds firmware step capacity');
  const steps = [];
  for (let step=0;step<length;step++) {
    const loaded = await rpc.stepGet(part,address.pat,step);
    if (!validStep(loaded,address,step)) throw Error('Unexpected bass step readback');
    steps.push(loaded.record);
  }
  if (!sameAddress(address,getAddress(await rpc.state(),part))) throw Error('Active pattern changed while reading');
  return {...address,length,steps};
}
export async function writeBassStep(rpc, snapshot, step, field, value, current=()=>true) {
  if (!Object.hasOwn(RULES,field) || !bounded(value,RULES[field]) || snapshot.steps[step]?.gate !== 1 || !bounded(step,snapshot.length-1))
    throw Error('This change is not a supported live note edit');
  if (snapshot.crc===KEEP) throw Error('This pattern cannot be written with a CRC guard');
  const addr=getAddress(await rpc.state(),snapshot.part);
  if (!sameAddress(snapshot,addr) || !current()) throw Error('Active pattern changed; reload before editing');
  const latest=await rpc.stepGet(addr.part,addr.pat,step);
  if (!validStep(latest,addr,step)||!sameRecord(snapshot.steps[step],latest.record))
    throw Error('Step changed; reload before editing');
  if (!sameAddress(addr,getAddress(await rpc.state(),addr.part)) || !current()) throw Error('Active pattern changed; reload before editing');
  const record={...latest.record,[field]:value};
  const {fields:ack}=await rpc.stepSet(addr.part,addr.pat,step,record,addr.crc);
  if (!validStep(ack,addr,step) || !sameRecord(ack.record,record)) throw Error('Device did not confirm this change');
  const fresh=await rpc.stepGet(addr.part,addr.pat,step);
  if (!validStep(fresh,addr,step) || !sameRecord(record,fresh.record))
    throw Error('Device did not read back this change');
}
export async function writeBassLength(rpc, snapshot, length, current=()=>true) {
  if (!bounded(length,64)||length===0) throw Error('Pattern length must be 1–64 steps');
  const addr=getAddress(await rpc.state(),snapshot.part);
  if (!sameAddress(snapshot,addr)||!current()) throw Error('Active pattern changed; reload before editing');
  if (await readLength(rpc,addr)!==snapshot.length) throw Error('Length changed; reload before editing');
  if (!sameAddress(addr,getAddress(await rpc.state(),addr.part))||!current()) throw Error('Active pattern changed; reload before editing');
  const pref=getPref(addr.part,addr.pat);
  const {fields:ack}=await rpc.paramSet(pref,length-1,snapshot.length-1);
  if (!ack || !Object.keys(pref).every(k=>pref[k]===ack[k]) || ack.value!==length-1 || await readLength(rpc,addr)!==length)
    throw Error('Device did not read back this length');
}
const pitch=n=>['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][n%12]+(Math.floor(n/12)-1);

export function mountBassRoll(root, link, getPart, onScope=()=>{}) {
  const doc=root.ownerDocument, roll=doc.getElementById('roll-view');
  const node=doc.createElement('section');
  node.className='bass-live-roll';node.hidden=true;
  node.setAttribute('aria-label','Bass pattern source');
  roll.prepend(node);
  let snapshot=null, selected=null, part=null, session=null, source='draft', wantedDraft=false, page=0;
  let loading=false, writing=false, desync=true, message='', version=0, serial=null, position=null;
  const capable=()=>!!(link.hello()?.caps&CAP.STEP)&&!!(link.hello()?.caps&CAP.PARAM);
  const live=()=>source==='firmware';
  function cancel(){version++;snapshot=null;selected=null;page=0;desync=true;message='';position=null;}
  function sync(){
    const n=PART[getPart()]??null;
    const s=link.bassRollClient();
    if (n!==part||s!==session) {
      if (s!==session) {wantedDraft=false;source='draft';}
      part=n;session=s;cancel();
    }
    if (part!==null&&session&&capable()&&!wantedDraft) source='firmware'; else source='draft';
    paint();
    if (visible()&&live()) void refresh();
  }
  function visible(){return !roll.hidden&&part!==null;}
  function paint(){
    node.hidden=part===null;
    if(part===null){delete roll.dataset.bassRollSource;onScope();return;}
    roll.dataset.bassRollSource=source;onScope();
    const focus=doc.activeElement?.closest('[data-roll-focus]')?.dataset.rollFocus;
    const count=snapshot?.length??0;
    const locked=desync||writing||!snapshot, unavailable=!(session&&capable());
    const controls=`<header><button data-roll-source="draft" data-roll-focus="draft" aria-pressed="${!live()}">Draft</button><button data-roll-source="firmware" data-roll-focus="firmware" aria-pressed="${live()}" ${unavailable?'disabled':''}>Firmware</button>${live()?'<button data-roll-reload data-roll-focus="reload">Refresh</button>':''}</header>`;
    const pattern=snapshot?`P${String(snapshot.pat+1).padStart(2,'0')}`:'';
    if(!live()){node.innerHTML=controls+'<p>Draft · browser only</p>';}
    else if(!snapshot){node.innerHTML=controls+`<p role="status">${message||'Reading active firmware pattern…'}</p>`;}
    else {
      const shown=snapshot.steps.slice(page*16,(page+1)*16);
      const pitches=shown.filter(rec=>rec.gate===1).map(rec=>rec.note);
      const highest=Math.max(60,...pitches),lowest=Math.min(48,...pitches);
      const pitchRange=highest-lowest;
      const grid=shown.map((rec,i)=>{
        const step=page*16+i, span=rec.end?rec.end/15:1;
        const elevation=100*(highest-rec.note)/pitchRange;
        const label=rec.gate===1?pitch(rec.note):rec.gate===2?'Tie':'Rest';
        return `<button data-roll-step="${step}" data-roll-focus="step-${step}" aria-pressed="${selected===step}" aria-label="Step ${step+1}: ${label}" style="--bass-pitch:${rec.gate===1?elevation:50}%" ${locked?'disabled':''}><small>${step+1}</small><span class="bass-native-pitch"><strong>${label}</strong>${rec.gate===1?`<i style="--bass-gate:${span*100}%"></i>`:''}</span><span>${rec.accent&&rec.gate===1?'Accent ':''}${rec.slide&&rec.gate===1?'Slide':''}</span></button>`;
      }).join('');
      const rec=snapshot.steps[selected??-1];
      const canWrite=!locked&&snapshot.crc!==KEEP;
      const edit=rec?.gate===1?`<div class="bass-live-fields"><strong>Step ${selected+1}: ${pitch(rec.note)}</strong><label>Velocity (0 = default)<input data-roll-field="velocity" data-roll-focus="velocity" type="number" min="0" max="127" value="${rec.velocity}" ${canWrite?'':'disabled'}></label><label>Release fraction (0 = full)<input data-roll-field="end" data-roll-focus="end" type="number" min="0" max="15" value="${rec.end}" ${canWrite?'':'disabled'}></label><button data-roll-field="accent" data-roll-focus="accent" aria-pressed="${!!rec.accent}" ${canWrite?'':'disabled'}>Accent</button><button data-roll-field="slide" data-roll-focus="slide" aria-pressed="${!!rec.slide}" ${canWrite?'':'disabled'}>Slide</button></div>`:'<p>Select a note step to edit its supported fields.</p>';
      node.innerHTML=controls+`<p role="status">Firmware · Active ${pattern} · ${message||'Confirmed'}${!canWrite&&snapshot.crc===KEEP?' · Steps are read-only (CRC guard unavailable)':''}</p>
      <div class="bass-live-pages"><label>Pattern length<input data-roll-length data-roll-focus="length" type="number" min="1" max="64" value="${count}" ${locked?'disabled':''}></label>${Array.from({length:Math.ceil(count/16)},(_,i)=>`<button data-roll-page="${i}" data-roll-focus="page-${i}" aria-pressed="${i===page}">${i*16+1}–${Math.min(count,(i+1)*16)}</button>`).join('')}</div>
      <div class="bass-live-steps">${grid}</div>${edit}<p>Pitch changes, note placement, ties, chance and group edits are Draft only. The firmware protocol cannot safely preserve chords during pitch edits.</p>`;
    }
    showPosition();
    if(focus)node.querySelector(`[data-roll-focus="${focus}"]`)?.focus({preventScroll:true});
  }
  function showPosition(){
    for(const b of node.querySelectorAll('[data-roll-step]')){
      const on=position!==null&&Number(b.dataset.rollStep)===position;
      if(on)b.setAttribute('data-firmware-playhead','true');else b.removeAttribute('data-firmware-playhead');
    }
  }
  const relevant=()=>visible()&&live()&&session&&capable();
  async function refresh(){
    if(!relevant()||loading||writing)return;
    loading=true;
    const v=version, rpc=session, active=part;
    try{
      const state=getAddress(await rpc.state(),active);
      if(v!==version || !relevant())return;
      if(!desync&&snapshot&&sameAddress(snapshot,state))return;
      if(!desync){desync=true;paint();}
      const next=await readBassRoll(rpc,active,link.hello()?.nsteps??0);
      if(v!==version||!relevant())return;
      if(snapshot?.pat!==next.pat){selected=null;page=0;}
      snapshot=next;page=Math.min(page,Math.ceil(next.length/16)-1);
      if(selected>=next.length)selected=null;
      desync=false;if(message!=='Write not confirmed; showing firmware readback.')message='';paint();
    }catch{
      if(v===version&&relevant()){snapshot=null;desync=true;message='Firmware pattern unavailable. Refresh to retry.';paint();}
    }finally{loading=false;}
  }
  async function change(field,val){
    if(!snapshot||desync||writing||!relevant())return;
    const old=snapshot,rpc=session,v=version,step=selected;
    const current=()=>v===version&&relevant();
    writing=true;message='Waiting for firmware…';paint();
    try{
      if(field==='length')await writeBassLength(rpc,old,val,current);
      else await writeBassStep(rpc,old,step,field,val,current);
    }catch{
      if(current()){snapshot=null;message='Write not confirmed; showing firmware readback.';paint();}
    }finally{
      writing=false;
      if(current()){desync=true;void refresh();}
    }
  }
  node.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.rollSource){wantedDraft=b.dataset.rollSource==='draft';cancel();sync();}
    else if(b.dataset.rollReload!==undefined){desync=true;message='';paint();void refresh();}
    else if(b.dataset.rollPage!==undefined){page=Number(b.dataset.rollPage);paint();}
    else if(b.dataset.rollStep!==undefined){selected=Number(b.dataset.rollStep);paint();}
    else if(b.dataset.rollField){const f=b.dataset.rollField;void change(f,1-snapshot.steps[selected][f]);}
  });
  node.addEventListener('change',e=>{
    const t=e.target,f=t.dataset.rollField??(t.dataset.rollLength!==undefined?'length':null);
    if(!f)return;
    if(!t.validity.valid||t.value===''){paint();return;}
    void change(f,Number(t.value));
  });
  link.onState(sync);
  link.onNotify(e=>{
    if(!relevant())return;
    if(e.kind===NOTIFY_KIND.POSITION||e.kind===NOTIFY_KIND.TRANSPORT&&!e.fields.playing){
      const current=e.fields.step_pos?.[part];
      position=bounded(current,63)?current:null;showPosition();return;
    }
    if(e.gap||e.kind===NOTIFY_KIND.PATTERN||e.kind===NOTIFY_KIND.CUE||
      (e.kind===NOTIFY_KIND.STEP&&e.fields.part===part&&e.fields.pat===snapshot?.pat)){
      desync=true;if(!writing){paint();void refresh();}
    }
  });
  function start(){serial??=setInterval(()=>{if(!doc.hidden)void refresh();},500);}
  doc.defaultView?.addEventListener('pagehide',()=>{clearInterval(serial);serial=null;cancel();});
  doc.defaultView?.addEventListener('pageshow',()=>{start();sync();});
  start();sync();
  return {sync};
}
