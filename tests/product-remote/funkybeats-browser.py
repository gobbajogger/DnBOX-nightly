# SPDX-License-Identifier: GPL-3.0-only
"""Five real-browser FunkyBeats surfaces, local draft only; no device access.

Serve the actual product build through Playwright routing, without a test HTTP server.
Use Playwright's bundled Chromium with its normal sandbox. Never fall back to
an unsandboxed browser. Each case receives a fresh page and tests an edit plus
its persistence/undo, rather than accepting only that a heading is visible.
"""
import asyncio
import json
import mimetypes
import re
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import unquote, urlparse
from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
SOURCE = None
ORIGIN = 'https://dnbox.test'

async def serve(route):
    url = urlparse(route.request.url)
    if url.netloc != 'dnbox.test':
        await route.abort()
        return
    path = (SOURCE / unquote(url.path).lstrip('/')).resolve()
    if not path.is_relative_to(SOURCE.resolve()):
        await route.fulfill(status=403, body='Forbidden')
        return
    if path.is_dir():
        path /= 'index.html'
    if not path.is_file():
        await route.fulfill(status=404, body='Not found')
        return
    mime = 'text/javascript' if path.suffix == '.mjs' else mimetypes.guess_type(path)[0] or 'application/octet-stream'
    await route.fulfill(status=200, content_type=mime, body=path.read_bytes())

async def roll(page):
    note = page.locator('#roll-grid [data-note]').first
    identity = await note.get_attribute('data-note')
    before = await note.get_attribute('aria-label')
    await note.press('ArrowUp')
    target = page.locator(f'#roll-grid [data-note="{identity}"]')
    await expect(target).not_to_have_attribute('aria-label', before)
    await page.locator('#undo').click()
    await expect(target).to_have_attribute('aria-label', before)

async def sequencer(page):
    await page.locator('.overflow summary').click()
    await page.locator('[data-view="drums"]').click()
    await page.locator('.overflow summary').click()
    cells = page.locator('.funkybeats-sequencer [data-drum-note]')
    await expect(cells).to_have_count(176)
    cell = cells.first
    before = await cell.get_attribute('aria-pressed')
    await cell.click()
    await expect(cells.first).to_have_attribute('aria-pressed', 'false' if before == 'true' else 'true')
    await page.locator('#undo').click()
    await expect(cells.first).to_have_attribute('aria-pressed', before)

async def mixer(page):
    await page.locator('[data-view="mix"]').click()
    faders = page.locator('input.mixer-fader[data-native-param]')
    await expect(faders).to_have_count(5)
    slider = faders.first
    before = await slider.input_value()
    await slider.press('ArrowRight')
    await expect(slider).not_to_have_value(before)
    after = await slider.input_value()
    await page.locator('[data-view="roll"]').click()
    await page.locator('[data-view="mix"]').click()
    await expect(faders.first).to_have_value(after)
    await page.locator('#undo').click()
    await expect(faders.first).to_have_value(before)

async def launcher(page):
    await page.locator('[data-view="patterns"]').click()
    await expect(page.locator('[data-launch-part]')).to_have_count(160)
    cell = page.locator('[data-launch-part="0"][data-pattern="1"]')
    await cell.click()
    await expect(cell).to_have_attribute('aria-pressed', 'true')
    await page.locator('[data-view="roll"]').click()
    await page.locator('[data-view="patterns"]').click()
    await expect(cell).to_have_attribute('aria-pressed', 'true')
    await expect(page.locator('[data-launch-part="0"][aria-pressed="true"]')).to_have_count(1)

async def synth(page):
    await page.locator('[data-engine="chicago"]').click()
    await page.locator('[data-view="sound"]').click()
    slider = page.locator('.funkybeats-typed-unit input[data-native-param]').first
    await expect(slider).to_be_visible()
    before = await slider.input_value()
    await slider.press('ArrowRight')
    await expect(slider).not_to_have_value(before)
    await expect(slider).not_to_have_attribute('aria-valuetext', '—')
    await page.locator('#undo').click()
    await expect(slider).to_have_value(before)

async def gesture_edits(page):
    identity = await page.locator('#roll-grid .note').evaluate_all('(ns)=>ns.find(n=>n.getBoundingClientRect().width>24).dataset.note')
    note = page.locator(f'#roll-grid [data-note="{identity}"]')
    await note.scroll_into_view_if_needed()
    before = await note.get_attribute('aria-label')
    start,end = map(int,re.search(r'(\d+) to (\d+) samples',before).groups())
    box = await note.bounding_box()
    x,y = box['x']+box['width']/2, box['y']+box['height']/2
    await page.mouse.move(x,y); await page.mouse.down(); await page.mouse.move(x+20,y,steps=4); await page.mouse.up()
    after = await note.get_attribute('aria-label')
    moved_start,moved_end = map(int,re.search(r'(\d+) to (\d+) samples',after).groups())
    assert moved_start > start and moved_end-moved_start == end-start
    await page.locator('#undo').click()
    await expect(note).to_have_attribute('aria-label',before)
    edge = await note.locator('[data-edge="end"]').bounding_box()
    x,y = edge['x']+edge['width']/2, edge['y']+edge['height']/2
    await page.mouse.move(x,y); await page.mouse.down(); await page.mouse.move(x+20,y,steps=4); await page.mouse.up()
    resized_start,resized_end = map(int,re.search(r'(\d+) to (\d+) samples',await note.get_attribute('aria-label')).groups())
    assert resized_start == start and resized_end > end
    await page.locator('#undo').click()
    await expect(note).to_have_attribute('aria-label',before)
    empty = await page.locator('#roll-scroll').evaluate("e=>{const r=e.getBoundingClientRect();for(let y=r.y+10;y<r.bottom-12;y+=15)for(let x=r.x+20;x<r.right-30;x+=25){const t=document.elementFromPoint(x,y);if(t?.closest('#roll-grid')&&!t.closest('[data-note]'))return{x,y};}throw Error('No empty visible roll cell');}")
    count = await page.locator('#roll-grid .note').count()
    await page.mouse.move(empty['x'],empty['y']); await page.mouse.down(); await page.mouse.move(empty['x']+15,empty['y'],steps=3); await page.mouse.up()
    await expect(page.locator('#roll-grid .note')).to_have_count(count+1)
    await page.locator('#undo').click()
    await expect(page.locator('#roll-grid .note')).to_have_count(count)

async def gesture_delete(page):
    identity = await page.locator('#roll-grid .note').evaluate_all('(ns)=>ns.find(n=>n.getBoundingClientRect().width>24).dataset.note')
    note = page.locator(f'#roll-grid [data-note="{identity}"]')
    await note.scroll_into_view_if_needed()
    before = await note.get_attribute('aria-label')
    box = await note.bounding_box()
    client = await page.context.new_cdp_session(page)
    for _ in range(2):
        await client.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':box['x']+box['width']/2,'y':box['y']+box['height']/2,'id':1}]})
        await client.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
    await client.detach()
    await expect(note).to_have_count(0)
    await page.locator('#undo').click()
    await expect(note).to_have_attribute('aria-label', before)

async def gesture_navigation(page):
    viewport = page.locator('#roll-scroll')
    box = await viewport.bounding_box()
    snapshot = await page.locator('#roll-grid .note').evaluate_all('(ns)=>ns.map(n=>n.getAttribute("aria-label"))')
    await page.locator('#zoom').evaluate('(el)=>{el.value="1.5";el.dispatchEvent(new Event("input"))}')
    x,y = box['x']+box['width']/2, box['y']+box['height']/2
    client = await page.context.new_cdp_session(page)
    async def touch(kind, points):
        await client.send('Input.dispatchTouchEvent', {'type':kind,'touchPoints':[{'x':a,'y':b,'id':i,'radiusX':1,'radiusY':1} for i,a,b in points]})
    before = await page.locator('#roll-grid').evaluate('(e)=>e.offsetWidth')
    await touch('touchStart', [(1,x-40,y),(2,x+40,y)])
    await touch('touchMove', [(1,x-80,y),(2,x+80,y)])
    await touch('touchEnd', [])
    await expect(page.locator('#zoom')).to_have_value('3')
    assert abs(await page.locator('#roll-grid').evaluate('(e)=>e.offsetWidth')-before*2) <= 1
    top = await viewport.evaluate('(e)=>e.scrollTop')
    await touch('touchStart', [(1,x-40,y),(2,x+40,y)])
    await touch('touchMove', [(1,x-40,y-20),(2,x+40,y-20)])
    await touch('touchEnd', [])
    assert abs(await viewport.evaluate('(e)=>e.scrollTop')-top-20) < 2
    assert await page.locator('#roll-grid .note').evaluate_all('(ns)=>ns.map(n=>n.getAttribute("aria-label"))') == snapshot
    await client.detach()
    zoomed_width = await page.locator('#roll-grid').evaluate('(e)=>e.offsetWidth')
    await page.locator('.overflow summary').click()
    async with page.expect_download() as requested:
        await page.locator('#draft-save').click()
    download = await requested.value
    draft = Path(await download.path()).read_bytes()
    await page.locator('#zoom').evaluate('(el)=>{el.value="1";el.dispatchEvent(new Event("input"))}')
    await page.locator('#draft-file').set_input_files({'name':'roundtrip.json','mimeType':'application/json','buffer':draft})
    await page.locator('#draft-replace').click()
    assert await page.locator('#roll-grid').evaluate('(e)=>e.offsetWidth') == zoomed_width

async def no_tool_row(page):
    screenshots = ROOT / 'build/remote-gestures'
    screenshots.mkdir(parents=True, exist_ok=True)
    await expect(page.locator('.roll-tools')).to_have_count(0)
    await expect(page.locator('[data-mode]:visible')).to_have_count(0)
    await page.screenshot(path=str(screenshots / '844x390.png'))
    await page.set_viewport_size({'width':1440,'height':900})
    await expect(page.locator('.roll-tools')).to_have_count(0)
    await expect(page.locator('[data-mode]:visible')).to_have_count(0)
    await page.screenshot(path=str(screenshots / '1440x900.png'))

async def draft_state(page):
    menu = page.locator('.overflow')
    if not await menu.evaluate('e=>e.open'):
        await page.locator('.overflow summary').click()
    async with page.expect_download() as requested:
        await page.locator('#draft-save').click()
    result = json.loads(Path(await (await requested.value).path()).read_text())
    await page.locator('.overflow summary').click()
    return result

async def load_draft(page, state):
    await page.locator('#draft-file').set_input_files({'name':'step-roundtrip.json','mimeType':'application/json','buffer':json.dumps(state).encode()})
    await page.locator('#draft-replace').click()

async def step_roll(page):
    state = await draft_state(page)
    first = next(n for n in state['notes'] if n['track']=='chicago')
    chord = dict(first, id='draft999', sourceOrder=None, note=first['note']+4, velocity=80)
    state['notes'].append(chord)
    await load_draft(page, state)
    before = (await draft_state(page))['notes']
    cell = page.locator('#velocity [data-lane-step="0"]')
    await expect(page.locator('#velocity [data-lane-step]')).to_have_count(16)
    await expect(cell).to_have_attribute('aria-label', re.compile('2 notes.*Mixed'))
    for kind, key in [('velocity','velocity'),('chance','chance'),('pan','pan'),('pitch','note')]:
        await page.locator('#lane-kind').evaluate('(e,k)=>{e.value=k;e.dispatchEvent(new Event("change"))}',kind)
        original = (await draft_state(page))['notes']
        await cell.press('ArrowDown' if kind=='chance' else 'ArrowUp')
        edited = (await draft_state(page))['notes']
        ids = {first['id'],chord['id']}
        for old,new in zip(original,edited):
            if old['id'] in ids:
                assert old.get(key) != new.get(key), (kind,old,new)
                assert (old['start'],old['end'],old['id']) == (new['start'],new['end'],new['id'])
            else:
                assert old == new
        await page.locator('#undo').click()
        assert (await draft_state(page))['notes'] == original
        await page.locator('#redo').click()
        assert (await draft_state(page))['notes'] == edited
        await page.locator('#undo').click()
    assert (await draft_state(page))['notes'] == before
    await page.locator('#lane-kind').evaluate('(e)=>{e.value="velocity";e.dispatchEvent(new Event("change"))}')
    await cell.scroll_into_view_if_needed()
    track = await page.locator('#velocity .lane-track').bounding_box()
    lane_box = await page.locator('#velocity').bounding_box()
    x0 = track['x']+track['width']/32
    x4 = track['x']+track['width']*4.5/16
    await page.mouse.move(x0,lane_box['y']+lane_box['height']-10)
    await page.mouse.down()
    await page.mouse.move(x4,lane_box['y']+10,steps=1)
    await page.mouse.up()
    ramp = (await draft_state(page))['notes']
    changed = [(a,b) for a,b in zip(before,ramp) if a!=b]
    assert len(changed)>=3, changed
    assert {b['velocity'] for a,b in changed if a['id'] in {first['id'],chord['id']}}=={1}
    await page.locator('#undo').click()
    assert (await draft_state(page))['notes']==before
    await page.locator('#lane-kind').evaluate('(e)=>{e.value="pan";e.dispatchEvent(new Event("change"))}')
    await cell.scroll_into_view_if_needed()
    box = await cell.bounding_box()
    client = await page.context.new_cdp_session(page)
    x,y = box['x']+box['width']/2,box['y']+10
    await client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':x,'y':y}]})
    await client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':x,'y':y},{'id':2,'x':x+30,'y':y+10}]})
    await client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    assert (await draft_state(page))['notes'] == before
    note = page.locator('#roll-grid [data-note="'+first['id']+'"]')
    await note.scroll_into_view_if_needed()
    nb = await note.bounding_box()
    lb = await cell.bounding_box()
    roll_point = {'id':11,'x':nb['x']+nb['width']/2,'y':nb['y']+nb['height']/2}
    lane_point = {'id':12,'x':lb['x']+lb['width']/2,'y':lb['y']+10}
    for start,second in [(roll_point,lane_point),(lane_point,roll_point)]:
        await client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[start]})
        await client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[start,second]})
        await client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        assert (await draft_state(page))['notes'] == before
    await client.detach()
    await cell.press('ArrowRight')
    exported = await draft_state(page)
    await load_draft(page,exported)
    assert (await draft_state(page))['notes'] == exported['notes']

async def step_drums(page):
    for kit in ['909','808']:
        await page.locator('[data-engine="drum'+kit+'"]').click()
        await page.locator('.overflow summary').click()
        await page.locator('[data-view="drums"]').click()
        await page.locator('.overflow summary').click()
        cells = page.locator('#drum-lane [data-lane-step]')
        await expect(cells).to_have_count(16)
        if kit=='808':
            await expect(page.locator('#drum-lane [data-lane-step]:disabled')).to_have_count(16)
            await page.locator('#sound-voice').select_option('1')
        cell = page.locator('#drum-lane [data-lane-step]:not(:disabled)').first
        before = (await draft_state(page))['notes']
        for _ in range(4):
            kind = await page.locator('#lane-kind').input_value()
            print('STEP_DRUM_CONTROL',kit,kind,flush=True)
            await cell.press('ArrowDown' if kind=='chance' else 'ArrowUp')
            after = (await draft_state(page))['notes']
            changes = [(a,b) for a,b in zip(before,after) if a!=b]
            assert changes, (kit,kind)
            for a,b in changes:
                assert a['track']==b['track']=='drum'+kit
                assert (a['note'],a['start'],a['end'])==(b['note'],b['start'],b['end'])
                if kind=='pitch': assert b['pitchOffset']==1
            if kind=='pitch':
                await page.locator('[data-view="roll"]').click()
                await expect(page.locator('#lane-value')).to_have_text('+1st')
                await page.locator('[data-view="drums"]').evaluate('e=>e.click()')
            await page.locator('#undo').click()
            assert (await draft_state(page))['notes']==before
            await page.locator('[data-lane-cycle]').click()
        assert await page.locator('.drum-step-lane').evaluate('e=>e.getBoundingClientRect().height') <= 49
        assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        await expect(page.locator('#inspector')).to_have_count(0)

async def thin_step_lanes(page):
    await expect(page.locator('#inspector')).to_have_count(0)
    for width,height in [(844,390),(1440,900)]:
        await page.set_viewport_size({'width':width,'height':height})
        assert await page.locator('.lane').evaluate('e=>e.getBoundingClientRect().height') <= 49
        assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        target = ROOT/'build/remote-step-lanes'
        target.mkdir(parents=True,exist_ok=True)
        await page.screenshot(path=str(target/f'{width}x{height}.png'))

async def browser_cases():
    notice = (ROOT / 'LICENSES/FunkyBeats-MIT.md').read_text()
    assert 'Permission is hereby granted' in notice
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(chromium_sandbox=True)
        try:
            for case in (roll, sequencer, mixer, launcher, synth, gesture_edits, gesture_delete, gesture_navigation, no_tool_row, step_roll, step_drums, thin_step_lanes):
                context = await browser.new_context(viewport={'width': 844, 'height': 390}, has_touch=True)
                await context.route('**/*', serve)
                page = await context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                await page.add_init_script('navigator.requestMIDIAccess=()=>{throw Error("Device access forbidden in local draft test")};')
                await page.goto(ORIGIN + '/remote/')
                await page.wait_for_function('document.getElementById("status").textContent.includes("Draft")')
                await case(page)
                assert not errors, errors
                print(f'PASS FunkyBeats {case.__name__}', flush=True)
                await context.close()
        finally:
            await browser.close()
    print('FUNKYBEATS-BROWSER pages=12 failures=0')

async def main():
    global SOURCE
    output_root = ROOT / '.output'
    output_root.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='funkybeats-browser-', dir=output_root) as output:
        SOURCE = Path(output)
        subprocess.run(['node', 'scripts/build-product-site.mjs', '--output', output], cwd=ROOT, check=True)
        await browser_cases()

if __name__ == '__main__':
    asyncio.run(main())
