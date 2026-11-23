import asyncio,json,runpy,sys
from pathlib import Path
from playwright.async_api import async_playwright,expect
w,b=map(Path,sys.argv[1:]); native=runpy.run_path(str(b/'tests/product-remote/native-sound-browser.py'))
async def main():
 with native['core'].server(w/'site') as origin:
  async with async_playwright() as p:
   browser=await p.chromium.launch(chromium_sandbox=True)
   ctx=await browser.new_context(viewport={'width':844,'height':390})
   page=await ctx.new_page(); errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
   await page.add_init_script(native['INSTRUMENT'])
   await page.goto(origin+'/remote/',wait_until='domcontentloaded')
   await expect(page.locator('main')).to_have_attribute('aria-busy','false')
   await native['start'](page)
   await page.locator('[data-engine="chicago"]').click(); await page.locator('[data-view="sound"]').click()
   await page.locator('[data-sound-source="emulator"]').click()
   await page.wait_for_function('soundErrors.length>0')
   assert await page.locator('[data-native-param]').count()==0
   await page.locator('[data-sound-source="draft"]').click()
   await page.locator('#sound-bank').select_option('MIAMI')
   before=await native['draft_bytes'](page)
   await page.locator('[data-sound-source="emulator"]').click()
   r=await native['packet_after'](page,0)
   assert (r['engine'],r['voice'],r['sourceBank'])==('MIAMI',0,1) and len(r['controls'])==1
   assert (r['controls'][0]['value'],r['controls'][0]['display'])==(127,'SQR')
   c=page.locator('[data-native-param="source-sound/MIAMI/0|1:2:0:0:1"]')
   await expect(c).to_be_enabled(); assert await page.locator('[data-native-param]').count()==1
   label=await c.get_attribute('aria-label')
   await c.fill('0'); await c.press('Tab')
   e=await native['packet_after'](page,1); assert (e['controls'][0]['value'],e['controls'][0]['display'])==(0,'TRI')
   await page.locator('#undo').click()
   u=await native['packet_after'](page,2); assert (u['controls'][0]['value'],u['controls'][0]['display'])==(127,'SQR')
   await page.locator('[data-sound-source="draft"]').click()
   assert await native['draft_bytes'](page)==before
   await page.locator('[data-sound-source="emulator"]').click()
   fresh=await native['packet_after'](page,3); assert (fresh['controls'][0]['value'],fresh['controls'][0]['display'])==(127,'SQR')
   await page.locator('[data-sound-source="draft"]').click()
   await page.locator('[data-engine="miami"]').click()
   await page.locator('[data-view="sound"]').click()
   await page.locator('[data-sound-source="emulator"]').click()
   chicago=await native['packet_after'](page,4)
   assert (chicago['engine'],chicago['voice'],chicago['sourceBank'])==('CHICAGO',1,0) and len(chicago['controls'])==20
   await native['assert_readings'](page,chicago)
   assert not errors and await page.evaluate('midiCalls===0')
   print(json.dumps(dict(label=label,blockedChicago=True,before=r,edit=e,undo=u,fresh=fresh,draftBytesEqual=True,chicagoPeerCount=len(chicago['controls'])),indent=2))
   await ctx.close();await browser.close()
asyncio.run(main())
