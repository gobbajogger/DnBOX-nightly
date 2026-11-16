// SPDX-License-Identifier: GPL-3.0-only
// Fit the unchanged archive's intrinsic body, never its viewport-dependent root.
const finite=n=>Number.isFinite(Number.parseFloat(n))?Number.parseFloat(n):0;
export function intrinsicArchiveHeight(bodyHeight,bodyStyle={},frameBorder=0){
 return Math.max(1,Math.ceil(finite(bodyHeight)+finite(bodyStyle.marginTop)+finite(bodyStyle.marginBottom)+Math.max(0,finite(frameBorder))));
}
export function mountArchiveFrame(frame){
 let observer=null,generation=0;
 const attach=()=>{
  observer?.disconnect();const own=++generation,doc=frame.contentDocument;
  if(!doc?.body)return;
  const fit=()=>{
   if(own!==generation||frame.contentDocument!==doc)return;
   const bodyStyle=doc.defaultView.getComputedStyle(doc.body),frameStyle=frame.ownerDocument.defaultView.getComputedStyle(frame);
   const border=frameStyle.boxSizing==='border-box'?finite(frameStyle.borderTopWidth)+finite(frameStyle.borderBottomWidth):0;
   const height=intrinsicArchiveHeight(doc.body.getBoundingClientRect().height,bodyStyle,border),value=height+'px';
   if(frame.style.height!==value)frame.style.height=value;
  };
  fit();observer=new ResizeObserver(fit);observer.observe(doc.body);doc.fonts?.ready?.then(fit);
 };
 frame.addEventListener('load',attach);
 if(frame.contentDocument?.readyState==='complete')attach();
 return()=>{++generation;observer?.disconnect();frame.removeEventListener('load',attach);};
}
if(typeof document!=='undefined')for(const frame of document.querySelectorAll('iframe.archive-frame'))mountArchiveFrame(frame);
