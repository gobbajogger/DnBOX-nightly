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
 querySelector(s){if(s==='span')return(this.span??=new Node());const m=s.match(/^\[data-(note|select|lane-onset)="([^"]+)"\]$/);if(m){const n=new Node();n.dataset[m[1]==='lane-onset'?'laneOnset':m[1]]=m[2];return n}return null}
 focus(){document.activeElement=this} showModal(){this.open=true} close(){this.open=false;this.onclose?.()}
}
async function boot(){
let downloaded=null;globalThis.URL.createObjectURL=b=>{downloaded=b;return'blob:source-event-double'};globalThis.URL.revokeObjectURL=()=>{};globalThis.setTimeout=()=>0;const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Node(id));return nodes.get(id)};
const views=['roll','drums','locks','sound','mix','patterns','song','files'].map(v=>Object.assign(new Node(),{dataset:{view:v}})),modes=['select','move','draw','length','pan'].map(v=>Object.assign(new Node(),{dataset:{mode:v}}));
const documentListeners={};
globalThis.document={createElement:()=>({click(){}}),activeElement:null,getElementById:get,querySelectorAll:s=>s==='[data-view]'?views:s==='[data-mode]'?modes:[],querySelector:()=>new Node(),addEventListener(t,f){(documentListeners[t]??=[]).push(f)}};
const windowListeners={};globalThis.window={addEventListener(t,f){(windowListeners[t]??=[]).push(f)}};
globalThis.fetch=async p=>({ok:true,text:async()=>fs.readFileSync(new URL(p,base),'utf8'),json:async()=>JSON.parse(fs.readFileSync(new URL(p,base),'utf8'))});
get('snap').value='off';get('zoom').value='1';get('lane-kind').value='velocity';get('part').value='chicago';get('part').selectedOptions=[{textContent:'Bass A Chicago'}];
await import(new URL('app.mjs?correctionProbe='+(bootId++),base));
const view=v=>views.find(x=>x.dataset.view===v).onclick();
const changePart=(v,label=v)=>{get('part').value=v;get('part').selectedOptions=[{textContent:label}];get('part').onchange()};
const press=id=>get(id).onclick();
return{get,view,changePart,press,mode:v=>modes.find(x=>x.dataset.mode===v).onclick(),windowListeners,documentListeners,download:async()=>downloaded?.text()};}

const event=(target,pointerId=1,extra={})=>({target,pointerId,button:0,clientX:0,clientY:40,preventDefault(){},...extra});
function review(x){x.press('review');return x.get('changes').textContent}
function drive(x,id=8,dx=14){x.view('mix');const controls=JSON.parse(fs.readFileSync(new URL('components.json',base),'utf8')).screens.find(s=>s.path.endsWith('/mix-master.svg')).controls;const target=Object.assign(new Node(),{dataset:{param:'current-state-and-reference/mix-master.svg|1:4:0:2',paramOccurrence:String(controls.findIndex(c=>c.identity==='1:4:0:2'))}});x.get('other-view').emit('pointerdown',event(target,id));const before=Number(x.get('parameter-value').value);x.get('other-view').emit('pointermove',event(target,id,{clientX:dx}));x.get('other-view').emit('pointerup',event(target,id));return{before,after:Number(x.get('parameter-value').value),target}}
function motion(x,id=9){x.view('locks');const n=x.get('motion-grid'),e=event(n,id,{clientX:10,clientY:50});n.onpointerdown(e);n.onpointerup(e)}
function song(x){x.view('patterns');for(let p=0;p<5;p++){const t=Object.assign(new Node(),{dataset:{launchPart:String(p),pattern:String(p+1)}});x.get('other-view').emit('click',{target:t})}x.view('song');x.get('other-view').emit('click',{target:new Node('song-add')})}


const x=await boot();x.view('roll');x.mode('draw');
function draw(pitch,pointerId){const target=new Node(),down=event(target,pointerId,{clientX:150,clientY:(127-pitch)*24+2});x.get('roll-scroll').emit('pointerdown',down);x.get('roll-scroll').emit('pointerup',down)}
draw(60,1);draw(64,2);x.press('draft-save');let doc=JSON.parse(await x.download());const chord=doc.notes.filter(n=>n.id.startsWith('draft'));assert.equal(chord.length,2);assert.equal(chord[0].start,chord[1].start);const ids=chord.map(n=>n.id),lane=()=>x.get('velocity').innerHTML;
const overlappingDirectTargets=()=>[...lane().matchAll(/data-select="([^"]+)"/g)].map(m=>m[1]).filter(id=>ids.includes(id));assert.equal(overlappingDirectTargets().length,1,'One unambiguous direct edit target, not stacked same-onset chord bars');
for(const n of chord)assert.ok(lane().includes('value="'+n.id+'"'),n.id+' exposed in tone chooser');assert.ok(lane().includes('data-lane-start="'+chord[0].start+'"'));
const choose=id=>{const t=Object.assign(new Node(),{dataset:{laneOnset:String(chord[0].start)},value:id});document.activeElement=t;x.get('velocity').emit('change',{target:t});};
choose(ids[0]);assert.deepEqual(overlappingDirectTargets(),[ids[0]]);const t=Object.assign(new Node(),{dataset:{select:ids[0]}}),down=event(t,11,{clientY:40});x.get('velocity').emit('pointerdown',down);x.get('velocity').emit('pointermove',event(t,11,{clientY:20}));x.get('velocity').emit('pointerup',event(t,11,{clientY:20}));x.press('draft-save');doc=JSON.parse(await x.download());assert.notEqual(doc.notes.find(n=>n.id===ids[0]).velocity,chord[0].velocity);assert.equal(doc.notes.find(n=>n.id===ids[1]).velocity,chord[1].velocity);x.press('undo');x.press('draft-save');doc=JSON.parse(await x.download());for(const n of chord)assert.equal(doc.notes.find(x=>x.id===n.id).velocity,n.velocity);x.press('redo');
choose(ids[1]);assert.deepEqual(overlappingDirectTargets(),[ids[1]]);const chance=Object.assign(new Node('chance-value'),{value:'50%'});x.get('inspector').emit('change',{target:chance});x.get('lane-kind').value='chance';x.get('lane-kind').onchange();const bar=Object.assign(new Node(),{dataset:{select:ids[1]}});x.get('velocity').emit('pointerdown',event(bar,12,{clientY:40}));x.get('velocity').emit('pointermove',event(bar,12,{clientY:20}));x.get('velocity').emit('pointerup',event(bar,12,{clientY:20}));x.press('draft-save');doc=JSON.parse(await x.download());assert.notEqual(doc.notes.find(n=>n.id===ids[1]).chance,'50%');assert.equal(doc.notes.find(n=>n.id===ids[0]).chance,undefined);x.press('undo');x.press('draft-save');doc=JSON.parse(await x.download());assert.equal(doc.notes.find(n=>n.id===ids[1]).chance,'50%');
console.log('PASS actual app chord tone chooser preserves exact onset, edits only chosen velocity/chance and Undo/Redo; event doubles, NOT browser hit-testing/touch');
