// SPDX-License-Identifier: GPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import * as history from '../web/product-site/builds/history-filter.mjs';
const root=new URL('../web/product-site/',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const pages=['index.html','install/index.html','manual/index.html','manual/legacy.html','help/index.html','new/index.html','presets/index.html','projects/index.html','breaks/index.html','starting-breaks/index.html','builds/index.html','tools/index.html','reference/index.html'];
test('all public page families expose the same accessible responsive navigation',()=>{for(const p of pages){const s=read(p);assert.match(s,/<header class="site-header"/,p);assert.match(s,/class="nav-toggle"[^>]*aria-expanded="false"[^>]*aria-controls="site-navigation"/,p);assert.match(s,/id="site-navigation"/,p);for(const label of ['Remote','Samples','Projects','Presets','Manual','Build history','Starting breaks','Tools','Setup &amp; help'])assert.ok(s.includes('>'+label+'</a>'),p+': '+label);}});
test('installer retains guarded actions and a single shell, not starting-break picker',()=>{const s=read('install/index.html');assert.equal((s.match(/<header/g)||[]).length,1);assert.equal(s.includes('id="sample-picker"'),false);assert.equal(s.includes('src="../install.mjs"'),false);for(const id of ['go','devagree','inconfirm','inconfirmok','inconfirmno','stockgo','models','sample-frame','project-frame','lang'])assert.ok(s.includes('id="'+id+'"'),id);});
test('build pagination never loses records, filters before slicing and clamps pages',()=>{assert.equal(typeof history.pageRecords,'function');const data=Array.from({length:41},(_,i)=>({id:String(i),channel:i%2?'night':'main',models:['elite'],original:{version:'build-'+i}}));let all=[];for(let page=1;page<=3;page++){const view=history.pageRecords(data,{page,pageSize:20});all.push(...view.records.map(x=>x.id));assert.equal(view.total,41);assert.equal(view.pages,3)}assert.equal(new Set(all).size,41);assert.equal(all.length,41);const filtered=history.pageRecords(data,{channel:'night',page:9,pageSize:8});assert.equal(filtered.page,3);assert.equal(filtered.total,20);assert.deepEqual(filtered.records.map(x=>x.id),['33','35','37','39']);assert.equal(history.pageRecords([],{page:99}).page,1);assert.equal(history.pageRecords(data,{query:'never matches'}).total,0);assert.equal(history.pageRecords(data,{pageSize:Infinity,page:-5}).page,1);});
test('unavailable private previews never request private paths or synthesize substitute audio',()=>{assert.match(read('install.mjs'),/previewAvailable:false/);assert.doesNotMatch(read('install.mjs'),/private-audio|X-Dnbox-Private/);assert.doesNotMatch(read('components/break-panel/panel.mjs'),/playTone|Math\.sin|fallbackId/);assert.match(read('components/break-panel/panel.mjs'),/Preview unavailable/);});
test('home does not present a connection failure before a connection attempt',()=>{assert.doesNotMatch(read('index.html'),/>Instrument connection is not available\.<\/span>/);assert.match(read('index.html'),/Local workspace preview/)});

test('new website stage is exactly reversible without rewriting earlier provenance',()=>{
 const proof=JSON.parse(read('SITE-R22-CHANGES.json'));
 for(const row of proof.files){let text=read(row.path);for(const c of [...row.changes].reverse()){assert.ok(text.includes(c.after),row.path);text=text.replace(c.after,c.before);}assert.equal(createHash('sha256').update(text).digest('hex'),row.beforeSHA256,row.path);}
});
test('existing executable bytes and source glyphs are preserved except the explicit waveform token substitution',()=>{
 const proof=JSON.parse(read('SITE-R22-CHANGES.json'));
 for(const row of proof.files){let before=read(row.path);for(const c of [...row.changes].reverse())before=before.replace(c.after,c.before);const after=read(row.path);const scripts=s=>[...s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].filter(x=>x[1]).map(x=>createHash('sha256').update(x[1]).digest('hex'));const normalized=after.replace('ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue("--prep-wave").trim() || "#c49b45";','ctx.strokeStyle = "#8fb9d0";');assert.deepEqual(scripts(normalized),scripts(before),row.path+' executable bytes except explicit presentation stroke token');const svgs=s=>[...s.matchAll(/<svg\b[\s\S]*?<\/svg>/g)].map(x=>createHash('sha256').update(x[0]).digest('hex'));assert.deepEqual(svgs(after),svgs(before),row.path+' SVGs retained');}
});

test('home live controls use the shared R22 renderer and consistent integer percentages',async()=>{
 const hero=await import('../web/product-site/hero.mjs').catch(()=>null);
 assert.equal(typeof hero?.heroPercent,'function');
 for(const [raw,value]of [[0,'0%'],[64,'50%'],[127,'100%'],[-5,'0%'],[999,'100%']])assert.equal(hero.heroPercent(raw),value);
 assert.match(read('hero.mjs'),/from '\.\/remote\/glyph-live\.mjs'/);
 assert.match(read('hero.mjs'),/GlyphAnimator/);
 assert.match(read('index.html'),/src="hero.mjs"/);
});

test('help includes a source-linked SMK control map rather than an unlabelled hardware image',()=>{
 const s=read('help/index.html');assert.match(s,/class="control-map"/);for(const name of ['SEQ','PARA','NOTE REPEAT','BT','GLOBE','KNOB BANK'])assert.ok(s.includes('<dt>'+name+'</dt>'));
 assert.match(s,/manual\/legacy\.html#s2/);
});

test('hero resonance moves resonance, not cutoff, and never labels attack as envelope amount',async()=>{
 const hero=await import('../web/product-site/hero.mjs');assert.equal(typeof hero.heroState,'function');
 assert.deepEqual(hero.heroState('PEAK',.2),{cutoff:32/127,res:.2});
 assert.deepEqual(hero.heroState('CUTOFF',.7),{cutoff:.7,res:0});
 assert.deepEqual(hero.heroState('GLIDE',.7),{});
 assert.equal(hero.heroControls.length,4);assert.equal(hero.heroControls.some(c=>c.label==='ENV'),false);
});

test('earlier captured interface is labeled honestly and the product/tool entry copy matches actual capability',()=>{
 const s=read('index.html');assert.match(s,/Earlier captured interface/);assert.match(s,/Turn your SMK-37 Elite or Pro into a standalone groovebox/);assert.doesNotMatch(read('tools/index.html'),/Download individual files or a ZIP/);
});

test('choosing a manual chapter closes the sticky jump instead of covering the chapter',()=>{
 let listener;const jump={open:true,addEventListener(type,fn){if(type==='click')listener=fn;}};
 runInNewContext(read('site-shell.mjs'),{document:{querySelector:()=>null,querySelectorAll:()=>[jump]}});
 listener?.({target:{closest:()=>({hash:'#s8'})}});assert.equal(jump.open,false);
});

test('cutoff and resonance do not reuse an indistinguishable default curve',async()=>{
 const {heroState}=await import('../web/product-site/hero.mjs');const {render}=await import('../web/product-site/remote/glyph-render.mjs');
 const cut=32/127,peak=95/127;assert.notEqual(render('CUTOFF',cut,'chicago',heroState('CUTOFF',cut)).d,render('PEAK',peak,'chicago',heroState('PEAK',peak)).d);
});

test('history exposes synchronized controls below records and safe initial deep-link filters',()=>{
 const s=read('builds/index.html');assert.match(s,/id="history-prev-bottom"/);assert.match(s,/id="history-next-bottom"/);assert.ok(s.indexOf('id="history-prev-bottom"')>s.indexOf('data-record-id="night-versions-0"'));
 assert.equal(typeof history.readHistoryFilters,'function');assert.deepEqual(history.readHistoryFilters('?channel=night&model=elite&query=94197fc8'),{channel:'night',model:'elite',query:'94197fc8'});assert.deepEqual(history.readHistoryFilters('?channel=bad&model=no'),{channel:'all',model:'all',query:''});
});

test('development highlights link exact saved records and preserve explicit device-test limits',()=>{
 const s=read('new/index.html');assert.match(s,/94197fc8/);assert.match(s,/79280e76/);assert.match(s,/BOOT\/RESTART NOT YET VERIFIED/);assert.match(s,/DEVICE NOT TESTED/);assert.match(s,/builds\/\?channel=night&amp;query=94197fc8/);
});

test('homepage feature artwork maps actual physical controls without invented active/value state',()=>{
 const s=read('index.html');assert.equal((s.match(/class="feature-control-map/g)||[]).length,3);
 assert.equal((s.match(/class="map-pad"/g)||[]).length,16);assert.equal((s.match(/class="map-knob"/g)||[]).length,4);assert.equal((s.match(/class="map-fader"/g)||[]).length,8);
 assert.match(s,/Earlier JUNO bank · WIDTH specimen/);assert.doesNotMatch(s,/class="map-(?:pad|knob|fader) active/);
});

test('Juno source preview uses the observed WIDTH scalar and only its actual renderer law',async()=>{
 const {sourcePreviewControls}=await import('../web/product-site/hero.mjs');const data=JSON.parse(read('remote/source-sounds.json'));const source=data.contexts.find(c=>c.bank==='JUNO'&&c.bassSlot===0).controls.find(c=>c.name==='WIDTH');
 assert.deepEqual(sourcePreviewControls,[{label:'WIDTH',raw:source.raw,engine:'juno'}]);assert.equal(source.raw,64);
});

test('installer actual waveform stroke takes the R22 CSS token instead of a legacy hardcoded blue',()=>{
 const s=read('install/index.html');assert.match(s,/ctx\.strokeStyle = getComputedStyle\(canvas\)\.getPropertyValue\("--prep-wave"\)\.trim\(\) \|\| "#c49b45"/);
});

test('R3 human defects have exact-source negative fixtures, and their repair hooks exist',()=>{
 const f=JSON.parse(readFileSync(new URL('visual/fixtures/site-r3-defects.json',import.meta.url),'utf8'));assert.equal(f.fixtures.length,7);
 for(const row of f.fixtures){const bytes=readFileSync(new URL('../'+row.path,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);assert.ok(row.expectedRejectedCondition);}
 assert.match(read('site.css'),/\.site-header \.more-nav>div>a\{display:flex\}/);
 assert.match(read('manual/protocol.html'),/class="document-page protocol-page"/);assert.match(read('manual/protocol.html'),/class="table" tabindex="0" role="region"/);
 assert.match(read('site.css'),/\.legacy-presets \.layout>\.full\{grid-column:2/);
 assert.match(read('tool-theme.css'),/\.tool-surface nav\[aria-label="X0X"\]/);
 assert.match(read('tool-theme.css'),/\.tool-surface #package-details>summary\{font-size:16px/);
});

test('actual browser animation probe preserves source-keyed attempts and rejects an exact original static hero',()=>{
 const probe=readFileSync(new URL('product-site-animation-browser.py',import.meta.url),'utf8');assert.match(probe,/attemptOnSameInputs/);assert.match(probe,/droppedFrames/);assert.match(probe,/softEdgePixels/);
 const f=JSON.parse(readFileSync(new URL('visual/fixtures/site-before-static-hero.json',import.meta.url),'utf8')),bytes=readFileSync(new URL('visual/fixtures/site-before-static-hero.html',import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),f.fixtureSHA256);assert.equal(f.originalIndexSHA256,'392afcc5e401b52ef61967901279d5f1b0dbe7cf5c11381fd38e1dbf4fa5bec3');
});

test('archive fitting uses intrinsic body bounds plus margins and frame borders, never viewport scrollHeight',async()=>{
 const api=await import('../web/product-site/archive-frame.mjs').catch(()=>null);assert.equal(typeof api?.intrinsicArchiveHeight,'function');
 assert.equal(api.intrinsicArchiveHeight(420,{marginTop:'40px',marginBottom:'40px'},2),502);
 assert.equal(api.intrinsicArchiveHeight(810.2,{marginTop:'0px',marginBottom:'0px'},2),813);
 const s=read('archive-frame.mjs');assert.doesNotMatch(s,/documentElement\.scrollHeight/);assert.match(s,/getBoundingClientRect/);
 for(const path of['reference/r22.html','reference/current-ui.html']){assert.match(read(path),/src="\.\.\/archive-frame\.mjs"/);assert.doesNotMatch(read(path),/documentElement\.scrollHeight/);}
 const old=JSON.parse(readFileSync(new URL('visual/fixtures/site-r3-archive-height.json',import.meta.url),'utf8'));assert.equal(old.screens.length,3);assert.ok(old.screens.every(r=>r.imageHeight!==r.domHeightAfterScreenshot));
});


test('disabled sample-play affordances are text glyphs and shared Menu typography is explicit',()=>{
 const s=read('install/index.html');assert.equal((s.match(/class="play-icon" aria-hidden="true"/g)||[]).length,2);assert.match(read('site.css'),/\.site-header \.nav-toggle\{font-weight:400;line-height:1\.25/);
});


test('earlier JUNO scalar is versioned, never relabelled as the new SuperJ6 engine',()=>{
 const s=read('index.html');assert.match(s,/Earlier JUNO bank · WIDTH specimen/);assert.match(s,/not current SuperJ6/);assert.doesNotMatch(read('hero.mjs'),/engine:\s*['"]superj6/);
 const f=JSON.parse(readFileSync(new URL('visual/fixtures/site-r3-juno-preview.json',import.meta.url))),old=readFileSync(new URL('visual/fixtures/site-r3-juno-preview.html',import.meta.url));assert.equal(createHash('sha256').update(old).digest('hex'),f.fixtureSHA256);assert.match(old.toString(),/>Juno source preview</);assert.doesNotMatch(old.toString(),/Earlier JUNO bank/);
});
