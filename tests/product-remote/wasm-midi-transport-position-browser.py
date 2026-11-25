#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Independent MIDI realtime to pinned firmware WASM and the actual built Remote."""
import asyncio
import importlib.util
import os
from pathlib import Path
from playwright.async_api import async_playwright, expect

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location('layout', HERE/'remote-controls-browser.py')
layout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(layout)
PIN = dict(firmware='adf3eee64fcbfd9971fd402fd67ec6809c58251b',
           kernel='b16d487dd6b6b9ffe1dddcddc99df7e45fed6f28',
           wasm='92b81be4e2b8f8c59f34cdd94b7bb5cf28f2acf5f9350babb5ac5741c3729c65')
VIEWS = (
    ('drum909', '.fw-drum-grid [data-col].ph', 'data-col', '[data-firmware-step]'),
    ('drum808', '.fw-drum-grid [data-col].ph', 'data-col', '[data-firmware-step]'),
    ('chicago', '[data-roll-step][data-firmware-playhead=true]', 'data-roll-step', '[data-roll-step]'),
    ('miami', '[data-roll-step][data-firmware-playhead=true]', 'data-roll-step', '[data-roll-step]'),
    ('breaks', '.break-on.ph', 'data-break-on', '[data-break-source=firmware]'),
)

async def main():
    runtime = Path(os.environ['DNBOX_EMULATOR_RUNTIME']).resolve()
    layout.SOURCE = Path(os.environ['DNBOX_AUDIT_SITE']).resolve()
    async def serve(route):
        path = route.request.url.removeprefix(layout.ORIGIN)
        fixtures = {
            '/fixture/wasm-web-midi.mjs': (HERE/'firmware/wasm-web-midi.mjs', 'text/javascript'),
            '/fixture/wasi.mjs': (runtime/'wasi.mjs', 'text/javascript'),
            '/fixture/runtime.json': (runtime/'runtime.json', 'application/json'),
            '/fixture/kernel.wasm': (runtime/'kernel.wasm', 'application/wasm'),
        }
        if path in fixtures:
            file, mime = fixtures[path]
            await route.fulfill(path=file, content_type=mime)
        else:
            await layout.serve(route)
    async with async_playwright() as api:
        browser = await api.chromium.launch(chromium_sandbox=True)
        try:
            page = await browser.new_page(viewport={'width':844,'height':390})
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            await page.route('**/*', serve)
            await page.add_init_script("navigator.requestMIDIAccess=()=>{throw Error('No physical MIDI')}")
            await page.goto(layout.ORIGIN+'/remote/')
            await expect(page.locator('main')).to_have_attribute('aria-busy','false')
            await page.evaluate("""async pin=>{
              const d=window.d=await import('/remote/dnr3.mjs');
              const {installWasmWebMidi}=await import('/fixture/wasm-web-midi.mjs');
              const f=window.fixture=await installWasmWebMidi(new URL('/fixture/',location.href),pin);
              window.pageWrites=mark=>f.out.slice(mark).filter(raw=>{
                if(raw[0]!==0xf0)return true;
                const q=d.decodeRequest(raw);
                return ![d.OP.STATE,d.OP.STEP_GET,d.OP.PARAM_GET,d.OP.DESCRIBE,d.OP.KEEPALIVE,d.OP.PATTERN_DUMP].includes(q.op)
                  && !(q.op===d.OP.RECORD&&q.fields.command===2);
              });
              let seq=14000;
              window.native=(op,fields={})=>{
                const id=++seq,at=f.inbound.length;
                f.deviceReceive(d.encodeRequest(op,id,fields));f.render(4);
                const frame=f.inbound.slice(at).find(raw=>{
                  const x=d.decodeFrame(raw);return x.op===(op|64)&&x.seq===id;
                });
                if(!frame)throw Error('No native response: '+op);
                const r=d.decodeReply(frame);
                if(r.status!==d.STATUS.OK)throw Error('Native response: '+JSON.stringify(r));
                return r.fields;
              };
            }""", PIN)
            await page.locator('#connect').click()
            await expect(page.locator('#conn-state')).to_have_text('Connected')
            channels = await page.evaluate("""()=>{
              const watch=fixture.out.map(d.decodeRequest).find(x=>x.op===d.OP.WATCH);
              const reply=fixture.inbound.find(raw=>{const x=d.decodeFrame(raw);return x.op===(d.OP.WATCH|64)&&x.seq===watch.seq;});
              const needed=d.WATCH.POSITION|d.WATCH.VOICE|d.WATCH.TRANSPORT;
              if(!reply||(d.decodeReply(reply).fields.mask&needed)!==needed)throw Error('Missing native WATCH grants');
              const state=native(d.OP.STATE);
              if(state.playing)throw Error('Fixture started unexpectedly');
              for(const [part,length] of [3,4,5,6].entries()){
                const r=native(d.OP.PART_SET,{epoch:watch.fields.epoch,part,pat:state.ppat[part],field:0,value:length});
                if(r.part!==part||r.pat!==state.ppat[part]||r.field!==0||r.value!==length)throw Error('Wrong length receipt');
              }
              return state.ch;
            }""")
            for part,(name,selector,attribute,ready) in enumerate(VIEWS):
                await page.locator(f'[data-engine={name}]').click()
                await expect(page.locator(ready).first).to_be_visible()
                await expect(page.locator('#play')).to_have_attribute('aria-pressed','false')
                await expect(page.locator(selector)).to_have_count(0)
                status = await page.evaluate("""({part,selector,attribute})=>{
                  const shown=()=>[...new Set([...document.querySelectorAll(selector)]
                    .filter(e=>e.getClientRects().length).map(e=>Number(e.getAttribute(attribute))))];
                  const visible=step=>[...document.querySelectorAll('['+attribute+'="'+step+'"]')]
                    .some(e=>e.getClientRects().length);
                  const log=[], mark=fixture.out.length;
                  const off=fixture.onInput(({data})=>{
                    if(d.decodeFrame(data).op!==d.OP.NOTIFY)return;
                    const r=d.decodeNotify(data);
                    if(r.kind===d.NOTIFY_KIND.POSITION)
                      log.push({rev:r.rev,steps:r.fields.step_pos,shown:shown(),visible:visible(r.fields.step_pos[part])});
                    if(r.kind===d.NOTIFY_KIND.TRANSPORT)
                      log.push({transport:r.fields.playing,pressed:document.querySelector('#play').getAttribute('aria-pressed')});
                  });
                  try{
                    fixture.deviceReceive([0xfa]);
                    fixture.render(8);
                    for(let i=0;i<108;i++){fixture.deviceReceive([0xf8]);fixture.render(2);}
                    fixture.deviceReceive([0xfc]);
                    fixture.render(35);
                    const mutations=pageWrites(mark);
                    return {log,mutations,refusals:fixture.refusals,after:shown()};
                  }finally{off();}
                }""", dict(part=part, selector=selector, attribute=attribute))
                assert not status['mutations'] and not status['refusals'], status
                positions = [v for v in status['log'] if 'steps' in v]
                active = [v for v in positions if v['steps'][part]!=127]
                assert active and any(a['rev']==b['rev'] and a['steps'][part]!=b['steps'][part]
                                      for a,b in zip(active, active[1:])), status
                assert all(any(v['steps'][part]!=v['steps'][other] for v in active)
                           for other in range(5) if other!=part), status
                assert any(v['visible'] for v in active), status
                for v in active:
                    assert v['shown']==([v['steps'][part]] if v['visible'] else []), (name,v,status)
                assert positions[-1]['steps']==[127]*5 and not positions[-1]['shown'] and not status['after'],status
                transports = [v for v in status['log'] if 'transport' in v]
                assert {'transport':1,'pressed':'true'} in transports and transports[-1]=={'transport':0,'pressed':'false'},status
                await expect(page.locator(selector)).to_have_count(0)
                print(f'PASS MIDI FA/F8/FC {name}: {len(active)} exact independent updates + stopped cursor; no browser writes',flush=True)

            # While stopped (no cursor), an 808 pad must not light a 909 row;
            # an addressed 909 velocity pulses its voice row, not any step.
            await page.locator('[data-engine=drum909]').click()
            await expect(page.locator('[data-firmware-step]').first).to_be_enabled()
            voice=await page.evaluate("""ch=>{
              const all=()=>[...document.querySelectorAll('.fw-drum-grid .seq-step')];
              const state=()=>all().map(e=>e.getAttribute('aria-pressed'));
              const marks=()=>all().filter(e=>e.matches('.ph,.fired,.held,.device-voice')||
                getComputedStyle(e,'::after').opacity!=='0').length;
              const before=state(),input=[],out=fixture.out.length;
              const off=fixture.onInput(({data})=>{if(d.decodeFrame(data).op===d.OP.NOTIFY){
                const r=d.decodeNotify(data);if(r.kind===d.NOTIFY_KIND.VOICE)input.push(r.fields);}});
              try{
                fixture.deviceReceive([0x90|ch[1],38,107]);fixture.render(5);
                const wrong=document.querySelectorAll('.fw-drum-grid .device-voice,.fw-drum-grid .seq-row.fired').length;
                const wrongMarks=marks();
                fixture.deviceReceive([0x90|ch[0],36,109]);fixture.render(5);
                const own=document.querySelector('[data-drum-row-note="36"] .device-voice')?.dataset.deviceVoiceNote;
                return {input,wrong,wrongMarks,marks:marks(),own,changed:JSON.stringify(before)!==JSON.stringify(state()),
                  mutations:pageWrites(out)};
              }finally{off();}
            }""",channels)
            assert {'part':1,'note':38,'velocity':107} in voice['input'] and {'part':0,'note':36,'velocity':109} in voice['input'],voice
            assert voice['own']=='36' and not any(voice[k] for k in ('wrong','wrongMarks','marks','changed','mutations')),voice
            print('PASS native VOICE: 909 row only; 808 event did not highlight 909; no marks or writes on steps',flush=True)
            await page.evaluate('fixture.close()')
            assert not errors,errors
        finally:
            await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
