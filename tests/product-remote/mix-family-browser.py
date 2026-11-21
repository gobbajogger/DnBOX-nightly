"""Reconstructed coherent Mix journey: actual unique shipped build, normal sandbox, no device."""
import asyncio,importlib.util,json,subprocess,tempfile
from pathlib import Path
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('funky',Path(__file__).with_name('funkybeats-browser.py'));core=importlib.util.module_from_spec(spec);spec.loader.exec_module(core)
async def state(page):return await core.draft_state(page)
async def mode(page,name):await page.locator('[data-mix-mode="'+name+'"]').click()
def values(document):return {x['id']:x['value'] for x in document['parameters']}
async def main():
 (ROOT/'.output').mkdir(exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='mix-family-',dir=ROOT/'.output') as tmp:
  core.SOURCE=Path(tmp)/'site';subprocess.run(['node','scripts/build-product-site.mjs','--output',str(core.SOURCE)],cwd=ROOT,check=True)
  async with async_playwright() as pw:
   browser=await pw.chromium.launch(chromium_sandbox=True)
   try:
    for w,h in [(1440,900),(390,844),(844,390)]:
     context=await browser.new_context(viewport={'width':w,'height':h},has_touch=True);await context.route('**/*',core.serve);page=await context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
     await page.add_init_script('window.midiCalls=0;navigator.requestMIDIAccess=()=>{window.midiCalls++;throw Error("No device")}')
     await page.goto(core.ORIGIN+'/remote/');await page.locator('[data-view="mix"]').click();await page.locator('.mixer-fader').first.wait_for()
     before=await state(page)
     for view in ['levels','pan','sends','fx']:
      await mode(page,view);assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(w,view)
      for target in await page.locator('[data-mix-mode]').all():assert (await target.bounding_box())['height']>=44
      out=ROOT/'test-results/mix-family';out.mkdir(parents=True,exist_ok=True);await page.screenshot(path=str(out/f'{view}-{w}x{h}.png'),full_page=True)
     await mode(page,'levels')
     for i in range(5):
      slider=page.locator('.mixer-fader').nth(i);old=int(await slider.input_value());await slider.press('ArrowRight');after=await state(page);assert values(after)[await slider.get_attribute('data-native-param')]==old+1;await page.locator('#undo').click();assert (await state(page))['parameters']==before['parameters']
     await mode(page,'sends')
     for i in range(10):
      slider=page.locator('.mix-send-strip input').nth(i);await slider.scroll_into_view_if_needed();box=await slider.bounding_box();old=int(await slider.input_value());x=box['x']+box['width']*.8;y=box['y']+box['height']/2
      if w==1440:await page.mouse.click(x,y)
      else:await page.touchscreen.tap(x,y)
      after=await state(page);identity=await slider.get_attribute('data-native-param');assert values(after).get(identity,old)!=old,(w,i,after['parameters'])
      key=identity.split('|')[1];aliases=[p['value'] for p in after['parameters'] if p['id'].endswith('|'+key)];assert len(set(aliases))==1
      await mode(page,'levels');await page.locator('#undo').click();assert (await state(page))['parameters']==before['parameters'];await mode(page,'sends')
     slider=page.locator('.mix-send-strip input').first;await slider.scroll_into_view_if_needed();box=await slider.bounding_box();cdp=await context.new_cdp_session(page);await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':box['x']+box['width']*.9,'y':box['y']+box['height']/2}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});await cdp.detach();assert (await state(page))['parameters']==before['parameters']
     await mode(page,'levels')
     for index in range(4):
      target=page.locator('.mix-master-panel [data-param]').nth(index);identity=await target.get_attribute('data-param');prior=await state(page);await target.press('ArrowUp');edited=await state(page);assert values(edited).get(identity)!=values(prior).get(identity);assert await target.locator('output').text_content() in (await target.get_attribute('aria-label') or '')
      await mode(page,'fx');await page.locator('#undo').click();restored=await state(page);assert values(restored).get(identity)==values(prior).get(identity,{'1:4:0:2':41,'1:6:0:12':95,'1:6:0:6':21,'1:6:0:13':64}[identity.split('|')[1]])
      await mode(page,'levels')
     fresh=await state(page);legacy=json.loads(json.dumps(fresh));legacy['parameters']=[{'id':'current-state-and-reference/mix-parts-live.svg|1:5:0:1','value':32}];await core.load_draft(page,legacy);imported=await state(page);assert len([p for p in imported['parameters'] if p['id'].endswith('|1:5:0:1') and p['value']==32])==3
     conflict=json.loads(json.dumps(imported));conflict['parameters'][0]['value']=0
     await page.locator('#draft-file').set_input_files({'name':'conflict.json','mimeType':'application/json','buffer':json.dumps(conflict).encode()})
     await expect(page.locator('#draft-dialog')).to_be_visible();await expect(page.locator('#draft-replace')).to_be_disabled();await expect(page.locator('#draft-preview')).to_have_text('Conflicting mixer aliases');await expect(page.locator('#status')).to_have_text('Conflicting mixer aliases')
     # Invalid imports stay modal; dismiss through the real UI before exporting to prove no mutation.
     await page.locator('#draft-cancel').click();await expect(page.locator('#draft-dialog')).to_be_hidden()
     assert (await state(page))['parameters']==imported['parameters'];await core.load_draft(page,before)
     await mode(page,'sends')
     for part in ['drum909','drum808','chicago','miami','breaks']:
      await page.locator('[data-mix-part="'+part+'"]').click();await expect(page.locator('[data-view="sound"]').first).to_have_attribute('aria-current','page');await page.locator('[data-view="mix"]').click()
     assert not errors,errors;assert await page.evaluate('window.midiCalls')==0;print('MIX_FAMILY',w,h,'PASS',flush=True);await context.close()
   finally:await browser.close()
 print('MIX_FAMILY PASS actual shipped build,3sizes,all10sends,5levels,cancel,Undo,5Soundroutes; no device')
if __name__=='__main__':asyncio.run(main())
