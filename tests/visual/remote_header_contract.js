/* SPDX-License-Identifier: GPL-3.0-only. Test-only rendered Remote header predicates. */
(mode) => {
 const q=(s)=>document.querySelector(s), issues=[];
 const need=(ok,message)=>{if(!ok)issues.push(message);};
 const rgb=s=>s.match(/\d+(?:\.\d+)?/g)?.map(Number)??[];
 const contains=(outer,inner)=>outer.left<=inner.left+.75&&outer.right>=inner.right-.75&&outer.top<=inner.top+.75&&outer.bottom>=inner.bottom-.75;
 const viewport={left:0,right:innerWidth,top:0,bottom:innerHeight};
 const luminance=channels=>channels.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0);
 const background=e=>{
  for(let n=e;n;n=n.parentElement){
   const c=rgb(getComputedStyle(n).backgroundColor);
   if(c.length===3||(c.length===4&&c[3]===1))return c;
  }
  return [255,255,255];
 };
 function readable(e,name,action=false){
  if(!e){issues.push(name+' missing');return;}
  const rect=e.getBoundingClientRect(),css=getComputedStyle(e);
  need(rect.width>0&&rect.height>0&&css.visibility==='visible'&&css.display!=='none'&&Number(css.opacity)>.5,name+' hidden');
  need(contains(viewport,rect),name+' outside viewport');
  // Check clipping ancestors as well as the viewport. The root can hide overflow.
  for(let n=e.parentElement;n&&n!==document.body;n=n.parentElement){
   const s=getComputedStyle(n);
   if(!['hidden','clip','auto','scroll'].includes(s.overflowX)&&!['hidden','clip','auto','scroll'].includes(s.overflowY))continue;
   need(contains(n.getBoundingClientRect(),rect),name+' clipped by '+(n.id||n.className));
  }
  const fg=luminance(rgb(css.color)),bg=luminance(background(e));
  need((Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)>=4.5,name+' unreadable contrast');
  if(action){
   const picked=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);
   need(!e.disabled&&picked&&e.contains(picked),name+' not actionable at center');
  }
 }
 const tabs=[...document.querySelectorAll('nav.tabs [data-tab]')],parts=[...document.querySelectorAll('.engine-list [data-engine]')];
 need(tabs.map(e=>e.dataset.view).join(',')==='roll,sound,mix,patterns,files','Workspace order');
 need(parts.map(e=>e.dataset.engine).join(',')==='drum909,drum808,breaks,chicago,miami','Track order');
 need(tabs.filter(e=>e.getAttribute('aria-current')==='page').length===1,'Exactly one selected workspace');
 need(parts.filter(e=>e.getAttribute('aria-pressed')==='true').length===1,'Exactly one selected track');
 for(const e of [tabs.find(e=>e.getAttribute('aria-current')==='page'),parts.find(e=>e.getAttribute('aria-pressed')==='true')]){
  if(!e)continue;
  const css=getComputedStyle(e),line=rgb(css.borderBottomColor);
  need(parseFloat(css.borderBottomWidth)>=1&&css.borderBottomStyle!=='none'&&(line.length===3||line[3]>.5),
       'Selected '+(e.dataset.view??e.dataset.engine)+' lacks a visible underline');
 }
 for(const e of [...tabs,...parts])readable(e,e.dataset.view??e.dataset.engine,true);
 const controls=['down','up','tap','reset'].map(k=>[k,q('[data-tempo='+k+']')]);
 for(const [k,e] of controls){
  readable(e,'BPM '+k,true);
  need(e?.getAttribute('aria-label')?.trim(),'BPM '+k+' missing action name');
  const r=e?.getBoundingClientRect();
  need(r&&r.width>=32&&r.height>=32,'BPM '+k+' touch hit area');
 }
 for(const selector of ['#tempo','#tempo-state','#pattern-no','#part-title','#conn-state','#connect','#edit-scope'])
  readable(q(selector),selector,selector==='#connect');
 const txt=(s)=>q(s)?.textContent.trim()??'';
 need(/^\d+(?:\.\d+)? BPM$/.test(txt('#tempo')),'BPM value unavailable/unlabelled');
 need(/^P\d{2}$/.test(txt('#pattern-no')),'No pattern context');
 if(mode==='device'){
  need(txt('#conn-state')==='Connected'&&txt('#connect')==='Disconnect','Connected must follow handshake');
  need(q('#draft-project-label')?.hidden,'Local project name presented as hardware context');
  need(txt('#tempo-state')==='Device','BPM scope is not device');
 }else{
  need(txt('#conn-state')==='Disconnected'&&txt('#connect')==='Connect','Draft falsely presented as connected');
  need(txt('#tempo-state')==='Draft'&&txt('#edit-scope').startsWith('Draft'),'Draft edit provenance missing');
 }
 return issues;
}
