// Actual shared navigation controller; event/layout doubles, not viewport/browser proof.
import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const source=readFileSync(new URL('../web/product-site/site-shell.mjs',import.meta.url),'utf8');
function element(){const events={},attrs={},classes=new Set();return {events,attrs,hidden:true,focused:false,open:false,inside:true,addEventListener:(k,f)=>events[k]=f,setAttribute:(k,v)=>attrs[k]=v,getAttribute:k=>attrs[k],focus(){this.focused=true;},classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),toggle(k,on){on?classes.add(k):classes.delete(k);},contains:k=>classes.has(k)}};}
function fixture(matches=true){
 const header=element(),toggle=element(),nav=element(),more=element(),summary=element(),jump=element(),doc=element(),media=element();media.matches=matches;
 const link=element();link.href='https://example.test/repo/manual/';const other=element();other.href='https://example.test/repo/presets/';
 header.querySelector=s=>s==='.nav-toggle'?toggle:nav;header.contains=e=>Boolean(e?.inside);nav.querySelector=()=>more;nav.querySelectorAll=()=>[link,other];more.querySelector=()=>summary;
 doc.querySelector=()=>header;doc.querySelectorAll=()=>[jump];
 Function('document','matchMedia','location','URL',source)(doc,()=>media,{href:'https://example.test/repo/manual/?mode=read#chapter'},URL);
 return{header,toggle,nav,more,summary,jump,doc,media,link,other};
}
test('mobile menu exposes links on toggle and Escape restores keyboard focus',()=>{
 const f=fixture();assert.equal(f.toggle.hidden,false);assert.equal(f.more.open,true);assert.equal(f.toggle.attrs['aria-expanded'],'false');
 f.toggle.events.click();assert.equal(f.toggle.attrs['aria-expanded'],'true');assert.equal(f.header.classList.contains('nav-open'),true);
 f.doc.events.keydown({key:'Escape'});assert.equal(f.toggle.attrs['aria-expanded'],'false');assert.equal(f.toggle.focused,true);assert.equal(f.header.classList.contains('nav-open'),false);
});
test('outside click and focus leaving close mobile menu; internal focus does not',()=>{
 const f=fixture();f.toggle.events.click();f.header.events.focusout({relatedTarget:{inside:true}});assert.equal(f.toggle.attrs['aria-expanded'],'true');
 f.header.events.focusout({relatedTarget:{inside:false}});assert.equal(f.toggle.attrs['aria-expanded'],'false');
 f.toggle.events.click();f.doc.events.click({target:{inside:false}});assert.equal(f.toggle.attrs['aria-expanded'],'false');
});
test('following a nav link closes menu without swallowing navigation',()=>{
 const f=fixture();f.toggle.events.click();let prevented=false;
 f.nav.events.click({target:{closest:()=>f.link},preventDefault:()=>prevented=true});assert.equal(f.toggle.attrs['aria-expanded'],'false');assert.equal(prevented,false);
 assert.equal(f.link.attrs['aria-current'],'page');assert.equal(f.other.attrs['aria-current'],undefined);
});
test('responsive transition resets stale open state and desktop More Escape restores summary focus',()=>{
 const f=fixture();f.toggle.events.click();f.media.matches=false;f.media.events.change();assert.equal(f.toggle.hidden,true);assert.equal(f.more.open,false);assert.equal(f.toggle.attrs['aria-expanded'],'false');
 f.more.open=true;f.doc.events.keydown({key:'Escape'});assert.equal(f.more.open,false);assert.equal(f.summary.focused,true);
 f.media.matches=true;f.media.events.change();assert.equal(f.toggle.hidden,false);assert.equal(f.more.open,true);
});
test('manual jump closes disclosure without suppressing chapter anchor',()=>{
 const f=fixture();f.jump.open=true;let prevented=false;f.jump.events.click({target:{closest:()=>({href:'#chapter'})},preventDefault:()=>prevented=true});assert.equal(f.jump.open,false);assert.equal(prevented,false);
});
test('missing progressive-enhancement header leaves legacy pages runnable',()=>{
 assert.doesNotThrow(()=>Function('document','matchMedia','location','URL',source)({querySelector:()=>null,querySelectorAll:()=>[]},()=>{throw Error('must not run');},{href:''},URL));
});
