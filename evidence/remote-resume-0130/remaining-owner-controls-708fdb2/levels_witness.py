"""Replay the retained Levels controls with one narrowly scoped CSS overlay."""
import argparse
import asyncio
import hashlib
import io
import json
from pathlib import Path
import runpy

from PIL import Image
from playwright.async_api import async_playwright,expect

VIEWPORTS=((1440,900),(844,390),(390,844))

def sha(value):
    return hashlib.sha256(value).hexdigest()


def ink(data,color):
    im=Image.open(io.BytesIO(data)).convert("RGB")
    pts=[(x,y) for y in range(im.height) for x in range(im.width) if im.getpixel((x,y))==color]
    return {"pixels":len(pts),"bounds":[min(p[0] for p in pts),min(p[1] for p in pts),max(p[0] for p in pts),max(p[1] for p in pts)] if pts else None}


async def inspect(browser,origin,css,width,height,after):
    context=await browser.new_context(viewport={"width":width,"height":height},has_touch=True,device_scale_factor=1)
    try:
        page=await context.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        await page.add_init_script("window.unexpectedMidi=0;navigator.requestMIDIAccess=()=>{unexpectedMidi++;throw Error('Unexpected MIDI')}")
        await page.route(origin+'/remote/style.css*',lambda route:route.fulfill(body=css,content_type='text/css'))
        await page.goto(origin+'/remote/',wait_until='domcontentloaded')
        await expect(page.locator('main')).to_have_attribute('aria-busy','false')
        await page.locator('[data-engine="chicago"]').click()
        await page.locator('[data-view="mix"]').evaluate('e=>e.click()')
        await expect(page.locator('[data-mix-mode="levels"]')).to_have_attribute('aria-pressed','true')
        await expect(page.locator('[data-mix-source="draft"]')).to_have_attribute('aria-pressed','true')
        await page.evaluate('document.fonts.ready')
        faders=page.locator('[data-mix-view="levels"] .mixer-fader')
        await expect(faders).to_have_count(5)
        state=await page.evaluate("""()=>({part:document.querySelector('#part').value,pattern:document.querySelector('#pattern-no').textContent,
           tempo:document.querySelector('#tempo').textContent,status:document.querySelector('#conn-state').textContent,
           viewport:[innerWidth,innerHeight],document:[document.documentElement.scrollWidth,document.documentElement.scrollHeight]})""")
        assert state=={"part":"chicago","pattern":"P01","tempo":"120 BPM","status":"Not connected","viewport":[width,height],"document":[width,height]},state
        controls=await faders.evaluate_all("""els=>els.map(e=>{
            const r=e.getBoundingClientRect(),s=getComputedStyle(e),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
            return {id:e.dataset.nativeParam,raw:Number(e.value),min:Number(e.min),max:Number(e.max),step:Number(e.step),
                    label:e.getAttribute('aria-label'),valueText:e.getAttribute('aria-valuetext'),
                    box:[r.x,r.y,r.width,r.height],hit:e===hit,writingMode:s.writingMode,
                    direction:s.direction,appearance:s.appearance};
        })""")
        assert [c['id'].split('|')[-1] for c in controls]==[f'1:5:{i}:0' for i in range(5)]
        assert [c['raw'] for c in controls]==[75,112,100,100,120]
        assert [c['valueText'] for c in controls]==['-5dB','+2dB','0dB','0dB','+3.2dB']
        assert all((c['min'],c['max'],c['step'],c['writingMode'],c['direction'])==(0,127,1,'vertical-lr','rtl') for c in controls)
        assert all(c['hit'] for c in controls),controls
        first=faders.first
        # Inspect only the first actual slider's pixels. No page or capture sweep.
        data=await first.screenshot(animations='disabled')
        pixels={name:ink(data,color) for name,color in {
            'muted':(153,170,169),'line':(41,61,67),'accent':(255,179,55)
        }.items()}
        if after:
            assert pixels['muted']['pixels']>=160 and pixels['line']['pixels']>=180,pixels
            assert pixels['accent']['pixels']==0,pixels
            cap,rail=(pixels[key]['bounds'] for key in ('muted','line'))
            assert abs((cap[0]+cap[2])-(rail[0]+rail[2]))<=2,pixels
        else:
            assert pixels['accent']['pixels']>=100,pixels

        await first.press('ArrowRight')
        await expect(first).to_have_value('76')
        await expect(first).to_have_attribute('aria-valuetext','-4.8dB')
        await page.locator('#undo').evaluate('e=>e.click()')
        await expect(first).to_have_value('75')
        await expect(first).to_have_attribute('aria-valuetext','-5dB')
        box=await first.bounding_box()
        await page.touchscreen.tap(box['x']+box['width']/2,box['y']+box['height']*.25)
        hit_readback=int(await first.input_value())
        assert hit_readback>75,hit_readback
        await page.locator('#undo').evaluate('e=>e.click()')
        await expect(first).to_have_value('75')
        assert not errors and await page.evaluate('unexpectedMidi')==0
        return {'state':state,'controls':controls,'pixels':pixels,'keyboardUndo':'PASS','touchReadback':hit_readback,
                'touchUndo':'PASS','cssSHA256':sha(css)}
    finally:
        await context.close()


async def main(args):
    server=runpy.run_path(str(args.repo/'tests/product-remote/envelope-browser.py'))['server']
    base=(args.site/'remote/style.css').read_bytes()
    candidate=(args.repo/'web/product-site/remote/style.css').read_bytes()
    report={}
    with server(args.site) as origin:
        async with async_playwright() as p:
            browser=await p.chromium.launch(chromium_sandbox=True)
            try:
                for w,h in VIEWPORTS:
                    before=await inspect(browser,origin,base,w,h,False)
                    after=await inspect(browser,origin,candidate,w,h,True)
                    assert before['state']==after['state']
                    for a,b in zip(before['controls'],after['controls']):
                        assert a.pop('appearance')=='auto'
                        assert b.pop('appearance')=='none'
                        assert a==b,(a,b)
                    assert before['touchReadback']==after['touchReadback'],(before['touchReadback'],after['touchReadback'])
                    report[f'{w}x{h}']={'before':before,'after':after}
                output={'result':'PASS','chromium':browser.version,'sandbox':True,
                        'sizes':report,'scope':'Retained local Draft Levels first-slider paint with all five geometry and readout checks.'}
                args.output.write_text(json.dumps(output,indent=2)+'\n')
                print('PASS',browser.version,list(report))
            finally:
                await browser.close()

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--repo',type=Path,required=True)
    p.add_argument('--site',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    asyncio.run(main(p.parse_args()))
