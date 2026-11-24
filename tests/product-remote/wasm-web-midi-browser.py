# SPDX-License-Identifier: GPL-3.0-only
"""Real browser Web MIDI⇄pinned firmware diagnostic; never uses physical devices."""
import asyncio
import importlib.util
import os
from pathlib import Path
from playwright.async_api import async_playwright, expect

spec = importlib.util.spec_from_file_location('layout',Path(__file__).with_name('remote-controls-browser.py'))
layout=importlib.util.module_from_spec(spec)
spec.loader.exec_module(layout)
PINS={
    'record': ('5f9799fde323b6d53f7a528445b6698e4cef4e6b',
               'ebf1a6bc448abd92906cd0b9567b641d98ce709b71d5575acb38cbb9ce40e9a5'),
    'motion': ('adf3eee64fcbfd9971fd402fd67ec6809c58251b',
               '92b81be4e2b8f8c59f34cdd94b7bb5cf28f2acf5f9350babb5ac5741c3729c65'),
}
KERNEL='b16d487dd6b6b9ffe1dddcddc99df7e45fed6f28'

async def main():
    firmware,wasm=PINS[os.environ.get('DNBOX_REMOTE_TEST_PIN','record')]
    directory=Path(os.environ['DNBOX_EMULATOR_RUNTIME']).resolve()
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
            await expect(page.locator('#rec')).to_be_enabled()
            await expect(page.locator('#rec')).to_have_attribute('aria-pressed','false')
            await page.locator('#rec').click()
            await expect(page.locator('#rec')).to_have_attribute('aria-pressed','true')
            await expect(page.locator('#play')).to_have_attribute('aria-pressed','false')
            await page.locator('#play').click()
            await expect(page.locator('#play')).to_have_attribute('aria-pressed','true')
            await expect(page.locator('#rec')).to_have_attribute('aria-pressed','true')
            await page.locator('#stop').click()
            await expect(page.locator('#play')).to_have_attribute('aria-pressed','false')
            await expect(page.locator('#rec')).to_have_attribute('aria-pressed','true')
            await page.evaluate('fixture.panel(1<<11); fixture.panel(0)')
            await expect(page.locator('#rec')).to_have_attribute('aria-pressed','false')
            await page.locator('[data-engine="drum909"]').click()
            result=await page.evaluate("""async ()=>{
              const d=await import('/remote/dnr3.mjs');
              const sent=fixture.out.map(d.decodeRequest);
              const request=(op,seq,fields)=>d.encodeRequest(op,seq,fields);
              const reply=q=>fixture.inbound.map(d.decodeFrame).findLast(r=>r.seq===q.seq&&r.op===(q.op|0x40));
              const [hello,open,watch]=sent;
              if(hello?.op!==d.OP.HELLO||open?.op!==d.OP.OPEN||watch?.op!==d.OP.WATCH)
                throw Error('Remote did not complete the real three-stage handshake');
              const h=d.decodeReply(d.encodeFrame(reply(hello).op,hello.seq,reply(hello).payload)).fields;
              const epoch=d.decodeReply(d.encodeFrame(reply(open).op,open.seq,reply(open).payload)).fields.epoch;
              if((h.caps&0x500)!==0x500||epoch!==watch.fields.epoch||!(watch.fields.mask&32))
                throw Error('Native firmware did not negotiate Record and VOICE');
              if(fixture.permissions.length!==1||!fixture.permissions[0].sysex)
                throw Error('Remote did not use the Web MIDI SysEx boundary');
              let seq=14000;
              function independent(frame,op) {
                const mark=fixture.inbound.length;
                fixture.deviceReceive(frame);
                fixture.render(6);
                const value=fixture.inbound.slice(mark).map(d.decodeFrame).find(r=>r.op===(op|0x40)&&r.seq===seq);
                if(!value||value.payload[0]!==0) throw Error('Native opcode declined: '+op+' '+JSON.stringify(value));
                return value;
              }
              function readRecord() {
                ++seq;
                const data=[0,7,14,21].map(s=>epoch>>s&127).concat(2);
                const result=independent(d.encodeFrame(0x29,seq,data),0x29);
                if(result.payload.length!==6||result.payload[5]>1) throw Error('Invalid native Record state');
                return result.payload[5];
              }
              const outside=fixture.out.length;
              const before=readRecord();
              fixture.panel(1<<11); fixture.panel(0); // B_REC
              const after=readRecord();
              fixture.panel(1<<11); fixture.panel(0);
              const restored=readRecord();
              if(before===after||restored!==before) throw Error('Native panel change not reflected on the wire');
              const state=independent(request(d.OP.STATE,++seq,{}),d.OP.STATE);
              const channels=d.decodeReply(d.encodeFrame(state.op,state.seq,state.payload)).fields.ch;
              const inputEvents=[], note=36;
              const unsubscribe=fixture.onInput(event=>inputEvents.push(event.data));
              fixture.deviceReceive([0x90|channels[0],note,107]);
              fixture.render(8);
              const glow=document.querySelector('[data-drum-row-note="36"] .device-voice');
              if(glow?.dataset.deviceVoiceNote!=='36') throw Error('The 909 voice row did not display the native event');
              fixture.deviceReceive([0x80|channels[0],note,0]);
              unsubscribe();
              const voice=inputEvents.filter(f=>d.decodeFrame(f).op===d.OP.NOTIFY)
                .map(d.decodeNotify).find(n=>n.kind===d.NOTIFY_KIND.VOICE&&n.fields.part===0&&
                     n.fields.note===note&&n.fields.velocity===107);
              if(!voice) throw Error('Missing independent native VOICE on virtual MIDI input');
              const own=fixture.out.slice(outside).map(d.decodeRequest).filter(q=>q.op!==d.OP.KEEPALIVE&&!(q.op===d.OP.RECORD&&q.fields.command===2));
              if(own.length||fixture.refusals.length) throw Error('Unexpected page edits or adapter refusals');
              return {caps:h.caps,epoch,record:[before,after,restored],voice:voice.fields,channels};
            }""")
            for name,part,note,selector in (
                ('drum808',1,38,'[data-drum-row-note="38"] .device-voice'),
                ('chicago',2,57,'#pitch-rail [data-key-note="57"].device-voice'),
                ('miami',3,60,'#pitch-rail [data-key-note="60"].device-voice'),
                ('breaks',4,12,'[data-break-slice="1"].device-voice'),
            ):
                await page.locator('[data-engine="'+name+'"]').click()
                if name=='breaks':
                    await expect(page.locator('[data-break-slice="1"]')).to_be_visible()
                await page.evaluate("""([ch,n])=>{fixture.deviceReceive([0x90|ch,n,107]);fixture.render(8);}""", [result['channels'][part],note])
                await expect(page.locator(selector)).to_have_attribute('data-device-voice-note',str(note))
                await page.evaluate("""([ch,n])=>{fixture.deviceReceive([0x80|ch,n,0]);fixture.render(8);}""",[result['channels'][part],note])
                if name in ('chicago','miami'):
                    await expect(page.locator(selector)).to_have_count(0,timeout=1000)
                print('PASS independent firmware note displayed as '+name+' '+str(note))
            await page.locator('#connect').click()
            await expect(page.locator('#conn-state')).to_have_text('Disconnected')
            await expect(page.locator('#rec')).to_be_disabled()
            assert await page.evaluate("""async ()=>{
                const d=await import('/remote/dnr3.mjs');
                const close=fixture.out.map(d.decodeRequest).find(q=>q.op===d.OP.CLOSE);
                return close&&fixture.inbound.map(d.decodeFrame).some(r=>r.op===(close.op|0x40)&&
                      r.seq===close.seq&&r.payload[0]===d.STATUS.OK);
            }"""), 'Remote did not release the native lease'
            await page.evaluate('fixture.close()')
            assert not errors, errors
            print(f'PASS real WASM Web MIDI on {firmware}: {result}')
        finally:
            await browser.close()

if __name__=='__main__':
    asyncio.run(main())
