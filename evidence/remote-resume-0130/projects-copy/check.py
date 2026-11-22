from __future__ import annotations

import asyncio
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import runpy
import subprocess

import numpy as np
from PIL import Image
from playwright.async_api import async_playwright, expect

ROOT = Path.cwd()
OUT = ROOT / '.output/project-copy'
SITE = OUT / 'site'
PARENT = ROOT.parent / 'remote-resume-0130'
REF = PARENT / '.output/owner-independent/reference/owner-12.png'
CORPUS = ROOT / 'tests/product-remote/funkybeats-browser.py'
FONTS = ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb']
VIEWPORTS = ((1440, 900), (1200, 820))
SOURCE = subprocess.check_output(['git','rev-parse','HEAD'], cwd=ROOT, text=True).strip()
BASELINE = {name:subprocess.check_output(['git','show',f'HEAD:web/product-site/remote/{name}'],cwd=ROOT)
            for name in ('app.mjs','style.css')}
SPEC = importlib.util.spec_from_file_location('funkybeats', CORPUS)
core = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(core)
core.SOURCE = SITE
FIXED = runpy.run_path(str(ROOT/'tests/visual/visual_gate.py'))

NAV = '[data-view="files"]'
GEOMETRY = '''() => {
 const rect = element => element.getBoundingClientRect().toJSON();
 const area = document.querySelector('#other-view');
 const areaBox = rect(area);
 const cards = Array.from(document.querySelectorAll('.destinations>section'));
 const actions = Array.from(area.querySelectorAll('.destinations a, .destinations button, .project-tools a, .project-guide summary, .project-summary button'));
 return {
  cards:cards.map(card=>({box:rect(card),title:rect(card.querySelector('h3'))})),
  descriptions:cards.map(card=>card.querySelector('header > p')).filter(Boolean).map(text=>({
   label:text.textContent, display:getComputedStyle(text).display, font:getComputedStyle(text).fontSize, box:rect(text)
  })),
  actions:actions.map(action=>{
   const box=rect(action),hit=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);
   return {label:action.textContent.trim(),visible:action.checkVisibility(),box,disabled:action.matches(':disabled'),
    inside:box.left>=areaBox.left&&box.right<=areaBox.right&&box.top>=areaBox.top&&box.bottom<=areaBox.bottom,
    hit:action.contains(hit)};
  }),
  view:areaBox,
  document:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
  scroll:[document.body.scrollLeft,document.body.scrollTop,scrollX,scrollY],
 };
}'''


def digest(value):
    return hashlib.sha256(value).hexdigest()


def pixels(value):
    with Image.open(io.BytesIO(value)) as image:
        return np.array(image.convert('RGB'), dtype=np.int16)


def comparison(a, b):
    changed = np.abs(a - b).max(axis=2)
    return {'changedExact':int(np.count_nonzero(changed)),
            'changedTolerant':int(np.count_nonzero(changed>25.5)),
            'tolerantPercent':float(np.mean(changed>25.5)*100),
            'maxChannelDelta':int(changed.max())}


async def capture(browser, size, baseline):
    width, height = size
    context=await browser.new_context(viewport={'width':width,'height':height}, device_scale_factor=1,
          has_touch=width<900, reduced_motion='reduce', locale='en-US', timezone_id='UTC')
    errors=[]
    async def serve(route):
        name=route.request.url.rsplit('/',1)[-1]
        if baseline and route.request.url.startswith(core.ORIGIN+'/remote/') and name in BASELINE:
            await route.fulfill(body=BASELINE[name],content_type={'app.mjs':'text/javascript','style.css':'text/css'}[name]);return
        await core.serve(route)
    try:
        await context.route('**/*',serve)
        await context.add_init_script(FIXED['FREEZE_JS'])
        page=await context.new_page()
        page.on('pageerror', lambda error:errors.append(str(error)))
        await page.goto(core.ORIGIN+'/remote/index.html')
        await page.add_style_tag(content=FIXED['FREEZE_CSS'])
        await page.evaluate('document.fonts.ready')
        await page.wait_for_load_state('networkidle')
        await expect(page.locator('main')).to_have_attribute('aria-busy','false')
        await page.wait_for_timeout(250)
        await page.locator(NAV).click()
        await page.wait_for_timeout(150)
        geometry=await page.evaluate(GEOMETRY)
        assert geometry['document']==[width,height] and not any(geometry['scroll']), geometry
        assert not errors,errors
        return geometry, await page.screenshot() if size!=(1200,820) else None
    finally:
        await context.close()


async def projects_journey(browser):
    context=await browser.new_context(viewport={'width':844,'height':390},has_touch=True)
    errors=[]
    try:
        await context.route('**/*', core.serve)
        await context.add_init_script('navigator.requestMIDIAccess=()=>{throw Error("Device access forbidden in local Draft test")};')
        page=await context.new_page()
        page.on('pageerror', lambda error:errors.append(str(error)))
        await core.project_files(page)
        assert not errors, errors
    finally:
        await context.close()


async def main():
    await asyncio.to_thread(core.preload_product, SITE)
    report={'baselineCommit':SOURCE,'ownerPage':12,'ownerPngSHA256':digest(REF.read_bytes()),
       'baselineAssetsSHA256':{k:digest(v) for k,v in BASELINE.items()},
       'candidateAssetsSHA256':{k:digest((SITE/'remote'/k).read_bytes()) for k in BASELINE},
       'candidatePatchSHA256':digest((OUT/'projects-copy.patch').read_bytes()), 'sizes':{}}
    compact = json.loads((OUT/'compact-guard.json').read_text())
    for tag in ('1024x640','844x390','390x844'):
        report['sizes'][tag]=compact['sizes'][tag]
    report['compactGuardCSS']=compact['candidateAssetsSHA256']['style.css']
    report['compactReuse']='Only the >=1200px wide and >=820px tall paragraph margin changed after the compact guards.'
    async with async_playwright() as playwright:
        browser=await playwright.chromium.launch(chromium_sandbox=True,args=FONTS)
        try:
            report['browser']=browser.version
            for size in VIEWPORTS:
                tag=f'{size[0]}x{size[1]}'
                old,old_png=await capture(browser,size,True)
                new,new_png=await capture(browser,size,False)
                result={'before':old,'after':new}
                report['sizes'][tag]=result
                assert new['cards']==old['cards'], (tag,'card geometry changed')
                assert new['actions']==old['actions'], (tag,'action geometry, availability or order changed')
                assert new['view']==old['view'], (tag,'workspace bounds changed')
                if size in ((1440,900),(1200,820)):
                    assert len(new['descriptions'])==3 and all(p['display']=='block' and p['font']=='21px' for p in new['descriptions']), (tag,new['descriptions'])
                    assert len(new['actions'])==13 and all(a['inside'] and a['hit'] and a['visible'] and a['box']['width']>=44 and a['box']['height']>=44 for a in new['actions']), (tag,new['actions'])
                else:
                    assert len(new['descriptions'])==3 and all(p['display']=='none' for p in new['descriptions']), (tag,new['descriptions'])
                if new_png:
                    before,after=pixels(old_png),pixels(new_png)
                    result['beforeAfterPixels']=comparison(before,after)
                    if size==(1440,900):
                        owner=pixels(REF.read_bytes())
                        result['ownerPixels']={'before':comparison(owner,before),'after':comparison(owner,after)}
                        file=OUT/'remote-files-1440x900-actual.png'
                        file.write_bytes(new_png)
                        result['candidatePngSHA256']=digest(new_png)
                        Image.fromarray(np.concatenate((owner,after),axis=1).astype(np.uint8)).save(OUT/'owner-12-projects.png')
                    else:
                        assert result['beforeAfterPixels']['changedTolerant']==0, (tag,result['beforeAfterPixels'])
                print(tag,'card/actions unchanged',len(new['actions']),result.get('beforeAfterPixels','geometry only'),result.get('ownerPixels',''),flush=True)
            (OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n')
            await projects_journey(browser)
            report['existingProjectFilesJourney']='PASS at all four registered sizes'
            (OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n')
        finally:
            await browser.close()


asyncio.run(main())
