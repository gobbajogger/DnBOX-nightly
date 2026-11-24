import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mountExchange} from '../web/product-site/projects/exchange/panel.mjs';
import {loadTraceProvider} from '../web/product-site/projects/exchange/provider.mjs';
const {provider,approvedSources}=await loadTraceProvider(async()=>({ok:false}));
class Node {
 constructor(tag=''){this.tag=tag;this.children=[];this.textContent='';this.disabled=false;this.hidden=false;}
 append(n){this.children.push(n);}
 replaceChildren(){this.children=[];this.textContent='';}
 setAttribute(name,value){this[name]=value;}
 text(){return this.hidden?'':this.textContent+' '+this.children.map(n=>n.text()).join(' ');}
}
const html=fs.readFileSync(new URL('../web/product-site/projects/index.html',import.meta.url),'utf8');
const disclosure=html.match(/<section id="project-exchange-availability"[^>]*>(.*?)<\/section>/s)[1].replace(/<[^>]+>/g,' ');
function setup(extra={}){
 const parent=new Node(),notice=new Node(),root=new Node();
 root.ownerDocument={createElement:tag=>new Node(tag)};
 notice.textContent=disclosure;parent.append(notice);parent.append(root);
 let reads=0, exports=0;
 const api=mountExchange(root,{provider,approvedSources,availabilityNotice:notice,
  readProjectFile:async bytes=>{reads++;return {project:bytes};},onFiles(){exports++;},...extra});
 const file=root.children.find(x=>x.tag==='label').children[0];
 async function load(){file.files=[{size:4,arrayBuffer:async()=>new Uint8Array([1,2,3,4]).buffer}];await file.onchange();}
 return {parent,notice,root,api,load,reads:()=>reads,exports:()=>exports};
}
test('actual no-provider reader and disclosure agree before and after valid project check',async()=>{
 for(const opts of [{},{provider:{render(){throw Error('Not admitted');}},approvedSources:[]}]){
  const t=setup(opts);
  for(const loaded of [false,true]){
   if(loaded)await t.load();
   const text=t.parent.text();
   assert.match(text,/Browser MIDI export is unavailable/);
   assert.match(text,/You can still check a project file or back up and restore full projects/);
   assert.match(text,/A Remote draft is not a project file and cannot be exported as MIDI/);
   assert.match(text,/Check a project file/);
   assert.match(text,/Choose a DnBOX project file to check/);
   assert.doesNotMatch(text,/Take your sequences into Live|Export a project as MIDI tracks|Prepare MIDI export|Export length|source-executed browser provider/);
   assert.equal(t.root.children.some(x=>x.tag==='button'||x.children.some(n=>n.type==='number')),false);
  }
  assert.match(t.parent.text(),/Project checked/);assert.equal(t.reads(),1);assert.equal(t.exports(),0);
  t.api.dispose();assert.match(t.parent.text(),/Browser MIDI export is unavailable/);
 }
});
test('admitted provider keeps the export labels, gated controls and file-based enablement',async()=>{
 const t=setup({provider:{render(){throw Error('Do not export in this test');}},approvedSources:['test-authority']});
 assert.equal(t.notice.hidden,true);
 assert.match(t.parent.text(),/Take your sequences into Live.*Export a project as MIDI tracks.*Export length in seconds.*Prepare MIDI export/s);
 const b=t.root.children.find(n=>n.tag==='button');assert.equal(b.disabled,true);
 await t.load();assert.equal(b.disabled,false);assert.equal(t.exports(),0);
 t.api.dispose();assert.equal(b.disabled,true);
});
