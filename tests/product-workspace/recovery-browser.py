"""Real startup failure/retry and invalid first draft recovery on built files."""
import asyncio,importlib.util,subprocess,tempfile
from pathlib import Path
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('core',ROOT/'tests/product-remote/envelope-browser.py');core=importlib.util.module_from_spec(spec);spec.loader.exec_module(core)
async def cases(origin):
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(chromium_sandbox=True)
  try:
   for width,height in [(1440,900),(390,844),(844,390)]:
    for bad in (['trace','catalog','components','source-sounds','malformed'] if width==1440 else ['malformed']):
     context=await browser.new_context(viewport={'width':width,'height':height});page=await context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
     try:
      source='catalog' if bad=='malformed' else bad
      async def refuse(route):await route.fulfill(status=200 if bad=='malformed' else 503,content_type='application/json',body='invalid')
      await page.route('**/remote/'+source+'.json',refuse)
      await page.goto(origin+'/remote/');await expect(page.locator('#workspace-error')).to_be_visible();await expect(page.locator('#workspace-retry')).to_be_focused();await expect(page.locator('[data-view="sound"]')).to_be_disabled();assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
      await page.unroute('**/remote/'+source+'.json',refuse);await page.locator('#workspace-retry').click();await expect(page.locator('main')).to_have_attribute('aria-busy','false');await expect(page.locator('[data-view="sound"]')).to_be_enabled();await page.locator('[data-view="sound"]').click();await page.locator('#part').select_option('chicago');await expect(page.locator('#workspace-error')).to_be_hidden()
      wave=page.locator('[data-native-param="source-sound/CHICAGO/0|1:2:0:0:0"]');await wave.press('Home');await wave.press('ArrowRight');await expect(wave).to_have_value('1')
      await page.locator('#draft-file').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'invalid'})
      await expect(page.locator('#draft-dialog')).to_be_visible();await expect(page.locator('#draft-replace')).to_be_disabled();assert await page.locator('#draft-preview').inner_text();await page.locator('#draft-cancel').click();await expect(wave).to_have_value('1');status_box=await page.locator('#status').bounding_box();assert status_box and status_box['width']>=100 and status_box['height']>=16,('Feedback must be visibly readable',status_box);assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
      print(f'PASS recovery {bad} {width}x{height}: retry, visible invalid draft, authored value retained',flush=True)
     finally:await context.close()
  finally:await browser.close()
def main():
 output=ROOT/'.output';output.mkdir(exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='recovery-',dir=output) as tmp:
  subprocess.run(['node','scripts/build-product-site.mjs','--output',tmp],cwd=ROOT,check=True)
  with core.server(tmp) as origin:asyncio.run(cases(origin))
if __name__=='__main__':main()
