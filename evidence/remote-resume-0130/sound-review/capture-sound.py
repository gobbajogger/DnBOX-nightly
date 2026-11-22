#!/usr/bin/env python3
"""Capture complete current Sound pages without changing production state or admission."""
import asyncio,hashlib,importlib.util,json,os,subprocess,sys,tempfile
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[3]
HERE=ROOT/'tests/product-remote';sys.path.insert(0,str(HERE))
spec=importlib.util.spec_from_file_location('sound_capture_core',HERE/'funkybeats-browser.py');core=importlib.util.module_from_spec(spec);spec.loader.exec_module(core)
OUT=Path(__file__).resolve().parent/os.environ.get('SOUND_CAPTURE_OUTPUT','complete-captures-exact');OUT.mkdir(exist_ok=True)
SIZES=json.loads(os.environ.get('SOUND_CAPTURE_SIZES','[[1440,900],[390,844],[844,390],[1024,640]]'))
METRICS='''() => {
 const b=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
 const root=document.querySelector('#other-view');
 const controls=[...root.querySelectorAll('button[data-param],input[data-sj6-field],select[data-sj6-field],.init-readout')].map(e=>({id:e.dataset.param??e.dataset.sj6Field??e.dataset.initField,label:e.getAttribute('aria-label')??e.textContent.trim(),box:b(e),visible:getComputedStyle(e).visibility==='visible'}));
 const scroll=[...root.querySelectorAll('*'),root].filter(e=>e.scrollHeight>e.clientHeight+1&&/auto|scroll/.test(getComputedStyle(e).overflowY)).map(e=>({tag:e.tagName,id:e.id,class:e.className,height:e.clientHeight,content:e.scrollHeight}));
 return {viewport:[innerWidth,innerHeight],document:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],panel:b(root),title:document.querySelector('#part-title').textContent,controls,scroll,glyphs:root.querySelectorAll('svg,[data-glyph-fn],[data-glyph-semantic],canvas').length,status:document.querySelector('#status').textContent};
}'''
async def run():
 proof=[]
 def save():
  (OUT.parent/(OUT.name+'.json')).write_text(json.dumps({'scope':'Draft Sound complete current product; no physical or native admission inferred','states':proof},indent=2)+'\n')
 async with async_playwright() as p:
  browser=await p.chromium.launch(chromium_sandbox=True)
  try:
   for w,h in SIZES:
    c=await browser.new_context(viewport={'width':w,'height':h},has_touch=w<900)
    await c.route('**/*',core.serve);page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.add_init_script("window.midiCalls=0;navigator.requestMIDIAccess=()=>{midiCalls++;throw Error('Unrequested MIDI')}")
    await page.goto(core.ORIGIN+'/remote/');await page.locator('[data-view="sound"]').click();await page.evaluate('document.fonts.ready')
    async def snap(name):
     await page.evaluate('document.fonts.ready');await page.wait_for_timeout(80)
     data=await page.evaluate(METRICS);assert data['document'][0]<=w,(name,data)
     data.update(state=name,errors=list(errors),midiCalls=await page.evaluate('midiCalls'))
     assert not data['errors'] and data['midiCalls']==0,data
     f=OUT/f'{w}x{h}-{name}.png';await page.screenshot(path=str(f),full_page=True)
     data['capture']=f.name;data['sha256']=hashlib.sha256(f.read_bytes()).hexdigest();proof.append(data);save()
     if data['scroll']:
      await page.locator('#other-view').evaluate('root=>{for(const e of [...root.querySelectorAll("*"),root])if(e.scrollHeight>e.clientHeight+1&&/auto|scroll/.test(getComputedStyle(e).overflowY))e.scrollTop=e.scrollHeight}')
      bottom=OUT/f'{w}x{h}-{name}-scrolled-bottom.png';await page.screenshot(path=str(bottom),full_page=True)
      data['bottomCapture']=bottom.name;data['bottomSha256']=hashlib.sha256(bottom.read_bytes()).hexdigest();save()
      await page.locator('#other-view').evaluate('root=>{for(const e of [...root.querySelectorAll("*"),root])e.scrollTop=0}')
    for kit in ['drum909','drum808']:
     await page.locator(f'[data-engine="{kit}"]').click()
     for voice in await page.locator('#sound-voice option').evaluate_all('es=>es.map(e=>e.value)'):
      await page.locator('#sound-voice').select_option(voice);await snap(f'{kit}-voice{int(voice):02d}')
    for part in ['chicago','miami']:
     await page.locator(f'[data-engine="{part}"]').click()
     for bank in ['CHICAGO','MIAMI','Synth One','SuperJ6']:
      await page.locator('#sound-bank').select_option(bank);await snap(part+'-'+bank.lower().replace(' ','-'))
    await page.locator('[data-engine="breaks"]').click();await snap('breaks')
    await c.close();await browser.close();browser=await p.chromium.launch(chromium_sandbox=True);print(f'PASS Sound complete-page captures {w}x{h}:31 states document overflowX=0 MIDI=0',flush=True)
  finally:await browser.close()
 save()
if __name__=='__main__' and os.environ.get('SOUND_CAPTURE_BUILD'):
 core.SOURCE=Path(os.environ['SOUND_CAPTURE_BUILD']);asyncio.run(run())
elif __name__=='__main__':
 with tempfile.TemporaryDirectory(prefix='sound-review-capture-',dir=ROOT/'.output') as d:
  core.SOURCE=Path(d);subprocess.run(['node','scripts/build-product-site.mjs','--output',d],cwd=ROOT,check=True)
  asyncio.run(run())
