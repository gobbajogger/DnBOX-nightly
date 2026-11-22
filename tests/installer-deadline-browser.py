# SPDX-License-Identifier: GPL-3.0-only
"""Actual built installer + real browser fetch deadline. Synthetic package only; no device writes."""
import asyncio,hashlib,json,mimetypes,re,subprocess,sys,tempfile
from pathlib import Path
from urllib.parse import urlparse,unquote
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
def raw(name):
 b=bytearray([125]*1024)
 for i,c in enumerate('SMK-37 '+name+'_900'):b[i*48+47]=(ord(c)+i+1)&255
 return bytes(b)
RAW={k:raw(n) for k,n in [('pro','Pro'),('elite','Elite')]}
CAT={'schema':1,'latest':'test','history':[],'versions':[{'version':'test','status':'dev-checked','config':'dev','hardware_tested':False,'models':{k:{'product':'SMK-37 '+n+'_900','size':1024,'sha256':hashlib.sha256(RAW[k]).hexdigest(),'controller_sha256':hashlib.sha256(b'123').hexdigest(),'pkg':'https://packages.test/'+hashlib.sha256(RAW[k]).hexdigest()+'/'+k+'.fwsc'} for k,n in [('pro','Pro'),('elite','Elite')]}}]}
PROBE='''window.deadlineState=()=>({image:!!image,href:$("download").getAttribute("href"),disabled:$("go").disabled,status:$("status").textContent});window.deadlineSelect=m=>{chosenModel=m;refreshModelUi();loadSelectedPackage();};'''
async def check_starting_break_picker(page):
 for picker_id in ('sample-picker','samples-status','download-breaks','download-status'):
  assert await page.locator(f'[id="{picker_id}"]').count()==1, f'Expected one #{picker_id}'
 picker=page.locator('#sample-picker')
 disclosure=page.locator('details.installer-starting-breaks > summary')
 if await disclosure.count():
  assert await picker.is_hidden()
  await disclosure.click()
 choices=picker.get_by_role('checkbox')
 await choices.first.wait_for()
 assert await choices.count()==5
 for choice in await choices.all():
  await choice.uncheck()
 button=page.locator('#download-breaks')
 assert await button.is_visible() and await button.is_disabled()
 assert '0 of 5 breaks selected' == await picker.locator('[data-selection-status]').inner_text()
 await choices.first.check()
 assert '1 of 5 breaks selected' == await picker.locator('[data-selection-status]').inner_text()
 async with page.expect_download() as download_event:
  await button.click()
 download=await download_event.value
 assert download.suggested_filename=='DnBOX-starting-breaks.x0xslots'
 assert (await download.path()).stat().st_size>512
 assert 'File prepared' in await page.locator('#download-status').inner_text()
async def check_starting_break_presentations(page):
 await check_starting_break_picker(page)
 await page.goto('https://dnbox.test/starting-breaks/',wait_until='domcontentloaded')
 await check_starting_break_picker(page)
 print('PASS starting break picker on installer and standalone page',flush=True)
async def main(site,picker_only):
 html=(site/'install/index.html').read_text()
 html,n=re.subn(r'^const catalog = .*?;$','const catalog = '+json.dumps(CAT)+';',html,count=1,flags=re.M);assert n==1
 html=html.replace('(async () => {',PROBE+'\n(async () => {',1)
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(chromium_sandbox=True)
  async def scenario(mode):
   c=await browser.new_context();p=await c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)));release=asyncio.Event();started=asyncio.Event()
   await c.add_init_script("window.midiRequests=0;navigator.requestMIDIAccess=()=>{midiRequests++;throw Error('No device');};")
   async def route(r):
    u=urlparse(r.request.url)
    if u.hostname=='packages.test':
     model=Path(u.path).stem
     if mode!='normal' and model=='pro':
      started.set();await release.wait()
     try:await r.fulfill(body=RAW[model],content_type='application/octet-stream')
     except Exception:pass # Request may have been genuinely aborted by the deadline.
     return
    path=(site/unquote(u.path).lstrip('/')).resolve()
    if path.is_dir():path=path/'index.html'
    if not path.is_relative_to(site.resolve()) or not path.is_file():await r.abort();return
    await r.fulfill(body=html if path==site/'install/index.html' else path.read_bytes(),content_type=mimetypes.guess_type(str(path))[0] or 'application/octet-stream')
   await c.route('**/*',route)
   try:
    await p.goto('https://dnbox.test/install/',wait_until='domcontentloaded')
    if picker_only:
     await check_starting_break_presentations(p)
     assert await p.evaluate('midiRequests')==0;assert not errors,errors
     return
    if mode=='timeout':
     await asyncio.wait_for(started.wait(),5)
     await p.wait_for_function("deadlineState().status.includes('too long')",timeout=24000)
     assert await p.evaluate('!deadlineState().image && !deadlineState().href && deadlineState().disabled')
     release.set();await p.wait_for_timeout(300)
     assert await p.evaluate('!deadlineState().image && !deadlineState().href')
     # Explicit retry after the bounded failure still works with the same valid bytes.
     assert await p.evaluate('midiRequests')==0
     await p.reload(wait_until='domcontentloaded')
    elif mode=='new-selection':
     await asyncio.wait_for(started.wait(),5);await p.evaluate("deadlineSelect('elite')")
     await p.wait_for_function("deadlineState().href?.startsWith('blob:')")
     release.set();await p.wait_for_timeout(300)
    await p.wait_for_function("deadlineState().href?.startsWith('blob:')")
    expected='elite' if mode=='new-selection' else 'pro'
    got=await p.evaluate("async()=>Array.from(new Uint8Array(await(await fetch(deadlineState().href)).arrayBuffer()))")
    assert bytes(got)==RAW[expected]
    if mode=='normal':
     assert await p.locator('header:visible').count() == 1
     await check_starting_break_presentations(p)

    assert await p.evaluate('midiRequests')==0;assert not errors,errors
    print('PASS installer deadline',mode,'verified retry/selection, MIDI0',flush=True)
   finally:release.set();await c.close()
  try:
   # Concurrent network waits are one bounded browser job, not concurrent builds.
   await asyncio.gather(*(scenario(m) for m in (['normal'] if picker_only else ['timeout','normal','new-selection'])))
  finally:await browser.close()
(ROOT/'.output').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='installer-deadline-',dir=ROOT/'.output') as tmp:
 site=Path(tmp)/'site';subprocess.run(['node','scripts/build-product-site.mjs','--output',str(site)],cwd=ROOT,check=True);asyncio.run(main(site,sys.argv[1:]==['--picker-only']))
