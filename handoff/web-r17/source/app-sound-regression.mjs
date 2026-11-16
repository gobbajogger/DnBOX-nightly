import fs from'node:fs';import assert from'node:assert/strict';import{pathToFileURL,fileURLToPath}from'node:url';import{resolve}from'node:path';
const base=pathToFileURL(resolve(process.argv[2]??fileURLToPath(new URL('./',import.meta.url)))+'/');let bootId=0;
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
 focus(){document.activeElement=this} showModal(){this.open=true}
}
async function boot(){
const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Node(id));return nodes.get(id)};
const views=['roll','drums','locks','sound','mix','patterns','song','files'].map(v=>Object.assign(new Node(),{dataset:{view:v}})),modes=['select','move','draw','length','pan'].map(v=>Object.assign(new Node(),{dataset:{mode:v}}));
const documentListeners={};
globalThis.document={activeElement:null,getElementById:get,querySelectorAll:s=>s==='[data-view]'?views:s==='[data-mode]'?modes:[],querySelector:()=>new Node(),addEventListener(t,f){(documentListeners[t]??=[]).push(f)}};
const windowListeners={};globalThis.window={addEventListener(t,f){(windowListeners[t]??=[]).push(f)}};
globalThis.fetch=async p=>({ok:true,text:async()=>fs.readFileSync(new URL(p,base),'utf8'),json:async()=>JSON.parse(fs.readFileSync(new URL(p,base),'utf8'))});
get('snap').value='off';get('zoom').value='1';get('lane-kind').value='velocity';get('part').value='chicago';get('part').selectedOptions=[{textContent:'Bass A Chicago'}];
await import(new URL('app.mjs?correctionProbe='+(bootId++),base));
const view=v=>views.find(x=>x.dataset.view===v).onclick();
const changePart=(v,label=v)=>{get('part').value=v;get('part').selectedOptions=[{textContent:label}];get('part').onchange()};
const press=id=>get(id).onclick();
return{get,view,changePart,press,windowListeners,documentListeners};}

const event=(target,pointerId=1,extra={})=>({target,pointerId,button:0,clientX:0,clientY:40,preventDefault(){},...extra});
function review(x){x.press('review');return x.get('changes').textContent}
function drive(x,id=8,dx=14){x.view('mix');const controls=JSON.parse(fs.readFileSync(new URL('components.json',base),'utf8')).screens.find(s=>s.path.endsWith('/mix-master.svg')).controls;const target=Object.assign(new Node(),{dataset:{param:'current-state-and-reference/mix-master.svg|1:4:0:2',paramOccurrence:String(controls.findIndex(c=>c.identity==='1:4:0:2'))}});x.get('other-view').emit('pointerdown',event(target,id));const before=Number(x.get('parameter-value').value);x.get('other-view').emit('pointermove',event(target,id,{clientX:dx}));x.get('other-view').emit('pointerup',event(target,id));return{before,after:Number(x.get('parameter-value').value),target}}
function motion(x,id=9){x.view('locks');const n=x.get('motion-grid'),e=event(n,id,{clientX:10,clientY:50});n.onpointerdown(e);n.onpointerup(e)}
function song(x){x.view('patterns');for(let p=0;p<5;p++){const t=Object.assign(new Node(),{dataset:{launchPart:String(p),pattern:String(p+1)}});x.get('other-view').emit('click',{target:t})}x.view('song');x.get('other-view').emit('click',{target:new Node('song-add')})}
let failed=0;async function check(id,run){try{await run(await boot());console.log('PASS '+id)}catch(e){failed++;console.error('FAIL '+id+'\n'+e.stack)}}

const soundData=JSON.parse(fs.readFileSync(new URL('source-sounds.json',base),'utf8'));
const idOf=(group,c)=>'source-sound/'+group.bank+'/'+group.bassSlot+'|'+[c.kind,c.target,c.voice,c.parameter,c.sourceBank].join(':');
const chooseBank=(x,bank)=>x.get('other-view').emit('change',{target:Object.assign(new Node('sound-bank'),{value:bank})});
const row=(x,id,p=71)=>{const t=Object.assign(new Node(),{dataset:{param:id}});x.get('other-view').emit('pointerdown',event(t,p));x.get('other-view').emit('pointerup',event(t,p));return t};
await check('all104 original bass scalars reachable under both local slot/bank previews',async x=>{let total=0;for(const slot of[0,1]){x.changePart(slot?'miami':'chicago',slot?'Bass B':'Bass A');x.view('sound');assert.match(x.get('other-view').innerHTML,/Engine <select/);for(const bank of['CHICAGO','MIAMI','JUNO']){chooseBank(x,bank);const group=soundData.contexts.find(g=>g.bank===bank&&g.bassSlot===slot);for(const c of group.controls.filter(c=>c.kind===1)){const id=idOf(group,c);assert.ok(x.get('other-view').innerHTML.includes('data-param="'+id+'"'),id);row(x,id);assert.equal(x.get('parameter-value').disabled,false);assert.equal(Number(x.get('parameter-value').value),c.raw);assert.equal(Number(x.get('parameter-value').max),c.max);total++;}}}assert.equal(total,104)});
await check('same target/voice/parameter in different banks remain reversible independent drafts',async x=>{x.changePart('chicago','Bass A');x.view('sound');const edited=[];for(const bank of['CHICAGO','MIAMI','JUNO']){chooseBank(x,bank);const group=soundData.contexts.find(g=>g.bank===bank&&g.bassSlot===0),c=group.controls.find(c=>c.kind===1&&c.parameter===0),id=idOf(group,c),next=c.raw===c.max?c.raw-1:c.raw+1;row(x,id);x.get('parameter-value').value=String(next);x.get('parameter-value').onchange();edited.push({bank,id,next});}let text=review(x);assert.equal(text.split('\n').length,3);for(const bank of['CHICAGO','MIAMI','JUNO'])assert.ok(text.includes('BASS A / '+bank));for(const e of edited){chooseBank(x,e.bank);row(x,e.id);assert.equal(Number(x.get('parameter-value').value),e.next)}for(let i=0;i<3;i++)x.press('undo');assert.equal(review(x),'No changes.');for(let i=0;i<3;i++)x.press('redo');assert.equal(review(x).split('\n').length,3)});
await check('bank change cancels active raw drag, does not commit or leak into next bank',async x=>{x.changePart('chicago','Bass A');x.view('sound');const g=soundData.contexts.find(g=>g.bank==='CHICAGO'&&g.bassSlot===0),c=g.controls.find(c=>c.kind===1&&c.raw<c.max-2),id=idOf(g,c),t=Object.assign(new Node(),{dataset:{param:id}});x.get('other-view').emit('pointerdown',event(t,83));x.get('other-view').emit('pointermove',event(t,83,{clientX:14}));assert.notEqual(Number(x.get('parameter-value').value),c.raw);chooseBank(x,'JUNO');x.get('other-view').emit('pointerup',event(t,83));assert.equal(review(x),'No changes.');chooseBank(x,'CHICAGO');row(x,id);assert.equal(Number(x.get('parameter-value').value),c.raw)});
await check('BREAK empty loop state visible but cannot be selected as scalar; numeric roles editable',async x=>{x.changePart('breaks','BREAK');x.view('sound');const g=soundData.contexts.find(g=>g.bank==='BREAK');assert.match(x.get('other-view').innerHTML,/INVALID/);assert.match(x.get('other-view').innerHTML,/No loaded loop domain|no loaded loop domain/);for(const c of g.controls.filter(c=>c.kind===12))assert.ok(!x.get('other-view').innerHTML.includes('data-param="'+idOf(g,c)+'"'));const c=g.controls.find(c=>c.kind===10),id=idOf(g,c);row(x,id);assert.equal(Number(x.get('parameter-value').max),100);x.get('parameter-value').value='5';x.get('parameter-value').onchange();assert.match(review(x),/BREAK.*B CHANCE.*0.*5/);x.press('undo');assert.equal(review(x),'No changes.');x.press('redo');assert.match(review(x),/B CHANCE.*5/)});
if(failed)process.exitCode=1;console.log('SOURCE_SOUND_APP_CASES 4; FAILURES '+failed+'; source-event stub, NOT DOM/touch');
