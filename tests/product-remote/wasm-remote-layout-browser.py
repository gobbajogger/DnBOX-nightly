# SPDX-License-Identifier: GPL-3.0-only
"""Responsive layout receipts against the built site and exact live WASM Web MIDI."""
import asyncio
import importlib.util
import os
import json
from pathlib import Path
from playwright.async_api import async_playwright, expect

HERE=Path(__file__).parent
spec=importlib.util.spec_from_file_location('layout',HERE/'remote-controls-browser.py')
layout=importlib.util.module_from_spec(spec)
spec.loader.exec_module(layout)
PIN=dict(firmware='adf3eee64fcbfd9971fd402fd67ec6809c58251b',
         kernel='b16d487dd6b6b9ffe1dddcddc99df7e45fed6f28',
         wasm='92b81be4e2b8f8c59f34cdd94b7bb5cf28f2acf5f9350babb5ac5741c3729c65')

async def main():
    directory=Path(os.environ['DNBOX_EMULATOR_RUNTIME']).resolve()
    layout.SOURCE=Path(os.environ['DNBOX_AUDIT_SITE']).resolve()
    out=Path(os.environ['DNBOX_AUDIT_OUTPUT']).resolve();out.mkdir(exist_ok=True,parents=True)

    async def serve(route):
        name=route.request.url.removeprefix(layout.ORIGIN)
        files={'/fixture/wasm-web-midi.mjs':(HERE/'firmware/wasm-web-midi.mjs','text/javascript'),
               '/fixture/wasi.mjs':(directory/'wasi.mjs','text/javascript'),
               '/fixture/runtime.json':(directory/'runtime.json','application/json'),
               '/fixture/kernel.wasm':(directory/'kernel.wasm','application/wasm')}
        if name in files:
            file,mime=files[name]
            await route.fulfill(path=file,content_type=mime)
        else:
            await layout.serve(route)

    async with async_playwright() as p:
        browser=await p.chromium.launch(chromium_sandbox=True)
        try:
            results=[]
            for w,h in [(844,390),(390,844),(1440,900),(1024,640)]:
                page=await browser.new_page(viewport={'width':w,'height':h},has_touch=True)
                await page.route('**/*',serve)
                errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                await page.add_init_script("navigator.requestMIDIAccess=()=>{throw Error('fixture not installed')}")
                await page.goto(layout.ORIGIN+'/remote/')
                await expect(page.locator('main')).to_have_attribute('aria-busy','false')
                async def cap(view):
                    await page.evaluate('document.fonts.ready')
                    await page.screenshot(path=out/f'{w}x{h}-{view}.png')
                    view_result=await page.evaluate("""()=>{
                        const els=['header','.topbar','.workspace-head','.transport','#tempo','#conn-state','.engine-tabs','#roll-scroll','#velocity','.drum-step-lane','.fw-drum-grid','#break-sequence','.mix-parts-panel','.mix-master-panel','#parameter-inspector','#glyph-card'];
                        const box=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {x:r.x,y:r.y,w:r.width,h:r.height,font:s.fontSize,color:s.color,bg:s.backgroundColor,radius:s.borderRadius,hidden:!e.getClientRects().length};};
                        return {width:document.documentElement.scrollWidth,innerWidth,mode:document.querySelector('[data-view][aria-current=page]')?.dataset.view,widgets:Object.fromEntries(els.map(k=>[k,document.querySelector(k)]).filter(([,v])=>v).map(([k,v])=>[k,box(v)]))};}""")
                    results.append({'size':[w,h],'view':view,**view_result})
                await cap('roll-draft')
                assert await page.locator('.roll-panel').evaluate('e=>e.offsetWidth >= innerWidth - 48')
                if w==1024:
                    await page.close();continue
                await page.evaluate("""async expected=>{
                  const {installWasmWebMidi}=await import('/fixture/wasm-web-midi.mjs');
                  window.fixture=await installWasmWebMidi(new URL('/fixture/',location.href),expected);
                }""",PIN)
                await page.locator('#connect').click()
                await expect(page.locator('#conn-state')).to_have_text('Connected')
                await expect(page.locator('[data-roll-step]')).to_have_count(16)
                assert await page.locator('[data-roll-step]').evaluate_all('''es=>es.every(e=>{
                  const r=e.getBoundingClientRect(),s=getComputedStyle(e);
                  return r.left>=0&&r.right<=innerWidth&&r.height>=44&&
                    s.backgroundColor==='rgb(16, 26, 31)'&&s.color==='rgb(221, 231, 222)';
                })''')
                await cap('roll-live')
                await page.locator('[data-engine=drum909]').click()
                await expect(page.locator('[data-firmware-step]').first).to_be_enabled()
                assert await page.locator('.fw-drum-grid .seq-row.sel .seq-channel-name').evaluate('e=>getComputedStyle(e).color==="rgb(5, 10, 13)"')
                lane=page.locator('.live-drum-velocity')
                await expect(lane).to_be_visible()
                metrics=await lane.evaluate('e=>{const r=e.getBoundingClientRect();return [r.height,r.bottom,innerHeight]}')
                assert 32 <= metrics[0] <= 48 and metrics[1] <= metrics[2],metrics
                assert await lane.locator('select').evaluate('e=>{const r=e.getBoundingClientRect(),p=e.closest(".live-drum-velocity").getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom&&r.height>=24;}')
                await cap('drums-live')
                await page.locator('[data-engine=breaks]').click()
                await cap('breaks-live')
                await page.locator('[data-view=mix]').click()
                await expect(page.locator('[data-runtime-key="5:0:0"]')).to_be_enabled()
                await cap('mix-live')
                await page.locator('[data-engine=miami]').click()
                await page.locator('[data-view=sound]').click()
                await expect(page.locator('[data-live-chicago]').first).to_be_enabled()
                await expect(page.locator('#part-title')).to_have_text('CHICAGO / BASS B')
                assert await page.locator('[data-sound-source=firmware] .parameter svg').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().width<=e.closest("label").getBoundingClientRect().width)')
                await cap('sound-live')
                await page.locator('[data-view=patterns]').click()
                await expect(page.locator('[data-clip-source=firmware]')).to_be_visible()
                await cap('patterns-live')
                await page.locator('#play').click()
                await expect(page.locator('#play')).to_have_attribute('aria-pressed','true')
                await page.locator('[data-launch-part="0"][data-pattern="1"]').click()
                await expect(page.locator('[data-launch-part="0"][data-pattern="1"]')).to_have_attribute('data-firmware-pattern','queued')
                await expect(page.locator('[data-firmware-pattern=queued] .cue-state')).to_have_text('QUEUED')
                await expect(page.locator('[data-firmware-pattern=active] .cue-state').first).to_have_text('ACTIVE')
                await cap('patterns-queued')
                await page.evaluate('fixture.close()')
                assert not errors,errors
                await page.close()
            (out/'geometry.json').write_text(json.dumps(results,indent=2)+'\n')
            print(f'PASS {len(results)} exact rendered layout captures and targeted interaction assertions')
        finally:
            await browser.close()

if __name__=='__main__':
    asyncio.run(main())
