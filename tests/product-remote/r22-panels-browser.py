"""Shared R22 panel radius on actual Mix, connection and failed-startup UI."""
import asyncio, importlib.util, json, subprocess, tempfile
from pathlib import Path
from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('funky', Path(__file__).with_name('funkybeats-browser.py'))
core = importlib.util.module_from_spec(spec)
spec.loader.exec_module(core)

async def cases():
 async with async_playwright() as pw:
  browser = await pw.chromium.launch(chromium_sandbox=True)
  try:
   for width, height in [(1440, 900), (390, 844), (844, 390)]:
    context = await browser.new_context(viewport={'width': width, 'height': height})
    await context.route('**/*', core.serve)
    page = await context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    await page.add_init_script('window.midiCalls=0;navigator.requestMIDIAccess=()=>{midiCalls++;throw Error("Device access forbidden")}')
    try:
     await page.goto(core.ORIGIN + '/remote/')
     await expect(page.locator('main')).to_have_attribute('aria-busy', 'false')

     async def panels(name, selector):
      targets = page.locator(selector)
      assert await targets.count(), (name, 'No actual panels rendered')
      for target in await targets.all():
       await expect(target).to_be_visible()
      async def snapshot():
       return await targets.evaluate_all('''els=>els.map(e=>{
        const s=getComputedStyle(e),r=e.getBoundingClientRect();
        return {token:s.getPropertyValue('--r-panel').trim(),
         radii:[s.borderTopLeftRadius,s.borderTopRightRadius,s.borderBottomLeftRadius,s.borderBottomRightRadius],
         box:{x:r.x,y:r.y,width:r.width,height:r.height}};
       })''')
      original = await snapshot()
      for item in original:
       assert item['radii'] == [item['token']] * 4, {'size':[width,height], 'surface':name, **item}
      # A different active token must flow through each rendered panel too;
      # checking just a hardcoded 7px would miss a second independent value.
      await page.evaluate("document.documentElement.style.setProperty('--r-panel','11px')")
      changed = await snapshot()
      for before, after in zip(original, changed):
       assert after['radii'] == ['11px'] * 4, {'size':[width,height], 'surface':name, 'changedToken':after}
       assert before['box'] == after['box'], (name, 'Panel token moved editing geometry')
      await page.evaluate("document.documentElement.style.removeProperty('--r-panel')")
      print('R22_PANEL', width, height, name, json.dumps(original), flush=True)

     await page.locator('[data-view="mix"]').click()
     for mode in ['levels', 'pan', 'sends', 'fx']:
      await page.locator(f'[data-mix-mode="{mode}"]').click()
      await panels('mix-' + mode, '.mix-parts-panel,.mix-master-panel,.mix-effects>.mix-panel')
     await page.locator('#connect').click()
     await expect(page.locator('#connection-message')).not_to_be_empty()
     await panels('connection', '#connection-result')
     await page.locator('#close-connection').click()
     await expect(page.locator('#connection-result')).to_be_hidden()
     assert await page.evaluate('midiCalls') == 0

     async def fail_catalog(route):
      await route.fulfill(status=503, content_type='application/json', body='unavailable')
     await page.route('**/remote/catalog.json', fail_catalog)
     await page.reload()
     await expect(page.locator('#workspace-error')).to_be_visible()
     await expect(page.locator('#workspace-retry')).to_be_focused()
     await panels('startup-error', '#workspace-error')
     assert not errors, errors
     assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    finally:
     await context.close()
  finally:
   await browser.close()
 print('R22_PANELS PASS 3sizes: all Mix modes, real Connect result, real startup failure; shared token and stable bounds', flush=True)

def main():
 (ROOT / '.output').mkdir(exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='r22-panels-', dir=ROOT / '.output') as output:
  core.SOURCE = Path(output)
  subprocess.run(['node', 'scripts/build-product-site.mjs', '--output', output], cwd=ROOT, check=True)
  asyncio.run(cases())

if __name__ == '__main__':
 main()
