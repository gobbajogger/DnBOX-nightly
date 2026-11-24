import {readProjectFile}from'./vendor/x0x_projects.js';
import {mountExchange}from'./panel.mjs';import{loadTraceProvider}from'./provider.mjs';import{storeZip}from'../../components/archive/store.mjs';
const root=document.getElementById('project-exchange-root');let panel;
const {provider,approvedSources}=await loadTraceProvider();
function mount(){panel=mountExchange(root,{readProjectFile,provider,approvedSources,availabilityNotice:document.getElementById('project-exchange-availability'),onFiles(files){const data=storeZip(files),url=URL.createObjectURL(new Blob([data],{type:'application/zip'})),a=document.createElement('a');a.href=url;a.download='DnBOX-MIDI-exchange.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}})}
mount();window.addEventListener('pagehide',()=>panel.dispose());window.addEventListener('pageshow',event=>{if(event.persisted)mount();});
