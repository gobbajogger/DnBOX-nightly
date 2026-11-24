"""Actual shipped controls preserve raw vs normalized glyph domains."""
import asyncio,importlib.util,subprocess,tempfile
from pathlib import Path
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('envelope_core',Path(__file__).with_name('envelope-browser.py'));core=importlib.util.module_from_spec(spec);spec.loader.exec_module(core)
async def cases(origin):
 async with async_playwright() as pw:
  for w,h in [(1440,900),(390,844),(844,390)]:
   browser=await pw.chromium.launch(chromium_sandbox=True)
   try:
    context=await browser.new_context(viewport={'width':w,'height':h},reduced_motion='reduce');page=await context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    try:
     await page.goto(origin+'/remote/');await page.locator('[data-view="sound"]').click();await page.locator('#part').select_option('chicago')
     control=page.locator('[data-native-param="source-sound/CHICAGO/0|1:2:0:0:0"]');await control.wait_for();images={}
     for raw,key in [(0,'Home'),(1,'ArrowRight'),(2,'ArrowRight'),(127,'End')]:
      await control.press(key)
      actual=await control.evaluate("e=>{const g=e.closest('.funkybeats-typed-unit').querySelector('[data-glyph-fn]');return {raw:+e.value,target:g.glyphAnimator.target,domain:g.dataset.glyphDomain,pixels:g.querySelector('canvas').toDataURL()}}")
      assert actual['raw']==raw and abs(actual['target']-raw/127)<1e-12,actual;assert actual['domain']=='normalized';images[raw]=actual['pixels']
     assert images[1]!=images[127] and images[2]!=images[127]
     await page.locator('[data-view="mix"]').click();drive=page.locator('[data-mix-param-label="Master DRIVE"]');await drive.press('Enter');field=page.locator('#parameter-value')
     for raw in [0,1,2,127]:
      await field.fill(str(raw));await field.press('Tab');target=await drive.locator('[data-glyph-fn]').evaluate('e=>e.glyphAnimator.target');assert abs(target-raw/127)<1e-12,(raw,target)
     assert not errors,errors;assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
     print(f'PASS glyph actual raw0/1/2/127 Sound+Mix {w}x{h}',flush=True)
    finally:await context.close()
   finally:await browser.close()
def main():
 out=ROOT/'.output';out.mkdir(exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='glyph-domain-',dir=out) as tmp:
  subprocess.run(['node','scripts/build-product-site.mjs','--output',tmp],cwd=ROOT,check=True)
  with core.server(tmp) as origin:asyncio.run(cases(origin))
if __name__=='__main__':main()
