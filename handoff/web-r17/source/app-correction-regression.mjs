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
await check('parameter Review and header Undo/Redo include actual raw change',async x=>{const c=drive(x);assert.equal(c.before,41);assert.equal(c.after,53);assert.equal(x.get('undo').disabled,false);assert.match(review(x),/Drive.*41.*53/);x.press('undo');assert.equal(review(x),'No changes.');x.press('redo');assert.match(review(x),/Drive.*41.*53/);x.press('undo');assert.equal(review(x),'No changes.')});
await check('Motion Review and shared Undo/Redo',async x=>{motion(x);assert.match(review(x),/Motion.*Step 2.*64/);x.press('undo');assert.match(x.get('motion-grid').innerHTML,/Step 2, unset/);assert.equal(review(x),'No changes.');x.press('redo');assert.match(x.get('motion-grid').innerHTML,/Step 2, 64/)});
await check('Song Review and shared Undo/Redo',async x=>{song(x);assert.match(review(x),/Song.*P2.*P3.*P4.*P5.*P6/);x.press('undo');assert.doesNotMatch(x.get('other-view').innerHTML,/<tr><th>1<\/th>/);assert.equal(review(x),'No changes.');x.press('redo');assert.match(x.get('other-view').innerHTML,/<tr><th>1<\/th>/)});
await check('blur cancels and immediately repaints without losing committed history',async x=>{motion(x);const n=x.get('motion-grid'),e=event(n,71,{clientX:25,clientY:25});n.onpointerdown(e);assert.match(n.innerHTML,/Step 5, 95/);for(const fn of x.windowListeners.blur??[])fn({});assert.match(n.innerHTML,/Step 5, unset/);assert.match(n.innerHTML,/Step 2, 64/);assert.doesNotMatch(review(x),/Step 5/);x.press('undo');assert.equal(review(x),'No changes.');x.press('redo');assert.match(n.innerHTML,/Step 2, 64/)});
await check('no-op clear and row update do not hide real undo',async x=>{x.view('locks');x.get('motion-clear').onclick();assert.equal(x.get('undo').disabled,true);song(x);const t=Object.assign(new Node(),{dataset:{songRow:'0'},value:'1'});x.get('other-view').emit('change',{target:t});x.press('undo');assert.equal(review(x),'No changes.');assert.equal(x.get('undo').disabled,true)});
await check('all four domains undo/redo chronologically and new branch discards redo',async x=>{const current=Number(x.get('inspector').innerHTML.match(/data-field="velocity"[^>]*value="(\d+)"/)[1]);const target=Object.assign(new Node(),{dataset:{field:'velocity'},value:String(current===127?126:current+1)});x.get('inspector').emit('change',{target});drive(x);motion(x);song(x);for(const word of['velocity','Drive','Motion','Song'])assert.ok(review(x).includes(word));for(let i=0;i<4;i++)x.press('undo');assert.equal(review(x),'No changes.');assert.equal(x.get('undo').disabled,true);for(let i=0;i<4;i++)x.press('redo');for(const word of['velocity','Drive','Motion','Song'])assert.ok(review(x).includes(word));x.press('undo');x.press('undo');drive(x,18,14);assert.equal(x.get('redo').disabled,true);for(let i=0;i<3;i++)x.press('undo');assert.equal(review(x),'No changes.')});

await check('Review distinguishes same-name parameters by exact kit and voice',async x=>{const select=(path,identity)=>{const controls=JSON.parse(fs.readFileSync(new URL('components.json',base),'utf8')).screens.find(s=>s.path===path).controls;const t=Object.assign(new Node(),{dataset:{param:path+'|'+identity,paramOccurrence:String(controls.findIndex(c=>c.identity===identity))}});x.get('other-view').emit('pointerdown',event(t,81));x.get('other-view').emit('pointerup',event(t,81));};x.changePart('drum909','909');x.view('sound');select('current-state-and-reference/909-voice-00.svg','1:0:0:0');x.get('parameter-value').value=35;x.get('parameter-value').onchange();x.changePart('drum808','808');x.view('sound');select('current-state-and-reference/808-voice-00.svg','1:1:0:3');x.get('parameter-value').value=65;x.get('parameter-value').onchange();const text=review(x),lines=text.split('\n');assert.equal(lines.length,2);assert.match(lines[0],/909.*BD.*Tune.*34.*35/);assert.match(lines[1],/808.*BD.*Tune.*64.*65/);x.press('undo');assert.doesNotMatch(review(x),/808.*Tune/);x.press('redo');assert.match(review(x),/808.*BD.*Tune.*64.*65/)});

if(failed)process.exitCode=1;console.log('CORRECTION_REGRESSION_CASES 7; FAILURES '+failed+'; source-event stub, NOT DOM/touch');
