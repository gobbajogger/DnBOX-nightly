# SPDX-License-Identifier: GPL-3.0-only
"""Verify the live BREAK editor on the exact firmware through real SysEx."""
import asyncio
import importlib.util
import os
import subprocess
import tempfile
from pathlib import Path
from playwright.async_api import async_playwright, expect

spec = importlib.util.spec_from_file_location('layout', Path(__file__).with_name('remote-controls-browser.py'))
layout=importlib.util.module_from_spec(spec)
spec.loader.exec_module(layout)
FIRMWARE='adf3eee64fcbfd9971fd402fd67ec6809c58251b'
KERNEL='b16d487dd6b6b9ffe1dddcddc99df7e45fed6f28'
WASM='92b81be4e2b8f8c59f34cdd94b7bb5cf28f2acf5f9350babb5ac5741c3729c65'

async def main():
    runtime=Path(os.environ['DNBOX_EMULATOR_RUNTIME']).resolve()
    out=layout.ROOT/'.output'
    out.mkdir(exist_ok=True)
    staging=tempfile.TemporaryDirectory(prefix='break-firmware-',dir=out)
    layout.SOURCE=Path(staging.name)
    env={**os.environ}
    env.pop('DNBOX_EMULATOR_RUNTIME',None) # fixture is private; do not embed it in the product build
    subprocess.run(['node','scripts/build-product-site.mjs','--output',staging.name],cwd=layout.ROOT,check=True,
                   stdout=subprocess.DEVNULL,env=env)
    async def serve(route):
        path=route.request.url.removeprefix(layout.ORIGIN)
        if path=='/fixture/wasm-web-midi.mjs':
            await route.fulfill(content_type='text/javascript',path=Path(__file__).parent/'firmware/wasm-web-midi.mjs')
        elif path in ('/fixture/wasi.mjs','/fixture/runtime.json','/fixture/kernel.wasm'):
            name=path.rsplit('/',1)[-1]
            await route.fulfill(path=runtime/name,content_type={'wasi.mjs':'text/javascript','runtime.json':'application/json','kernel.wasm':'application/wasm'}[name])
        else:
            await layout.serve(route)
    async with async_playwright() as app:
        browser=await app.chromium.launch(chromium_sandbox=True)
        context=await browser.new_context(viewport={'width':844,'height':390})
        await context.route('**/*',serve)
        page=await context.new_page()
        await page.goto(layout.ORIGIN+'/remote/')
        await page.locator('[data-engine="breaks"]').click()
        label=page.locator('[data-break-source]')
        button=page.locator('[data-break-on="0"]')
        cell=page.locator('[data-break-step="0"]')
        await expect(label).to_have_attribute('data-break-source','draft')
        await page.locator('[data-break-slice="23"]').click()
        await expect(cell).to_have_attribute('data-value','23')
        await page.evaluate("""async expect=>{
          window.fixture=await (await import('/fixture/wasm-web-midi.mjs')).installWasmWebMidi(new URL('/fixture/',location.href),expect);
          const d=await import('/remote/dnr3.mjs');let seq=14000;
          window.dec=d;
          window.req=(op,fields)=>{
            const mark=fixture.inbound.length,n=++seq;
            fixture.deviceReceive(d.encodeRequest(op,n,fields));fixture.render(10);
            const reply=fixture.inbound.slice(mark).filter(frame=>d.decodeFrame(frame).op===(op|0x40)).map(d.decodeReply).find(r=>r.seq===n);
            if(!reply||reply.status!==0)throw Error(JSON.stringify(reply));
            return reply.fields;
          };
        }""",dict(firmware=FIRMWARE,kernel=KERNEL,wasm=WASM))
        await page.locator('#connect').click()
        await expect(label).to_have_attribute('data-break-source','firmware')
        await expect(button).to_be_enabled()
        await expect(cell).not_to_have_attribute('data-value','23')
        await expect(page.locator('[data-break-rate]').first).to_be_disabled()
        await expect(page.locator('[data-break-loop]').first).to_be_disabled()
        proof=await page.evaluate("""()=>{
          const d=dec,s=req(d.OP.STATE,{});
          const {epoch}=fixture.out.map(d.decodeRequest).find(q=>q.op===d.OP.WATCH).fields;
          const pat=s.ppat[4],crc=s.pattern_crc[pat],mark=fixture.out.length;
          req(d.OP.STEP_SET,{epoch,part:4,pat,step:0,record:{on:1,slice:7},expect_crc:crc});
          return {mark,pat,assertion:req(d.OP.STEP_GET,{part:4,pat,step:0}).record};
        }""")
        assert proof['assertion']=={'on':1,'slice':7}
        await expect(cell).to_have_attribute('data-value','7')
        await expect(button).to_have_attribute('aria-pressed','true')
        assert await page.evaluate('n=>fixture.out.slice(n).map(dec.decodeRequest).every(x=>x.op!==dec.OP.STEP_SET)',proof['mark'])
        await page.locator('[data-break-slice="12"]').click()
        await expect(cell).to_have_attribute('data-value','12')
        exact=await page.evaluate("""async pat=>{
          const d=dec,writes=fixture.out.map(d.decodeRequest).filter(q=>q.op===d.OP.STEP_SET);
          return {writes:writes.map(x=>x.fields),record:req(d.OP.STEP_GET,{part:4,pat,step:0}).record};
        }""",proof['pat'])
        assert exact['record']=={'on':1,'slice':12}
        assert len(exact['writes'])==1 and exact['writes'][0]['expect_crc']!=16383 and exact['writes'][0]['pat']==proof['pat']
        await button.click()
        await expect(button).to_have_attribute('aria-pressed','false')
        await expect(button).to_be_enabled()
        assert await page.evaluate('pat=>req(dec.OP.STEP_GET,{part:4,pat,step:0}).record',proof['pat'])=={'on':0,'slice':12}
        await page.locator('#play').click()
        await expect(button).to_be_disabled()
        await page.locator('#stop').click()
        await expect(button).to_be_enabled()
        await page.locator('#connect').click()
        await expect(label).to_have_attribute('data-break-source','draft')
        await expect(cell).to_have_attribute('data-value','23')
        await browser.close()
        print('PASS BREAK native active-pattern STEP_GET/SET CAS, independent exact firmware mutation, and isolated Draft')

if __name__=='__main__': asyncio.run(main())
