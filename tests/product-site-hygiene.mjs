// SPDX-License-Identifier: GPL-3.0-only
// Browser HTML hygiene only. Original historical SVG archives are not requalified.
export function hygieneAudit(root,options={}){
 const over=(f,b)=>{const a=f[3]+b[3]*(1-f[3]);return a?[0,1,2].map(i=>(f[i]*f[3]+b[i]*b[3]*(1-f[3]))/a).concat(a):[0,0,0,0];};
 const luminance=c=>c.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
 const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
 const compose=(foreground,layers)=>{let fg=foreground,bg=[0,0,0,0];for(const layer of layers){fg=over(fg,layer.color);bg=over(bg,layer.color);fg[3]*=layer.opacity;bg[3]*=layer.opacity;}return{fg,bg,ratio:bg[3]>=.999?ratio(fg,bg):null};};
 if(options.colorTest)return compose(options.colorTest.foreground,options.colorTest.layers);
 const win=root.defaultView,styles=new Map(),style=n=>{if(!styles.has(n))styles.set(n,win.getComputedStyle(n));return styles.get(n);};
 const parse=s=>{const n=String(s).match(/[\d.]+/g)?.map(Number);return n?.length>=3?[n[0],n[1],n[2],n[3]??1]:null;};
 const result={textCount:0,contrastFailures:[],horizontalOverflows:[],clippedText:[],glyphLabelOverlaps:[],unmeasuredBackgrounds:[],fontObservations:[],limits:['HTML text only, not historical SVG path-fonts or browser-native input shadow text.','Font sizes are measured, not declared owner-approved per-target floors.','Vertical font-metric overhang with visible overflow is not mislabeled as ink clipping; real clipping ancestors are audited.','Intentional scroll regions retain their own scrolling content.'],epsilonPx:.5};
 const fonts=new Map(),walker=root.createTreeWalker(root.body,win.NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())){
  const parent=node.parentElement,text=node.nodeValue.trim();if(!parent||!text||parent.closest('script,style,template,noscript,svg'))continue;
  const s=style(parent);if(s.visibility!=='visible'||s.display==='none')continue;
  const range=root.createRange();range.selectNodeContents(node);const rects=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0);if(!rects.length)continue;
  result.textCount++;const name=parent.id?('#'+parent.id):parent.tagName.toLowerCase(),sample={node:name,text:text.slice(0,100)},layers=[];let measurable=true;
  for(let p=parent;p;p=p.parentElement){const ps=style(p),color=parse(ps.backgroundColor);if(!color||ps.backgroundImage!=='none'){measurable=false;break;}layers.push({color,opacity:Number(ps.opacity)});}
  const foreground=parse(s.color),mixed=foreground&&measurable?compose(foreground,layers):null;
  if(!mixed||mixed.ratio===null)result.unmeasuredBackgrounds.push(sample);else if(mixed.ratio<4.5-1e-9)result.contrastFailures.push({...sample,ratio:mixed.ratio,foreground:mixed.fg,background:mixed.bg});
  const key=parent.tagName+'|'+s.fontSize;if(!fonts.has(key))fonts.set(key,{tag:parent.tagName,fontPx:parseFloat(s.fontSize),count:0,example:text.slice(0,60)});fonts.get(key).count++;
  const box=parent.closest('p,h1,h2,h3,h4,button,summary,label,dt,dd,legend,li,td,th,pre,a');
  if(box&&style(box).overflowX!=='auto'&&style(box).overflowX!=='scroll'){
   const b=box.getBoundingClientRect();if(rects.some(r=>r.left<b.left-.5||r.right>b.right+.5))result.horizontalOverflows.push({...sample,container:box.id||box.tagName});
  }
  for(let p=parent;p;p=p.parentElement){const ps=style(p),b=p.getBoundingClientRect(),x=['hidden','clip'].includes(ps.overflowX),y=['hidden','clip'].includes(ps.overflowY);if(!x&&!y)continue;
   if(rects.some(r=>(x&&(r.left<b.left-.5||r.right>b.right+.5))||(y&&(r.top<b.top-.5||r.bottom>b.bottom+.5)))){result.clippedText.push({...sample,clip:p.id||p.tagName});break;}
  }
 }
 const area=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
 for(const c of root.querySelectorAll('.hero-parameter')){const glyph=c.querySelector('.hero-parameter-glyph')?.getBoundingClientRect();if(!glyph)continue;for(const n of c.querySelectorAll('.hero-parameter-label,output'))if(area(glyph,n.getBoundingClientRect())>0)result.glyphLabelOverlaps.push({label:n.textContent,area:area(glyph,n.getBoundingClientRect())});}
 result.fontObservations=[...fonts.values()];return result;
}
