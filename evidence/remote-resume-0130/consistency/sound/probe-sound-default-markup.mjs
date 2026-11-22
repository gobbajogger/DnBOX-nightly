import {createHash} from 'node:crypto';
import fs from'node:fs';import assert from'node:assert/strict';import{pathToFileURL,fileURLToPath}from'node:url';import{resolve}from'node:path';
const base=new URL('web/product-site/remote/',pathToFileURL(resolve(process.argv[2])+'/'));let bootId=0;
class Node {
 constructor(id=''){Object.assign(this,{id,handlers:{},dataset:{},style:{setProperty(){}},innerHTML:'',textContent:'',value:'',scrollLeft:0,scrollTop:0,clientHeight:300,disabled:false,captured:new Set(),attributes:{},hidden:false});this.classList={toggle:()=>false};}
 addEventListener(type,fn){(this.handlers[type]??=[]).push(fn)}
 removeEventListener(type,fn){this.handlers[type]=(this.handlers[type]??[]).filter(x=>x!==fn)}
 emit(type,e){for(const fn of this.handlers[type]??[])fn(e)}
 setAttribute(k,v){this.attributes[k]=v} removeAttribute(k){delete this.attributes[k]}
 setPointerCapture(p){this.captured.add(p)} hasPointerCapture(p){return this.captured.has(p)} releasePointerCapture(p){this.captured.delete(p)}
 getBoundingClientRect(){return{left:0,top:0,width:100,height:100}}
 closest(s){if(s==='button')return this;const m=s.match(/^\[data-(note|select|param|edge)\]$/);return m&&this.dataset[m[1]]!==undefined?this:null}
 querySelector(s){if(s==='span')return(this.span??=new Node());const m=s.match(/^\[data-(note|select)="([^"]+)"\]$/);if(m){const n=new Node();n.dataset[m[1]]=m[2];return n}return null}
 focus(){document.activeElement=this} showModal(){this.open=true} close(){this.open=false;this.onclose?.()}
}
async function boot(){
const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Node(id));return nodes.get(id)};
const views=['roll','drums','locks','sound','mix','patterns','song','files'].map(v=>Object.assign(new Node(),{dataset:{view:v}})),modes=['select','move','draw','length','pan'].map(v=>Object.assign(new Node(),{dataset:{mode:v}}));
const documentListeners={};
globalThis.document={activeElement:null,getElementById:get,querySelectorAll:s=>s==='[data-view]'?views:s==='[data-mode]'?modes:[],querySelector:()=>new Node(),addEventListener(t,f){(documentListeners[t]??=[]).push(f)}};
const windowListeners={};globalThis.window={addEventListener(t,f){(windowListeners[t]??=[]).push(f)}};
globalThis.fetch=async p=>({ok:true,text:async()=>fs.readFileSync(new URL(p,base),'utf8'),json:async()=>JSON.parse(fs.readFileSync(new URL(p,base),'utf8'))});
get('zoom').value='1';get('lane-kind').value='velocity';get('part').value='chicago';get('part').selectedOptions=[{textContent:'Bass A Chicago'}];
const app=await import(new URL('app.mjs?correctionProbe='+(bootId++),base));
const view=v=>views.find(x=>x.dataset.view===v).onclick();
const changePart=(v,label=v)=>{get('part').value=v;get('part').selectedOptions=[{textContent:label}];get('part').onchange()};
const press=id=>get(id).onclick();
return{get,view,changePart,press,windowListeners,documentListeners,app};}

const event=(target,pointerId=1,extra={})=>({target,pointerId,button:0,clientX:0,clientY:40,preventDefault(){},...extra});
function review(x){x.press('review');return x.get('changes').textContent}
function drive(x,id=8,dx=14){x.view('mix');const controls=JSON.parse(fs.readFileSync(new URL('components.json',base),'utf8')).screens.find(s=>s.path.endsWith('/mix-master.svg')).controls;const target=Object.assign(new Node(),{dataset:{param:'current-state-and-reference/mix-master.svg|1:4:0:2',paramOccurrence:String(controls.findIndex(c=>c.identity==='1:4:0:2'))}});x.get('other-view').emit('pointerdown',event(target,id));const before=Number(x.get('parameter-value').value);x.get('other-view').emit('pointermove',event(target,id,{clientX:dx}));x.get('other-view').emit('pointerup',event(target,id));return{before,after:Number(x.get('parameter-value').value),target}}
function motion(x,id=9){x.view('locks');const n=x.get('motion-grid'),e=event(n,id,{clientX:10,clientY:50});n.onpointerdown(e);n.onpointerup(e)}
function song(x){x.view('patterns');for(let p=0;p<5;p++){const t=Object.assign(new Node(),{dataset:{launchPart:String(p),pattern:String(p+1)}});x.get('other-view').emit('click',{target:t})}x.view('song');x.get('other-view').emit('click',{target:new Node('song-add')})}
let failed=0;async function check(id,run){try{await run(await boot());console.log('PASS '+id)}catch(e){failed++;console.error('FAIL '+id+'\n'+e.stack)}}

const soundData=JSON.parse(fs.readFileSync(new URL('source-sounds.json',base),'utf8'));
const idOf=(group,c)=>'source-sound/'+group.bank+'/'+group.bassSlot+'|'+[c.kind,c.target,c.voice,c.parameter,c.sourceBank].join(':');
const legacyDraft=fs.readFileSync(new URL('../../../tests/product-remote/fixtures/legacy-sound-banks/both-owners.json',base),'utf8');
async function importLegacyOwners(x,text=legacyDraft){
 await x.get('draft-file').onchange({target:{files:[{size:Buffer.byteLength(text),text:async()=>text}]}});
 assert.equal(x.get('draft-dialog').open,true);
 x.press('draft-replace');
 assert.equal(x.get('draft-dialog').open,false);
}
function chooseBank(x,bank){
 const pane=x.get('other-view');
 if(bank==='JUNO'){
  if(pane.innerHTML.includes('data-restore-legacy-juno')){
   const button=Object.assign(new Node(),{dataset:{restoreLegacyJuno:''}});
   pane.emit('click',{target:button});
  }
  assert.match(pane.innerHTML,/<option value="JUNO" selected disabled>/);
  return;
 }
 pane.emit('change',{target:Object.assign(new Node('sound-bank'),{value:bank})});
}

const states={};
const save=(name,x)=>states[name]=createHash('sha256').update(x.get('other-view').innerHTML).digest('hex');
const x=await boot();
for(const kit of ['909','808']){
 x.changePart('drum'+kit,kit);x.view('sound');
 for(let voice=0;voice<11;voice++){
  const target=Object.assign(new Node('sound-voice'),{value:String(voice)});
  x.get('other-view').emit('change',{target});
  save('drum'+kit+'-voice'+String(voice).padStart(2,'0'),x);
 }
}
for(const part of ['chicago','miami']){
 x.changePart(part,part);x.view('sound');
 for(const bank of ['CHICAGO','MIAMI','SuperJ6','Synth One']){
  chooseBank(x,bank);
  save(part+'-'+bank.toLowerCase().replace(' ','-'),x);
 }
}
x.changePart('breaks','BREAK');x.view('sound');save('breaks',x);
assert.equal(Object.keys(states).length,31);
assert.equal(new Set(Object.values(states)).size,31);
console.log(JSON.stringify(states,null,2));
