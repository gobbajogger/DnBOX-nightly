import asyncio, importlib.util, json, os, re, sys
from pathlib import Path
from playwright.async_api import async_playwright, expect
root,lsite,negative,positive,shim,out=map(Path,sys.argv[1:7])
mode=sys.argv[7]
spec=importlib.util.spec_from_file_location('layout',root/'tests/product-remote/remote-controls-browser.py')
layout=importlib.util.module_from_spec(spec);spec.loader.exec_module(layout)
layout.SOURCE=lsite
pins={
 'legacy':dict(firmware='8f97fe7d2bbf4f878cd0061c657c13c6f4322ea6',kernel='8f03c63dd3a7bc81058e78e1d6c2f8d032188620',wasm='17f7c1160cc4ee9edf017db9dcbf58142d5cee4570d06c73790c6e38e570e8d1',dnr3=False),
 'dnr3':dict(firmware='adf3eee64fcbfd9971fd402fd67ec6809c58251b',kernel='b16d487dd6b6b9ffe1dddcddc99df7e45fed6f28',wasm='92b81be4e2b8f8c59f34cdd94b7bb5cf28f2acf5f9350babb5ac5741c3729c65',dnr3=True)}
name='Draft · MIDI found, but DnBOX didn’t answer Remote'
async def serve(route):
 url=route.request.url.removeprefix(layout.ORIGIN)
 if url.startswith('/fixture/'):
  _, _, key, asset=url.split('/')
  directory=positive if key=='dnr3' else negative
  paths={'wasm-web-midi.mjs':shim,'wasi.mjs':directory/'wasi.mjs','runtime.json':directory/'runtime.json','kernel.wasm':directory/'kernel.wasm'}
  await route.fulfill(path=paths[asset],content_type={'mjs':'text/javascript','json':'application/json','wasm':'application/wasm'}[asset.rsplit('.',1)[-1]])
 else: await layout.serve(route)
async def replace(page,key):
 return await page.evaluate("""async ([key,pin])=>{
  window.fixture?.close();
  const base=new URL('/fixture/'+key+'/',location.href);
  const {installWasmWebMidi}=await import(new URL('wasm-web-midi.mjs',base));
  window.fixture=await installWasmWebMidi(base,pin);
  return fixture.caps;
 }""",[key,pins[key]])
async def main():
 async with async_playwright() as api:
  browser=await api.chromium.launch(chromium_sandbox=True)
  try:
   for width,height in [(390,844),(1440,900)]:
    page=await browser.new_page(viewport={'width':width,'height':height},is_mobile=width==390,has_touch=width==390)
    failures=[];page.on('pageerror',lambda e:failures.append(str(e)))
    await page.route('**/*',serve)
    await page.add_init_script("navigator.requestMIDIAccess=()=>{throw Error('No physical MIDI')}")
    await page.goto(layout.ORIGIN+'/remote/')
    await expect(page.locator('main')).to_have_attribute('aria-busy','false')
    async def action(s):
      q=page.locator(s).first
      if width==390: await q.tap()
      else: await q.click()
    connect=page.locator('#connect'); label=page.locator('#conn-state'); scope=page.locator('#edit-scope'); note=page.locator('#connection-message')
    await expect(scope).to_have_text('Draft · Connect via USB MIDI to edit your DnBOX')
    await action('[data-engine=drum909]')
    assert await replace(page,'legacy')==1
    # Independent native MIDI check. Even though the kernel responds to MIDI realtime,
    # the matched Web MIDI ports cannot answer DNR3.
    assert await page.evaluate("""()=>{fixture.deviceReceive([0xfa]);fixture.render(6);const on=fixture.playing();fixture.deviceReceive([0xfc]);fixture.render(6);return [on,fixture.playing()];}""")==[1,0]
    await action('#connect')
    await expect(page.locator('#connection-result')).to_be_visible()
    await expect(connect).to_have_attribute('aria-pressed','false')
    await expect(label).to_have_text('Disconnected')
    await expect(page.locator('#close-connection')).to_be_focused()
    await expect(page.locator('.project-name')).to_be_visible()
    msg=(await note.text_content()) or ''
    wire=await page.evaluate("""async()=>{const d=await import('/remote/dnr3.mjs');return {onlyHello:fixture.out.length===2&&fixture.out.every(x=>d.decodeRequest(x).op===d.OP.HELLO),received:fixture.inbound.length};}""")
    assert wire=={'onlyHello':True,'received':0},wire
    assert await page.locator('#connection-result').evaluate('(el)=>el.getBoundingClientRect().right<=innerWidth+1')
    await page.screenshot(path=out/f'{width}-legacy-dialog.png')
    await action('#close-connection')
    await expect(page.locator('#connection-result')).to_be_hidden()
    await expect(connect).to_be_focused()
    draft_step=page.locator('[data-drum-note="36"]').first
    previous=await draft_step.get_attribute('aria-pressed')
    await action('[data-drum-note="36"]'); await expect(draft_step).to_have_attribute('aria-pressed','false' if previous=='true' else 'true')
    await expect(page.locator('#undo')).to_be_enabled()
    assert await page.evaluate('fixture.out.length')==2
    draft=(await scope.text_content()) or ''
    if mode=='fixed':
       assert 'didn’t answer Remote' in msg and 'Edits stay in Draft' in msg and 'firmware that supports Remote' in msg,msg
       await expect(scope).to_have_text(name)
    else:
       assert draft!=name and 'firmware' not in msg and 'Draft' not in msg,(msg,draft)
    await page.screenshot(path=out/f'{width}-legacy-dismissed.png')
    print(f'{width} LEGACY cap=1 realtime actual, two HELLO only, no replies or edits, dialog={msg!r}, dismissed={draft!r}',flush=True)
    # Retry without a reload: confirmed DNR3 clears compatibility state.
    assert await replace(page,'dnr3')&2
    await action('#connect')
    await expect(label).to_have_text('Connected')
    await expect(connect).to_have_attribute('aria-pressed','true')
    await expect(page.locator('#connection-result')).to_be_hidden()
    await expect(page.locator('[data-firmware-step]').first).to_be_visible()
    await expect(scope).to_have_text('DnBOX · Undo unavailable in this editor')
    await expect(page.locator('.project-name')).to_be_hidden()
    await expect(page.locator('#tempo-state')).to_have_text('Device')
    assert await page.evaluate("""async()=>{const d=await import('/remote/dnr3.mjs');return [d.OP.HELLO,d.OP.OPEN,d.OP.STATE].every(op=>fixture.inbound.some(x=>d.decodeFrame(x).op===(op|64)));}""")
    assert await scope.evaluate('(el)=>el.getBoundingClientRect().right<=innerWidth+1')
    await page.screenshot(path=out/f'{width}-dnr3-connected.png')
    await action('#connect')
    await expect(label).to_have_text('Disconnected')
    await expect(scope).to_have_text('Draft · Connect via USB MIDI to edit your DnBOX')
    assert not failures, failures
    print(f'{width} DNR3 native HELLO/OPEN/STATE confirmed, real Live controls and tempo, clears note on retry and disconnect',flush=True)
    await page.close()
  finally: await browser.close()
asyncio.run(main())
