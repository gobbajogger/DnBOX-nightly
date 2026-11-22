"""Measure the actual owner drum screens and guarded edits in one Chromium instance."""
import argparse
import asyncio
import hashlib
import json
import runpy
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
CORE = runpy.run_path(str(ROOT / 'tests/product-remote/page15-density-browser.py'))
SERVER = runpy.run_path(str(ROOT / 'tests/product-remote/envelope-browser.py'))['server']
GEOMETRY = '''() => {
 const one = selector => document.querySelector(selector);
 const rect = e => e.getBoundingClientRect();
 const pads = [...document.querySelectorAll('.sequencer-grid [data-drum-note]')];
 const accents = [...document.querySelectorAll('.sequencer-grid [data-drum-accent-step]')];
 const nav = [...document.querySelectorAll('.drum-grid-navigation button')];
 const lane = one('#drum-lane');
 const laneSlots = [...lane.querySelectorAll('[data-lane-step]')];
 const dims = items => items.map(e => [rect(e).width, rect(e).height]);
 const css = (e, pseudo=null) => getComputedStyle(e, pseudo).backgroundColor;
 const view = e => rect(e).toJSON();
 const selected = pads.find(e => e.classList.contains('hit'));
 const paint = e => getComputedStyle(e,'::before').content==='none' ? css(e) : css(e,'::before');
 const geometry = {first: view(pads[0]), fifth: view(pads[4]), lastFirstRow: view(pads[15]),
    lastFirstBank: view(pads[95]), panel: view(one('.funkybeats-sequencer')), sound: view(one('.drum-sound-panel'))};
 return { geometry, padDimensions:dims(pads), accentDimensions:dims(accents), navigation:dims(nav),
  stepFills:[paint(pads[3]),paint(pads[7]),paint(pads[11]),paint(pads[15])],
  selectedFill:selected?paint(selected):null, selectedInk:selected?getComputedStyle(selected).color:null,
  lane: view(one('.drum-step-lane')), laneOffsets: laneSlots.map((e,i)=>rect(e).x+rect(e).width/2-rect(pads[i]).x-rect(pads[i]).width/2),
  laneReadouts:[...lane.querySelectorAll('output')].map(e=>{const r=rect(e), l=rect(lane);return r.top>=l.top-.1&&r.bottom<=l.bottom+.1;}),
  names:[...document.querySelectorAll('.seq-channel-full-name')].map(e=>[e.textContent,e.checkVisibility()]),
  midiCalls:window.drumMIDIRequests,
 };
}'''


def pixels(path):
    return np.asarray(Image.open(path).convert('RGB'), dtype=np.int16)


def difference(left, right):
    delta = np.max(abs(left - right), axis=2)
    return {'exact': int((delta > 0).sum()), 'tolerant': int((delta > 25.5).sum()),
            'tolerantPercent': round(float((delta > 25.5).mean()) * 100, 4)}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


async def verify_edits(page, kit, width, height):
    pads = page.locator('.sequencer-grid [data-drum-note]')
    for index in (15,95) if height<500 else (15,175):
        pad = pads.nth(index)
        value = await pad.get_attribute('aria-pressed')
        await pad.tap()
        await expect(pad).not_to_have_attribute('aria-pressed', value)
        await page.locator('#undo').click()
        await expect(pad).to_have_attribute('aria-pressed', value)
        await page.locator('#redo').click()
        await expect(pad).not_to_have_attribute('aria-pressed', value)
        await page.locator('#undo').click()
        await expect(pad).to_have_attribute('aria-pressed', value)
    if height>=500:
        return
    navigation = page.get_by_role('navigation',name=f'{kit} step navigation')
    for label, focus in [('Voices 7–11', pads.nth(96)), ('Accent lane', page.locator('[data-drum-accent-step]').first),
                         ('Voices 1–6', pads.first)]:
        await navigation.get_by_role('button',name=label,exact=True).tap()
        await expect(focus).to_be_focused()
    footer = navigation.get_by_role('button',name='Review draft',exact=True)
    await footer.press('Enter')
    await page.get_by_role('button',name='Return',exact=True).click()
    await expect(footer).to_be_focused()
    v = await page.evaluate(CORE['MEASURE'])
    assert {(row,step) for row in range(6) for step in range(16)} <= {tuple(pair) for pair in v['visible']}, v
    if width == 844:
        sys.path.insert(0,str(ROOT/'tests/product-remote'))
        comp = runpy.run_path(str(ROOT/'tests/product-remote/composition-browser.py'))
        result = await comp['check_landscape_drum_banks'](page,pads)
        assert result['wheelReachablePads']==176
        return result


async def capture(browser, origin, kind, width, height, out, sizes, phase, errors):
    context = await browser.new_context(viewport={'width': width, 'height': height},has_touch=True,reduced_motion='reduce')
    await context.add_init_script("window.drumMIDIRequests=0;navigator.requestMIDIAccess=()=>{drumMIDIRequests++;throw Error('no MIDI device access');};")
    page = await context.new_page()
    page.on('pageerror',lambda err:errors.append(str(err)))
    try:
        await page.goto(origin+'/remote/',wait_until='domcontentloaded')
        await expect(page.locator('main')).to_have_attribute('aria-busy','false')
        await page.locator(f'[data-engine="drum{kind}"]').click()
        await page.locator('.overflow summary').click()
        await page.locator('[data-view="drums"]').click()
        if await page.locator('.overflow').get_attribute('open') is not None:
            await page.locator('.overflow summary').click()
        await expect(page.locator('main')).to_have_attribute('data-layout-view','drums')
        await page.evaluate('document.fonts.ready')
        v = await page.evaluate(CORE['MEASURE'])
        data = await page.evaluate(GEOMETRY)
        assert v['body']==[width,height] and not any(v['hiddenScroll']) and data['midiCalls']==0, v
        assert v['mounted']==176 and len(data['accentDimensions'])==16, v
        initially = {tuple(pair) for pair in v['visible']}
        if width>=1340:
            assert len(initially)==176 and all(w>=44 and h>=44 for w,h in data['accentDimensions']), (v,data['accentDimensions'])
            assert all(h>=40 for _,h in data['padDimensions'])
            assert all(is_visible for _,is_visible in data['names'])
        else:
            assert {(row,step) for row in range(6) for step in range(16)} <= initially, v
            assert max(abs(offset) for offset in data['laneOffsets'])<(.25 if width>=820 else 1), data['laneOffsets']
            assert all(data['laneReadouts']), data['laneReadouts']
            assert abs(data['lane']['height']-32)<.1 and all(h>=23.99 and (w>=23.99 if width>=820 else w>18) for w,h in data['padDimensions']), (data['lane'],sorted(set(map(tuple,data['padDimensions']))))
            assert all(x['whole'] for x in v['navigation']) and all(w>=44 and h>=44 for w,h in data['navigation']),v
        if kind=='909' and [width,height] in [[1440,900],[844,390]]:
            png_file = out / f'{phase}-{width}x{height}.png'
            await page.screenshot(path=png_file,animations='disabled')
            data['sha256'] = digest(png_file)
        if phase=='candidate':
            if width>=1340:
                assert data['stepFills']==['rgb(41, 61, 67)','rgb(5, 10, 13)']*2, data['stepFills']
            if data['selectedFill'] is not None:
                assert data['selectedInk']=='rgb(5, 10, 13)'
                assert data['selectedFill']=={'909':'rgb(255, 149, 41)','808':'rgb(255, 72, 65)'}[kind],data['selectedFill']
            data['wheel'] = await verify_edits(page, kind, width, height)
        data['initiallyWhole'] = len(initially)
        data['tapUndoRedo'] = phase=='candidate'
        sizes[f'{kind}-{width}x{height}'] = data
        print(phase,kind,width,height,'whole',len(initially),'sound X',data['geometry']['sound']['x'],
              'first pad',tuple(round(data['geometry']['first'][key],2) for key in ('x','y','width','height')),flush=True)
    finally:
        await context.close()


async def main(args):
    args.out.mkdir(parents=True,exist_ok=args.resume)
    report = {'browser':'','sourceBase':args.source,'states':{},'errors':[], 'pixels':{}}
    if args.resume:
        report = json.loads((args.out/'report.json').read_text())
        assert report['sourceBase']==args.source and not report['errors']
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(chromium_sandbox=True)
        assert not report['browser'] or report['browser']==browser.version
        report['browser'] = browser.version
        try:
            for phase, site in [('base',args.base),('candidate',args.candidate)]:
                sizes = [(1440,900),(844,390)] if phase=='base' or args.quick else [(1440,900),(1340,900),(844,390),(820,390),(740,390)]
                style_digest = digest(site/'remote/style.css')
                block = report['states'].setdefault(phase, {'stylesheetSHA256':style_digest,'sizes':{}})
                assert block['stylesheetSHA256']==style_digest
                with SERVER(site) as origin:
                    for w,h in sizes:
                        for kit in ('909','808'):
                            if f'{kit}-{w}x{h}' in block['sizes']:
                                continue
                            await capture(browser,origin,kit,w,h,args.out,report['states'][phase]['sizes'],phase,report['errors'])
                            (args.out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
        finally:
            await browser.close()
    assert not report['errors'],report['errors']
    for page,size,body in [(2,'1440x900',(230,793,46,1010)),(15,'844x390',(125,347,12,569))]:
        owner = pixels(args.reference/f'owner-{page:02d}.png')
        y0,y1,x0,x1 = body
        report['pixels'][str(page)] = {}
        for phase in ('base','candidate'):
            actual = pixels(args.out/f'{phase}-{size}.png')
            report['pixels'][str(page)][phase] = {'wholePage':difference(owner,actual),
                'drumMatrix':difference(owner[y0:y1,x0:x1],actual[y0:y1,x0:x1])}
            if phase=='candidate':
                Image.fromarray(np.concatenate((owner,actual),axis=1).astype(np.uint8)).save(args.out/f'owner-{page:02d}-candidate.png')
    (args.out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report['pixels'],indent=2),flush=True)
    if not args.quick:
        assert all(p['candidate']['wholePage']['tolerant'] < p['base']['wholePage']['tolerant'] for p in report['pixels'].values()),report['pixels']


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ('base','candidate','reference','out'):
        parser.add_argument(name,type=lambda path: Path(path).resolve())
    parser.add_argument('--quick',action='store_true')
    parser.add_argument('--resume',action='store_true')
    parser.add_argument('--source',required=True)
    asyncio.run(main(parser.parse_args()))
