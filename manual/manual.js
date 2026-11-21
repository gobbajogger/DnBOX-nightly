// Preserve published original-manual bookmarks and reveal linked current chapters.
function revealChapter(){
 if(/^#s(?:[1-9]|1[0-9])$/.test(location.hash)){location.replace('original/'+location.hash);return;}
 let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
 const heading=document.getElementById(id),chapter=heading?.closest('details');
 if(chapter){chapter.open=true;heading.scrollIntoView({block:'start'});}
}
addEventListener('hashchange',revealChapter);revealChapter();
// Activating the current topic does not fire hashchange.
addEventListener('click',event=>{
 if(event.defaultPrevented||event.button!==0||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
 const link=event.target?.closest?.('.manual-topics a[href^="#"]');
 if(link&&link.hash===location.hash)revealChapter();
});
// Native disclosures remain usable without JavaScript; printing includes every instruction.
let beforePrint=null;
addEventListener('beforeprint',()=>{if(beforePrint)return;beforePrint=[...document.querySelectorAll('main details')].map(el=>[el,el.open]);for(const [el] of beforePrint)el.open=true;});
addEventListener('afterprint',()=>{for(const [el,open] of beforePrint??[])el.open=open;beforePrint=null;});
