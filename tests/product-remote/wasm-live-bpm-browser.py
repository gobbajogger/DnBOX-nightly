# SPDX-License-Identifier: GPL-3.0-only
"""BPM controls against exact live WASM over Web MIDI; no physical device or authored replies."""
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
            page=await browser.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
            await page.route('**/*',serve)
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            await page.add_init_script("navigator.requestMIDIAccess=()=>{throw Error('fixture not installed')}")
            await page.goto(layout.ORIGIN+'/remote/')
            await page.evaluate("""async expected=>{
              const {installWasmWebMidi}=await import('/fixture/wasm-web-midi.mjs');
              window.fixture=await installWasmWebMidi(new URL('/fixture/',location.href),expected);
            }""",PIN)
            proof=os.environ.get('DNBOX_BPM_PROOF')
            if proof: await page.screenshot(path=str(Path(proof)/'phone.png'))
            ctl=page.get_by_role('group',name='BPM controls')
            up=ctl.get_by_role('button',name='Increase BPM')
            down=ctl.get_by_role('button',name='Decrease BPM')
            reset=ctl.get_by_role('button',name='Reset BPM')
            tap=ctl.get_by_role('button',name='Tap tempo')
            slider=ctl.get_by_role('slider',name='BPM')
            await expect(ctl.get_by_text('Draft',exact=True)).to_be_visible()
            for b in (up,down,reset,tap):
                box=await b.bounding_box(); assert box and box['width']>=34 and box['height']>=32,box
                assert box['x']+box['width']<=390,box
            await up.tap(); await expect(slider).to_have_text('126 BPM')
            assert await page.evaluate('fixture.out.length===0&&fixture.permissions.length===0')
            await page.locator('#connect').tap()
            await expect(page.locator('#conn-state')).to_have_text('Connected')
            await expect(ctl.get_by_text('Device',exact=True)).to_be_visible()
            async def native():
                result=await page.evaluate(WIRE,[0x30,{}])
                assert result['status']==0,result
                return result['fields']['bpm_x10']
            before=await native()
            await expect(slider).to_have_text(f'{before/10:g} BPM')
            # An out-of-band write must reflect without issuing a page write.
            mark=await page.evaluate('fixture.out.length')
            outside=await page.evaluate(WIRE,[0x27,dict(epoch=None,bpm_x10=1045)])
            assert outside['status']==0,outside
            await expect(slider).to_have_text('104.5 BPM')
            assert await page.evaluate('n=>fixture.out.slice(n).every(f=>f[5]!==0x27)',mark)
            await up.tap(); await expect(slider).to_have_text('105.5 BPM')
            assert await native()==1055
            # Suppress TEMPO frames at the virtual cable, never synthesize a receipt.
            # An unreceived request cannot be painted as a confirmed device value.
            await page.evaluate('''async () => {
              const port=[...(await navigator.requestMIDIAccess({sysex:true})).outputs.values()][0];
              const send=port.send;
              port.send=bytes=>{if(bytes[5]!==0x27)send(bytes);};
              window.restoreTempoCable=()=>{port.send=send;};
            }''')
            await up.tap()
            await expect(ctl.get_by_text('Updating',exact=True)).to_be_visible()
            await expect(slider).to_have_text('105.5 BPM')
            await expect(page.locator('#tempo-state')).to_have_attribute('title','Tempo change not confirmed.')
            await expect(ctl.get_by_text('Not confirmed',exact=True)).to_be_visible()
            await expect(slider).to_have_text('105.5 BPM')
            assert await native()==1055
            await page.evaluate('restoreTempoCable()')
            await down.tap(); await expect(slider).to_have_text('104.5 BPM')
            await slider.press('ArrowUp'); await expect(slider).to_have_text('105.5 BPM')
            assert await native()==1055
            await reset.tap(); await expect(slider).to_have_text('125 BPM')
            assert await native()==1250
            await tap.tap(); await expect(tap).to_have_attribute('aria-pressed','true')
            await page.wait_for_timeout(600)
            await tap.tap(); await expect(slider).not_to_have_text('125 BPM')
            assert 700 <= await native() <= 1150
            if proof: await page.screenshot(path=str(Path(proof)/'phone-connected.png'))
            await page.locator('#connect').tap()
            await expect(ctl.get_by_text('Draft',exact=True)).to_be_visible()
            await expect(slider).to_have_text('126 BPM')
            mark=await page.evaluate('fixture.out.length')
            await down.tap(); await expect(slider).to_have_text('125 BPM')
            assert await page.evaluate('n=>fixture.out.slice(n).every(f=>f[5]!==0x27)',mark)
            assert not errors,errors
            desktop=await browser.new_page(viewport={'width':1280,'height':900})
            await desktop.route('**/*',serve)
            await desktop.goto(layout.ORIGIN+'/remote/')
            desktop_ctl=desktop.get_by_role('group',name='BPM controls')
            if proof: await desktop.screenshot(path=str(Path(proof)/'desktop.png'))
            for name in ('Increase BPM','Decrease BPM','Tap tempo','Reset BPM'):
                await expect(desktop_ctl.get_by_role('button',name=name)).to_be_visible()
            await desktop_ctl.get_by_role('slider',name='BPM').press('PageUp')
            await expect(desktop_ctl.get_by_role('slider',name='BPM')).to_have_text('135 BPM')
        finally:
            await browser.close()
    print('PASS mobile and desktop discoverability + exact DNR3 BPM read/write + offline isolation')

if __name__=='__main__':
    asyncio.run(main())
