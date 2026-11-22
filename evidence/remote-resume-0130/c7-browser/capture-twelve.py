#!/usr/bin/env python3
"""Capture only changed Snare909,Snare808,BREAK Sound defaults, with editor/Undo witnesses."""
import argparse,asyncio,hashlib,importlib.util,json,subprocess,sys,tempfile
from pathlib import Path
from playwright.async_api import async_playwright,expect
p=argparse.ArgumentParser();p.add_argument('--root',type=Path,required=True);p.add_argument('--sha',required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();ROOT=a.root.resolve();OUT=a.output.resolve();OUT.mkdir(parents=True,exist_ok=False)
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()==a.sha
subprocess.run(['git','diff','--exit-code',a.sha,'--','web/product-site','scripts/build-product-site.mjs'],cwd=ROOT,check=True)
sys.path.insert(0,str(ROOT/'tests/product-remote'));spec=importlib.util.spec_from_file_location('sound_refresh_core',ROOT/'tests/product-remote/funkybeats-browser.py');core=importlib.util.module_from_spec(spec);spec.loader.exec_module(core)
SIZES=[(1440,900),(390,844),(844,390),(1024,640)]
CASES=[('drum909','drum909-voice01','1:0:1:1'),('drum808','drum808-voice01','1:1:1:1'),('breaks','breaks',None)]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
async def run(site):
 core.SOURCE=site;components=json.loads((site/'remote/components.json').read_text());proof={'source':a.sha,'tree':subprocess.check_output(['git','rev-parse',a.sha+'^{tree}'],cwd=ROOT,text=True).strip(),'options':{'route':core.ORIGIN+'/remote/','hasTouch':'width<900','clockFreeze':False,'settleMs':80,'fullPage':True,'chromiumSandbox':True},'product':{n:sha(site/'remote'/n) for n in ['app.mjs','style.css','glyph-render.mjs','drum-strip.mjs']},'states':[]}
 def save():(OUT/'receipt.json').write_text(json.dumps(proof,indent=2)+'\n')
 async with async_playwright() as pw:
  for w,h in SIZES:
   browser=await pw.chromium.launch(chromium_sandbox=True);proof['chromium']=browser.version
   try:
    c=await browser.new_context(viewport={'width':w,'height':h},has_touch=w<900);await c.route('**/*',core.serve);page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.add_init_script("window.midiCalls=0;navigator.requestMIDIAccess=()=>{midiCalls++;throw Error('Unrequested MIDI')}")
    for part,key,identity in CASES:
     # Reload before each default frame so functional Undo/Redo history from the
     # preceding case cannot change the next frame's history-button state.
     await page.goto(core.ORIGIN+'/remote/');await page.locator('[data-view="sound"]').click()
     await page.locator(f'[data-engine="{part}"]').click()
     if identity:await page.locator('#sound-voice').select_option('1')
     await expect(page.locator('#undo')).to_be_disabled();await expect(page.locator('#redo')).to_be_disabled()
     await page.evaluate('document.fonts.ready');await page.wait_for_timeout(80)
     state=await page.evaluate('''() => ({viewport:[innerWidth,innerHeight],document:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],title:document.querySelector('#part-title').textContent,status:document.querySelector('#status').textContent,tempo:document.querySelector('#tempo').textContent,midiCalls})''');assert state['document'][0]<=w and state['tempo']=='120 BPM' and state['midiCalls']==0 and not errors,(state,errors)
     filename=f'{w}x{h}-{key}.png';await page.screenshot(path=str(OUT/filename),full_page=True);state.update(state=key,filename=filename,sha256=sha(OUT/filename),errors=errors.copy());proof['states'].append(state);save()
     if identity:
      button=page.locator(f'#other-view button[data-param$="|{identity}"]').first
      glyph=f'#other-view :is([data-drum-editor],[data-drum-sound-strip]) [data-source-control="{identity}"] [data-glyph-semantic]'
     else:
      button=page.locator('#other-view button[data-param="source-sound/BREAK/-1|1:3:0:1:-1"]')
      glyph='#other-view [data-glyph-fn="BREAK PITCH"][data-glyph-engine="break"]'
     await button.press('Enter');editor=page.locator('#parameter-value');await expect(editor).to_be_enabled();initial=int(await editor.input_value());maximum=int(await editor.get_attribute('max'));minimum=int(await editor.get_attribute('min'));assert minimum==0 and maximum==(127 if identity else 24),(minimum,maximum)
     async def sample(raw):
      if identity:
       want=await page.evaluate('''async ([id,raw,max])=>{const {paintDrumGlyph}=await import('/remote/drum-strip.mjs');let d;const g={querySelector:()=>({setAttribute:(k,v)=>{if(k==='d')d=v}}),setAttribute(){}};paintDrumGlyph({querySelectorAll:()=>[g]},{identity:id,context:{name:'Tone'}},raw,max);return d;}''',[identity,raw,maximum])
       await expect(page.locator(glyph+' path').first).to_have_attribute('d',want,timeout=10000)
       return await page.locator(glyph).first.evaluate('''async g=>{const {polylines}=await import('/remote/glyph-live.mjs');const d=g.querySelector('path').getAttribute('d');return {d,points:polylines(d),origin:g.dataset.glyphOrigin};}''')
      await page.wait_for_function('''([selector,value])=>{const g=document.querySelector(selector);return g?.glyphAnimator?.idle&&g.glyphAnimator.value===value;}''',arg=[glyph,raw/maximum])
      return await page.locator(glyph).evaluate('''async (g,value)=>{const {render}=await import('/remote/glyph-render.mjs');const {polylines}=await import('/remote/glyph-live.mjs');const canvas=g.querySelector('canvas'),ctx=canvas.getContext('2d'),pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',pixels))].map(x=>x.toString(16).padStart(2,'0')).join('');const r=render('BREAK PITCH',value,'break');return {role:g.dataset.glyphFn,engine:g.dataset.glyphEngine,normalized:g.dataset.glyphValue,points:polylines(r.d),guide:polylines(r.guide),canvas:[canvas.width,canvas.height],pixelSHA256:hash};}''',raw/maximum)
     original=await sample(initial);state['glyphChecks']={'parameter':identity or '1:3:0:1','initialRaw':initial,'initialReadout':await page.locator('#parameter-readout').text_content(),'editorContext':await page.locator('#parameter-inspector label span').text_content(),'initial':original,'samples':[]}
     values=[0,64,127] if identity else [0,12,24]
     for value in values:
      await editor.fill(str(value));await editor.press('Tab');await expect(editor).to_have_value(str(value));data=await sample(value);state['glyphChecks']['samples'].append({'raw':value,'readout':await page.locator('#parameter-readout').text_content(),'glyph':data});save()
     for _ in values:await page.locator('#undo').click()
     await expect(editor).to_have_value(str(initial));restored=await sample(initial);assert restored==original,(key,restored,original);state['glyphChecks']['undoRestored']=True
     if identity and w==844:
      await page.get_by_role('button',name='Open original',exact=True).click();scene=page.locator('.source-scene');path=await scene.get_attribute('data-source-frame');screen=next(s for s in components['screens'] if s['path']==path)
      equal=await scene.locator('svg').evaluate("(svg,body)=>svg.isEqualNode(new DOMParser().parseFromString(body,'image/svg+xml').documentElement)",screen['body_svg']);assert equal,path;state['openOriginal']={'path':path,'sourceSVGUnchanged':True,'sourceBodySHA256':hashlib.sha256(screen['body_svg'].encode()).hexdigest()};await page.get_by_role('button',name='Return to Sound',exact=True).click()
     assert not errors and await page.evaluate('midiCalls')==0;save();print('PASS',filename,'glyph edit0/mid/end and Undo',flush=True)
    await c.close()
   finally:await browser.close()
 assert len(proof['states'])==12;proof['result']='PASS12/12 captures and functional guards';save()
with tempfile.TemporaryDirectory(prefix='glyph-role-twelve-',dir=ROOT/'.output') as temp:
 subprocess.run(['node','scripts/build-product-site.mjs','--output',temp],cwd=ROOT,check=True);asyncio.run(run(Path(temp)))
