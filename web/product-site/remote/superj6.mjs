// SPDX-License-Identifier: GPL-3.0-only
// Measured fields of one original preset. The upstream waveform/PWM audit is
// experiments/sound-hardware-v1/sj6-amp2/oscillator-prenote.tar.gz at
// gobbajogger/DnBOX 7e68fc39608d88441d2923277b53364f1d5248bf.
// Other fields of the original program and the original engine are not included.
export const SUPERJ6_PROGRAM = Object.freeze({
  bank:'Intro Bank', name:'PWM String Pad',
  bankId:'84B1A8EB-BA34-4B8B-B3BE-6FE8CADB40DA',
  programId:'4DBA5169-1A26-45B7-9A8C-BE968BB2EA36',
  bankArchiveSha256:'ab702e00b4cc425c9406b9b2b44e68ba0f40e1125d591fcaa422cc6a8c6272b8',
});
export const SOUND_BANKS=Object.freeze(['CHICAGO','MIAMI','Synth One','SuperJ6','JUNO']);
export const sourceOnlyBank=bank=>bank==='SuperJ6'||bank==='Synth One';
export const WAVE_STOPS=Object.freeze([0,Math.fround(1/3),Math.fround(2/3),1]);
const waveNames=['Sine','Triangle','Saw','Square'];
const sections=[
  ['Layer 1',[[82,'Wave','wave',1],[210,'PWM','enable',1],[78,'Width','width',0.1263203]]],
  ['Layer 2',[[83,'Wave','wave',1],[211,'PWM','enable',1],[79,'Width','width',0.50431365]]],
  ['Sub',[[202,'Level','level',0.10799015]]],
  ['LFO 1',[[195,'Mode','mode',1],[88,'Rate','rate',0.19909006]]],
  ['LFO 2',[[196,'Mode','mode',0],[96,'Rate','rate',0.20779613]]],
  ['LFO 3',[[197,'Mode','mode',1],[100,'Rate','rate',0.27862325]]],
];
const specs=new Map();
const slots=[new Map(),new Map()];
for(const [slot,byField] of slots.entries()) {
  for(const [section,fields] of sections) for(const [field,label,kind,raw] of fields) {
    const {bankId,programId,bankArchiveSha256}=SUPERJ6_PROGRAM;
    const id='superj6/'+bankArchiveSha256+'/'+slot+'/'+bankId+'/'+programId+'|'+field;
    const spec=Object.freeze({id,field,label,kind,section,slot,value:Math.fround(raw),
      context:'Bass '+(slot?'B':'A')+' / SuperJ6 / PWM String Pad / '+section,
      min:0,max:1,step:kind==='wave'?1/3:kind==='enable'||kind==='mode'?1:2**-149});
    specs.set(id,spec); byField.set(field,spec);
  }
}
export const superJ6Specs=Object.freeze([...specs.values()]);
export const superJ6Spec=id=>specs.get(id);
export function acceptsSuperJ6(spec,value) {
  if(!spec||!specs.has(spec.id)||!Number.isFinite(value)||value<0||value>1||Math.fround(value)!==value)return false;
  if(spec.kind==='wave')return WAVE_STOPS.includes(value);
  if(spec.kind==='enable'||spec.kind==='mode')return value===0||value===1;
  return true;
}
const current=(spec,edits)=>edits.get(spec.id)??spec.value;
const read=(slot,field,edits)=>current(slots[slot].get(field),edits);
const decimal=(v,places)=>Number(v.toFixed(places)).toString();
function duty(slot,layer,edits) {
  return read(slot,layer?211:210,edits)===1 ? .5-.47*read(slot,layer?79:78,edits) : .5;
}
export function superJ6Text(spec,value,edits) {
  switch(spec.kind) {
    case 'wave':return waveNames[WAVE_STOPS.indexOf(value)];
    case 'enable':return value?'On':'Off';
    case 'mode':return value?'Hz':'Tempo';
    case 'level':return decimal(100*value,2)+'%';
    case 'width':return decimal(50-47*value,2)+'% duty';
    case 'rate':{
      const mode=read(spec.slot,{88:195,96:196,100:197}[spec.field],edits);
      return mode ? decimal(16*Math.pow(value,3.33),3)+' Hz' : decimal(100*value,2)+'% tempo position';
    }
  }
}
function glyph(spec,value,edits) {
  const line=(points)=>'<svg aria-hidden="true" viewBox="0 0 64 24"><polyline points="'+points+'"/></svg>';
  const position=()=>line('2,19 '+decimal(2+60*value,2)+',19');
  if(spec.kind==='enable'||spec.kind==='mode')return line(value?'5,19 29,19 32,5 59,5':'5,19 59,19');
  if(spec.kind==='level')return position();
  if(spec.kind==='rate') {
    if(read(spec.slot,{88:195,96:196,100:197}[spec.field],edits)===0)return position();
    const hz=16*Math.pow(value,3.33);
    return line(Array.from({length:61},(_,x)=>(2+x)+','+decimal(12-8*Math.sin(2*Math.PI*x/60*hz*.25),2)).join(' '));
  }
  const layer=spec.section==='Layer 2';
  const shape=spec.kind==='width'?3:WAVE_STOPS.indexOf(value);
  if(shape===0)return line(Array.from({length:61},(_,x)=>(2+x)+','+decimal(12-8*Math.sin(x*Math.PI/30),2)).join(' '));
  if(shape===1)return line('2,12 17,3 47,21 62,12');
  if(shape===2)return line('2,21 31,3 31,21 62,3');
  const width=spec.kind==='width'?.5-.47*value:duty(spec.slot,layer,edits);
  const edge=decimal(2+60*width,2);
  return line('2,20 2,4 '+edge+',4 '+edge+',20 62,20');
}
function editor(spec,value,edits) {
  const attributes='data-sj6-field="'+spec.field+'" data-sj6-id="'+spec.id+'" aria-label="'+spec.section+' '+spec.label+'"';
  let options;
  if(spec.kind==='wave')options=WAVE_STOPS.map((stop,i)=>[stop,waveNames[i]]);
  if(spec.kind==='enable')options=[[0,'Off'],[1,'On']];
  if(spec.kind==='mode')options=[[0,'Tempo'],[1,'Hz']];
  if(options)return '<select '+attributes+'>'+options.map(([v,name])=>'<option value="'+v+'"'+(value===v?' selected':'')+'>'+name+'</option>').join('')+'</select>';
  return '<input type="range" '+attributes+' aria-valuetext="'+superJ6Text(spec,value,edits)+'" min="0" max="1" step="any" value="'+value+'">';
}
export function renderSuperJ6(slot,edits) {
  return '<section data-superj6 aria-label="SuperJ6 Draft"><header><h3>'+SUPERJ6_PROGRAM.name+'</h3><span>'+SUPERJ6_PROGRAM.bank+' · Draft</span></header>'+
    '<div class="sj6-groups">'+sections.map(([section,fields])=>'<fieldset><legend>'+section+'</legend>'+
      fields.map(([field])=>{
        const spec=slots[slot].get(field),value=current(spec,edits);
        return '<label class="sj6-unit"><span>'+spec.label+'</span><span data-sj6-glyph="'+field+'">'+glyph(spec,value,edits)+'</span>'+
          '<output data-sj6-display="'+field+'">'+superJ6Text(spec,value,edits)+'</output>'+editor(spec,value,edits)+'</label>';
      }).join('')+'</fieldset>').join('')+'</div></section>';
}
export function paintSuperJ6(root,slot,edits) {
  for(const spec of slots[slot].values()){
    const value=current(spec,edits),out=root.querySelector('[data-sj6-display="'+spec.field+'"]'),art=root.querySelector('[data-sj6-glyph="'+spec.field+'"]');
    const text=superJ6Text(spec,value,edits);
    if(out)out.textContent=text;
    const input=root.querySelector('input[data-sj6-field="'+spec.field+'"]');
    if(input)input.setAttribute('aria-valuetext',text);
    if(art)art.innerHTML=glyph(spec,value,edits);
  }
}
