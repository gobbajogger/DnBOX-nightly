# SPDX-License-Identifier: GPL-3.0-only
"""Firmware glyph feedback against exact live WASM over Web MIDI; no physical device or authored replies."""
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
    const seq=window.glyphSeq=(window.glyphSeq||14000)+1;
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
            await page.evaluate("""async expected=>{
              const {installWasmWebMidi}=await import('/fixture/wasm-web-midi.mjs');
              window.fixture=await installWasmWebMidi(new URL('/fixture/',location.href),expected);
            }""",PIN)
            await page.locator('[data-engine=drum909]').click()
            await page.locator('#connect').click()
            await expect(page.locator('#conn-state')).to_have_text('Connected')
            await expect(page.locator('.fw-drum-grid')).to_be_visible()
            await expect(page.locator('#play .fw-transport')).to_have_count(1)
            state=(await page.evaluate(WIRE,[0x30,{}]))['fields']
            target=dict(part=0,pat=state['ppat'][0],step=0,track=0)
            raw=await page.evaluate(WIRE,[0x20,target])
            assert raw['status']==0,raw
            if not raw['fields']['record']['on']:
                change=await page.evaluate(WIRE,[0x21,dict(part=0,pat=target['pat'],step=0,epoch=None,
                    expect_crc=state['pattern_crc'][target['pat']],record=dict(track=0,on=1,vel=127))])
                assert change['status']==0,change
            cell=page.locator('[data-firmware-step="0"][data-firmware-track="0"]')
            await expect(cell).to_have_attribute('aria-pressed','true')
            await page.evaluate("""()=>{
              const feedback=window.feedback={rows:0,cells:0,pos:0};
              new MutationObserver(records=>{
                for(const r of records){
                  const e=r.target;
                  if(e.matches?.('.fw-drum-grid [data-drum-row-note="36"].fired')) feedback.rows++;
                  if(e.matches?.('.fw-drum-grid .seq-step.fired')) feedback.cells++;
                  if(e.matches?.('.fw-drum-grid [data-col="0"].ph')) feedback.pos++;
                }
              }).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
            }""")
            async def transport(action):
                result=await page.evaluate(WIRE,[0x26,dict(epoch=None,action=action)])
                assert result['status']==0,result
            async def mute(on):
                result=await page.evaluate(WIRE,[0x28,dict(epoch=None,bit=0,on=on,queued=0)])
                assert result['status']==0,result

            async def phase(on):
                await mute(on)
                await page.wait_for_timeout(300)
                start=await page.evaluate('''()=>{feedback.rows=feedback.cells=feedback.pos=0;return fixture.inbound.length;}''')
                await transport(1)
                await page.wait_for_function('feedback.pos>0')
                await page.wait_for_timeout(650)
                await transport(0)
                hits=await page.evaluate("""async mark=>{
                  const d=await import('/remote/dnr3.mjs');
                  return fixture.inbound.slice(mark).filter(f=>f[5]===d.OP.NOTIFY).map(d.decodeNotify)
                    .filter(n=>n.kind===d.NOTIFY_KIND.VOICE&&n.fields.part===0&&n.fields.note===36&&n.fields.velocity>0).length;
                }""",start)
                effects=await page.evaluate('({...feedback})')
                assert effects['cells']==0, effects
                return hits,effects
            hits,visual=await phase(0)
            assert hits>0 and visual['rows']>0,(hits,visual)
            hits,visual=await phase(1)
            assert hits==0 and visual['rows']==0,(hits,visual)
            await expect(cell).to_have_attribute('aria-pressed','true') # programmed even though muted
            await mute(0)
            await page.evaluate('fixture.close()')
            assert not errors,errors
            print('PASS native Web MIDI glyphs: real positive VOICE row flash, POSITION advances on muted programmed hit with no VOICE/flash')
        finally:
            await browser.close()

if __name__=='__main__':
    asyncio.run(main())
