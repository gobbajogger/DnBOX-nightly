# SPDX-License-Identifier: GPL-3.0-only
"""Real built preset file workflow; exact downloads, no device/runtime simulator."""
import asyncio,json,mimetypes,subprocess,tempfile,io,zipfile
from pathlib import Path
from urllib.parse import urlparse,unquote
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
SINGLE='{"uid":"u","name":"First","bank":"User","cutoff":1,"waveform1":0,"future":900719925474099312345,"seqPatternNote":['+','.join(['0']*16)+']}'
BANK='['+SINGLE+']'
J6='{"name":"Bank","uuid":"b","midiBankChangeNumber":0,"canDelete":true,"presets":[{"uid":"p","name":"First","parameterValues":[{"identifier":"x","value":1e-999},{"identifier":"x","value":2}]}]}'
def is_runtime_request(url):
 return '/emu/' in unquote(urlparse(url).path).rstrip('/')+'/'
def assert_no_requests(midi_requests,runtime_requests):
 assert not midi_requests,f'MIDI requests: {midi_requests}'
 assert not runtime_requests,f'/emu requests: {runtime_requests}'
async def observed_context(browser,site,viewport=None):
 c=await browser.new_context(viewport=viewport,service_workers='block')
 # Python-held records survive every document, including a handled rejection
 # followed by navigation. Install both observers before even creating a page.
 midi_requests=[];runtime_requests=[];errors=[]
 await c.expose_binding('__dnboxRecordMidiRequest',lambda _source,url:midi_requests.append(url))
 await c.add_init_script("""Object.defineProperty(Navigator.prototype,'requestMIDIAccess',{
  configurable:false,writable:false,value:async()=>{
   await window.__dnboxRecordMidiRequest(location.href);
   throw Error('MIDI blocked by presets browser test');
  }
 });""")
 c.on('request',lambda req:runtime_requests.append(req.url) if is_runtime_request(req.url) else None)
 c.on('page',lambda page:page.on('pageerror',lambda e:errors.append(str(e))))
 async def route(r):
  u=urlparse(r.request.url);path=(site/unquote(u.path).lstrip('/')).resolve()
  # Record attempted runtime loads, but never execute the emulator in this test.
  if is_runtime_request(r.request.url):await r.abort();return
  if path.is_dir():path=path/'index.html'
  if u.hostname!='dnbox.test' or not path.is_relative_to(site.resolve()) or not path.is_file():await r.abort();return
  await r.fulfill(body=path.read_bytes(),content_type=mimetypes.guess_type(str(path))[0] or 'application/octet-stream')
 await c.route('**/*',route)
 return c,midi_requests,runtime_requests,errors
async def request_detector_controls(browser,site):
 for case in ['handled-midi','emu-first-load','emu-preset-phase']:
  c,midi_requests,runtime_requests,errors=await observed_context(browser,site)
  target='https://dnbox.test/emu/detector-'+case
  try:
   if case=='emu-first-load':
    await c.add_init_script("if(location.pathname==='/tools/')fetch("+json.dumps(target)+").catch(()=>{});")
   p=await c.new_page();await p.goto('https://dnbox.test/tools/',wait_until='networkidle')
   if case!='emu-first-load':
    assert_no_requests(midi_requests,runtime_requests)
    await p.locator('a.button[href="../presets/"]').click();await p.wait_for_url('**/presets/')
    assert_no_requests(midi_requests,runtime_requests)
    if case=='handled-midi':
     assert await p.evaluate("""async()=>{try{await navigator.requestMIDIAccess();return false;}
      catch(e){return e.message==='MIDI blocked by presets browser test';}}""")
    else:await p.evaluate('async url=>{try{await fetch(url);}catch{}}',target)
   # The old per-document counter lost exactly this handled original-editor call.
   await p.goto('https://dnbox.test/presets/legacy/',wait_until='networkidle')
  finally:await c.close()
  assert not errors,errors
  assert midi_requests==(['https://dnbox.test/presets/'] if case=='handled-midi' else []),midi_requests
  assert runtime_requests==([] if case=='handled-midi' else [target]),runtime_requests
  try:assert_no_requests(midi_requests,runtime_requests)
  except AssertionError as error:
   assert str(error).startswith('MIDI requests:' if case=='handled-midi' else '/emu requests:'),str(error)
  else:raise AssertionError('Request detector missed '+case)
  print('PASS request detector rejects '+case+' after navigation; no pageerror or hardware access',flush=True)
async def capture(p,out,state,w,h):
 assert await p.evaluate('document.documentElement.scrollWidth===innerWidth'),state+' horizontal overflow'
 await p.screenshot(path=str(out/f'{state}-{w}x{h}.png'),full_page=True)
async def main(site):
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(chromium_sandbox=True)
  try:
   await request_detector_controls(browser,site)
   out=ROOT/'test-results/presets-workflow';out.mkdir(parents=True,exist_ok=True)
   for w,h in [(1440,900),(390,844),(844,390)]:
    c,midi_requests,runtime_requests,errors=await observed_context(browser,site,{'width':w,'height':h})
    p=await c.new_page()
    try:
     await p.goto('https://dnbox.test/tools/',wait_until='networkidle')
     assert await p.evaluate('document.documentElement.scrollWidth===innerWidth')
     assert await p.locator('main details').count()==0,'no emulator walkthrough on Tools'
     # Tools copy must lead to real controls without silently starting audio.
     await capture(p,out,'tools',w,h)
     await p.locator('a.button[href="../remote/"]').click();await p.wait_for_url('**/remote/')
     await p.locator('#roll-grid .note').first.wait_for()
     await p.locator('[data-view="mix"]').click();await p.locator('#other-view').wait_for()
     assert await p.locator('[data-mix-source]').count()==0 and await p.locator('#emulator-start').count()==0
     assert await p.locator('#conn-state').inner_text()=='Disconnected'
     assert_no_requests(midi_requests,runtime_requests)
     await p.goto('https://dnbox.test/tools/',wait_until='networkidle')
     await p.locator('a.button[href="../presets/"]').click();await p.wait_for_url('**/presets/')
     assert await p.locator('#name').is_disabled() and await p.locator('#preset').is_disabled()
     for control in ['#keep','#edit','#original','#export']:assert await p.locator(control).is_disabled(),control
     assert 'not sound audition' in await p.locator('.intro').inner_text()
     await capture(p,out,'empty',w,h)
     for profile,kind,name,raw in [('synthone','synthone-single','one.synth1',SINGLE),('synthone','synthone-bank','bank.json',BANK),('superj6','superj6-bank','juno.superj6.bank.json',J6)]:
      await p.locator('#profile').select_option(profile)
      await p.locator('#file').set_input_files({'name':name,'mimeType':'application/json','buffer':raw.encode()})
      await p.wait_for_function("!document.querySelector('#keep').disabled||document.querySelector('#status').textContent.startsWith('Not imported')")
      assert not await p.locator('#keep').is_disabled(),await p.locator('#status').inner_text()
      assert await p.locator('#preset option').count()==1
      await p.locator('#name').fill('Renamed');await p.locator('#edit').focus();await p.keyboard.press('Enter');await p.locator('#keep').click()
      async with p.expect_download() as original:await p.locator('#original').click()
      assert Path(await (await original.value).path()).read_bytes()==raw.encode();assert (await original.value).suggested_filename=='original-'+name
      async with p.expect_download() as edited:await p.locator('#export').click()
      expected=raw.replace('"First"','"Renamed"').encode();assert Path(await (await edited.value).path()).read_bytes()==expected;assert (await edited.value).suggested_filename=='kept-'+name
      summary=p.locator('details summary');await summary.focus();await p.keyboard.press('Enter');assert await p.locator('details').evaluate('(e)=>e.open')
      if profile=='superj6':assert 'Duplicate parameter identifiers are preserved' in await p.locator('#format-notes').inner_text()
      await capture(p,out,f'ready-{kind}-formats-expanded',w,h)
      await p.keyboard.press('Enter');assert not await p.locator('details').evaluate('(e)=>e.open')
      await capture(p,out,f'ready-{kind}',w,h)
      await p.locator('#file').set_input_files({'name':'broken.json','mimeType':'application/json','buffer':b'{broken'})
      await p.locator('#status').filter(has_text='Not imported').wait_for();assert await p.locator('#keep').is_disabled();assert await p.locator('#name').input_value()=='';assert await p.locator('#preset option').count()==0
      async with p.expect_download() as retained:await p.locator('#export').click()
      assert Path(await (await retained.value).path()).read_bytes()==expected
      await capture(p,out,f'error-{kind}',w,h)
      await p.locator('#cancel').click()
     assert_no_requests(midi_requests,runtime_requests)
     # The Tools entry must send ZIP users to the actual earlier file tool.
     await p.goto('https://dnbox.test/tools/',wait_until='networkidle')
     await p.locator('a[href="../presets/legacy/"]').click();await p.wait_for_url('**/presets/legacy/')
     original=bytes(await p.evaluate("async()=>Array.from((await import('./codec.mjs')).encodeDnpr({engineId:1,name:'Example',params:new Uint8Array(22)}))"))
     await p.locator('#files').set_input_files({'name':'example.chicago.dnpr','mimeType':'application/octet-stream','buffer':original})
     await p.locator('#preview').wait_for(state='visible');await p.locator('#keep').click()
     async with p.expect_download() as dnpr:await p.locator('#save-file').click()
     assert Path(await (await dnpr.value).path()).read_bytes()==original
     async with p.expect_download() as zipped:await p.locator('#save-zip').click()
     archive=Path(await (await zipped.value).path()).read_bytes()
     with zipfile.ZipFile(io.BytesIO(archive)) as z:
      assert len(z.namelist())==1 and z.read(z.namelist()[0])==original
     p.on('dialog',lambda d:asyncio.create_task(d.accept()))
     await p.locator('#clear').click();await p.locator('#session-empty').wait_for(state='visible')
     await p.locator('#files').set_input_files({'name':'presets.zip','mimeType':'application/zip','buffer':archive})
     await p.locator('#preview').wait_for(state='visible');await p.locator('#keep').click()
     async with p.expect_download() as unzipped:await p.locator('#save-file').click()
     assert Path(await (await unzipped.value).path()).read_bytes()==original
     damaged=original[:-1]+bytes([original[-1]^1])
     await p.locator('#files').set_input_files({'name':'bad.chicago.dnpr','mimeType':'application/octet-stream','buffer':damaged})
     await p.locator('#status').filter(has_text='CRC').wait_for()
     async with p.expect_download() as preserved:await p.locator('#save-file').click()
     assert Path(await (await preserved.value).path()).read_bytes()==original
     await capture(p,out,'presets',w,h)
    finally:await c.close()
    assert_no_requests(midi_requests,runtime_requests)
    assert not errors,errors
    print('PASS actual presets3formats+DNPR/ZIP original/rename/invalid-retention/discovery/keyboard/expanded/empty/error/fit/journey-MIDI0/emu0',w,h,flush=True)
  finally:await browser.close()
(ROOT/'.output').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='presets-journey-',dir=ROOT/'.output') as tmp:
 site=Path(tmp)/'site';subprocess.run(['node','scripts/build-product-site.mjs','--output',str(site)],cwd=ROOT,check=True);asyncio.run(main(site))
