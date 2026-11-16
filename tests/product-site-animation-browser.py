# SPDX-License-Identifier: GPL-3.0-only
# Measured browser-only shared preview animation. Not native or device qualification.
import json,hashlib,re,threading,os,sys,subprocess
from datetime import datetime,timezone
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];SITE=ROOT/'web/product-site';OUT=Path(os.environ.get('DNBOX_ANIMATION_EVIDENCE',str(ROOT.parent/'evidence/site-animation-r4')));OUT.mkdir(exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def translate_path(self,path):
  if path.split('?',1)[0]=='/__metrics.mjs':return str(ROOT/'tests/product-site-animation-metrics.mjs')
  if path.split('?',1)[0].startswith('/__fixtures/'):return str(ROOT/'tests/visual/fixtures'/Path(path.split('?',1)[0]).name)
  return super().translate_path(path)
inputs={(SITE/name).resolve()for name in ['index.html','site.css','assets/BarlowSemiCondensed-Medium.ttf','assets/BarlowSemiCondensed-Bold.ttf']};seen=set()
def deps(path):
 path=path.resolve()
 if path in seen:return
 seen.add(path);inputs.add(path)
 for ref in re.findall(r"(?:from\s*|import\s*)['\"](\.[^'\"]+)['\"]",path.read_text()):
  p=(path.parent/ref).resolve()
  if p.is_file()and p.suffix in{'.mjs','.js'}:deps(p)
for name in ['hero.mjs','app.mjs','site-shell.mjs']:deps(SITE/name)
inputs.add((SITE/'remote/source-sounds.json').resolve())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
result={'schema':'dnbox-public-preview-animation/1','scope':'Shared public Chicago WAVE and Juno WIDTH previews only. No native/device/live/audio admission.','sources':{str(p.relative_to(SITE.resolve())):sha(p)for p in sorted(inputs)},'testSHA256':sha(Path(__file__)),'measurements':[],'checks':[],'errors':[]}
toolFiles={str(p.relative_to(ROOT)):sha(p)for p in[Path(__file__).resolve(),ROOT/'tests/product-site-animation-metrics.mjs',ROOT/'tests/visual/fixtures/site-before-static-hero.html',ROOT/'tests/visual/fixtures/site-before-static-hero.json']}
config={'viewports':[[1440,900],[390,844],[844,390]],'dpr':1,'motion':'no-preference','browserExecutable':'/usr/bin/chromium','browserVersion':subprocess.check_output(['/usr/bin/chromium','--version'],text=True).strip(),'cadenceDropDefinition':'An observed RAF interval exceeds1.5times median interval; no fixed settling-duration threshold imposed.','pixelCaptureIsolation':'Exact typed-array snapshots, then two RAFs before transition; no boxed pixel array staging.','antialiasClassification':'Exact current glyph-live GLYPH_STROKE/FACE imports; solid endpoint, nonopaque and off-palette negatives tested.'}
fingerprint=hashlib.sha256(json.dumps({'sources':result['sources'],'tools':toolFiles,'config':config},sort_keys=True).encode()).hexdigest();ledgerPath=OUT.parent/'site-animation-attempts.json';ledger=json.loads(ledgerPath.read_text())if ledgerPath.exists()else[];attempt=1+sum(r['fingerprint']==fingerprint for r in ledger);runDir=OUT/f'{fingerprint[:12]}-attempt-{attempt:03d}';runDir.mkdir(exist_ok=False)
entry={'fingerprint':fingerprint,'attempt':attempt,'started':datetime.now(timezone.utc).isoformat(),'status':'RUNNING','report':str(runDir/'report.json')};ledger.append(entry);ledgerPath.write_text(json.dumps(ledger,indent=2)+'\n');result.update(fingerprint=fingerprint,attemptOnSameInputs=attempt,toolFiles=toolFiles,config=config)
def check(ok,label):result['checks'].append({'pass':bool(ok),'label':label});print(('PASS 'if ok else'FAIL ')+label,flush=True)
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(SITE)));threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
probe=r'''async selector=>{
 const {pixelMetrics}=await import('/__metrics.mjs'),{GLYPH_STROKE,FACE}=await import('/remote/glyph-live.mjs');
 const specimen=document.querySelector(selector)?.closest('details');if(specimen&&!specimen.open){specimen.open=true;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}
 const card=document.querySelector(selector),glyph=card.querySelector('[data-glyph-fn]'),a=glyph.glyphAnimator,input=card.querySelector('input'),canvas=glyph.querySelector('canvas');
 const set=raw=>{input.value=String(raw);input.dispatchEvent(new Event('input',{bubbles:true}))};
 set(0);await new Promise(resolve=>{let n=0;const wait=()=>a.idle||n++>180?resolve():requestAnimationFrame(wait);requestAnimationFrame(wait)});
 const pixels=()=>canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,before=pixels(),initialFrames=a.frames,samples=[];
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));set(127);const started=performance.now();let timedOut=false;
 await new Promise(resolve=>{const sample=t=>{samples.push({t,value:a.value,drawFrames:a.frames-initialFrames});if(a.idle&&samples.length>2)return resolve();if(performance.now()-started>2000){timedOut=true;return resolve()}requestAnimationFrame(sample)};requestAnimationFrame(sample)});
 const metrics=pixelMetrics(before,pixels(),FACE,GLYPH_STROKE);
 const gaps=samples.slice(1).map((s,i)=>s.t-samples[i].t),sorted=[...gaps].sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)],dropped=gaps.filter(dt=>dt>1.5*median).length,ds=samples.slice(1).map((s,i)=>s.value-samples[i].value);
 return{fn:glyph.dataset.glyphFn,engine:glyph.dataset.glyphEngine,width:canvas.width,height:canvas.height,samples,medianFrameMs:median,roundedFps:Math.round(1000/median),droppedFrames:dropped,maxFrameMs:Math.max(...gaps),monotone:ds.every(d=>d>=-1e-9),easedSpeedVariation:Math.max(...ds)-Math.min(...ds),settled:a.idle&&a.value===1,timedOut,...metrics,palette:{face:FACE,stroke:GLYPH_STROKE},elapsedMs:performance.now()-started,animationSpanMs:samples.at(-1).t-samples[0].t};
}'''
try:
 with sync_playwright()as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);result['browserVersion']=b.version
  for size,wh in [('desktop',(1440,900)),('phone',(390,844)),('landscape',(844,390))]:
   ctx=b.new_context(viewport={'width':wh[0],'height':wh[1]},device_scale_factor=1,reduced_motion='no-preference');page=ctx.new_page();page.on('pageerror',lambda e:result['errors'].append(str(e)));page.goto(base+'/');page.evaluate('document.fonts.ready')
   for selector in['.hero-ui .hero-parameter:first-child','.source-preview-live .hero-parameter']:
    m=page.evaluate(probe,selector);m.update(size=size,viewport=wh);result['measurements'].append(m);label=size+' '+m['engine']+' '+m['fn']
    check(m['settled']and not m['timedOut'],label+' settles at actual requested scalar');check(30<=m['roundedFps']<=60 and m['droppedFrames']==0,label+' measured30–60fps without cadence drops');check(m['monotone']and m['easedSpeedVariation']>.02,label+' actual transition is monotone and eased, not linear');check(m['changedPixels']>0,label+' actual curve pixels adapt');check(m['softEdgePixels']>0 and m['offPalettePixels']==0 and m['nonOpaquePixels']==0,label+' actual pixels have qualified opaque anti-aliased edge coverage')
   ctx.close()
  ctx=b.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');page=ctx.new_page();page.goto(base+'/');m=page.evaluate('''()=>{const c=document.querySelector('.hero-ui .hero-parameter'),g=c.querySelector('[data-glyph-fn]'),a=g.glyphAnimator,input=c.querySelector('input');input.value='127';input.dispatchEvent(new Event('input',{bubbles:true}));return{value:a.value,idle:a.idle}}''');check(m['value']==1 and m['idle'],'reduced-motion preview jumps immediately without idle animation');ctx.close()
  ctx=b.new_context();page=ctx.new_page();page.goto(base+'/__fixtures/site-before-static-hero.html');old=page.locator('.hero-ui').evaluate('(e)=>({svg:e.querySelectorAll("svg").length,animators:[...e.querySelectorAll("[data-glyph-fn]")].filter(n=>n.glyphAnimator).length,ranges:e.querySelectorAll("input[type=range]").length})');result['oldFixture']=old;check(old['svg']>0 and old['animators']==0 and old['ranges']==0,'regression detector rejects actual9809static hero as current adaptive animation');ctx.close();b.close()
except Exception as e:
 result['errors'].append(str(e))
server.shutdown();result['inputChanges']=[name for name,h in result['sources'].items()if not(SITE/name).exists()or sha(SITE/name)!=h];check(not result['inputChanges'],'animation runtime source closure stable');check(sha(Path(__file__))==result['testSHA256'],'animation probe source stable');check(not result['errors'],'no browser animation errors');check(all(sha(ROOT/name)==h for name,h in toolFiles.items()),'animation test and old fixture tools stable');entry.update(status='FAIL'if any(not c['pass']for c in result['checks'])else'PASS',finished=datetime.now(timezone.utc).isoformat());ledgerPath.write_text(json.dumps(ledger,indent=2)+'\n');result['run']=entry;(runDir/'report.json').write_text(json.dumps(result,indent=2)+'\n');(OUT/'report.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'checks':len(result['checks']),'failed':sum(not c['pass']for c in result['checks']),'errors':result['errors']},indent=2));sys.exit(any(not c['pass']for c in result['checks']))
