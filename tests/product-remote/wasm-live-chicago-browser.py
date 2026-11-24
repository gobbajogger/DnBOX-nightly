# SPDX-License-Identifier: GPL-3.0-only
"""Chicago Sound against exact live WASM over Web MIDI; no physical device or authored replies."""
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
    const seq=window.chicagoSeq=(window.chicagoSeq||14000)+1;
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
            await page.locator('[data-engine=chicago]').click()
            await page.locator('[data-view=sound]').click()
            await page.evaluate("""async expected=>{
              const {installWasmWebMidi}=await import('/fixture/wasm-web-midi.mjs');
              window.fixture=await installWasmWebMidi(new URL('/fixture/',location.href),expected);
            }""",PIN)
            await page.locator('#connect').click()
            await expect(page.locator('#conn-state')).to_have_text('Connected')

            async def get(addr):
                result=await page.evaluate(WIRE,[0x11,dict(params=[addr])])
                assert result['status']==0,result
                [row]=result['fields']['params']
                assert all(row[k]==v for k,v in addr.items()),row
                return row
            async def put(addr,value,**kw):
                return await page.evaluate(WIRE,[0x12,dict(**addr,epoch=None,expect=0x3fff,value=value,**kw)])
            async def writes(mark):
                return await page.evaluate("""async n=>{
                  const d=await import('/remote/dnr3.mjs');
                  return fixture.out.slice(n).filter(f=>f[5]===0x12).map(d.decodeRequest);
                }""",mark)
            for slot,part in ((0,'chicago'),(1,'miami')):
                mark=await page.evaluate('fixture.out.length')
                await page.locator(f'[data-engine="{part}"]').click()
                bank=dict(kind=41,a=0,b=slot,c=0)
                original=(await get(bank))['value']
                if original!=0:
                    await expect(page.locator('[data-sound-source=draft]')).to_be_visible()
                    await page.locator('#sound-bank').select_option('CHICAGO')
                    assert not await writes(mark), 'Draft engine choice wrote to device'
                    reply=await put(bank,0)
                    assert reply['status'] in (0,1),reply
                await expect(page.locator('[data-sound-source=firmware]')).to_be_visible()
                await expect(page.locator('[data-live-chicago]')).to_have_count(20)
                assert (await get(bank))['value']==0
                changes=[]
                for idx in range(20):
                    control=page.locator(f'[data-live-chicago="{idx}"]')
                    addr=dict(kind=1,a=2,b=slot,c=idx)
                    row=await get(addr)
                    old=row['value']; want=old-1 if old==row['max'] else old+1
                    await expect(control).to_have_value(str(old))
                    formatting=await page.evaluate("""async ([slot,index,v])=>{
                      const f=await import('/remote/firmware-labels.mjs'), id='1:2:'+slot+':'+index;
                      return {name:f.firmwareName(id,'CHICAGO'),value:f.firmwareValue(id,v,'CHICAGO')};
                    }""",[slot,idx,old])
                    assert formatting['name'] in await control.get_attribute('aria-label'),formatting
                    await expect(control).to_have_attribute('aria-valuetext',formatting['value'])
                    assert await control.evaluate('e=>e.closest("label").querySelector("output").textContent')==formatting['value']
                    mark=await page.evaluate('fixture.out.length')
                    await control.press('ArrowLeft' if want<old else 'ArrowRight')
                    await expect(control).to_have_value(str(want))
                    assert (await get(addr))['value']==want
                    packet=await writes(mark)
                    assert len(packet)==1 and all(packet[0]['fields'][k]==v for k,v in
                        dict(**addr,expect=old,value=want,expect_bank=0).items()),packet
                    changes.append((addr,old,want))
                for addr,old,want in reversed(changes[-16:]):
                    await expect(page.locator('#undo')).to_be_enabled()
                    await page.locator('#undo').click()
                    await expect(page.locator(f'[data-live-chicago="{addr["c"]}"]')).to_have_value(str(old))
                    assert (await get(addr))['value']==old,'guarded Undo did not read back'
                await expect(page.locator('#undo')).to_be_disabled()
                for addr,old,want in changes[:4]:
                    assert (await get(addr))['value']==want,'Undo retention exceeded sixteen'

                addr=dict(kind=1,a=2,b=slot,c=0)
                latest=await get(addr)
                candidate=(latest['value']+11)%(latest['max']+1)
                mark=await page.evaluate('fixture.out.length')
                ext=await put(addr,candidate,expect_bank=0)
                assert ext['status']==0,ext
                await expect(page.locator('[data-live-chicago="0"]')).to_have_value(str(candidate))
                assert not await writes(mark), 'Device-origin change provoked page write'
                wrong=await put(addr,latest['value'],expect_bank=1)
                assert wrong['status']==5 and (await get(addr))['value']==candidate,wrong
                control=page.locator('[data-live-chicago="0"]')
                next_value=candidate-1 if candidate==latest['max'] else candidate+1
                await control.press('ArrowLeft' if next_value<candidate else 'ArrowRight')
                await expect(page.locator('#undo')).to_be_enabled()
                mark=await page.evaluate('fixture.out.length')
                other_value=(next_value+7)%(latest['max']+1)
                external=await put(addr,other_value,expect_bank=0)
                assert external['status']==0,external
                await expect(control).to_have_value(str(other_value))
                await expect(page.locator('#undo')).to_be_disabled()
                assert not await writes(mark) and (await get(addr))['value']==other_value
                assert (await put(bank,1))['status'] in (0,1)
                await expect(page.locator('[data-sound-source=draft]')).to_be_visible()
                assert not await page.locator('[data-live-chicago]').count(), 'Stale Chicago controls survived bank switch'

            await page.locator('#connect').click()
            await expect(page.locator('#conn-state')).to_have_text('Disconnected')
            await page.evaluate('fixture.close()')
            assert not errors,errors
            print('PASS native Web MIDI Chicago Sound: both slots, 40 CAS controls, bounded 16-deep guarded Undo in both slots, independent reflection, wrong-bank refusal and Draft isolation')
        finally:
            await browser.close()

if __name__=='__main__':
    asyncio.run(main())
