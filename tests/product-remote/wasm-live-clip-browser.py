# SPDX-License-Identifier: GPL-3.0-only
"""Pattern launcher against exact live WASM over Web MIDI; no physical device or authored replies."""
import asyncio
import importlib.util
import os
from pathlib import Path
from playwright.async_api import async_playwright, expect

HERE=Path(__file__).parent
spec=importlib.util.spec_from_file_location('layout',HERE/'remote-controls-browser.py')
layout=importlib.util.module_from_spec(spec)
spec.loader.exec_module(layout)
PIN=dict(firmware='adf3eee64fcbfd9971fd402fd67ec6809c58251b',
         kernel='b16d487dd6b6b9ffe1dddcddc99df7e45fed6f28',
         wasm='92b81be4e2b8f8c59f34cdd94b7bb5cf28f2acf5f9350babb5ac5741c3729c65')

WIRE="""async ([op,fields])=>{
    const d=await import('/remote/dnr3.mjs');
    const seq=window.clipSeq=(window.clipSeq||14000)+1;
    const watch=fixture.out.filter(f=>f[0]===240).map(d.decodeRequest).find(q=>q.op===d.OP.WATCH);
    if(fields.epoch===null)fields.epoch=watch.fields.epoch;
    const mark=fixture.inbound.length;
    fixture.deviceReceive(d.encodeRequest(op,seq,fields));fixture.render(6);
    const frame=fixture.inbound.slice(mark).find(f=>f[5]===(op|64)&&d.decodeFrame(f).seq===seq);
    if(!frame)throw Error('No native reply '+op);
    return d.decodeReply(frame);
}"""

async def main():
    directory=Path(os.environ['DNBOX_EMULATOR_RUNTIME']).resolve()
    layout.SOURCE=layout.ROOT/'web/product-site'

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
            page=await browser.new_page(viewport={'width':844,'height':390})
            await page.route('**/*',serve)
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            await page.add_init_script("navigator.requestMIDIAccess=()=>{throw Error('fixture not installed')}")
            await page.goto(layout.ORIGIN+'/remote/')
            await page.locator('[data-view=patterns]').click()
            await expect(page.locator('[data-clip-source=draft]')).to_be_visible()
            await page.locator('[data-launch-part="0"][data-pattern="6"]').click()
            await expect(page.locator('[data-launch-part="0"][data-pattern="6"]')).to_have_attribute('aria-pressed','true')
            await page.evaluate("""async expected=>{
              const {installWasmWebMidi}=await import('/fixture/wasm-web-midi.mjs');
              window.fixture=await installWasmWebMidi(new URL('/fixture/',location.href),expected);
            }""",PIN)
            await page.locator('#connect').click()
            await expect(page.locator('#conn-state')).to_have_text('Connected')
            await expect(page.locator('[data-clip-source=firmware]')).to_be_visible()
            await expect(page.locator('[data-firmware-pattern=active]')).to_have_count(5)

            async def native():
                response=await page.evaluate(WIRE,[0x30,{}])
                assert response['status']==0,response
                return response['fields']
            async def mutations(mark):
                return await page.evaluate("""async n=>{
                  const d=await import('/remote/dnr3.mjs');
                  return fixture.out.slice(n).filter(f=>f[0]!==240||
                    [0x12,0x21,0x22,0x24,0x26,0x27,0x28,0x2b].includes(f[5])||
                    (f[5]===0x29&&d.decodeRequest(f).fields.command!==2));
                }""",mark)
            state=await native()
            for part in range(5):
                target=(state['ppat'][part]+7)%32
                mark=await page.evaluate('fixture.out.length')
                await page.evaluate('([ch,pat])=>fixture.deviceReceive([0xC0|ch,pat])',[state['ch'][part],target])
                cell=page.locator(f'[data-launch-part="{part}"][data-pattern="{target}"]')
                await expect(cell).to_have_attribute('data-firmware-pattern','active')
                assert (await native())['ppat'][part]==target
                assert not await mutations(mark), 'Independent pattern reflection caused a page write'

            for part in range(5):
                for pattern in tuple(range(32)) if os.environ.get('DNBOX_FULL_CLIP_GRID') else (3, 31):
                    fresh=await native()
                    if fresh['ppat'][part]==pattern:
                        alternate=(pattern+1)%32
                        await page.evaluate('([ch,pat])=>fixture.deviceReceive([0xC0|ch,pat])',[fresh['ch'][part],alternate])
                        await expect(page.locator(f'[data-launch-part="{part}"][data-pattern="{alternate}"]')).to_have_attribute('data-firmware-pattern','active')
                    cell=page.locator(f'[data-launch-part="{part}"][data-pattern="{pattern}"]')
                    await expect(cell).to_have_attribute('data-firmware-pattern','inactive')
                    mark=await page.evaluate('fixture.out.length')
                    await cell.click()
                    await expect(cell).to_have_attribute('data-firmware-pattern','active')
                    assert (await native())['ppat'][part]==pattern,(part,pattern)
                    writes=await mutations(mark)
                    assert len(writes)==1 and writes[0][5]==0x24 and writes[0][14:16]==[part,pattern],writes

            mark=await page.evaluate('fixture.out.length')
            await page.locator('[data-view=files]').click()
            await page.locator('[data-view=patterns]').click()
            await expect(page.locator('[data-clip-source=firmware]')).to_be_visible()
            assert not await mutations(mark), 'View navigation wrote to firmware'

            started=await page.evaluate(WIRE,[0x26,dict(epoch=None,action=1)])
            assert started['fields']['playing']==1,started
            now=await native()
            part=0
            pattern=(now['ppat'][part]+1)%32
            queued=page.locator(f'[data-launch-part="{part}"][data-pattern="{pattern}"]')
            await queued.click()
            await expect(queued).to_have_attribute('data-firmware-pattern','queued')
            assert (await native())['pcue'][part]==pattern
            await expect(queued).to_have_attribute('data-firmware-pattern','active',timeout=7000)
            assert (await native())['ppat'][part]==pattern
            await page.evaluate(WIRE,[0x26,dict(epoch=None,action=0)])
            await page.locator('#connect').click()
            await expect(page.locator('[data-clip-source=draft]')).to_be_visible()
            await expect(page.locator('[data-launch-part="0"][data-pattern="6"]')).to_have_attribute('aria-pressed','true')
            assert await page.locator('[data-firmware-pattern]').count()==0
            await page.evaluate('fixture.close()')
            assert not errors,errors
            print('PASS native Web MIDI patterns: all 5 independent reflections, exact CUE/STATE, queued→active, zero-write navigation, Draft isolation')
        finally:
            await browser.close()

if __name__=='__main__':
    asyncio.run(main())
