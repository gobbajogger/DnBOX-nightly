# SPDX-License-Identifier: GPL-3.0-only
"""Motion against exact live WASM over Web MIDI; no physical device or authored replies."""
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
    const seq=window.motionSeq=(window.motionSeq||14000)+1;
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
            async def open_motion():
                menu=page.locator('.overflow')
                if not await menu.evaluate('e=>e.open'):
                    await menu.locator('summary').click()
                await page.locator('[data-view=locks]').click()
                if await menu.evaluate('e=>e.open'):
                    await menu.locator('summary').click()
            await page.locator('[data-engine=chicago]').click()
            await open_motion()
            await expect(page.locator('#other-view h2')).to_have_text('Motion · MIAMI Wave · Draft')
            await page.evaluate("""async expected=>{
              const {installWasmWebMidi}=await import('/fixture/wasm-web-midi.mjs');
              window.fixture=await installWasmWebMidi(new URL('/fixture/',location.href),expected);
            }""",PIN)
            await page.locator('#connect').click()
            await expect(page.locator('#conn-state')).to_have_text('Connected')
            await expect(page.locator('#other-view h2')).to_have_text('Motion · MIAMI Carrier waveform · Firmware')
            await expect(page.locator('#firmware-motion button[data-live-motion-step]')).to_have_count(16)
            point=page.locator('[data-live-motion-step="5"]')
            await expect(point).to_be_enabled()
            native=await page.evaluate(WIRE,[0x30,{}])
            target=dict(voice=0,pat=native['fields']['ppat'][2])
            async def raw():
                result=await page.evaluate(WIRE,[0x2A,target])
                assert result['status']==0,result
                return result['fields']['points'][5]
            assert await raw()==255
            mark=await page.evaluate('fixture.out.length')
            await point.click()
            chooser=page.get_by_role('combobox',name='Carrier waveform')
            await chooser.select_option(label='SAW')
            encoded=int(await chooser.input_value())
            await page.get_by_role('button',name='Set point').click()
            await expect(point).to_have_text('6 · SAW')
            assert await raw()==encoded
            writes=await page.evaluate("""async n=>{
              const d=await import('/remote/dnr3.mjs');
              return fixture.out.slice(n).filter(f=>f[5]===0x2B).map(f=>d.decodeRequest(f).fields);
            }""",mark)
            assert len(writes)==1 and all(writes[0][k]==v for k,v in dict(**target,step=5,expect=255,value=encoded).items()),writes

            mark=await page.evaluate('fixture.out.length')
            ext=await page.evaluate(WIRE,[0x2B,dict(**target,epoch=None,step=5,expect=encoded,value=0)])
            assert ext['status']==0 and await raw()==0,ext
            await expect(point).to_have_text('6 · TRI')
            assert not await page.evaluate('n=>fixture.out.slice(n).some(f=>f[5]===0x2B)',mark)
            await page.get_by_role('button',name='Clear point').click()
            await expect(point).to_have_text('6 · —')
            assert await raw()==255

            await page.evaluate('fixture.panel(1<<11);fixture.panel(0)')
            await expect(page.locator('#motion-live-status')).to_contain_text('turn Record off')
            await expect(point).to_be_disabled()
            await page.evaluate('fixture.panel(1<<11);fixture.panel(0)')
            await expect(point).to_be_enabled()

            started=await page.evaluate(WIRE,[0x26,dict(epoch=None,action=1)])
            assert started['fields']['playing']==1,started
            await expect(point).to_be_disabled()
            stopped=await page.evaluate(WIRE,[0x26,dict(epoch=None,action=0)])
            assert stopped['fields']['playing']==0,stopped
            await expect(point).to_be_enabled()
            await page.locator('[data-engine=drum909]').click()
            await expect(page.get_by_text('Select Bass A or Bass B',exact=False)).to_be_visible()
            assert await page.locator('#firmware-motion').count()==0

            await page.locator('#connect').click()
            await page.locator('[data-engine=chicago]').click()
            await expect(page.locator('#motion-grid')).to_be_visible()
            await expect(page.locator('#motion-grid button').nth(5)).to_have_text('—')
            await page.evaluate('fixture.close()')
            assert not errors,errors
            print('PASS native MIAMI Carrier Motion: exact CAS, native input polling, zero vs unset, play/REC interlocks, Draft isolation')
        finally:
            await browser.close()

if __name__=='__main__':
    asyncio.run(main())
