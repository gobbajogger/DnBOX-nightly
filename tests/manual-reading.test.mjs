import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../web/product-site/manual/index.html',import.meta.url),'utf8');
const before=JSON.parse(readFileSync(new URL('./manual-content-preserved.json',import.meta.url)));
test('manual retains every existing safety paragraph, recovery item and deep link',()=>{for(const p of [...before.paragraphs,...before.items])assert.ok(html.includes(p),'Lost instruction: '+p.slice(0,90));for(const id of before.anchors)assert.ok(html.includes('id="'+id+'"'));});
test('manual uses native progressive chapters and a direct task index',()=>{assert.match(html,/<nav[^>]+aria-label="Manual topics"/);assert.equal((html.match(/<details class="manual-chapter"/g)||[]).length,8);assert.equal((html.match(/<summary>/g)||[]).length,9);assert.match(html,/manual.css/);});
test('repeated print events restore original disclosures once',async()=>{const {runInNewContext}=await import('node:vm');const events={},nodes=[{open:false},{open:true}];runInNewContext(readFileSync(new URL('../web/product-site/manual/manual.js',import.meta.url),'utf8'),{location:{hash:''},document:{getElementById:()=>null,querySelectorAll:()=>nodes},addEventListener:(type,fn)=>events[type]=fn});events.beforeprint();events.beforeprint();assert.deepEqual(nodes.map(x=>x.open),[true,true]);events.afterprint();assert.deepEqual(nodes.map(x=>x.open),[false,true]);events.afterprint();assert.deepEqual(nodes.map(x=>x.open),[false,true]);});
test('same-document legacy bookmark navigation redirects to the original chapter',async()=>{const {runInNewContext}=await import('node:vm');const events={},seen=[];const location={hash:'',replace:x=>seen.push(x)};runInNewContext(readFileSync(new URL('../web/product-site/manual/manual.js',import.meta.url),'utf8'),{location,document:{getElementById:()=>null},addEventListener:(type,fn)=>events[type]=fn});location.hash='#s3';events.hashchange();assert.deepEqual(seen,['original/#s3']);});

test('activating the current manual topic reopens and scrolls to its chapter',async()=>{
 const {runInNewContext}=await import('node:vm');
 const events={},location={hash:''},chapter={open:false},scrolls=[];
 const heading={closest:selector=>selector==='details'?chapter:null,scrollIntoView:({block})=>scrolls.push(block)};
 runInNewContext(readFileSync(new URL('../web/product-site/manual/manual.js',import.meta.url),'utf8'),{
  location,document:{getElementById:id=>id==='projects'?heading:null},addEventListener:(type,fn)=>events[type]=fn,
 });
 location.hash='#projects';events.hashchange();
 assert.equal(chapter.open,true);
 chapter.open=false;
 scrolls.length=0;

 const activate=(overrides={},hash='#projects',inTopics=true)=>{
  const event={
   button:0,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},
   target:{closest:selector=>inTopics&&selector==='.manual-topics a[href^="#"]'?{hash}:null},
   ...overrides,
  };
  events.click?.(event);
  assert.equal(event.defaultPrevented,overrides.defaultPrevented??false);
 };
 for(const input of [{defaultPrevented:true},{button:1},{button:2},{altKey:true},{ctrlKey:true},{metaKey:true},{shiftKey:true}])activate(input);
 activate({},'#keyboard-controls');
 activate({},'#projects',false);
 assert.equal(chapter.open,false);
 assert.deepEqual(scrolls,[]);

 activate();
 assert.equal(location.hash,'#projects');
 assert.equal(chapter.open,true);
 assert.deepEqual(scrolls,['start']);
});

test('four-kick example matches the actual keyboard quick start and keeps all task links',()=>{const match=html.match(/<ol class="beat-steps"[^>]*>(.*?)<\/ol>/s);assert.ok(match);const cells=[...match[1].matchAll(/<li([^>]*)>(\d+)<\/li>/g)];assert.equal(cells.length,16);assert.deepEqual(cells.filter(x=>x[1].includes('hit')).map(x=>Number(x[2])),[1,5,9,13]);const legacy=readFileSync(new URL('../web/product-site/manual/legacy.html',import.meta.url),'utf8');assert.ok(legacy.includes('Press white keys 1, 5, 9 and 13'));for(const target of ['make-a-drum-beat','play-and-record-a-bass-line','save-a-project-and-power-off','live-set-switch-mute-and-chain']){assert.ok(html.includes('legacy.html#'+target));assert.ok(legacy.includes('id="'+target+'"'));}});
