import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import test from'node:test';import assert from'node:assert/strict';import{readFileSync,existsSync,mkdirSync,mkdtempSync,rmSync}from'node:fs';import{createHash}from'node:crypto';import{buildProductSite}from'../scripts/build-product-site.mjs';
const root=new URL('../',import.meta.url),P=new URL('web/product-site/',root),read=n=>readFileSync(new URL(n,P),'utf8');
test('complete source manifest builds byte-identical local output without deployment',t=>{const outRoot=fileURLToPath(new URL('.output/',root));mkdirSync(outRoot,{recursive:true});const output=mkdtempSync(join(outRoot,'content-'));t.after(()=>rmSync(output,{recursive:true,force:true}));const r=buildProductSite({output});assert.equal(r.published,false);assert.deepEqual(r.catalogMutations,[]);assert.equal(r.files,JSON.parse(readFileSync(new URL('../web/product-site/SOURCE-MANIFEST.json',import.meta.url))).files.length+10);buildProductSite({output,check:true});});
test('both manual families and197 true history records survive source integration',()=>{const smk=read('manual/legacy.html'),fm=read('manual/original/index.html');for(let i=1;i<=21;i++)assert.ok(smk.includes('id="s'+i+'"'));assert.ok(smk.includes('94197fc8'));assert.ok(fm.length>40000);assert.equal((read('builds/index.html').match(/data-record-id=/g)||[]).length,197);for(const p of['manual/','builds/','tools/','help/'])assert.ok(read('index.html').includes('href="'+p));});
test('source admission remains explicit, no original-format or remote capability fabricated',()=>{assert.match(read('remote/catalog.mjs'),/null/);assert.match(read('projects/exchange/provider.mjs'),/provider=null/);assert.ok(read('presets/index.html').includes('Their original format'));assert.ok(existsSync(new URL('presets/legacy/codec.mjs',P)));const p=JSON.parse(read('APPROVED-PRESENTATION.json'));assert.equal(p.native_source,'3c41ef4bedf9701f549ce2752b73306e2fab1eb8');assert.equal(p.baseline_shared_website_instrument_paths_sha256,'e9f35e989f64ad97d1a936bde8467a86f1bc440dc8e1855c0914aed724fcbdc2');assert.equal(p.R22HiHat.sha256,'2d234b1ee918ae9b882800256ed3867757a64304ade44d0a352f3f50f6ccc4cd');assert.equal(p.R22HiHat.sourceFreeze,'dc0f8a080843b427cda17e6c55e80043aef40788e5d711e7c6f13382c5c966ff');assert.equal(p.R22HiHat.occurrences,14);});

test('R16 composed source names exact workspace and contains safe local editing endpoints only',()=>{const t=JSON.parse(read('SOURCE-TRACE.json'));assert.match(t.remote,/R16/);assert.equal(t.candidatePins.workspaceManifest,'0013f29a990fbc2305a3269f4da1f87182ec3a29b7e3b35ca760281c132e2186');assert.equal(t.retainedHistoricalSources.count,10);assert.equal(t.deployed,false);assert.equal(t.browserProvider,null);assert.match(read('remote/sequence.mjs'),/beginSelectionGesture/);assert.match(read('remote/roll.mjs'),/g.edge==='start'/);assert.match(read('remote/device/catalog.mjs'),/null/)});

test('R21 captured presentation and v6 port identity remain explicit without admission',()=>{const t=JSON.parse(read('SOURCE-TRACE.json'));assert.equal(t.candidatePins.remoteEndpointManifest,'36e54ac2ca5f6c0524f7f8e4615839a7333b10e6bf9738bece022b8d315f8847');assert.ok(read('remote/frame.mjs').includes('runtime_admitted'));const c=JSON.parse(read('remote/components.json'));assert.equal(c.screens.length,26);assert.equal(c.screens.reduce((n,s)=>n+s.controls.length,0),124);assert.match(read('remote/device/page.mjs'),/p.id/);assert.ok(JSON.parse(read('remote/WORKSPACE-SOURCE-PINS.json')));});

test('entry availability is disclosed without enabling native providers',()=>{assert.match(read('index.html'),/Local workspace preview/);assert.match(read('tools/index.html'),/No connected control or playback in this preview/);assert.match(read('projects/index.html'),/Browser MIDI export is unavailable/);assert.match(read('starting-breaks/index.html'),/Download chosen breaks/);assert.match(read('starting-breaks/index.html'),/Downloading does not change your keyboard/);assert.match(read('starting-breaks/index.html'),/Restore replaces slot 1, and slot 2/);assert.match(read('remote/index.html'),/Download draft/);assert.equal(JSON.parse(read('SOURCE-MANIFEST.json')).publicationQualified,false);});


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

test('homepage separates the current Chicago waveform and SuperJ6 name from archived control replays', async () => {
 const home = read('index.html');
 const presentation = JSON.parse(read('APPROVED-PRESENTATION.json'));
 const original = presentation.frames.find(frame => frame.id === 'voice-0');
 const {waveDisplay} = await import('../web/product-site/remote/wave-display.mjs');
 const name = waveDisplay('CHICAGO', original.source_params.actual_wave);
 assert.equal(name, 'SAW');
 const hero = home.match(/<div class="hero-ui"[\s\S]*?<\/svg>/)[0];
 const value = hero.match(/<g role="text" aria-label="SAW"[^>]*>([\s\S]*?)<\/g>/);
 assert.ok(value, 'Chicago WAVE value in the static hero');
 assert.match(hero, /role="img" aria-label="Chicago oscillator wave, SAW"/);
 assert.doesNotMatch(hero, /aria-label="0%"/);
 const miami = home.match(/<template id="frame-miami-0">([\s\S]*?)<\/template>/)[1];
 const originalGlyphs = miami.match(/<g role="text" aria-label="SAW"[^>]*>([\s\S]*?)<\/g>/)[1];
 const outlines = group => Array.from(group.matchAll(/<path [^>]*\bd="([^"]+)"/g), m => m[1]);
 assert.equal(outlines(value[1]).length, 3);
 assert.deepEqual(outlines(value[1]), outlines(originalGlyphs));
 const sound = home.match(/<section class="sound-section"[\s\S]*?<\/section>/)[0];
 assert.match(sound, /Chicago, Miami and SuperJ6/);
 assert.match(sound, /<span>SuperJ6<\/span>/);
 assert.doesNotMatch(sound, /\bJuno\b/);
 assert.match(home, /data-demo="juno"[^>]*>Juno \(archived\)<\/button>/);
 const frames = JSON.parse(home.match(/<script id="replay-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
 assert.equal(frames.juno.length, 7);
 assert.ok(frames.juno.every(frame => frame.text.startsWith('JUNO ')));
});

test('archived build links name different destinations in the static record', () => {
  const records = read('builds/index.html').matchAll(/<article\b[^>]*data-record-id="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g);
  const recordIds = [];
  let reviewed = 0;
  for (const [, id, record] of records) {
    recordIds.push(id);
    const group = record.match(/<div class="record-links">([\s\S]*?)<\/div>/);
    if (!group) continue;
    const links = [...group[1].matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([^<>]+)<\/a>/g)];
    if (new Set(links.map(([, href]) => href)).size >= 2) reviewed++;
    const destinations = new Map();
    for (const [, href, text] of links) {
      const name = text.trim();
      assert.ok(name && name !== 'Source and evidence', id + ' needs a descriptive source link');
      assert.ok(!destinations.has(name) || destinations.get(name) === href,
        id + ' reuses "' + name + '" for different source links');
      destinations.set(name, href);
      const target = new URL(href, 'https://example.invalid/');
      const github = target.hostname === 'github.com';
      const commit = target.pathname.match(/\/commit\/([0-9a-f]{40})$/);
      const pull = target.pathname.match(/\/pull\/(\d+)$/);
      const review = target.pathname.match(/\/pulls\/(\d+)\/reviews\/\d+$/);
      if (review) assert.ok(/review/i.test(name) && name.includes('#' + review[1]), id + ' needs its review target');
      if (target.pathname.endsWith('.log')) assert.match(name, /log/i);
      if (target.pathname.includes('/tree/')) assert.match(name, /tree|folder|directory/i);
      if (github && commit) assert.ok(name.includes(commit[1].slice(0, 8)), id + ' needs its commit ID');
      if (github && pull) assert.ok(name.includes('#' + pull[1]), id + ' needs its pull request number');
    }
  }
  assert.deepEqual(recordIds, JSON.parse(read('data/history.json')).map(record => record.id));
  assert.ok(reviewed >= 60, 'archived multi-source build records are missing');
});
