# SPDX-License-Identifier: GPL-3.0-only
"""Focused gate for the affected Remote controls, against one retained and one candidate build."""
import argparse
import asyncio
import hashlib
import json
import io
import math
from PIL import Image
from pathlib import Path
import runpy

from playwright.async_api import async_playwright, expect

PALETTE = ['rgb(255, 149, 41)', 'rgb(255, 72, 65)', 'rgb(130, 240, 90)',
           'rgb(70, 205, 255)', 'rgb(214, 120, 255)']
AMBER = 'rgb(255, 179, 55)'
INK = 'rgb(5, 10, 13)'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


async def ready(page, origin):
    await page.goto(origin+'/remote/', wait_until='domcontentloaded')
    await expect(page.locator('main')).to_have_attribute('aria-busy','false')
    await page.evaluate('document.fonts.ready')


async def view(page, name):
    await page.locator(f'[data-view="{name}"]').evaluate('e=>e.click()')
    await expect(page.locator('main')).to_have_attribute('data-layout-view',name)


async def paint(locator):
    return await locator.evaluate('''e => {
        const s=getComputedStyle(e), r=e.getBoundingClientRect();
        return {background:s.backgroundColor,color:s.color,border:s.borderTopColor,
                box:[r.x,r.y,r.width,r.height],label:e.textContent.trim()};
    }''')


async def viewport_clear(page):
    assert await page.evaluate('''() => !midiCalls && !scrollX && !scrollY && !document.body.scrollLeft &&
        !document.body.scrollTop && document.documentElement.scrollWidth===innerWidth &&
        document.documentElement.scrollHeight===innerHeight''')


async def draft(page):
    await page.locator('.overflow').evaluate('e=>e.open=true')
    try:
        async with page.expect_download() as pending:
            await page.locator('#draft-save').click()
        return json.loads(Path(await (await pending.value).path()).read_text())
    finally:
        await page.locator('.overflow').evaluate('e=>e.open=false')


async def song_patterns(page, origin, candidate, output):
    result = []
    for w,h in [(1440,900),(844,390),(390,844)]:
        await page.set_viewport_size({'width':w,'height':h})
        await ready(page, origin)
        await page.locator('[data-engine="chicago"]').click()
        await view(page,'patterns')
        button=page.locator('[data-pattern-action="song"]')
        review=page.locator('#pattern-review')
        actions=[await paint(e) for e in (button,review)]
        if candidate:
            assert all(r['background']==AMBER and r['color']==INK for r in actions), actions
        # Use a different pattern from the settled P01 witness to cover status padding.
        await page.locator('[data-launch-part="2"][data-pattern="6"]').press('Enter')
        status=await page.locator('#status').text_content()
        if candidate:
            assert status=='Bass A · P07 selected · Not loaded',status
        await page.locator('[data-pattern-scope="all"]').press('Enter')
        for part in range(5):
            await page.locator(f'[data-launch-part="{part}"][data-pattern="0"]').press('Enter')
        await page.locator('[data-pattern-action="song"]').press('Enter')
        await expect(page.locator('main')).to_have_attribute('data-layout-view','song')
        await page.locator('#song-add').press('Enter')
        headings=await page.locator('.song-table thead th').all()
        headers=[await paint(h) for h in headings[1:6]]
        song_review=await paint(page.locator('#song-review'))
        if candidate:
            assert [r['color'] for r in headers]==PALETTE, headers
            assert (song_review['background'],song_review['color'])==(AMBER,INK),song_review
        expected=[{'patterns':[0]*5,'repeats':1}]
        assert (await draft(page))['song']==expected
        # Exercise the available edit and Review actions on this same local row.
        await page.locator('[data-song-on="0"][data-song-part="2"]').press('Space')
        assert (await draft(page))['song']==[{**expected[0],'muteMask':4}]
        await page.locator('#song-undo').press('Enter')
        assert (await draft(page))['song']==expected
        await page.locator('#song-review').press('Enter')
        await expect(page.locator('#review-dialog')).to_be_visible()
        await page.locator('#review-dialog').get_by_role('button',name='Return').click()
        await expect(page.locator('#song-review')).to_be_focused()
        await viewport_clear(page)
        if candidate and w==1440:
            await page.screenshot(path=output/'10-song.png',animations='disabled')
        result.append({'viewport':[w,h],'actions':actions,'headers':headers,
                       'songReview':song_review,'status':status,'row':expected})
    return result


async def roll_and_drums(page, origin, candidate, output):
    results=[]
    for w,h in [(1440,900),(844,390)]:
        await page.set_viewport_size({'width':w,'height':h})
        await ready(page,origin)
        await page.locator('[data-engine="chicago"]').click()
        await view(page,'roll')
        grid=await page.evaluate('''() => {
            const grid=document.querySelector('#roll-grid'), clip=document.querySelector('#roll-scroll').getBoundingClientRect();
            const rect=grid.getBoundingClientRect();
            const row=parseFloat(getComputedStyle(grid).getPropertyValue('--row'));
            const notes=[...grid.querySelectorAll('[data-note]')].map(e=>({id:e.dataset.note,box:e.getBoundingClientRect().toJSON()}));
            const shaded=[...grid.querySelectorAll('.black-key')].map(e=>({top:parseFloat(e.style.top),height:parseFloat(e.style.height)}));
            return {grid:rect.toJSON(),clip:clip.toJSON(),row,notes,shaded};
        }''')
        assert grid['shaded'] and grid['notes']
        shot=await page.screenshot(animations='disabled')
        image=Image.open(io.BytesIO(shot)).convert('RGB')
        seams=[]
        for shade in grid['shaded']:
            offset=int(candidate)
            assert shade['top'] % grid['row']==offset and shade['height']==grid['row']-1
            y=round(grid['grid']['top']+shade['top']-offset)
            if not grid['clip']['top']+1 <= y < grid['clip']['bottom']-2:
                continue
            for delta in range(6,20):
                x=math.ceil(grid['grid']['left'])+delta
                if not grid['clip']['left'] <= x < grid['clip']['right'] or any(n['box']['left']-2 <= x <= n['box']['right']+2 and n['box']['top']-2 <= y <= n['box']['bottom']+2 for n in grid['notes']):
                    continue
                if image.getpixel((x,y+2))==(10,18,22):
                    seams.append({'xy':[x,y],'rgb':image.getpixel((x,y))})
                    break
        assert len(seams)>=3,seams
        expected=(25,38,43) if candidate else (10,18,22)
        assert all(tuple(sample['rgb'])==expected for sample in seams),seams
        if candidate and w==844:
            (output/'14-notes.png').write_bytes(shot)
        await viewport_clear(page)
        await page.locator('[data-engine="drum909"]').click()
        await view(page,'drums')
        heading=page.locator('.drum-sound-panel > h3')
        name=await paint(heading)
        if candidate:
            await expect(heading).to_contain_text('Bass drum')
        drum_shapes=await page.locator('.sequencer-grid [data-drum-note]').evaluate_all('''pads=>pads.map(p=>{
            const r=p.getBoundingClientRect(), hit=p.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
            return {width:r.width,height:r.height,hit};
        })''')
        assert len(drum_shapes)==176
        if w==844:
            assert all(p['hit'] and p['height']>=24 and p['width']>=24 for p in drum_shapes[:96])
        hit=page.locator('.sequencer-grid [data-drum-note]').nth(15)
        initial=await hit.get_attribute('aria-pressed')
        await hit.tap()
        await expect(hit).not_to_have_attribute('aria-pressed',initial)
        await page.locator('#undo').press('Enter')
        await expect(hit).to_have_attribute('aria-pressed',initial)
        await page.locator('#sound-voice').select_option('1')
        if candidate:
            await expect(heading).to_contain_text('Snare')
        await page.locator('[data-engine="drum808"]').click()
        await view(page,'drums')
        await page.locator('#sound-voice').select_option('7')
        if candidate:
            await expect(heading).to_contain_text('Cowbell')
        await viewport_clear(page)
        results.append({'viewport':[w,h],'rollSeams':seams,'noteBounds':grid['notes'],
                        'drumHeading':name,'drumShapes':drum_shapes,'808Heading':await heading.text_content()})
    return results


async def breaks(page, origin, candidate, output):
    await page.set_viewport_size({'width':1440,'height':900})
    await ready(page,origin)
    await page.locator('[data-engine="breaks"]').click()
    await view(page,'roll')
    await page.locator('#break-views [data-break-view="slices"]').click()
    component=page.locator('#break-sequence')
    boxes=component.locator('[data-asset]')
    await expect(component.locator('[data-asset]:checked')).to_have_count(5)
    all_button=component.locator('[data-action="all"]')
    none_button=component.locator('[data-action="none"]')
    baseline=await draft(page)
    states=[]
    async def state(count, all_selected, none_selected):
        await expect(component.locator('[data-asset]:checked')).to_have_count(count)
        selected=[await all_button.get_attribute('aria-pressed'),await none_button.get_attribute('aria-pressed')]
        paints=[await paint(e) for e in (all_button,none_button)]
        if candidate:
            assert selected==[str(all_selected).lower(),str(none_selected).lower()],selected
            assert [p['background']==AMBER and p['color']==INK for p in paints]==[all_selected,none_selected]
        else:
            assert selected==[None,None],selected
        states.append({'checked':count,'pressed':selected,'buttons':paints})
    await state(5,True,False)
    await none_button.press('Enter')
    await state(0,False,True)
    await boxes.first.check()
    await state(1,False,False)
    await all_button.press('Enter')
    await state(5,True,False)
    assert await draft(page)==baseline
    await viewport_clear(page)
    if candidate:
        await page.screenshot(path=output/'11-slices.png',animations='disabled')
    return states


async def verify(args):
    server=runpy.run_path(str(args.repo/'tests/product-remote/envelope-browser.py'))['server']
    results={}
    with server(args.baseline) as base, server(args.candidate) as candidate:
        async with async_playwright() as pw:
            browser=await pw.chromium.launch(chromium_sandbox=True)
            try:
                for label,origin in [('baseline',base),('candidate',candidate)]:
                    context=await browser.new_context(has_touch=True,device_scale_factor=1,accept_downloads=True)
                    try:
                        page=await context.new_page()
                        errors=[]
                        page.on('pageerror',lambda e:errors.append(str(e)))
                        await page.add_init_script('window.midiCalls=0;navigator.requestMIDIAccess=()=>{midiCalls++;throw Error("Unexpected MIDI")};')
                        cases={'songAndPatterns':await song_patterns(page,origin,label=='candidate',args.output),
                               'rollAndDrums':await roll_and_drums(page,origin,label=='candidate',args.output),
                               'breaks':await breaks(page,origin,label=='candidate',args.output)}
                        assert not errors,errors
                        results[label]=cases
                    finally:
                        await context.close()
                levels=runpy.run_path(str(Path(__file__).with_name('levels_witness.py')))['inspect']
                results['levels']={}
                for w,h in [(1440,900),(844,390),(390,844)]:
                    before=await levels(browser,base,(args.baseline/'remote/style.css').read_bytes(),w,h,False)
                    after=await levels(browser,candidate,(args.candidate/'remote/style.css').read_bytes(),w,h,True)
                    assert before['state']==after['state'] and before['touchReadback']==after['touchReadback']
                    for a,b in zip(before['controls'],after['controls']):
                        assert a['appearance']=='auto' and b['appearance']=='none'
                        assert {k:v for k,v in a.items() if k!='appearance'}=={k:v for k,v in b.items() if k!='appearance'}
                    results['levels'][f'{w}x{h}']={'before':before,'after':after}
                version=browser.version
            finally:
                await browser.close()
    for before,after in zip(results['baseline']['songAndPatterns'],results['candidate']['songAndPatterns']):
        for key in ('actions','headers'):
            assert [r['box'] for r in before[key]]==[r['box'] for r in after[key]], (key,before,after)
        assert before['songReview']['box']==after['songReview']['box']
        assert before['status']=='Bass A · P7 selected · Not loaded'
    for before,after in zip(results['baseline']['rollAndDrums'],results['candidate']['rollAndDrums']):
        assert before['noteBounds']==after['noteBounds']
        assert before['drumShapes']==after['drumShapes']
        assert before['drumHeading']['box']==after['drumHeading']['box']
    for before,after in zip(results['baseline']['breaks'],results['candidate']['breaks']):
        assert [r['box'] for r in before['buttons']]==[r['box'] for r in after['buttons']]
    results.update({'chromium':version,'normalSandbox':True,'result':'PASS',
                    'served':{label:{name:sha(site/'remote'/name) for name in ('app.mjs','style.css','song-view.mjs','funkybeats-view.mjs','break-sequence.mjs')}
                              for label,site in [('baseline',args.baseline),('candidate',args.candidate)]}})
    (args.output/'receipt.json').write_text(json.dumps(results,indent=2)+'\n')
    print('PASS Levels faders preserve input geometry, raw values, keyboard/touch and Undo at 3 sizes')
    print('PASS BREAK preview all/none/partial, unchanged Draft and action bounds')
    print('PASS Roll pitch seams and 909/808 voice titles with unchanged note bounds and pad geometry')
    print('PASS Song and Patterns hierarchy, padded local status, unchanged action boxes and Draft operations at 3 sizes')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    for key in ('repo','baseline','candidate','output'):
        parser.add_argument(key,type=lambda value:Path(value).resolve())
    arguments=parser.parse_args()
    arguments.output.mkdir(parents=True,exist_ok=True)
    asyncio.run(verify(arguments))
