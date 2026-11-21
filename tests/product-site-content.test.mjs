import test from'node:test';import assert from'node:assert/strict';import{readFileSync,existsSync,mkdirSync,mkdtempSync,rmSync}from'node:fs';import{fileURLToPath}from'node:url';import{join}from'node:path';import{createHash}from'node:crypto';import{buildProductSite}from'../scripts/build-product-site.mjs';
const root=new URL('../',import.meta.url),P=new URL('web/product-site/',root),read=n=>readFileSync(new URL(n,P),'utf8');
function isolatedOutput(t){const base=fileURLToPath(new URL('.output/',root));mkdirSync(base,{recursive:true});const output=mkdtempSync(join(base,'content-test-'));t.after(()=>rmSync(output,{recursive:true,force:true}));return output;}
test('complete source manifest builds byte-identical local output without deployment',t=>{const output=isolatedOutput(t),r=buildProductSite({output});assert.equal(r.published,false);assert.deepEqual(r.catalogMutations,[]);assert.equal(r.files,JSON.parse(readFileSync(new URL('../web/product-site/SOURCE-MANIFEST.json',import.meta.url))).files.length+10);buildProductSite({output,check:true});});
test('both manual families and197 true history records survive source integration',()=>{const smk=read('manual/legacy.html'),fm=read('manual/original/index.html');for(let i=1;i<=21;i++)assert.ok(smk.includes('id="s'+i+'"'));assert.ok(smk.includes('94197fc8'));assert.ok(fm.length>40000);assert.equal((read('builds/index.html').match(/data-record-id=/g)||[]).length,197);for(const p of['manual/','builds/','tools/','help/'])assert.ok(read('index.html').includes('href="'+p));});
test('source admission remains explicit, no original-format or remote capability fabricated',()=>{const presets=read('presets/index.html');assert.match(read('remote/catalog.mjs'),/null/);assert.match(read('projects/exchange/provider.mjs'),/provider=null/);assert.ok(presets.includes('file editor, not sound audition'));assert.ok(presets.includes('Only existing preset names change here.'));assert.ok(presets.includes('Nothing is sent to an instrument.'));assert.ok(existsSync(new URL('presets/legacy/codec.mjs',P)));const p=JSON.parse(read('APPROVED-PRESENTATION.json'));assert.equal(p.native_source,'3c41ef4bedf9701f549ce2752b73306e2fab1eb8');assert.equal(p.baseline_shared_website_instrument_paths_sha256,'e9f35e989f64ad97d1a936bde8467a86f1bc440dc8e1855c0914aed724fcbdc2');assert.equal(p.R22HiHat.sha256,'2d234b1ee918ae9b882800256ed3867757a64304ade44d0a352f3f50f6ccc4cd');assert.equal(p.R22HiHat.sourceFreeze,'dc0f8a080843b427cda17e6c55e80043aef40788e5d711e7c6f13382c5c966ff');assert.equal(p.R22HiHat.occurrences,14);});

test('R16 composed source names exact workspace and contains safe local editing endpoints only',()=>{const t=JSON.parse(read('SOURCE-TRACE.json'));assert.match(t.remote,/R16/);assert.equal(t.candidatePins.workspaceManifest,'0013f29a990fbc2305a3269f4da1f87182ec3a29b7e3b35ca760281c132e2186');assert.equal(t.retainedHistoricalSources.count,10);assert.equal(t.deployed,false);assert.equal(t.browserProvider,null);assert.match(read('remote/sequence.mjs'),/beginSelectionGesture/);assert.match(read('remote/roll.mjs'),/g.edge==='start'/);assert.match(read('remote/device/catalog.mjs'),/null/)});

test('R21 captured presentation and v6 port identity remain explicit without admission',()=>{const t=JSON.parse(read('SOURCE-TRACE.json'));assert.equal(t.candidatePins.remoteEndpointManifest,'36e54ac2ca5f6c0524f7f8e4615839a7333b10e6bf9738bece022b8d315f8847');assert.ok(read('remote/frame.mjs').includes('runtime_admitted'));const c=JSON.parse(read('remote/components.json'));assert.equal(c.screens.length,26);assert.equal(c.screens.reduce((n,s)=>n+s.controls.length,0),124);assert.match(read('remote/device/page.mjs'),/p.id/);assert.ok(JSON.parse(read('remote/WORKSPACE-SOURCE-PINS.json')));});

test('entry availability distinguishes drafts, separate browser audio and unavailable device providers',()=>{assert.match(read('index.html'),/Local workspace preview/);const tools=read('tools/index.html');assert.match(tools,/Sketch notes and save a draft/);assert.match(tools,/separate browser instrument/);assert.match(tools,/This does not control a connected device/);assert.match(tools,/your draft stays untouched/);assert.match(tools,/If the emulator is unavailable, keep working in Draft/);assert.doesNotMatch(tools,/No connected control or playback in this preview/);assert.match(read('projects/index.html'),/Browser MIDI export is unavailable/);assert.match(read('starting-breaks/index.html'),/Download chosen breaks/);assert.match(read('starting-breaks/index.html'),/Downloading does not change your keyboard/);assert.match(read('starting-breaks/index.html'),/Restore replaces slot 1, and slot 2/);assert.match(read('remote/index.html'),/Download draft/);assert.equal(JSON.parse(read('SOURCE-MANIFEST.json')).publicationQualified,false);});

test('historical manual never presents a descriptive retirement name as a hardware label',()=>{
 const html=read('manual/legacy.html');
 assert.doesNotMatch(html,/<code>LEGACY STRINGS<\/code>/);
 assert.match(html,/legacy string engine.*descriptive term, not an on-screen label/);
 assert.match(html,/retains its original on-screen label/);
});

test('retired build branches link to the archived source and evidence commits',()=>{
 const history = read('builds/index.html');
 const destinations = [
  ['night-versions-12','d8086cc09203945919c70d3c805f8ca3e6acbe5a'],
  ['night-versions-11','c20943a75d9e680a64e0384458245db4d7999e05/docs/evidence/build-0.0.24.1'],
 ];
 for(const [record, destination] of destinations){
  const article = history.split('data-record-id="'+record+'"')[1]?.split('</article>')[0];
  assert.ok(article,record);
  assert.ok(article.includes('href="https://github.com/gobbajogger/DnBOX/tree/'+destination+'"'),record+' must point to archived evidence');
 }
});

test('all nineteen musician routes and both legacy entry redirects survive the build',t=>{
 const routes=['index.html','breaks/index.html','builds/index.html','help/index.html','install/index.html','manual/index.html','manual/legacy.html','manual/original/index.html','manual/projects-guide.html','manual/protocol.html','new/index.html','presets/index.html','presets/legacy/index.html','projects/index.html','remote/index.html','remote/device/index.html','remote/identity/index.html','starting-breaks/index.html','tools/index.html'];
 assert.equal(routes.length,19);
 const output=isolatedOutput(t);
 buildProductSite({output});
 for(const route of routes){
  const source=read(route),built=readFileSync(join(output,route),'utf8');
  assert.equal(built,source,route+' must retain its full current source');
  assert.match(built,/<title>[^<]+<\/title>/i,route+' must have a page title');
 }
 for(const [route,target] of [['install.html','install/'],['remote.html','remote/']]){
  const built=readFileSync(join(output,route),'utf8');
  assert.match(built,/http-equiv=["']refresh["']/i,route+' must retain its redirect');
  assert.ok(built.includes(target),route+' must point to its maintained route');
 }
});

test('starting-breaks publication navigation uses existing live destinations without unrelated route rollout',()=>{
 const html=read('starting-breaks/index.html');
 const allowed=new Set(['#content','../index.html','../breaks/','../projects/','../manual/','../builds/','../install/','../install/#samples','../new/']);
 for(const [,href] of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)){
  if(/^https:\/\//.test(href))continue;
  assert.ok(allowed.has(href),'unpublished starting-break destination: '+href);
 }
 assert.match(html,/>Home<\/a>/);
 assert.match(html,/class="starting-breaks-page"/);
 assert.match(html,/\.starting-breaks-page header\{[^}]*flex-wrap:wrap/);
 assert.match(html,/Restore replaces slot 1, and slot 2 when two groups are selected/);
 assert.match(html,/src="\.\.\/install\.mjs"/);
});

test('published release records, backup workflows and history bookmarks survive site composition',()=>{
 const notes=read('new/index.html'), manual=read('manual/index.html'), history=read('builds/index.html');
 for(const target of [
  'https://github.com/gobbajogger/DnBOX/pull/869#issuecomment-6849042743',
  'https://github.com/gobbajogger/DnBOX-nightly/pull/120',
  'https://github.com/gobbajogger/DnBOX-nightly/pull/117',
  'https://github.com/gobbajogger/DnBOX-nightly/pull/118',
  '../install/#buildarchive',
 ])assert.ok(notes.includes('href="'+target+'"'),target);
 for(const text of ['94197fc8','600b3b45','withdrawn','0.0.25.1'])assert.ok(notes.includes(text),text);
 for(const target of ['../install/#samples','../install/#projects','https://github.com/gobbajogger/DnBOX/issues','https://github.com/gobbajogger/DnBOX/tree/79280e763341d03ba43266d3e25dad66f12de860/docs'])assert.ok(manual.includes('href="'+target+'"'),target);
 for(const id of ['status','buildtitle','builds','historytitle','history'])assert.ok(history.includes('id="'+id+'"'),id);
 assert.ok(history.includes('href="../build-status.json"'));
 const ids=[...notes.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
});

test('Loopy clip mode names DnBOX when returning from the host grid', () => {
  const instruction = 'return to normal DnBOX operation with KNOB BANK';
  for (const path of ['docs/install/index.html', 'web/product-site/install/index.html']) {
    const html = readFileSync(new URL(path, root), 'utf8');
    const clipMode = html.match(/<li><b>Loopy clip mode:<\/b>([^<]*)<\/li>/)?.[1];
    assert.ok(clipMode?.includes(instruction), path + ' must name DnBOX in the return instruction');
  }
});

test('the project guide opens the musician workflow and keeps protocol details optional', () => {
  const guide = read('manual/projects-guide.html');
  const introduction = guide.slice(guide.indexOf('<h1>'), guide.indexOf('<h2'));
  assert.match(introduction, /<a href="\.\.\/projects\/">Projects<\/a>/);
  for (const label of ['Find USB MIDI keyboard', 'Connect selected ports']) {
    assert.ok(introduction.includes(label) && read('projects/index.html').includes('>' + label + '</button>'), label);
  }
  assert.doesNotMatch(introduction, /make_pages\.py|localhost|web\/x0x_projects\.html/);
  const reference = guide.match(/<details>\s*<summary>File format and MIDI protocol<\/summary>([\s\S]*?)<\/details>/);
  assert.ok(reference && reference[1].includes('id="usb-midi-project-protocol"'));
  assert.ok(guide.indexOf('id="recover-an-interrupted-sample-transfer"') < reference.index);
});
