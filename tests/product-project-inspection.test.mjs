// Actual project panel/adapter with file and parser boundaries mocked; provider stays null.
import test from'node:test';import assert from'node:assert/strict';import{mountExchange}from'../web/product-site/projects/exchange/panel.mjs';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
class E{constructor(tag='div'){this.tag=tag;this.children=[];this.textContent='';this.disabled=false;this.files=[];}append(n){this.children.push(n);}replaceChildren(){this.children=[];}setAttribute(){}}
function fixture(parser=async project=>({project})){const root=new E();root.ownerDocument={createElement:t=>new E(t)};let exports=0,parsed=0;const api=mountExchange(root,{readProjectFile:async b=>{parsed++;return parser(b);},onFiles:()=>exports++});return{api,root,file:root.children.find(x=>x.tag==='label').children[0],button:root.children.find(x=>x.tag==='button'),status:root.children.at(-1),parsed:()=>parsed,exports:()=>exports};}
test('verified file inspection never enables unavailable renderer or returns export files',async()=>{
 const f=fixture();f.file.files=[{size:3,arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer}];await f.file.onchange();assert.equal(f.parsed(),1);assert.equal(f.button.disabled,true);assert.match(f.status.textContent,/matching firmware renderer/);await f.button.onclick();assert.equal(f.exports(),0);assert.equal(f.button.disabled,true);f.api.dispose();
});
test('oversized project rejects before allocating or calling parser',async()=>{
 const f=fixture();let reads=0;f.file.files=[{size:4*1024*1024+1,arrayBuffer:async()=>{reads++;return new ArrayBuffer(0);}}];await f.file.onchange();assert.equal(reads,0);assert.equal(f.parsed(),0);assert.equal(f.button.disabled,true);assert.match(f.status.textContent,/4 MiB/);f.api.dispose();
});
test('new selection prevents a late old file read from replacing current inspection',async()=>{
 const old=deferred(),seen=[],f=fixture(async project=>{seen.push([...project]);return{project};});f.file.files=[{size:1,arrayBuffer:()=>old.promise}];const pending=f.file.onchange();f.file.files=[{size:1,arrayBuffer:async()=>new Uint8Array([2]).buffer}];await f.file.onchange();const current=f.status.textContent;old.resolve(new Uint8Array([1]).buffer);await pending;assert.deepEqual(seen,[[2]]);assert.equal(f.status.textContent,current);assert.equal(f.button.disabled,true);f.api.dispose();
});
test('dispose while file read is pending prevents parsing and removes event handlers',async()=>{
 const pending=deferred(),f=fixture();f.file.files=[{size:1,arrayBuffer:()=>pending.promise}];const read=f.file.onchange();f.api.dispose();pending.resolve(new ArrayBuffer(1));await read;assert.equal(f.parsed(),0);assert.equal(f.exports(),0);assert.equal(f.file.onchange,null);assert.equal(f.button.onclick,null);assert.equal(f.button.disabled,true);
});
test('invalid parsed project remains unavailable and discloses verification failure',async()=>{
 const f=fixture(async()=>({project:'not bytes'}));f.file.files=[{size:1,arrayBuffer:async()=>new ArrayBuffer(1)}];await f.file.onchange();assert.equal(f.button.disabled,true);assert.match(f.status.textContent,/could not be verified/);assert.equal(f.exports(),0);f.api.dispose();
});
