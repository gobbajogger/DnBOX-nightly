#!/usr/bin/env python3
"""Refresh only default SuperJ6 A/B at the four registered Sound viewports."""
import argparse,asyncio,hashlib,importlib.util,json,os,subprocess,sys,tempfile
from pathlib import Path
from playwright.async_api import async_playwright,expect
p=argparse.ArgumentParser();p.add_argument('--root',type=Path,required=True);p.add_argument('--sha',required=True);p.add_argument('--output',type=Path,required=True);args=p.parse_args();ROOT=args.root.resolve();OUT=args.output.resolve();OUT.mkdir(parents=True,exist_ok=False)
HEAD=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip();assert HEAD==args.sha,(HEAD,args.sha)
subprocess.run(['git','diff','--exit-code',args.sha,'--','web/product-site','scripts/build-product-site.mjs'],cwd=ROOT,check=True)
sys.path.insert(0,str(ROOT/'tests/product-remote'));spec=importlib.util.spec_from_file_location('capture_sound_core',ROOT/'tests/product-remote/funkybeats-browser.py');core=importlib.util.module_from_spec(spec);spec.loader.exec_module(core)
SIZES=[(1440,900),(390,844),(844,390),(1024,640)]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
async def run(site):
 core.SOURCE=site;proof={'source':args.sha,'sourceTree':subprocess.check_output(['git','rev-parse',args.sha+'^{tree}'],cwd=ROOT,text=True).strip(),'product':{n:sha(site/'remote'/n) for n in ['app.mjs','style.css','superj6.mjs']},'scope':'Only8changed defaultSuperJ6 Sound captures; stoppedDraft at120BPM, built-in IntroBank/PWMStringPad, no imported preset or original bank selection. Matches original31stateSound runner options, no clock/random override.','options':{'hasTouch':'width<900','fullPage':True,'clockFreeze':False,'fontWait':'document.fonts.ready','settleMs':80,'chromiumSandbox':True},'states':[]}
 def save():(OUT/'receipt.json').write_text(json.dumps(proof,indent=2)+'\n')
 async with async_playwright() as p:
  for w,h in SIZES:
   browser=await p.chromium.launch(chromium_sandbox=True);proof['chromium']=browser.version
   try:
    context=await browser.new_context(viewport={'width':w,'height':h},has_touch=w<900);await context.route('**/*',core.serve);page=await context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.add_init_script("window.midiCalls=0;navigator.requestMIDIAccess=()=>{midiCalls++;throw Error('Unrequested MIDI')}")
    await page.goto(core.ORIGIN+'/remote/');await page.locator('[data-view="sound"]').click()
    for slot,part in enumerate(['chicago','miami']):
     await page.locator(f'[data-engine="{part}"]').click();await page.locator('#sound-bank').select_option('SuperJ6');panel=page.locator('[data-superj6]')
     await expect(panel.locator('[data-sj6-display="96"]')).to_have_text('2 Bars');await expect(panel.locator('[data-sj6-display="82"]')).to_have_text('Square');await expect(panel.locator('[data-sj6-display="83"]')).to_have_text('Square')
     await expect(panel.locator('[data-sj6-program]')).to_have_count(0);await expect(panel.locator('[data-sj6-field]')).to_have_count(13)
     await page.evaluate('document.fonts.ready');await page.wait_for_timeout(80)
     state=await page.evaluate('''() => ({viewport:[innerWidth,innerHeight],document:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],title:document.querySelector('#part-title').textContent,status:document.querySelector('#status').textContent,tempo:document.querySelector('#tempo')?.textContent??null,midiCalls,fields:[...document.querySelectorAll('[data-sj6-field]')].map(e=>({field:e.dataset.sj6Field,id:e.dataset.sj6Id,value:e.value})),readouts:[...document.querySelectorAll('[data-sj6-display]')].map(e=>({field:e.dataset.sj6Display,text:e.textContent}))})''')
     assert state['document'][0]<=w and not errors and state['midiCalls']==0 and state['tempo']=='120 BPM',(state,errors)
     name=f'{w}x{h}-{part}-superj6.png';await page.screenshot(path=str(OUT/name),full_page=True)
     state.update(slot=slot,part=part,filename=name,sha256=sha(OUT/name),errors=errors.copy(),ownerKey='05-superj6' if (slot,w,h)==(1,1440,900) else None);proof['states'].append(state);save();print('PASS',name,state['sha256'],flush=True)
    await context.close()
   finally:await browser.close()
 assert len(proof['states'])==8;proof['result']='PASS8/8';save()
with tempfile.TemporaryDirectory(prefix='superj6-eight-',dir=ROOT/'.output') as temp:
 subprocess.run(['node','scripts/build-product-site.mjs','--output',temp],cwd=ROOT,check=True);asyncio.run(run(Path(temp)))
