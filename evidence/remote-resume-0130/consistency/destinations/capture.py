from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import runpy
from pathlib import Path
import sys

from playwright.async_api import async_playwright, expect

SIZES = ((1440,900), (1024,640), (844,390), (390,844))
FONTS = ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb']
HEADER_CHECK = '''() => {
 const element = selector => document.querySelector(selector);
 const box = selector => element(selector).getBoundingClientRect();
 const title = box('#part-title');
 const controls = ['#play','#stop','#rec','#undo','#redo','.overflow summary'];
 const overlaps=controls.filter(selector=>{
  const button=box(selector);
  return Math.min(title.right,button.right)-Math.max(title.left,button.left)>.2
   && Math.min(title.bottom,button.bottom)-Math.max(title.top,button.top)>.2;
 });
 const outside=controls.filter(selector=>{const r=box(selector);return r.left<-.2||r.right>innerWidth+.2;});
 return {title:element('#part-title').textContent, titleBox:title.toJSON(), overlaps, outside,
   viewport:[innerWidth,innerHeight], body:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
   scroll:[document.body.scrollLeft,document.body.scrollTop,scrollX,scrollY],
   part:element('#part').value, pattern:element('#pattern-no').textContent,
   activeEngine:element('.engine[aria-pressed="true"]')?.dataset.engine,
   activeTab:element('.tab[aria-current="page"]')?.dataset.view,
   view:element('main').dataset.layoutView, projectSummary:element('.project-summary p')?.textContent ?? null,
   songRows:document.querySelectorAll('.song-table tbody tr').length, midiCalls:window.consistencyMidiCalls};
}'''


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


async def capture(options):
    checkout, site, out = (item.resolve() for item in (options.checkout, options.site, options.out))
    out.mkdir(parents=True,exist_ok=False)
    sys.path.insert(0, str(checkout/'tests/visual'))
    visual=runpy.run_path(str(checkout/'tests/visual/visual_gate.py'))
    server=runpy.run_path(str(checkout/'tests/product-remote/envelope-browser.py'))['server']
    assets = {name:sha(site/'remote'/name) for name in ['app.mjs','style.css','index.html','firmware-link.mjs','song-view.mjs','funkybeats-view.mjs']}
    assert all(sha(checkout/'web/product-site/remote'/name)==asset for name,asset in assets.items())
    file_digests={path.relative_to(site).as_posix():sha(path) for path in sorted(site.rglob('*')) if path.is_file()}
    report={'source':options.source,'remoteAssetsSHA256':assets,'builtSiteSHA256':file_digests,'states':{},'songHeaderGuards':{},'pageErrors':[]}
    ready='main[aria-busy="false"]'
    async def record(page, key, expected, workflow, shot_args=None):
        await page.evaluate('document.fonts.ready')
        bounds=await page.evaluate(HEADER_CHECK)
        width,height=bounds['viewport']
        rect=bounds['titleBox']
        assert bounds['title']==expected and not (bounds['overlaps'] or bounds['outside']), bounds
        assert rect['left']>=0 and rect['right']<=width+.2, bounds
        assert bounds['body']==[width,height] and not any(bounds['scroll']), bounds
        assert bounds['part']==bounds['activeEngine'] and bounds['pattern']=='P01' and bounds['midiCalls']==0,bounds
        filename=key+'.png'
        await page.screenshot(path=out/filename,**(shot_args or {}))
        report['states'][key]={**bounds,'imageFilename':filename,'sha256':sha(out/filename),'workflow':workflow}
        (out/'inventory.json').write_text(json.dumps(report,indent=2)+'\n')
        print(key,bounds['title'],bounds['part'],bounds['projectSummary'],flush=True)

    async def setup(context):
        await context.add_init_script('''window.consistencyMidiCalls=0;
          navigator.requestMIDIAccess=()=>{window.consistencyMidiCalls++;throw Error('No device access');};''')
        page=await context.new_page()
        page.on('pageerror',lambda error:report['pageErrors'].append(str(error)))
        return page

    with server(site) as origin:
      async with async_playwright() as playwright:
        browser=await playwright.chromium.launch(chromium_sandbox=True,args=FONTS)
        report['browser']=browser.version
        try:
            sizes=(*SIZES,(1000,640),(1099,640),(740,390),(736,414)) if options.preflight else SIZES
            for width,height in sizes:
                context=await browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,
                     has_touch=width<900,reduced_motion='reduce',locale='en-US',timezone_id='UTC')
                try:
                    await context.add_init_script(visual['FREEZE_JS'])
                    page=await setup(context)
                    await page.goto(origin+'/remote/index.html')
                    await page.add_style_tag(content=visual['FREEZE_CSS'])
                    await page.evaluate('document.fonts.ready')
                    await page.wait_for_load_state('networkidle')
                    await page.locator(ready).wait_for()
                    await page.wait_for_timeout(250)
                    await page.locator('[data-view="files"]').click()
                    await page.wait_for_timeout(150)
                    await expect(page.locator('.project-summary p')).to_contain_text('0 song rows')
                    if not options.preflight:
                        await record(page,f'remote-files-{width}x{height}','Project files','Registered default Chicago, local Draft zero Song rows')
                    overflow=page.locator('.overflow')
                    await overflow.locator('summary').click()
                    await page.locator('[data-view="song"]').click()
                    await overflow.evaluate('e=>e.open=false')
                    await expect(page.locator('main')).to_have_attribute('data-layout-view','song')
                    guard=await page.evaluate(HEADER_CHECK)
                    report['songHeaderGuards'][f'{width}x{height}']=guard
                    (out/'inventory.json').write_text(json.dumps(report,indent=2)+'\n')
                    valid=guard['title']=='Song arrangement' and not(guard['overlaps'] or guard['outside'] or any(guard['scroll']))
                    print('Song header guard',width,height,'PASS' if valid else guard['outside'] or guard['overlaps'] or guard['scroll'],flush=True)
                    if not options.preflight:assert valid,guard
                finally:
                    await context.close()
            if options.preflight:
                assert all(not (guard['overlaps'] or guard['outside'] or any(guard['scroll'])) for guard in report['songHeaderGuards'].values()), report['songHeaderGuards']
                return
            await browser.close()
            browser = await playwright.chromium.launch(chromium_sandbox=True)
            context=await browser.new_context(viewport={'width':1440,'height':900},has_touch=True,accept_downloads=True)
            try:
                page=await setup(context)
                await page.goto(origin+'/remote/',wait_until='domcontentloaded')
                await page.locator(ready).wait_for()
                overflow=page.locator('.overflow')
                async def view(name):
                    if name=='song':await overflow.evaluate('e=>e.open=true')
                    await page.locator(f'[data-view="{name}"]').evaluate('e=>e.click()')
                    await overflow.evaluate('e=>e.open=false')
                    await expect(page.locator('main')).to_have_attribute('data-layout-view',name)
                async def engine(name):
                    await page.locator(f'.engine[data-engine="{name}"]').click()
                if options.include_overlays:
                    await engine('miami');await view('sound')
                    await page.locator('#sound-bank').select_option('MIAMI')
                    await page.locator('#sound-bank').select_option('SuperJ6')
                    await engine('chicago')
                await view('patterns')
                await page.locator('[data-pattern-scope="all"]').click()
                for part in range(5):
                    await page.locator(f'[data-launch-part="{part}"][data-pattern="0"]').click()
                await view('song')
                await page.locator('#song-add').click()
                await expect(page.locator('.song-table tbody tr')).to_have_count(1)
                await record(page,'10-song','Song arrangement','Owner p10 Chicago, all five Draft launch P01, Add once',{'animations':'disabled'})
                if options.include_overlays:
                    await engine('breaks')
                    await view('roll')
                    await page.locator('[data-break-view="generator"]').click()
                    await view('files')
                    await overflow.evaluate('e=>e.open=true')
                    await page.locator('#review').click()
                    await record(page,'13-review','Project files','Owner p13 Review over Files, BREAK selected, one Song row',{'animations':'disabled'})
                    await page.locator('#review-dialog button').first.click()
                    await overflow.evaluate('e=>e.open=false')
                    await page.locator('#connect').click()
                    await expect(page.locator('#connection-result')).to_be_visible()
                    await record(page,'13-connect','Project files','Owner p13 Connect over Files, BREAK selected, one Song row',{'animations':'disabled'})
                    await page.locator('#close-connection').click()
                await page.set_viewport_size({'width':844,'height':390})
                await engine('chicago')
                await view('patterns')
                await page.locator('[data-pattern-scope="selected"]').click()
                await view('files')
                await expect(page.locator('.project-summary p')).to_contain_text('1 song rows')
                await record(page,'20-projects','Project files','Owner p20 Chicago, same one-row Draft from p10',{'animations':'disabled'})
            finally:
                await context.close()
        finally:
            await browser.close()
    assert not report['pageErrors'],report['pageErrors']
    assert len(report['states'])==6+2*options.include_overlays,report['states'].keys()
    (out/'inventory.json').write_text(json.dumps(report,indent=2)+'\n')


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description='Capture only shared global-title changes with original state inputs.')
    for key in ['checkout','site','out']:
        parser.add_argument(key,type=Path)
    parser.add_argument('--source',required=True)
    parser.add_argument('--include-overlays',action='store_true')
    parser.add_argument('--preflight',action='store_true')
    asyncio.run(capture(parser.parse_args()))
