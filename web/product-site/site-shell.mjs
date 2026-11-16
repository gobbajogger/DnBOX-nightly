// SPDX-License-Identifier: GPL-3.0-only
// Progressive enhancement. With no JS, all navigation links remain available.
const header=document.querySelector('.site-header'),toggle=header?.querySelector('.nav-toggle'),nav=header?.querySelector('#site-navigation');
if(header&&toggle&&nav){
 const mobile=matchMedia('(max-width: 1000px)'),more=nav.querySelector('.more-nav');
 const close=({restoreFocus=false}={})=>{header.classList.remove('nav-open');toggle.setAttribute('aria-expanded','false');if(restoreFocus)toggle.focus();};
 const adapt=()=>{close();toggle.hidden=!mobile.matches;if(more)more.open=mobile.matches;};
 header.classList.add('nav-enhanced');adapt();
 toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';header.classList.toggle('nav-open',open);toggle.setAttribute('aria-expanded',String(open));});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){const inMore=more?.open&&!mobile.matches;if(inMore){more.open=false;more.querySelector('summary').focus();}if(toggle.getAttribute('aria-expanded')==='true')close({restoreFocus:true});}});
 document.addEventListener('click',event=>{if(!header.contains(event.target)){close();if(more&&!mobile.matches)more.open=false;}});
 nav.addEventListener('click',event=>{if(event.target.closest('a'))close();});
 header.addEventListener('focusout',event=>{if(event.relatedTarget&&!header.contains(event.relatedTarget)){close();if(more&&!mobile.matches)more.open=false;}});
 mobile.addEventListener('change',adapt);
 const current=new URL(location.href);for(const a of nav.querySelectorAll('a')){const url=new URL(a.href);if(url.pathname===current.pathname)a.setAttribute('aria-current','page');}
}
// A sticky chapter chooser must reveal, not cover, its destination.
for(const jump of document.querySelectorAll('.manual-jump'))jump.addEventListener('click',event=>{if(event.target.closest('a[href^="#"]'))jump.open=false;});
