"""Actual captured drum controls: visible consumer names and transparent Tab focus."""
import asyncio, importlib.util, io, json, subprocess, tempfile
from PIL import Image, ImageChops
from pathlib import Path
from playwright.async_api import async_playwright, expect
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('funky',Path(__file__).with_name('funkybeats-browser.py'))
core=importlib.util.module_from_spec(spec);spec.loader.exec_module(core)

async def cases(evidence=None):
 data=json.loads((ROOT/'web/product-site/remote/components.json').read_text())
 screens={s['path']:s for s in data['screens']};proof=[];samples=0;active_count=0
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(chromium_sandbox=True)
  try:
   for width,height in [(1440,900),(390,844),(844,390)]:
    context=await browser.new_context(viewport={'width':width,'height':height})
    await context.route('**/*',core.serve);page=await context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    await page.add_init_script('window.midiCalls=0;navigator.requestMIDIAccess=()=>{midiCalls++;throw Error("No devices")}')
    await page.goto(core.ORIGIN+'/remote/')
    for kit in ['drum909','drum808']:
     await page.locator(f'[data-engine="{kit}"]').click();await page.locator('[data-view="sound"]').click()
     options=await page.locator('#sound-voice option').evaluate_all('es=>es.map(e=>e.value)');assert len(options)==11
     for voice in options:
      await page.locator('#sound-voice').select_option(voice)
      scene=page.locator('.source-scene');path=await scene.get_attribute('data-source-frame');screen=screens[path]
      assert await scene.get_attribute('data-runtime-admitted')=='false'
      assert await scene.locator('svg').evaluate('(svg,body)=>svg.isEqualNode(new DOMParser().parseFromString(body,"image/svg+xml").documentElement)',screen['body_svg']),path
      active=[c for c in screen['controls'] if c.get('markers',{}).get('visual-role')=='active glyph/value control']
      # Exercise real Tab even on the negative: an opaque blank hit is a separate defect.
      first=scene.locator('.source-hit').first
      await page.locator('#sound-voice').focus();await first.scroll_into_view_if_needed()
      box=await first.bounding_box()
      clip={'x':box['x']+4,'y':box['y']+4,'width':box['width']-8,'height':box['height']-8}
      unfocused=await page.screenshot(clip=clip)
      await page.keyboard.press('Tab');await expect(first).to_be_focused()
      focused=await page.screenshot(clip=clip)
      before_image=Image.open(io.BytesIO(unfocused)).convert('RGB');after_image=Image.open(io.BytesIO(focused)).convert('RGB')
      same_ink=ImageChops.difference(before_image,after_image).getbbox() is None
      glyph_pixels=sum(r>100 and g>60 and b<120 for r,g,b in before_image.getdata())
      if evidence:
       folder=Path(evidence).parent/'screenshots';folder.mkdir(exist_ok=True)
       (folder/f'{width}x{height}-{kit}-{voice}-before.png').write_bytes(unfocused)
       (folder/f'{width}x{height}-{kit}-{voice}-focused.png').write_bytes(focused)

      background=await first.evaluate('e=>getComputedStyle(e).backgroundColor')
      assert background=='rgba(0, 0, 0, 0)' and same_ink and glyph_pixels>0,('Focused source glyph/value is covered',path,background,same_ink,glyph_pixels)
      labels=scene.locator('[data-source-label]');assert await labels.count()==len(active),('Missing visible control names',path,len(active),await labels.count())
      row=[]
      for c in active:
       label=scene.locator(f'[data-source-label="{c["identity"]}"]');await label.scroll_into_view_if_needed()
       await expect(label).to_have_text('Pitch depth' if c['context']['name']=='P.Dpth' else c['context']['name'])
       metrics=await label.evaluate('''e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e),range=document.createRange();range.selectNodeContents(e);const text=range.getBoundingClientRect(),scene=e.closest('.source-scene'),ink=scene.querySelector('svg [data-source-control="'+e.dataset.sourceLabel+'"] [data-glyph-semantic]').getBoundingClientRect();return {font:parseFloat(s.fontSize),opacity:s.opacity,box:{x:r.x,y:r.y,width:r.width,height:r.height},textFits:text.left>=r.left&&text.right<=r.right&&text.top>=r.top&&text.bottom<=r.bottom,onscreen:r.top>=0&&r.bottom<=innerHeight,aligned:Math.abs((r.left+r.right)/2-(ink.left+ink.right)/2)<r.width/2,aboveInk:r.bottom<=ink.top+1}}''')
       assert metrics['font']>=12 and metrics['textFits'] and metrics['onscreen'] and metrics['aligned'] and metrics['aboveInk'],(path,c['context']['name'],metrics)
       row.append(metrics['box']);active_count+=1
      if evidence:await page.screenshot(path=str(Path(evidence).parent/'screenshots'/f'{width}x{height}-{kit}-{voice}-labels.png'))
      for a,b in zip(row,row[1:]):assert a['x']+a['width']<=b['x']+.01,(path,'Labels collide')
      # Re-start from the select: each source control must remain a real Tab target.
      await page.locator('#sound-voice').focus()
      for index,c in enumerate(screen['controls']):
       hit=scene.locator('.source-hit').nth(index);await hit.scroll_into_view_if_needed()
       before=await hit.evaluate('e=>({style:e.getAttribute("style"),w:e.offsetWidth,h:e.offsetHeight})')
       await page.keyboard.press('Tab');await expect(hit).to_be_focused()
       after=await hit.evaluate('''e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {style:e.getAttribute('style'),w:e.offsetWidth,h:e.offsetHeight,background:s.backgroundColor,focus:e.matches(':focus-visible')&&s.outlineWidth==='2px',hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e}}''')
       assert all(before[k]==after[k] for k in before),(path,index,'Focus changed hit geometry')
       assert after['background']=='rgba(0, 0, 0, 0)' and after['focus'] and after['hit'],(path,index,after)
       expected='Pitch depth' if c['context']['name']=='P.Dpth' else c['context']['name']
       assert (await hit.get_attribute('aria-label')).startswith(expected+', source example ')
       assert c['identity'] in (await hit.get_attribute('data-param'))
       samples+=1
      proof.append({'size':[width,height],'path':path,'controls':len(screen['controls']),'visibleNames':len(active),'labels':row})
      print('DRUM_CONTROLS',width,height,path,'PASS',flush=True)
    await first.evaluate("e=>{e.dataset.live='pan';e.textContent='L25'}")
    await expect(first).to_have_text('L25')
    assert await first.evaluate("e=>getComputedStyle(e).backgroundColor")=='rgba(14, 20, 22, 0.72)'
    assert not errors,errors;assert await page.evaluate('midiCalls')==0
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    await context.close()
  finally:await browser.close()
 assert len(proof)==66 and samples==249 and active_count==180,(len(proof),samples,active_count)
 if evidence:Path(evidence).write_text(json.dumps({'states':proof,'focusSamples':samples,'visibleNameSamples':active_count},indent=2)+'\n')
 print('DRUM_CONTROLS PASS 66states 249TabTargets 180visibleNames immutableSVG stableHits',flush=True)

def main():
 (ROOT/'.output').mkdir(exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='drum-controls-',dir=ROOT/'.output') as output:
  core.SOURCE=Path(output);subprocess.run(['node','scripts/build-product-site.mjs','--output',output],cwd=ROOT,check=True)
  asyncio.run(cases())
if __name__=='__main__':main()
