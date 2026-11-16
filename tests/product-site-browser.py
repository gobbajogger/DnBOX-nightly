# SPDX-License-Identifier: GPL-3.0-only
# Actual source-pinned public website checks. No device writes or provider admission.
import json,threading,hashlib,traceback,sys,os,re,io,wave,math,struct,base64
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];SITE=ROOT/'web/product-site';OUT=Path(os.environ.get('DNBOX_EVIDENCE_DIR',str(ROOT.parent/'evidence/site-actual-final')));OUT.mkdir(exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def translate_path(self,path):
  clean=path.split('?',1)[0]
  if clean.startswith('/__fixtures/'):
   return str(ROOT/'tests/visual/fixtures'/Path(clean).name)
  return super().translate_path(path)
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(SITE)));threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
routes=['','install/','manual/','manual/legacy.html','manual/protocol.html','manual/projects-guide.html','manual/original/','presets/legacy/','help/','new/','presets/','projects/','breaks/','starting-breaks/','builds/','tools/','reference/','reference/r22.html','reference/current-ui.html']
result={'sourceFiles':{},'screens':[],'checks':[],'errors':[],'states':[],'assetErrors':[],'regressions':[],'alignmentMeasurements':[],'hygieneMeasurements':[],'canonicalMeasurements':[],'stateHygieneMeasurements':[],'testSourceSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
# Public website sources and real hero import closure. Unrelated Remote app work
# does not invalidate this scoped proof. Final combined-source gates remain separate.
inputs={p for p in SITE.rglob('*') if p.is_file() and 'remote' not in p.relative_to(SITE).parts and p.name not in {'SOURCE-MANIFEST.json','SOURCE-TRACE.json'}}
seen=set()
def dependencies(path):
 path=path.resolve()
 if path in seen:return
 seen.add(path);inputs.add(path)
 for ref in re.findall(r"(?:from\s*|import\s*)['\"](\.[^'\"]+)['\"]",path.read_text()):
  target=(path.parent/ref).resolve()
  if target.is_file() and target.suffix in {'.mjs','.js'}:dependencies(target)
dependencies(SITE/'hero.mjs')
inputs.add((SITE/'remote/source-sounds.json').resolve()) # exact observed Juno WIDTH specimen provenance
fixtureManifest=json.loads((ROOT/'tests/visual/fixtures/site-r3-defects.json').read_text())
result['regressionFixtureFiles']={r['path']:hashlib.sha256((ROOT/r['path']).read_bytes()).hexdigest()for r in fixtureManifest['fixtures']}
for p in sorted(inputs):result['sourceFiles'][str(p.relative_to(SITE.resolve()))]=hashlib.sha256(p.read_bytes()).hexdigest()
hygienePath=ROOT/'tests/product-site-hygiene.mjs';hygieneCode=hygienePath.read_text().replace('export function','function',1);result['hygieneToolSHA256']=hashlib.sha256(hygienePath.read_bytes()).hexdigest()
for name in ['site-before-disabled-controls.html','site-before-disabled-controls.json','site-r3-archive-height.json','site-r3-archive-fit.json','site-r3-archive-fit.html','site-valid-project.json','site-retired-engine4.json','site-r3-juno-preview.html','site-r3-juno-preview.json','site-r4-header-height.json']:
 p=ROOT/'tests/visual/fixtures'/name;result['regressionFixtureFiles'][str(p.relative_to(ROOT))]=hashlib.sha256(p.read_bytes()).hexdigest()
r4Fixtures=json.loads((ROOT/'tests/visual/fixtures/site-r4-review-findings.json').read_text());result['regressionFixtureFiles']['tests/visual/fixtures/site-r4-review-findings.json']=hashlib.sha256((ROOT/'tests/visual/fixtures/site-r4-review-findings.json').read_bytes()).hexdigest()
for row in r4Fixtures['fixtures']:
 p=ROOT/'tests/visual/fixtures'/row['fixture'];result['regressionFixtureFiles'][str(p.relative_to(ROOT))]=hashlib.sha256(p.read_bytes()).hexdigest()
portFixture=json.loads((ROOT/'tests/visual/fixtures/site-before-locked-port.json').read_text());result['regressionFixtureFiles']['tests/visual/fixtures/site-before-locked-port.json']=hashlib.sha256((ROOT/'tests/visual/fixtures/site-before-locked-port.json').read_bytes()).hexdigest()
for row in portFixture['nativeFixture']:
 p=ROOT/'tests/visual/fixtures'/row['file'];result['regressionFixtureFiles'][str(p.relative_to(ROOT))]=hashlib.sha256(p.read_bytes()).hexdigest()
result['sourceScope']='Public website + recursively imported shared hero renderer. Unrelated Remote application changes excluded; final combined gates still required.'
def check(ok,label):
 result['checks'].append({'pass':bool(ok),'label':label});print(('PASS 'if ok else 'FAIL ')+label,flush=True)
audio=io.BytesIO()
with wave.open(audio,'wb')as wav:
 wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(44100);wav.writeframes(b''.join(struct.pack('<h',int(5000*math.sin(i*2*math.pi*220/44100)))for i in range(8820)))
fixture={'name':'local-test.wav','mimeType':'audio/wav','buffer':audio.getvalue()}
def png_size(path):
 data=path.read_bytes();return struct.unpack('>II',data[16:24])
def orange_pixels(locator):
 from PIL import Image
 data=locator.screenshot();img=Image.open(io.BytesIO(data)).convert('RGB');return sum(r>180 and 70<g<200 and b<70 for r,g,b in img.getdata())
def archive_measure(page):
 return page.locator('#archive-frame').evaluate("e=>({parent:document.documentElement.scrollHeight,frame:e.getBoundingClientRect().height,body:e.contentDocument.body.getBoundingClientRect().height,marginTop:parseFloat(e.contentDocument.defaultView.getComputedStyle(e.contentDocument.body).marginTop),marginBottom:parseFloat(e.contentDocument.defaultView.getComputedStyle(e.contentDocument.body).marginBottom)})")
def canonical(page):
 return page.evaluate("""()=>{const expected={base:'rgb(5, 10, 13)',face:'rgb(16, 26, 31)',edge:'rgb(38, 56, 61)',ink:'rgb(234, 241, 239)',white:'rgb(222, 231, 223)',line:'rgb(40, 56, 61)',amber:'rgb(196, 155, 69)',dim:'rgb(128, 146, 148)'},body=getComputedStyle(document.body),header=document.querySelector('.site-header'),failures=[],surfaces=[];if(body.backgroundColor!==expected.base)failures.push({role:'body/base',actual:body.backgroundColor,expected:expected.base});if(body.color!==expected.ink)failures.push({role:'body/ink',actual:body.color,expected:expected.ink});if(header&&getComputedStyle(header).borderBottomColor!==expected.line)failures.push({role:'header/divider',actual:getComputedStyle(header).borderBottomColor,expected:expected.line});for(const n of document.querySelectorAll('.hero-ui,.hero-parameter,.sound-description,.demo-stage,.tools-section nav>a,.capability-columns>article,.original-presets section,.build-record,.break-picker,.legacy-presets .panel,.tool-surface main>section')){const b=n.getBoundingClientRect(),c=getComputedStyle(n);if(!b.width||!b.height||c.borderTopStyle!=='solid'||parseFloat(c.borderTopWidth)<1)continue;const row={element:n.id||n.className||n.tagName,face:c.backgroundColor,edge:c.borderTopColor,radius:c.borderTopLeftRadius};surfaces.push(row);if(row.face!==expected.face||row.edge!==expected.edge||row.radius!=='9px')failures.push({...row,role:'outer-panel/face-edge-radius9'});}for(const n of document.querySelectorAll('.hero-parameter output'))if(getComputedStyle(n).color!==expected.white)failures.push({role:'value/white',actual:getComputedStyle(n).color});return{expected,body:{background:body.backgroundColor,ink:body.color},surfaces,failures,scope:'Actual outer HTML surfaces/values only. Historical iframe/SVG originals are preserved, not requalified; canonical native region comparison remains separate.'};}""")
def state(page,label,size):
 audit=page.evaluate('('+hygieneCode+')(document)');result['stateHygieneMeasurements'].append({'label':label,'size':size,**audit});check(not audit['contrastFailures'] and not audit['horizontalOverflows'] and not audit['clippedText'] and not audit['glyphLabelOverlaps'] and not audit['unmeasuredBackgrounds'],label+' '+size+' actual interacted HTML contrast/containment/glyph-label hygiene')
 for frame in page.frames:
  if frame==page.main_frame or not frame.url.startswith(base) or not frame.frame_element().is_visible():continue
  inner=frame.evaluate('('+hygieneCode+')(document)');result['stateHygieneMeasurements'].append({'label':label,'size':size,'frameURL':frame.url,**inner});check(not inner['contrastFailures'] and not inner['horizontalOverflows'] and not inner['clippedText'] and not inner['glyphLabelOverlaps'] and not inner['unmeasuredBackgrounds'],label+' '+size+' visible embedded HTML hygiene');paint=canonical(frame);result['canonicalMeasurements'].append({'label':label,'size':size,'frameURL':frame.url,**paint});check(not paint['failures'],label+' '+size+' visible embedded canonical roles')
 path=OUT/f'{label}-{size}.png';page.screenshot(path=str(path),full_page=True)
 result['states'].append({'label':label,'size':size,'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
with sync_playwright()as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,chromium_sandbox=True)
 for size,wh in [('desktop',(1440,900)),('phone',(390,844)),('landscape',(844,390))]:
  context=browser.new_context(viewport={'width':wh[0],'height':wh[1]},device_scale_factor=1)
  page=context.new_page();page.on('pageerror',lambda e:result['errors'].append(str(e)))
  page.on('response',lambda r:result['assetErrors'].append({'url':r.url,'status':r.status})if r.status>=400 and r.url.startswith(base) and re.search(r'\.(?:css|mjs|js|woff2?|png|svg|jpg|webp|html)(?:[?#]|$)',r.url)else None)
  for route in routes:
   try:
    page.goto(base+'/'+route,wait_until='load');page.evaluate('document.fonts.ready');page.locator('img[loading=lazy]').evaluate_all('(imgs)=>imgs.forEach(i=>i.loading="eager")');page.evaluate('Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))');page.wait_for_timeout(300)
    colors=canonical(page);result['canonicalMeasurements'].append({'route':route,'size':size,**colors});check(not colors['failures'],route+' '+size+' actual computed canonical outer roles/radius9')
    audit=page.evaluate('('+hygieneCode+')(document)');result['hygieneMeasurements'].append({'route':route,'size':size,**audit});check(not audit['contrastFailures'],route+' '+size+' effective HTML label contrast4.5:1');check(not audit['horizontalOverflows'] and not audit['clippedText'],route+' '+size+' HTML text containment and real clipping');check(not audit['glyphLabelOverlaps'],route+' '+size+' current glyphs never overlap labels or values');check(not audit['unmeasuredBackgrounds'],route+' '+size+' label backgrounds are measurable, not assumed')
    slug=route.strip('/').replace('/','-').replace('.html','')or'home';path=OUT/f'{slug}-{size}.png'
    archive=route.endswith('-source.html')
    # All defaults are native full-page screenshots, including complete manuals. Exact archive originals are contained by their historical wrappers.
    full=True
    beforeArchive=archive_measure(page)if route in {'reference/r22.html','reference/current-ui.html'}else None
    page.screenshot(path=str(path),full_page=full)
    dims=page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight})');check(dims['scroll']==wh[0],route+' '+size+' no horizontal overflow')
    if beforeArchive:
     page.wait_for_timeout(350);afterArchive=archive_measure(page);pixelSize=png_size(path);stable=all(abs(afterArchive[k]-beforeArchive[k])<=1 for k in ['parent','frame','body']);check(stable and pixelSize[1]==dims['height'],route+' '+size+' archive intrinsic height stays stable through full-page capture');check(abs(afterArchive['frame']-(math.ceil(afterArchive['body']+afterArchive['marginTop']+afterArchive['marginBottom'])+2))<=1,route+' '+size+' archive fits content without large blank viewport padding');result['alignmentMeasurements'].append({'route':route,'size':size,'archiveBefore':beforeArchive,'archiveAfter':afterArchive,'pngSize':pixelSize})
    header=page.locator('.site-header').bounding_box();menu=page.locator('.nav-toggle');menuStyle=menu.evaluate('(n)=>({weight:getComputedStyle(n).fontWeight,lineHeight:parseFloat(getComputedStyle(n).lineHeight),font:parseFloat(getComputedStyle(n).fontSize)})');check(menuStyle['weight']=='400' and abs(menuStyle['lineHeight']/menuStyle['font']-1.25)<.01,route+' '+size+' shared Menu typography is explicit');result['alignmentMeasurements'].append({'route':route,'size':size,'header':header,'menuStyle':menuStyle})
    result['screens'].append({'route':route,'size':wh,'path':str(path),'fullPage':full,'dimensions':dims,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    if not archive:
     check(page.locator('header.site-header').count()==1,route+' '+size+' one shared header')
     if wh[0]>1000:
      more=page.locator('.more-nav');more.locator('summary').click();check(more.evaluate('(e)=>e.open'),route+' desktop More opens');check(more.locator('a:visible').count()==more.locator('a').count(),route+' desktop every More destination visible');page.keyboard.press('Escape');check(not more.evaluate('(e)=>e.open'),route+' desktop Escape closes More');check(more.locator('summary').evaluate('(e)=>e===document.activeElement'),route+' desktop More restores focus');more.locator('summary').click();page.locator('h1').first.click();check(not more.evaluate('(e)=>e.open'),route+' desktop outside closes More')
     if wh[0]<=1000:
      toggle=page.locator('.nav-toggle');check(toggle.is_visible(),route+' '+size+' menu visible')
      check(toggle.bounding_box()['height']>=44,route+' '+size+' menu touch target')
      toggle.click();check(page.locator('#site-navigation').is_visible(),route+' '+size+' menu opens')
      check(page.locator('#site-navigation a:visible').count()==page.locator('#site-navigation a').count(),route+' '+size+' every actual navigation destination visible')
      if route=='':state(page,'home-menu-open',size)
      check(page.locator('#site-navigation').evaluate('(n)=>n.getBoundingClientRect().right<=innerWidth'),route+' '+size+' open menu fits')
      page.keyboard.press('Escape');check(toggle.get_attribute('aria-expanded')=='false',route+' '+size+' Escape closes')
      check(page.evaluate('document.activeElement===document.querySelector(".nav-toggle")'),route+' '+size+' Escape restores focus')
      toggle.click();page.locator('h1').first.click();check(toggle.get_attribute('aria-expanded')=='false',route+' '+size+' outside closes')
    if wh[0]>1000:
     alignment=page.locator('#site-navigation>a').evaluate_all('(ns)=>{let rows=ns.map(n=>{const r=document.createRange();r.selectNodeContents(n);const t=r.getBoundingClientRect(),b=n.getBoundingClientRect();return {text:n.textContent,textTop:t.top,left:b.left,right:b.right}});return {rows,baselineSpread:Math.max(...rows.map(x=>x.textTop))-Math.min(...rows.map(x=>x.textTop)),gaps:rows.slice(1).map((x,i)=>x.left-rows[i].right)}}')
     result['alignmentMeasurements'].append({'route':route,'size':size,'primaryNavigation':alignment});check(alignment['baselineSpread']<=1,route+' primary navigation text baselines within1px');check(max(alignment['gaps'])-min(alignment['gaps'])<=2,route+' primary navigation spacing consistent within2px')
    if route=='':
     check(page.locator('.hero-ui .hero-live canvas').count()==4,'hero uses four semantically correct shared R22 glyph canvases')
     check(page.locator('.source-preview-live canvas').count()==1,'Juno source specimen uses actual shared WIDTH renderer')
     check(page.locator('.earlier-source-specimen').count()==1,'earlier JUNO scalar stays in its archived source disclosure')
     glyph=page.locator('.hero-ui .hero-parameter').first
     before=glyph.locator('canvas').evaluate('(c)=>c.toDataURL()')
     glyph.locator('input').focus();glyph.locator('input').press('End');page.wait_for_timeout(260)
     check(glyph.locator('output').inner_text()=='SQR','hero WAVE endpoint uses shared source display, not standalone percentage')
     check(glyph.locator('canvas').evaluate('(c)=>c.toDataURL()')!=before,'hero actual shared curve adapts to changed value')
     check(glyph.get_by_role('button',name='Increase WAVE').is_disabled(),'source WAVE plus clamps at raw127');glyph.get_by_role('button',name='Decrease WAVE').click();check(glyph.locator('input').input_value()=='126' and glyph.locator('output').inner_text()=='BLEND','real minus updates same raw input/readout');glyph.locator('input').focus();glyph.locator('input').press('Home');check(glyph.get_by_role('button',name='Decrease WAVE').is_disabled() and glyph.locator('output').inner_text()=='SAW','source WAVE minus clamps at raw0');glyph.get_by_role('button',name='Increase WAVE').click();check(glyph.locator('input').input_value()=='1' and glyph.locator('input').get_attribute('aria-valuetext')=='BLEND','real plus updates shared raw/visible/accessible state');glyph.locator('input').focus();glyph.locator('input').press('End');page.wait_for_timeout(280);check(page.locator('.hero-ui .hero-parameter').evaluate_all('(ns)=>ns.every(n=>parseFloat(getComputedStyle(n).borderTopWidth)===0)'),'actual hero parameters share one plate, not individual boxes');check(all(n['h']>=44 for n in page.locator('.hero-parameter-buttons button').evaluate_all('(ns)=>ns.filter(n=>n.getBoundingClientRect().width).map(n=>({h:n.getBoundingClientRect().height}))')),'visible preview increment actions retain44px targets');state(page,'home-hero-wave-end',size)
     page.locator('.earlier-source-specimen>summary').click();page.wait_for_timeout(150);check(page.locator('.source-preview-live output').inner_text()=='50%','visible earlier JUNO specimen retains observed raw64 readout')
     width=page.locator('.source-preview-live input');width.focus();width.press('End');page.wait_for_timeout(280);check(page.locator('.source-preview-live output').inner_text()=='100%','earlier WIDTH specimen real change reaches100percent');state(page,'home-earlier-width-end',size)
     for mode in ['voice','juno','miami','pattern']:
      page.locator('.demo-tabs [data-demo='+mode+']').click();check(page.locator('.demo-tabs [data-demo='+mode+']').get_attribute('aria-pressed')=='true','actual retained replay mode '+mode+' selected');state(page,'home-replay-'+mode,size)
     page.locator('[data-demo=juno]').first.click();check(page.locator('[data-demo=juno]').first.get_attribute('aria-pressed')=='true','source Juno replay retained')
     prior=page.locator('#demo-status').inner_text();page.locator('#demo-play').click();page.wait_for_timeout(950);check(page.locator('#demo-status').inner_text()!=prior,'real source control replay advances');page.locator('#demo-stop').click()
    if route=='presets/':
     check(page.locator('#preset').is_disabled() and page.locator('#name').is_disabled(),'empty preset fields are unavailable')
     check(page.locator('#export').is_disabled(),'preset export denied without kept file')
     page.locator('#file').set_input_files({'name':'invalid.json','mimeType':'application/json','buffer':b'{bad'})
     page.wait_for_function("document.getElementById('status').textContent.includes('Not imported')");check('Not imported' in page.locator('#status').inner_text(),'invalid original preset rejected')
     source=b'[{"uid":"u","name":"First","bank":"User","cutoff":1,"waveform1":0}]'
     page.locator('#file').set_input_files({'name':'test.json','mimeType':'application/json','buffer':source});page.wait_for_function("!document.getElementById('keep').disabled")
     check(not page.locator('#keep').is_disabled(),'valid original-format preset inspected')
     with page.expect_download()as originalDownload:page.locator('#original').click()
     check(originalDownload.value.suggested_filename=='original-test.json' and Path(originalDownload.value.path()).read_bytes()==source,'original preset download prefix and untouched bytes match disclosed policy')
     page.locator('#name').fill('Changed');page.locator('#edit').click();page.locator('#keep').click()
     with page.expect_download()as d:page.locator('#export').click()
     data=Path(d.value.path()).read_bytes();check(b'Changed'in data and b'uid'in data and d.value.suggested_filename=='kept-test.json','kept preset separate copy preserves fields and disclosed prefix')
     state(page,'presets-valid',size)
     page.locator('#cancel').click();check(page.locator('#name').input_value()=='' and page.locator('#preset option').count()==0 and page.locator('#name').is_disabled(),'discard clears only preview fields')
     check(not page.locator('#export').is_disabled(),'discard preserves kept export')
    if route=='manual/protocol.html':
     region=page.locator('.protocol-page .table');check(region.get_attribute('tabindex')=='0','protocol comparison table is keyboard focusable')
     check(region.locator('td').first.bounding_box()['width']>=160,'protocol identifiers retain a readable technical column width')
     if wh[0]<1000:
      check(region.evaluate('(e)=>e.scrollWidth>e.clientWidth'),'protocol model columns scroll within their own region')
      region.focus();region.press('ArrowRight');page.wait_for_timeout(100);check(region.evaluate('(e)=>e.scrollLeft>0'),'protocol region responds to keyboard horizontal scrolling');state(page,'protocol-scrolled',size)
    if route=='presets/legacy/':
     check(page.locator('option[value=drone]').count()==0 and 'read-only' in page.locator('option[value="4"]').inner_text(),'retired engine filter is neutral read-only, never current Drone or SynthOne')
     page.locator('#target').select_option('4');legacy=json.loads((ROOT/'tests/visual/fixtures/site-retired-engine4.json').read_text());payload=base64.b64decode(legacy['base64']);page.locator('#files').set_input_files({'name':'legacy-engine4.dnpr','mimeType':'application/octet-stream','buffer':payload});page.wait_for_function("!document.getElementById('preview').hidden")
     check('Retired engine 4' in page.locator('#preview-meta').inner_text() and '(drone)' not in page.locator('#preview-meta').inner_text(),'actual legacy engine4 inspection preserves identity without active exposure')
     page.locator('#keep').click()
     with page.expect_download()as d:page.locator('#save-file').click()
     check(Path(d.value.path()).read_bytes()==payload,'retired engine4 user file exports byte-identically')
     state(page,'presets-retired-readonly',size)
     if wh[0]>740:
      boxes=page.locator('.layout>.panel').evaluate_all('(ns)=>ns.map(n=>n.getBoundingClientRect().toJSON())');check(abs(boxes[1]['x']-boxes[2]['x'])<=1 and boxes[0]['x']<boxes[1]['x'],'legacy session occupies the previously empty preview column')
    if route=='manual/legacy.html':
     page.locator('.manual-jump summary').click();page.locator('.manual-jump a[href="#s8"]').click();page.wait_for_timeout(350)
     check(not page.locator('.manual-jump').evaluate('(e)=>e.open'),'manual chapter chooser closes after selection')
     check(page.locator('#s8').bounding_box()['y']>=80,'manual chapter is not covered by sticky chooser')
    if route=='install/':
     pixels=orange_pixels(page.locator('#prep-reference'));pixels+=orange_pixels(page.locator('#prep-encoded'));check(pixels==0,'disabled audio controls use monochrome unavailable glyphs, not orange OS emoji')
     check(page.locator('#sample-picker').count()==0,'install has no starting-break picker')
     controls=page.locator('.model-help>summary,#package-details>summary,.diagnostics>summary,.resource-links a').evaluate_all('(ns)=>ns.filter(n=>n.getBoundingClientRect().height>0).map(n=>({font:parseFloat(getComputedStyle(n).fontSize),height:n.getBoundingClientRect().height}))');check(all(n['font']>=16 and n['height']>=44 for n in controls),'installer secondary controls meet declared16px/44px target')
     check(page.locator('#go').is_disabled(),'install denied without device')
     check(page.locator('#prep-encoded').evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(21, 32, 37)','disabled processed preview uses unavailable colour')
     page.locator('#prep-file').set_input_files(fixture);page.wait_for_function("!document.getElementById('prep-encoded').disabled")
     check(not page.locator('#prep-reference').is_disabled(),'installer locally decodes reference and processed audio')
     page.locator('#prep-rate').select_option('22050');page.locator('#prep-grit').select_option('2');page.wait_for_timeout(150);page.locator('#prep-details summary').click()
     check(page.locator('#prep-technical').inner_text().split(' Hz')[0].replace(',','').replace('.','').replace(' ','')=='11025','installer processing facts reflect actual11,025Hz local quality choice')
     state(page,'install-local-audio',size)
     for tab,panel in [('samples-tab','samples-panel'),('projects-tab','projects-panel'),('firmware-tab','firmware-panel')]:
      page.locator('#'+tab).click();page.wait_for_timeout(150);check(page.locator('#'+panel).is_visible(),'installer '+tab+' routes correctly')
      if panel=='projects-panel':check(page.frame_locator('#project-frame').locator('#find').evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(196, 155, 69)','embedded legacy Projects connect action uses actual canonical amber')
      state(page,'install-'+panel,size)
     check(page.locator('#go').is_disabled(),'returning to firmware does not enable write')
    if route=='starting-breaks/':
     check(page.locator('[data-action=play]').count()==5,'five starting breaks retained')
     check(page.locator('[data-action=play]:disabled').count()==5,'private previews unavailable, not fake audio')
     page.locator('[data-action=none]').click();check(page.locator('[data-asset]:checked').count()==0,'clear selection');check(all(t=='Preview unavailable' for t in page.locator('[data-action=play]').all_inner_texts()),'None never relabels unavailable audio as Play');state(page,'starting-breaks-none',size)
     page.locator('[data-action=all]').click();check(page.locator('[data-asset]:checked').count()==5,'all selected');check(all(t=='Preview unavailable' for t in page.locator('[data-action=play]').all_inner_texts()),'All preserves unavailable preview labels');state(page,'starting-breaks-all',size)
     page.locator('[data-asset]').first.uncheck();check(page.locator('[data-asset]:checked').count()==4 and all(t=='Preview unavailable' for t in page.locator('[data-action=play]').all_inner_texts()),'individual selection preserves unavailable audio state');state(page,'starting-breaks-individual',size)
     page.locator('[data-model=Elite]').click();check(page.locator('[data-model=Elite]').get_attribute('aria-pressed')=='true','model selected state')
    if route=='builds/':
     check(page.locator('#history-prev-bottom').is_disabled(),'bottom history pager starts at first page')
     check(page.locator('.build-record:visible').count()==20,'history defaults to20 records')
     first=page.locator('.build-record:visible').first.get_attribute('data-record-id');page.locator('#history-next').click();check(page.locator('.build-record:visible').first.get_attribute('data-record-id')!=first,'history next changes records')
     check(page.locator('#history-page-bottom').inner_text()==page.locator('#history-page').inner_text(),'history pagers stay synchronized')
     page.locator('#history-prev-bottom').click();check(page.locator('.build-record:visible').first.get_attribute('data-record-id')==first,'bottom previous restores first page')
     page.locator('#history-search').fill('no_such_build_019');check(page.locator('.build-record:visible').count()==0,'history empty result')
     page.locator('#history-search').fill('');check(page.locator('#history-prev').is_disabled(),'filter resets page')
     check(page.locator('.build-record').count()==197,'all197history source records retained')
    if route=='breaks/':
     page.locator('#auditionFile').set_input_files(fixture);page.wait_for_function("!document.getElementById('auditionEncoded').disabled")
     check('Preview only' in page.locator('#auditionStatus').inner_text(),'samples local audio decode reports preview-only facts')
     check(page.locator('#send').is_disabled(),'local audio never enables device write')
     state(page,'breaks-local-audio',size)
    if route=='new/':
     notes=page.locator('main>details').first;notes.locator('summary').click();ids=page.locator('[id]').evaluate_all('(ns)=>ns.map(n=>n.id)');check(len(ids)==len(set(ids)),'FM1 release notes have unique usable anchors');check(page.locator('h1').count()==1,'archived notes retain one page heading');check(notes.locator('a[href="https://charlesvestal.github.io/fm1-x0x/install/"]').count()==1 and notes.locator('a[href="../manual/original/"]').count()==1,'historical FM1 tools and manual do not target SMK37');state(page,'new-fm1-notes-open',size)
    if route=='projects/':
     check('Revision 13 import is unavailable here' in page.locator('main').inner_text(),'active full-project workspace discloses legacy schema boundary');check('MIDI export is unavailable' in page.locator('#project-exchange-root').inner_text(),'MIDI preview states unavailable boundary inside actual offer')
     task=page.locator('nav[aria-label="X0X"] a').evaluate_all('(ns)=>ns.map(n=>({font:parseFloat(getComputedStyle(n).fontSize),height:n.getBoundingClientRect().height}))');check(len(task)==2 and all(n['font']>=16 and n['height']>=44 for n in task),'project task destinations are legible44px controls')
     check(page.locator('#import').is_disabled(),'project import unavailable without prepared device')
     box=page.locator('#project-exchange-root').bounding_box();check(box['x']>=19 and box['x']+box['width']<=wh[0]-19,'project exchange stays inside content gutters')
     page.locator('#file').set_input_files({'name':'invalid.x0xproject','mimeType':'application/octet-stream','buffer':b'invalid project'})
     page.wait_for_timeout(150);check(page.locator('#prepare').is_disabled() and page.locator('#import').is_disabled(),'malformed project stays unable to prepare or import')
     valid=json.loads((ROOT/'tests/visual/fixtures/site-valid-project.json').read_text());payload=base64.b64decode(valid['base64']);check(hashlib.sha256(payload).hexdigest()==valid['sha256'] and valid['synthetic'] and not valid['contains_user_data'],'project test fixture exact and synthetic');page.locator('#file').set_input_files({'name':'source-fixture.x0xproject','mimeType':'application/octet-stream','buffer':payload});page.wait_for_function("document.getElementById('file-info').textContent.includes('Source fixture project')");check('File checked' in page.locator('#status').inner_text(),'actual source-derived project inspected offline');check(page.locator('#prepare').is_disabled() and page.locator('#import').is_disabled(),'valid offline inspection does not admit device import');state(page,'projects-valid-offline',size)
   except Exception as e:result['errors'].append(route+' '+size+': '+str(e));print('ERROR',route,size,str(e),flush=True)
  for alias,target in [('install.html','/install/'),('remote.html','/remote/')]:
   page.goto(base+'/'+alias);page.wait_for_url('**'+target);check(page.url.endswith(target),alias+' '+size+' compatibility redirect preserved')
  heights=[x['header']['height']for x in result['alignmentMeasurements']if x.get('size')==size and 'header'in x];check(len(heights)==len(routes) and max(heights)-min(heights)<=1,size+' actual common header height consistent across all19routes within1px')
  context.close()
 # Past-defect fixtures are isolated exact R3 markup/styles, not invented failures.
 for name,viewport,kind in [('site-r3-nav-hidden.html',(390,844),'navigation'),('site-r3-small-controls.html',(1440,900),'controls'),('site-r3-project-task-nav.html',(390,844),'task'),('site-r3-protocol-columns.html',(390,844),'protocol'),('site-r3-legacy-column.html',(1440,900),'legacy'),('site-r3-emoji-play.html',(390,844),'emoji'),('site-r3-tool-header.html',(390,844),'header')]:
  context=browser.new_context(viewport={'width':viewport[0],'height':viewport[1]});page=context.new_page();page.goto(base+'/__fixtures/'+name);page.evaluate('document.fonts.ready')
  if kind=='navigation':
   values={'total':page.locator('.more-nav a').count(),'visible':page.locator('.more-nav a:visible').count()};rejected=values['visible']!=values['total']
  elif kind in {'controls','task'}:
   selector='.model-help>summary,#package-details>summary,.diagnostics>summary,.resource-links a'if kind=='controls'else'nav[aria-label="X0X"] a'
   values=page.locator(selector).evaluate_all('(ns)=>ns.map(n=>({text:n.textContent,font:parseFloat(getComputedStyle(n).fontSize),height:n.getBoundingClientRect().height}))');rejected=any(n['font']<16 or n['height']<44 for n in values)
  elif kind=='protocol':
   region=page.locator('.table');values={'firstColumn':region.locator('td').first.bounding_box()['width'],'tabindex':region.get_attribute('tabindex')};rejected=values['firstColumn']<160 or values['tabindex']!='0'
  elif kind=='emoji':
   values={'orangePixels':orange_pixels(page.locator('#prep-reference'))+orange_pixels(page.locator('#prep-encoded'))};rejected=values['orangePixels']>0
  elif kind=='header':
   values=page.locator('.nav-toggle').evaluate('(e)=>({weight:getComputedStyle(e).fontWeight,lineHeight:getComputedStyle(e).lineHeight})');rejected=values['weight']!='400'
  else:
   values=page.locator('.layout>.panel').evaluate_all('(ns)=>ns.map(n=>n.getBoundingClientRect().toJSON())');rejected=abs(values[1]['x']-values[2]['x'])>1
  result['regressions'].append({'fixture':name,'measurements':values,'rejected':rejected});check(rejected,'regression detector rejects actual R3 '+kind+' defect');context.close()
 context=browser.new_context(viewport={'width':390,'height':844});page=context.new_page();page.goto(base+'/__fixtures/site-r4-emoji-variation.html');page.evaluate('document.fonts.ready');oldPixels=orange_pixels(page.locator('#prep-reference'))+orange_pixels(page.locator('#prep-encoded'));oldColors=canonical(page);result['regressions'].append({'fixture':'site-r4-emoji-variation.html','orangePixels':oldPixels,'canonicalFailures':oldColors['failures']});check(oldPixels>0,'pixel detector rejects actual R4 variation-selector OS emoji');check(bool(oldColors['failures']),'computed-role detector rejects actual old R4 palette');context.close()
 context=browser.new_context(viewport={'width':1440,'height':900});page=context.new_page();page.goto(base+'/__fixtures/site-before-locked-port-browser.html');page.evaluate('document.fonts.ready');page.wait_for_function("document.querySelectorAll('.hero-parameter').length===4");old=page.locator('.hero-parameter').evaluate_all('(ns)=>ns.map(n=>({border:parseFloat(getComputedStyle(n).borderTopWidth),readout:n.querySelector("output").textContent,buttons:n.querySelectorAll("button").length}))');result['regressions'].append({'fixture':'site-before-locked-port-browser.html','measurements':old});check(old[0]['border']>=1 and old[0]['readout']=='0%' and old[0]['buttons']==0,'native detector rejects authentic old parameter-card/percent-only composition');context.close()
 # Real old archive fit must fail the exact screenshot-stability detector.
 context=browser.new_context(viewport={'width':390,'height':844});page=context.new_page();page.goto(base+'/__fixtures/site-r3-archive-fit.html');page.evaluate('document.fonts.ready');page.wait_for_timeout(300);before=archive_measure(page);negativePath=OUT/'negative-r3-archive-fit.png';page.screenshot(path=str(negativePath),full_page=True);page.wait_for_timeout(350);after=archive_measure(page);rejected=abs(after['parent']-before['parent'])>1 or png_size(negativePath)[1]!=after['parent'];result['regressions'].append({'fixture':'site-r3-archive-fit.html','before':before,'after':after,'pngSize':png_size(negativePath),'rejected':rejected});check(rejected,'archive detector rejects real R3 viewport-dependent fit defect');context.close()
 # Actual original disabled controls validate ancestor-opacity contrast composition.
 context=browser.new_context();page=context.new_page();page.goto(base+'/__fixtures/site-before-disabled-controls.html');page.evaluate('document.fonts.ready');old=page.evaluate('('+hygieneCode+')(document)');result['regressions'].append({'fixture':'site-before-disabled-controls.html','contrastFailures':old['contrastFailures']});check(bool(old['contrastFailures']),'contrast detector rejects real original disabled-control opacity defect');context.close()
 # No-JS navigation uses native details rather than hiding the secondary destinations.
 context=browser.new_context(viewport={'width':390,'height':844},java_script_enabled=False);page=context.new_page();page.goto(base+'/');more=page.locator('.more-nav');check(more.locator('summary').is_visible(),'no-JS secondary navigation remains reachable');more.locator('summary').click();check(more.locator('a[href="starting-breaks/"]').is_visible(),'no-JS native More exposes starting breaks');check(page.locator('#site-navigation a:visible').count()==11,'no-JS all11destinations remain reachable');state(page,'home-nojs-open','phone');check(page.evaluate('document.documentElement.scrollWidth')==390,'no-JS navigation stays inside phone viewport');context.close()
 # A real shareable history link must select its source record before and after metadata fetch.
 context=browser.new_context();page=context.new_page();page.goto(base+'/builds/?channel=night&query=94197fc8');page.wait_for_timeout(200);check(page.locator('#channel').input_value()=='night' and page.locator('.build-record:visible').count()>0,'history deep link selects saved nightly checkpoint');check(all('94197fc8'in text for text in page.locator('.build-record:visible').all_inner_texts()),'history deep link does not silently show unrelated records');context.close()
 # Offline metadata is a real negative test, not simulated success.
 context=browser.new_context(viewport={'width':390,'height':844});page=context.new_page();page.route('**/data/history.json',lambda r:r.abort());page.goto(base+'/builds/');page.wait_for_timeout(300);check(page.locator('.build-record:visible').count()==20,'history offline fallback paginates complete source');check('complete saved history'in page.locator('#history-source-status').inner_text(),'history offline status accurate');context.close()
 browser.close()
server.shutdown();result['inputChanges']=[name for name,sha in result['sourceFiles'].items() if not (SITE/name).exists() or hashlib.sha256((SITE/name).read_bytes()).hexdigest()!=sha];check(all(hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==sha for name,sha in result['regressionFixtureFiles'].items()),'past-defect fixtures stable during validation');check(hashlib.sha256(hygienePath.read_bytes()).hexdigest()==result['hygieneToolSHA256'],'browser hygiene audit tool stable');check(hashlib.sha256(Path(__file__).read_bytes()).hexdigest()==result['testSourceSHA256'],'browser test source stable during validation');check(not result['inputChanges'],'all source inputs stable during browser validation');check(not result['errors'],'no unhandled browser errors');check(not result['assetErrors'],'no missing local page or visual assets');(OUT/'report.json').write_text(json.dumps(result,indent=2));print(json.dumps({'checks':len(result['checks']),'fails':sum(not x['pass']for x in result['checks']),'errors':result['errors']},indent=2));sys.exit(1 if result['errors']or any(not x['pass']for x in result['checks'])else 0)
