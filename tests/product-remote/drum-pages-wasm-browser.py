# SPDX-License-Identifier: GPL-3.0-only
"""Exact #206 Remote Web MIDI Drum pages against real firmware WASM; no physical ports."""
import asyncio
import importlib.util
import os
from pathlib import Path
from playwright.async_api import async_playwright, expect

spec = importlib.util.spec_from_file_location('layout',Path(__file__).with_name('remote-controls-browser.py'))
layout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(layout)
FIRMWARE = '5f9799fde323b6d53f7a528445b6698e4cef4e6b'
KERNEL = 'b16d487dd6b6b9ffe1dddcddc99df7e45fed6f28'
WASM = 'ebf1a6bc448abd92906cd0b9567b641d98ce709b71d5575acb38cbb9ce40e9a5'
if os.environ.get('DNBOX_REMOTE_TEST_PIN','record') == 'motion':
    FIRMWARE = 'adf3eee64fcbfd9971fd402fd67ec6809c58251b'
    WASM = '92b81be4e2b8f8c59f34cdd94b7bb5cf28f2acf5f9350babb5ac5741c3729c65'

async def main():
    directory = Path(os.environ['DNBOX_EMULATOR_RUNTIME']).resolve()
    layout.SOURCE = layout.ROOT / 'web/product-site'

    async def serve(route):
        path = route.request.url.removeprefix(layout.ORIGIN)
        if path == '/fixture/wasm-web-midi.mjs':
            await route.fulfill(content_type='text/javascript',path=Path(__file__).parent/'firmware/wasm-web-midi.mjs')
        elif path in ('/fixture/wasi.mjs', '/fixture/runtime.json', '/fixture/kernel.wasm'):
            name = path.rsplit('/',1)[-1]
            mime = {'wasi.mjs':'text/javascript','runtime.json':'application/json','kernel.wasm':'application/wasm'}[name]
            await route.fulfill(content_type=mime,path=directory/name)
        else:
            await layout.serve(route)

    async with async_playwright() as p:
        browser = await p.chromium.launch(chromium_sandbox=True)
        try:
            context = await browser.new_context(viewport={'width':844,'height':390})
            await context.route('**/*',serve)
            page = await context.new_page()
            errors = []
            page.on('pageerror',lambda e: errors.append(str(e)))
            await page.add_init_script("navigator.requestMIDIAccess=()=>{throw Error('test fixture not installed')}")
            await page.goto(layout.ORIGIN+'/remote/')
            await page.locator('[data-engine="drum909"]').click()
            await expect(page.locator('[data-drum-source=draft]')).to_contain_text('Draft')
            await page.evaluate("""async expected=>{
              const {installWasmWebMidi}=await import('/fixture/wasm-web-midi.mjs');
              const d=await import('/remote/dnr3.mjs');
              window.fixture=await installWasmWebMidi(new URL('/fixture/',location.href),expected);
              let seq=14000;
              window.drumOracle=(name,fields={})=>{
                const op=d.OP[name],n=++seq,mark=fixture.inbound.length;
                fixture.deviceReceive(d.encodeRequest(op,n,fields));
                fixture.render(6);
                const value=fixture.inbound.slice(mark).map(d.decodeFrame).find(r=>r.op===(op|0x40)&&r.seq===n);
                if(!value||value.payload[0]!==0) throw Error('Native opcode declined: '+name+' '+JSON.stringify(value));
                return d.decodeReply(d.encodeFrame(value.op,value.seq,value.payload)).fields;
              };
            }""",dict(firmware=FIRMWARE,kernel=KERNEL,wasm=WASM))
            await page.locator('#connect').click()
            await expect(page.locator('#conn-state')).to_have_text('Connected')
            await expect(page.locator('[data-drum-source=firmware]')).to_be_visible()
            for name,part in [('drum909',0),('drum808',1)]:
                await page.locator(f'[data-engine="{name}"]').click()
                # Change the actual loaded pattern independently so a cosmetic P01 fails.
                await page.evaluate("""part=>{
                    const st=drumOracle('STATE');
                    fixture.deviceReceive([0xc0|st.ch[part],part+5]);fixture.render(10);
                }""",part)
                # The runtime's blank-pattern default is 16, not a fake hard-coded 32.
                # Change only this isolated WASM pattern and demand matching 32-step readback.
                await expect(page.locator('[data-firmware-step]:enabled')).to_have_count(192,timeout=15000)
                await expect(page.locator('.drum-len')).to_have_text('LEN 16')
                await page.locator('[data-drum-params]').click()
                await page.locator('input[data-seq-opt=R_DLEN]').fill('31')
                await expect(page.locator('.drum-len')).to_have_text('LEN 32',timeout=15000)
                await expect(page.locator('[data-seq-value-of=R_DLEN]')).to_have_text('32 steps')
                for index in range(4):
                    await page.locator(f'[data-drum-page="{index}"]').click()
                    await expect(page.locator('[data-firmware-step]:enabled')).to_have_count(192,timeout=15000)
                    read = await page.evaluate("""part=>{
                        const st=drumOracle('STATE'), pat=st.ppat[part];
                        return {pat,len:drumOracle('PARAM_GET',{params:[{kind:3,a:part,b:pat+1,c:0}]}).params[0].value+1};
                    }""",part)
                    assert read=={'pat':part+5,'len':32},read
                    await expect(page.locator('.drum-len')).to_have_text('LEN '+str(read['len']))
                    await expect(page.locator('[data-drum-source=firmware]')).to_contain_text(f"P{read['pat']+1:02d}")
                    for track in (0,1,11):
                        step = index*16 + (15 if track==11 else track)
                        cell = page.locator(f'[data-firmware-track="{track}"][data-firmware-step="{step}"]')
                        address = dict(part=part,pat=read['pat'],track=track,step=step)
                        before = await page.evaluate("""address=>{
                            const crc=drumOracle('STATE').pattern_crc[address.pat];
                            return {on:drumOracle('STEP_GET',address).record.on,crc,mark:fixture.out.length};
                        }""",address)
                        await expect(cell).to_have_attribute('aria-pressed',str(bool(before['on'])).lower())
                        await cell.click()
                        await expect(cell).to_have_attribute('aria-pressed',str(not before['on']).lower(),timeout=15000)
                        await expect(cell).to_be_enabled(timeout=15000)
                        witness = await page.evaluate("""async ({address,before})=>{
                            const d=await import('/remote/dnr3.mjs'), actual=drumOracle('STEP_GET',address);
                            const writes=fixture.out.slice(before.mark).filter(b=>b[0]===0xf0).map(d.decodeRequest).filter(r=>r.op===d.OP.STEP_SET);
                            return {actual,writes:writes.map(r=>r.fields)};
                        }""",dict(address=address,before=before))
                        assert witness['actual']['record']['on']==1-before['on'],witness
                        assert len(witness['writes'])==1,witness
                        write=witness['writes'][0]
                        assert [write[k] for k in ('part','pat','step')]==[part,read['pat'],step],witness
                        assert write['record']['track']==track and write['expect_crc']==before['crc'],witness
                    if index==0:
                        await page.locator('[data-drum-lane-voice]').select_option('0')
                        vel=page.locator('[data-drum-velocity="0"]')
                        await expect(vel).to_be_enabled(timeout=15000)
                        address=dict(part=part,pat=read['pat'],step=0,track=0)
                        before=await page.evaluate('a=>drumOracle("STEP_GET",a).record',address)
                        assert before['on']==1,before
                        await vel.fill('73')
                        await expect(vel).to_have_value('73',timeout=15000)
                        assert (await page.evaluate('a=>drumOracle("STEP_GET",a).record',address))=={'track':0,'on':1,'vel':73}
                        await page.evaluate("""async a=>{
                          const d=await import('/remote/dnr3.mjs');
                          const epoch=fixture.out.map(d.decodeRequest).find(x=>x.op===d.OP.WATCH).fields.epoch;
                          const expect_crc=drumOracle('STATE').pattern_crc[a.pat];
                          drumOracle('STEP_SET',{epoch,part:a.part,pat:a.pat,step:a.step,expect_crc,record:{track:0,on:1,vel:0}});
                        }""",address)
                        await expect(vel).to_have_attribute('aria-valuetext','Default',timeout=15000)
                        assert (await page.evaluate('a=>drumOracle("STEP_GET",a).record',address))['vel']==0
                        print(f'PASS {name} native Velocity lane SET, independent GET and external clear reflection',flush=True)
                    print(f'PASS {name} P{read["pat"]+1:02d} LEN {read["len"]} steps {index*16+1}–{index*16+16} BD/SD/accent',flush=True)
                # A direct firmware edit while the high page stays selected must reflect.
                expected = await page.evaluate("""async part=>{
                    const d=await import('/remote/dnr3.mjs'), watch=fixture.out.map(d.decodeRequest).find(r=>r.op===d.OP.WATCH);
                    const epoch=watch?.fields.epoch;
                    if(!epoch)throw Error('No leased WATCH');
                    const st=drumOracle('STATE'),pat=st.ppat[part],step=63,track=11;
                    const on=drumOracle('STEP_GET',{part,pat,track,step}).record.on;
                    drumOracle('STEP_SET',{epoch,part,pat,step,expect_crc:st.pattern_crc[pat],record:{track,on:1-on,vel:127}});
                    if (drumOracle('STEP_GET',{part,pat,track,step}).record.on!==1-on) throw Error('Independent write not reflected by firmware');
                    return String(!on);
                }""",part)
                await expect(page.locator('[data-firmware-track="11"][data-firmware-step="63"]')).to_have_attribute('aria-pressed',expected,timeout=15000)
            for width,height in [(390,844),(844,390),(1024,640),(1440,900)]:
                await page.set_viewport_size(dict(width=width,height=height))
                count=await page.locator('[data-firmware-track="0"]').evaluate_all("""cells=>{
                    const vw=document.documentElement.clientWidth;
                    return cells.filter(c=>{const r=c.getBoundingClientRect();return r.width>4&&r.left>=-.5&&r.right<=vw+.5;}).length;
                }""")
                assert count==16,(width,height,count)
            await page.locator('#connect').click()
            await expect(page.locator('[data-drum-source=draft]')).to_contain_text('Draft')
            await page.evaluate('fixture.close()')
            assert not errors,errors
            print("PASS both kits: exact firmware STEP notifications, disconnect to Draft, 16 columns at all four review sizes")
        finally:
            await browser.close()

if __name__=='__main__':
    asyncio.run(main())
