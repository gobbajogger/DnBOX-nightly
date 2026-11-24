# SPDX-License-Identifier: GPL-3.0-only
"""Mix against exact live WASM over Web MIDI; no physical device or authored replies."""
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
    const seq=window.mixSeq=(window.mixSeq||14000)+1;
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
            await page.locator('[data-view=mix]').click()
            await expect(page.locator('#other-view')).to_have_attribute('data-confirmed-mix-source','draft')
            await page.evaluate("""async expected=>{
              const {installWasmWebMidi}=await import('/fixture/wasm-web-midi.mjs');
              window.fixture=await installWasmWebMidi(new URL('/fixture/',location.href),expected);
            }""",PIN)
            await page.locator('#connect').click()
            await expect(page.locator('#conn-state')).to_have_text('Connected')
            await expect(page.locator('#other-view')).to_have_attribute('data-confirmed-mix-source','firmware')

            async def read(addr):
                result=await page.evaluate(WIRE,[0x11,dict(params=[addr])])
                assert result['status']==0,result
                [value]=result['fields']['params']
                assert all(value[k]==v for k,v in addr.items()),value
                return value

            async def edits(keys):
                for key in keys:
                    target,voice,p=map(int,key.split(':'))
                    control=page.locator(f'[data-runtime-key="{key}"]')
                    await expect(control).to_be_enabled()
                    addr=dict(kind=1,a=target,b=voice,c=p)
                    old=await read(addr); prior=old['value']; maximum=old['max']
                    assert maximum>0,old
                    observed=(prior+max(1,maximum//3))%(maximum+1)
                    tag=await control.evaluate('e=>e.tagName')
                    async def displayed(value):
                        if tag=='INPUT':
                            await expect(control).to_have_value(str(value))
                            visual=await control.evaluate("e=>({aria:e.getAttribute('aria-valuetext'),text:e.closest('.funkybeats-typed-unit')?.querySelector('[data-param-value]')?.textContent})")
                            assert visual['aria']==visual['text'],(key,visual)
                        else:
                            rendered=await control.locator('output').text_content()
                            assert rendered and rendered in (await control.get_attribute('aria-label') or ''),(key,rendered)
                    mark=await page.evaluate('fixture.out.length')
                    test=await page.evaluate(WIRE,[0x12,dict(**addr,epoch=None,expect=prior,value=observed)])
                    assert test['status']==0 and (await read(addr))['value']==observed,test
                    if tag=='BUTTON':
                        expected=await page.evaluate("""async ([key,v])=>{
                          if(key==='4:0:14')return Math.round(v*100/127)+'%';
                          return (await import('/remote/firmware-labels.mjs')).firmwareValue('1:'+key,v);
                        }""",[key,observed])
                        await expect(control.locator('output')).to_have_text(expected)
                    await displayed(observed)
                    assert not await page.evaluate('n=>fixture.out.slice(n).some(f=>f[5]===0x12)',mark)
                    mark=await page.evaluate('fixture.out.length')
                    want=observed-1 if observed==maximum else observed+1
                    await control.press('ArrowLeft' if want<observed else 'ArrowRight')
                    if tag=='INPUT':
                        await expect(control).to_have_value(str(want))
                    await expect(page.locator('#undo')).to_be_enabled()
                    await displayed(want)
                    assert (await read(addr))['value']==want,addr
                    writes=await page.evaluate("""async n=>{
                      const d=await import('/remote/dnr3.mjs');
                      return fixture.out.slice(n).filter(f=>f[5]===0x12).map(f=>d.decodeRequest(f).fields);
                    }""",mark)
                    assert len(writes)==1 and all(writes[0][k]==v for k,v in
                        dict(**addr,expect=observed,value=want).items()),writes
                    await page.locator('#undo').click()
                    await expect(page.locator('#undo')).to_be_disabled()
                    assert (await read(addr))['value']==observed,(key,'Undo did not restore device')
                    await displayed(observed)

            await edits([f'5:{voice}:0' for voice in range(5)])
            await edits(['4:0:2','6:0:12','6:0:6','6:0:13'])
            await page.locator('[data-mix-mode=pan]').click()
            await edits([f'5:{voice}:3' for voice in range(5)])
            await page.locator('[data-mix-mode=sends]').click()
            await edits([f'5:{voice}:{p}' for voice in range(5) for p in (1,2)])
            await page.locator('[data-mix-mode=fx]').click()
            await edits([f'4:0:{p}' for p in (4,5,6,7,8,9,10,11,14)])
            await page.locator('[data-mix-mode=sends]').click()

            for part in ('drum909','drum808','chicago','miami','breaks'):
                mark=await page.evaluate('fixture.out.length')
                await page.locator(f'[data-mix-part="{part}"]').click()
                await expect(page.locator('#part')).to_have_value(part)
                await expect(page.locator('[data-view=sound]')).to_have_attribute('aria-current','page')
                await page.wait_for_timeout(180)
                writes=await page.evaluate("""async n=>{
                    const d=await import('/remote/dnr3.mjs');
                    return fixture.out.slice(n).filter(f=>f[0]!==240||
                      [0x12,0x21,0x22,0x24,0x26,0x27,0x28,0x2b].includes(f[5])||
                      (f[5]===0x29&&d.decodeRequest(f).fields.command!==2));
                }""",mark)
                assert not writes,f'Mix navigation to {part} wrote to device: {writes}'
                await page.locator('[data-view=mix]').click()
                await expect(page.locator('[data-mix-part=drum909]')).to_be_enabled()

            await page.locator('#connect').click()
            await expect(page.locator('#other-view')).to_have_attribute('data-confirmed-mix-source','draft')
            assert not await page.locator('[data-runtime-key]').count()
            await page.evaluate('fixture.close()')
            assert not errors,errors
            print('PASS native Web MIDI Mix: all 33 Mix controls read/write/Undo; 5 zero-write Sound links and Draft isolation')
        finally:
            await browser.close()

if __name__=='__main__':
    asyncio.run(main())
