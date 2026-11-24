# SPDX-License-Identifier: GPL-3.0-only
"""Real browser Web MIDI⇄pinned firmware diagnostic; never uses physical devices."""
import asyncio
import importlib.util
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright, expect

spec = importlib.util.spec_from_file_location('layout',Path(__file__).with_name('remote-controls-browser.py'))
layout=importlib.util.module_from_spec(spec)
spec.loader.exec_module(layout)
REVIEWED={
    '5f9799fde323b6d53f7a528445b6698e4cef4e6b': 'ebf1a6bc448abd92906cd0b9567b641d98ce709b71d5575acb38cbb9ce40e9a5',
    'adf3eee64fcbfd9971fd402fd67ec6809c58251b': '92b81be4e2b8f8c59f34cdd94b7bb5cf28f2acf5f9350babb5ac5741c3729c65',
}
KERNEL='b16d487dd6b6b9ffe1dddcddc99df7e45fed6f28'

async def main():
    directory=Path(os.environ['DNBOX_EMULATOR_RUNTIME']).resolve()
    firmware=json.loads((directory/'runtime.json').read_text())['firmware_source']
    wasm=REVIEWED[firmware]
    layout.SOURCE=layout.ROOT / 'web/product-site'

    async def serve(route):
        path=route.request.url.removeprefix(layout.ORIGIN)
        if path=='/fixture/wasm-web-midi.mjs':
            await route.fulfill(content_type='text/javascript',path=Path(__file__).parent/'firmware/wasm-web-midi.mjs')
        elif path in ('/fixture/wasi.mjs','/fixture/runtime.json','/fixture/kernel.wasm'):
            name=path.rsplit('/',1)[-1]
            mime={'wasi.mjs':'text/javascript','runtime.json':'application/json','kernel.wasm':'application/wasm'}[name]
            await route.fulfill(content_type=mime,path=directory/name)
        else:
            await layout.serve(route)

    async with async_playwright() as p:
        browser=await p.chromium.launch(chromium_sandbox=True)
        try:
            context=await browser.new_context(viewport={'width':844,'height':390})
            await context.route('**/*',serve)
            page=await context.new_page()
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            await page.add_init_script("navigator.requestMIDIAccess=()=>{throw Error('fixture not installed')}")
            await page.goto(layout.ORIGIN+'/remote/')
            await expect(page.locator('#conn-state')).to_have_text('Disconnected')
            await page.evaluate("""async expected=>{
              const {installWasmWebMidi}=await import('/fixture/wasm-web-midi.mjs');
              window.fixture=await installWasmWebMidi(new URL('/fixture/',location.href),expected);
            }""",dict(firmware=firmware,kernel=KERNEL,wasm=wasm))
            await page.locator('#connect').click()
            await expect(page.locator('#conn-state')).to_have_text('Connected')
            await expect(page.locator('[data-roll-source="firmware"]')).to_have_attribute('aria-pressed','true')
            await page.evaluate("""async () => {
              const d=await import('/remote/dnr3.mjs');
              const opened=fixture.inbound.map(d.decodeFrame).find(x=>x.op===(d.OP.OPEN|0x40));
              const epoch=d.decodeReply(d.encodeFrame(opened.op,opened.seq,opened.payload)).fields.epoch;
              let seq=13000;
              window.rpc=(name,fields={})=>{
                const op=d.OP[name], tag=++seq, at=fixture.inbound.length;
                fixture.deviceReceive(d.encodeRequest(op,tag,{epoch,...fields}));
                fixture.render(6);
                const r=fixture.inbound.slice(at).map(d.decodeFrame).find(x=>x.seq===tag && x.op===(op|0x40));
                if(!r)throw Error('Native reply missing '+name);
                const decoded=d.decodeReply(d.encodeFrame(r.op,r.seq,r.payload));
                if(decoded.status!==0)throw Error('Firmware declined '+name+' '+JSON.stringify(decoded));
                return decoded.fields;
              };
            }""")
            for engine,part,pat,note in [('chicago',2,10,57),('miami',3,13,62)]:
                await page.locator(f'[data-engine="{engine}"]').click()
                seeded=await page.evaluate("""([part,pat,note])=>{
                  rpc('CUE',{part,pat});
                  rpc('TRANSPORT',{action:1});
                  fixture.render(120);
                  rpc('TRANSPORT',{action:0});
                  const state=rpc('STATE');
                  if(state.ppat[part]!==pat)throw Error('Not active: '+JSON.stringify(state.ppat));
                  const length=rpc('PARAM_GET',{params:[{kind:5,a:part-2,b:pat+1,c:0}]}).params[0].value+1;
                  if(length<4)throw Error('Fixture pattern too short');
                  const step=2;
                  const record={note,gate:1,accent:0,slide:0,velocity:81,end:6};
                  rpc('STEP_SET',{part,pat,step,record,expect_crc:state.pattern_crc[pat]});
                  return {length,defaultStep:rpc('STEP_GET',{part,pat:0,step}).record};
                }""",[part,pat,note])
                await expect(page.locator('.bass-live-roll [role="status"]')).to_contain_text(f'Active P{pat+1:02d}',timeout=10000)
                step=page.locator('[data-roll-step="2"]')
                await expect(step).to_have_attribute('aria-label','Step 3: '+('A3' if note==57 else 'D4'))
                await step.click()
                await expect(page.locator('[data-roll-field="velocity"]')).to_have_value('81')
                for selector,value in [('velocity','92'),('end','8')]:
                    field=page.locator(f'[data-roll-field="{selector}"]')
                    await field.fill(value)
                    await field.press('Tab')
                    await expect(field).to_be_enabled()
                    await expect(field).to_have_value(value)
                for selector in ['accent','slide']:
                    field=page.locator(f'[data-roll-field="{selector}"]')
                    await field.click()
                    await expect(field).to_have_attribute('aria-pressed','true')
                readback=await page.evaluate("""([part,pat])=>({
                  live:rpc('STEP_GET',{part,pat,step:2}).record,
                  fallback:rpc('STEP_GET',{part,pat:0,step:2}).record
                })""",[part,pat])
                assert readback['live']==dict(note=note,gate=1,accent=1,slide=1,velocity=92,end=8)
                assert readback['fallback']==seeded['defaultStep']
                length=page.locator('[data-roll-length]')
                nextlen=seeded['length']+1 if seeded['length']<64 else 63
                await length.fill(str(nextlen))
                await length.press('Tab')
                await expect(length).to_be_enabled()
                await expect(length).to_have_value(str(nextlen))
                exact=await page.evaluate("([part,pat])=>rpc('PARAM_GET',{params:[{kind:5,a:part-2,b:pat+1,c:0}]}).params[0].value+1",[part,pat])
                assert exact==nextlen
            # Draft is deliberately separate from device edits.
            await page.locator('#play').click()
            await expect(page.locator('[data-roll-step][data-firmware-playhead=true]')).to_have_count(1)
            await page.locator('#stop').click()
            await expect(page.locator('[data-roll-step][data-firmware-playhead=true]')).to_have_count(0)
            await page.locator('[data-roll-source="draft"]').click()
            await expect(page.locator('[data-roll-source="draft"]')).to_have_attribute('aria-pressed','true')
            await expect(page.locator('.roll-panel')).to_be_visible()
            await page.locator('#connect').click()
            await expect(page.locator('#conn-state')).to_have_text('Disconnected')
            await expect(page.locator('[data-roll-source="firmware"]')).to_be_disabled()
            assert not errors, errors
        finally:
            await browser.close()
    print('PASS #206 real DNR3 Chicago and Miami active pattern readback + guarded edits; Draft remains separate')

if __name__=='__main__':
    asyncio.run(main())
