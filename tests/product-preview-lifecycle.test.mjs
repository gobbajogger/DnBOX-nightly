// Actual panel/picker/audition and admitted WAVs; DOM/media interfaces mocked, not browser proof.
import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{mountBreakPanel}from'../web/product-site/components/break-panel/panel.mjs';
import{createStartingBreakPreview}from'../web/product-site/starting-break-preview.mjs';
import{SAMPLE_CONTRACT_SHA256}from'../web/product-site/sample-pin.mjs';
const base=new URL('../web/product-site/',import.meta.url),contractBytes=new Uint8Array(readFileSync(new URL('sample-contract.json',base))),assets=JSON.parse(new TextDecoder().decode(contractBytes)).assets;
function fixture(){
 const buttons=assets.map(a=>({dataset:{action:'play',id:a.id},attrs:{},textContent:'Play',setAttribute(k,v){this.attrs[k]=v;}})),inputs=assets.map(a=>({dataset:{asset:a.id},checked:true})),fields=Object.fromEntries(['selection-status','capacity','audio-status','selection-export','audio'].map(k=>[k,{textContent:''}])),events={};
 const root={innerHTML:'',querySelectorAll:s=>s==='[data-asset]'?inputs:s==='[data-action="play"]'?buttons:[],querySelector:s=>fields[s.slice(6,-1)],addEventListener:(k,f)=>events[k]=f,removeEventListener:k=>delete events[k],contains:()=>true};
 const audios=[],revoked=[],urls=[];
 const createAudio=()=>{const listeners=new Map();const a={addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k),removed:false,remove(){this.removed=true;},pause(){},removeAttribute(){},load(){},play:async()=>{},fire:k=>listeners.get(k)?.()};audios.push(a);return a;};
 const provider=createStartingBreakPreview({fetchImpl:async url=>{const bytes=new Uint8Array(readFileSync(new URL(url)));let sent=false;return {ok:true,headers:{get:()=>String(bytes.length)},body:{getReader:()=>({read:async()=>sent?{done:true}:(sent=true,{done:false,value:bytes}),cancel:async()=>{},releaseLock(){}})}};}});
 const mount=()=>mountBreakPanel(root,{contractBytes,contractSha256:SAMPLE_CONTRACT_SHA256,...provider,createAudio,createUrl:()=>{const u='blob:fixture-'+urls.length;urls.push(u);return u;},revokeUrl:u=>revoked.push(u)});
 return{mount,buttons,fields,audios,revoked,urls,events};
}
for(const terminal of ['ended','error'])test(`verified preview ${terminal} resets transport label and pressed state`,async()=>{
 const f=fixture(),api=await f.mount();assert.equal(await api.listen(assets[0].id),true);assert.equal(f.buttons[0].textContent,'Stop');assert.equal(f.buttons[0].attrs['aria-pressed'],'true');
 f.audios[0].fire(terminal);assert.equal(f.audios[0].removed,true,'terminal cleanup detaches obsolete native controls');assert.equal(f.buttons[0].textContent,'Play');assert.equal(f.buttons[0].attrs['aria-pressed'],'false');assert.equal(f.buttons[0].attrs['aria-label'],'Play '+assets[0].name);assert.deepEqual(f.revoked,f.urls);
 if(terminal==='error')assert.match(f.fields['audio-status'].textContent,/failed/);else assert.equal(f.fields['audio-status'].textContent,'');
 api.destroy();assert.ok(f.audios.every(a=>a.removed));assert.deepEqual(f.revoked,f.urls);
});
test('switching previews immediately clears old pressed state while bytes verify',async()=>{
 const f=fixture(),api=await f.mount();await api.listen(assets[0].id);const next=api.listen(assets[1].id);
 assert.equal(f.audios[0].removed,true);assert.equal(f.buttons[0].attrs['aria-pressed'],'false');await next;assert.equal(f.buttons[1].attrs['aria-pressed'],'true');assert.equal(f.buttons[0].textContent,'Play');api.destroy();assert.ok(f.audios.every(a=>a.removed));assert.deepEqual(f.revoked,f.urls);
});
test('None cancels pending preview and destroyed panel cannot start another',async()=>{
 const f=fixture(),api=await f.mount(),pending=api.listen(assets[0].id);
 f.events.click({target:{closest:()=>({dataset:{action:'none'}})}});
 assert.equal(await pending,false);assert.deepEqual(api.selectedIds(),[]);assert.equal(f.audios.length,0);assert.ok(f.buttons.every(b=>b.textContent==='Play'&&b.attrs['aria-pressed']==='false'));
 api.destroy();assert.equal(await api.listen(assets[1].id),false);assert.equal(f.audios.length,0);assert.deepEqual(f.revoked,[]);
});
