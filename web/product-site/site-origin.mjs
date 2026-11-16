// SPDX-License-Identifier: GPL-3.0-only
// The only place the public repo names are spelled out.
// A rename is this object. Every other website, installer, catalog and manifest link uses {{firmwareRepo}} or {{nightlyRepo}}.
import {R22_TOKENS} from './remote/glyphs.mjs';

export const SITE_ORIGIN=Object.freeze({
 owner:'gobbajogger',
 firmwareRepo:'X0X37-for-Loopy-Pro',
 nightlyRepo:'x0x37-for-Loopy-Pro_nightly'
});

export function githubRepo(repo,suffix=''){
 const path=suffix? (suffix.startsWith('/')?suffix:'/'+suffix) : '';
 return `https://github.com/${SITE_ORIGIN.owner}/${repo}${path}`;
}

export function pagesUrl(suffix=''){
 const tail=suffix? (suffix.startsWith('/')?suffix.slice(1):suffix) : '';
 return `https://${SITE_ORIGIN.owner}.github.io/${SITE_ORIGIN.nightlyRepo}/${tail}`;
}

export function expandOrigin(value){
 return String(value).replaceAll('{{nightlyRepo}}',SITE_ORIGIN.nightlyRepo).replaceAll('{{firmwareRepo}}',SITE_ORIGIN.firmwareRepo);
}

if(typeof document!=='undefined'){
 const parse=JSON.parse;
 JSON.parse=function(text,reviver){
  if(typeof text==='string'&&text.includes('{{')) text=expandOrigin(text);
  return parse.call(this,text,reviver);
 };
 const apply=root=>{
  if(!root?.querySelectorAll) return;
  const texts=[];
  const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  while(walk.nextNode()) texts.push(walk.currentNode);
  for(const node of texts) if(node.nodeValue?.includes('{{')) node.nodeValue=expandOrigin(node.nodeValue);
  for(const el of root.querySelectorAll('*')) for(const attr of [...el.attributes]) if(attr.value.includes('{{')) el.setAttribute(attr.name,expandOrigin(attr.value));
  const radii=R22_TOKENS.radii;
  const rootStyle=document.documentElement.style;
  rootStyle.setProperty('--r-control',radii.control+'px');
  rootStyle.setProperty('--r-panel',radii.panel+'px');
  rootStyle.setProperty('--r-note',radii.note+'px');
  rootStyle.setProperty('--r-bar',radii.bar+'px');
  rootStyle.setProperty('--r-field',radii.field+'px');
 };
 const run=()=>apply(document.documentElement);
 if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run);
 else run();
}
