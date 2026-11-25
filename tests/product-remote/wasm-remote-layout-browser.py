# SPDX-License-Identifier: GPL-3.0-only
"""Responsive layout receipts against the built site and exact live WASM Web MIDI."""
import asyncio
import importlib.util
import os
import json
from pathlib import Path
from playwright.async_api import async_playwright, expect

HERE=Path(__file__).parent
HEADER_CONTRACT=(HERE.parent/'visual'/'remote_header_contract.js').read_text()
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
                page=await browser.new_page(viewport={'width':w,'height':h},has_touch=True,is_mobile=w<1000)
                await page.route('**/*',serve)
                errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                await page.add_init_script("navigator.requestMIDIAccess=undefined")
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
                await expect(page.locator('#edit-scope')).to_have_text('Draft · Connect via USB MIDI to edit your DnBOX')
                await expect(page.locator('.project-name')).to_have_text('Example project')
                await cap('roll-draft')
                assert await page.locator('.roll-panel').evaluate('e=>e.offsetWidth >= innerWidth - 48')
                await page.locator('#connect').tap()
                await expect(page.locator('#connection-result')).to_be_visible()
                await expect(page.locator('#connection-message')).to_contain_text('Keep editing the Draft here')
                await expect(page.locator('#close-connection')).to_be_focused()
                await expect(page.locator('#conn-state')).to_have_text('Disconnected')
                await page.locator('#close-connection').tap()
                await expect(page.locator('#connection-result')).to_be_hidden()
                await expect(page.locator('#connect')).to_be_focused()
                # Give the offline history an actual command before connecting.
                await page.locator('[data-engine=drum909]').tap()
                kick=page.locator('[data-drum-note="36"]').first
                await expect(page.locator('#roll-view')).to_be_hidden()
                await expect(page.locator('#break-views')).to_be_hidden()
                await expect(page.locator('[data-voice-glyph=KICK]').first).to_be_visible()
                await expect(page.locator('[data-voice-glyph=SNARE]').first).to_be_visible()
                before=await kick.get_attribute('aria-pressed')
                await kick.tap()
                draft='true' if before=='false' else 'false'
                await expect(kick).to_have_attribute('aria-pressed',draft)
                await expect(page.locator('#undo')).to_be_enabled()
                await page.locator('[data-engine=drum808]').tap()
                await expect(page.locator('#roll-view')).to_be_hidden()
                await expect(page.locator('#break-views')).to_be_hidden()
                await expect(page.locator('[data-drum-note="56"]').first).to_be_attached()
                await page.locator('[data-view=sound]').tap()
                await page.locator('[data-view=roll]').tap()
                await expect(page.locator('#roll-view')).to_be_hidden()
                await expect(page.locator('[data-drum-note="56"]').first).to_be_attached()
                await page.locator('[data-engine=chicago]').tap()
                await page.evaluate("""async expected=>{
                  const {installWasmWebMidi}=await import('/fixture/wasm-web-midi.mjs');
                  window.fixture=await installWasmWebMidi(new URL('/fixture/',location.href),expected);
                }""",PIN)
                await page.locator('#connect').click()
                await expect(page.locator('#conn-state')).to_have_text('Connected')
                await expect(page.locator('#tempo-state')).to_have_text('Device')
                issues=await page.evaluate(HEADER_CONTRACT,'device')
                assert not issues,issues
                await expect(page.locator('.project-name')).to_be_hidden()
                await expect(page.locator('[data-roll-step]')).to_have_count(16)
                await expect(page.locator('#edit-scope')).to_have_text('DnBOX · Undo unavailable in this editor')
                await page.locator('[data-roll-source=draft]').tap()
                await expect(page.locator('#edit-scope')).to_have_text('Draft · Changes stay in this project')
                await page.locator('[data-roll-source=firmware]').tap()
                await expect(page.locator('#edit-scope')).to_have_text('DnBOX · Undo unavailable in this editor')
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
                await expect(page.locator('#edit-scope')).to_have_text('DnBOX · Undo unavailable in this editor')
                await expect(page.locator('#undo')).to_be_disabled()
                await expect(page.locator('[data-engine=drum909]')).to_have_attribute('aria-pressed','true')
                # Native PC goes straight to the device, bypassing the browser.
                await page.evaluate("""async()=>{
                    const d=await import('/remote/dnr3.mjs');
                    let seq=14000;
                    window.readNative=(op,fields={})=>{
                        const k=++seq,mark=fixture.inbound.length;
                        fixture.deviceReceive(d.encodeRequest(op,k,fields));fixture.render(6);
                        const frame=fixture.inbound.slice(mark).find(b=>b[5]===(op|64)&&d.decodeFrame(b).seq===k);
                        if(!frame)throw Error('No firmware reply '+op);
                        const r=d.decodeReply(frame);if(r.status!==0)throw Error('Firmware declined '+op);
                        return r.fields;
                    };
                    const st=readNative(d.OP.STATE);
                    fixture.deviceReceive([0xc0|st.ch[0],5]);fixture.render(10);
                }""")
                await expect(page.locator('#pattern-no')).to_have_text('P06')
                await expect(page.locator('[data-drum-source=firmware]')).to_contain_text('P06')
                # A new beat must be possible with the first two voices without scrolling.
                for track in (0,1):
                    assert await page.locator(f'[data-firmware-track="{track}"]').evaluate_all('''es=>{
                        const clip=es[0].closest('.sequencer-grid').getBoundingClientRect();
                        return es.length===16&&es.every(e=>{const r=e.getBoundingClientRect();
                          return r.left>=0&&r.right<=innerWidth&&r.top>=clip.top&&r.bottom<=clip.bottom;});
                    }'''),f'Drum voice {track} is clipped at {w}×{h}'
                # Compose a beat with two direct taps; confirm the actual device before navigation.
                for track,step in [(0,0),(1,4)]:
                    native_cell=page.locator(f'[data-firmware-track="{track}"][data-firmware-step="{step}"]')
                    await expect(native_cell).to_be_enabled()
                    pressed=await native_cell.get_attribute('aria-pressed')
                    await native_cell.tap()
                    expected='true' if pressed=='false' else 'false'
                    await expect(native_cell).to_have_attribute('aria-pressed',expected)
                    assert (await page.evaluate('a=>Boolean(readNative(0x20,a).record.on)',
                        dict(part=0,pat=5,track=track,step=step)))==(expected=='true')
                await cap('drums-live')
                await page.keyboard.press('Control+z')
                await expect(page.locator('#undo')).to_be_disabled()
                await page.locator('[data-engine=drum808]').tap()
                await expect(page.locator('[data-engine=drum808]')).to_have_attribute('aria-pressed','true')
                await expect(page.locator('[data-firmware-step]').first).to_be_enabled()
                await expect(page.locator('#roll-view')).to_be_hidden()
                await expect(page.locator('#break-views')).to_be_hidden()
                await expect(page.locator('[data-voice-glyph=COWBELL]')).to_be_attached()
                assert await page.locator('[data-firmware-track="0"]').evaluate_all('''es=>es.length===16&&es.every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.width>0;})''')
                await page.locator('[data-engine=drum909]').tap()
                await expect(page.locator('[data-firmware-step]').first).to_be_enabled()
                await expect(page.locator('[data-engine=drum909]')).to_have_attribute('aria-pressed','true')
                await page.locator('[data-drum-params]').tap()
                await page.locator('input[data-seq-opt=R_DLEN]').fill('31')
                await expect(page.locator('.drum-len')).to_have_text('LEN 32')
                await page.locator('[data-drum-params]').tap()
                await page.locator('[data-drum-page="1"]').tap()
                await expect(page.locator('[data-firmware-step="16"]').first).to_be_enabled()
                # Browser touch cancel and vertical scroll must never fire a step or parameter write.
                scroll_grid=page.locator('.sequencer-grid')
                box=await scroll_grid.bounding_box()
                if w<1000:
                    cdp=await page.context.new_cdp_session(page)
                    x,y=round(box['x']+100),round(min(box['y']+box['height']-12,h-40))
                    mark=await page.evaluate('fixture.out.length')
                    async def touch(type_, points):
                        await cdp.send('Input.dispatchTouchEvent',{'type':type_,'touchPoints':points})
                    await touch('touchStart',[dict(x=x,y=y)])
                    await touch('touchCancel',[])
                    await touch('touchStart',[dict(x=x,y=y)])
                    for k in range(1,5):
                        await touch('touchMove',[dict(x=x,y=y-13*k)])
                        await page.wait_for_timeout(20)
                    # Pause at the end of the swipe so the next tap isn't a fling stop.
                    await page.wait_for_timeout(220)
                    await touch('touchEnd',[])
                    assert not await page.evaluate('n=>fixture.out.slice(n).some(f=>f[0]===240&&[0x12,0x21,0x22].includes(f[5]))',mark)
                    assert await scroll_grid.evaluate('e=>e.scrollTop>0'),'touch motion must actually scroll'
                    await cdp.detach()
                await page.locator('[data-engine=breaks]').tap()
                await expect(page.locator('#edit-scope')).to_have_text('DnBOX · Undo unavailable in this editor')
                await expect(page.locator('[data-break-source=firmware]')).to_be_visible()
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
                live_range=page.locator('[data-live-chicago="0"]')
                addr=dict(kind=1,a=2,b=1,c=0)
                get_sound='addr=>readNative(0x11,{params:[addr]}).params[0]'
                row=await page.evaluate(get_sound,addr)
                bounds=await live_range.bounding_box()
                original=row['value']
                x=bounds['width']*(0.25 if original>=(int(await live_range.get_attribute('min'))+int(await live_range.get_attribute('max')))/2 else 0.75)
                mark=await page.evaluate('fixture.out.length')
                await live_range.tap(position=dict(x=x,y=bounds['height']/2))
                await expect(live_range).not_to_have_value(str(original))
                changed=int(await live_range.input_value())
                assert (await page.evaluate(get_sound,addr))['value']==changed
                assert await page.evaluate('n=>fixture.out.slice(n).filter(f=>f[0]===240&&f[5]===0x12).length',mark)==1
                await expect(page.locator('#undo')).to_be_enabled()
                await page.locator('#undo').tap()
                await expect(live_range).to_have_value(str(original))
                assert (await page.evaluate(get_sound,addr))['value']==original
                await page.locator('[data-view=roll]').tap()
                await page.locator('[data-engine=drum909]').tap()
                await expect(page.locator('#roll-view')).to_be_hidden()
                await expect(page.locator('[data-drum-page="1"]')).to_have_attribute('aria-pressed','true')
                await expect(page.locator('[data-firmware-step="16"]').first).to_be_enabled()
                await expect(page.locator('#pattern-no')).to_have_text('P06')
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
                await page.locator('#connect').click()
                await expect(page.locator('#conn-state')).to_have_text('Disconnected')
                await expect(page.locator('.project-name')).to_be_visible()
                await page.locator('[data-view=roll]').tap()
                await page.locator('[data-engine=drum909]').tap()
                await page.locator('[data-drum-page="0"]').tap()
                await expect(kick).to_have_attribute('aria-pressed',draft)
                await expect(page.locator('#undo')).to_be_enabled()
                await page.locator('#undo').tap()
                await expect(kick).to_have_attribute('aria-pressed',before)
                await page.evaluate('fixture.close()')
                assert not errors,errors
                await page.close()
            (out/'geometry.json').write_text(json.dumps(results,indent=2)+'\n')
            print(f'PASS {len(results)} exact rendered layout captures and targeted interaction assertions')
        finally:
            await browser.close()

if __name__=='__main__':
    asyncio.run(main())
