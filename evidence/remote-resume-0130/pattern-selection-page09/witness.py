"""Exercise only the desktop Patterns P01 selection, using the retained 133fe8 build."""
import argparse
import asyncio
import hashlib
import io
import json
import math
from pathlib import Path
import runpy
import subprocess

import numpy as np
from PIL import Image
from playwright.async_api import async_playwright, expect


def sha(data):
    return hashlib.sha256(data).hexdigest()


async def capture(args, origin, browser, name, css):
    context = await browser.new_context(viewport={'width':1440,'height':900}, has_touch=True,
                                        device_scale_factor=1, accept_downloads=True)
    errors = []
    served = []
    try:
        page = await context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        await page.add_init_script('window.midiCalls=0; navigator.requestMIDIAccess=()=>{midiCalls++;throw Error("Unexpected MIDI")};')

        async def style(route):
            served.append(sha(css))
            await route.fulfill(body=css, content_type='text/css')

        await page.route(origin+'/remote/style.css*', style)
        await page.goto(origin+'/remote/', wait_until='domcontentloaded')
        await expect(page.locator('main')).to_have_attribute('aria-busy','false')
        await page.locator('[data-engine="chicago"]').click()
        await page.locator('[data-view="patterns"]').evaluate('e=>e.click()')
        await expect(page.locator('main')).to_have_attribute('data-layout-view','patterns')
        await expect(page.locator('[data-pattern-scope="selected"]')).to_have_attribute('aria-pressed','true')
        pads = page.locator('.patterns-grid-panel[data-scope="selected"] .perform-cell')
        await expect(pads).to_have_count(32)
        p01 = pads.nth(0)
        p02 = pads.nth(1)
        await expect(p01).to_have_attribute('aria-pressed','false')
        await p01.tap()
        await expect(p01).to_have_attribute('aria-pressed','true')
        await expect(p01).to_have_attribute('aria-label','Bass A P01, not loaded')
        await page.evaluate('document.fonts.ready')
        image = await page.screenshot(path=args.output/f'{name}.png', animations='disabled')
        layout = await pads.evaluate_all('''pads=>pads.map(p=>{
            const r=p.getBoundingClientRect(), s=getComputedStyle(p);
            return {box:[r.x,r.y,r.width,r.height], hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===p,
                pressed:p.getAttribute('aria-pressed'), background:s.backgroundColor, color:s.color, label:p.getAttribute('aria-label')};
        })''')
        assert all(pad['hit'] and min(pad['box'][2:]) >= 44 for pad in layout)
        assert [pad['pressed'] for pad in layout] == ['true'] + ['false'] * 31
        state = await page.evaluate('''()=>({part:document.querySelector('#part').value,
            pattern:document.querySelector('#pattern-no').textContent, tempo:document.querySelector('#tempo').textContent,
            connection:document.querySelector('#conn-state').textContent,
            viewport:[innerWidth,innerHeight],body:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
            scroll:[scrollX,scrollY,document.body.scrollLeft,document.body.scrollTop],midiCalls})''')
        assert state == {'part':'chicago','pattern':'P01','tempo':'120 BPM','connection':'Not connected',
                         'viewport':[1440,900],'body':[1440,900],'scroll':[0,0,0,0],'midiCalls':0}, state
        await p02.press('Enter')
        await expect(p02).to_have_attribute('aria-pressed','true')
        await expect(p01).to_have_attribute('aria-pressed','false')
        await p01.tap()
        await expect(p01).to_have_attribute('aria-pressed','true')
        await expect(p02).to_have_attribute('aria-pressed','false')
        await page.locator('.overflow').evaluate('e=>e.open=true')
        async with page.expect_download() as download:
            await page.locator('#draft-save').click()
        draft = json.loads(Path(await (await download.value).path()).read_text())
        assert draft['launch']==[None,None,0,None,None] and draft['song']==[] and draft['parameters']==[]
        assert not errors and served==[sha(css)] and await page.evaluate('midiCalls')==0, (errors,served)
        return image, {'state':state,'pads':layout,'cssSHA256':served[0],'draftLaunch':draft['launch'],
                       'pngSHA256':sha(image),'keyboardAndTouch':'PASS'}
    finally:
        await context.close()


async def run(args):
    def rgb(data):
        return np.asarray(Image.open(io.BytesIO(data)).convert('RGB')).astype(np.int16)

    server = runpy.run_path(str(args.repo/'tests/product-remote/envelope-browser.py'))['server']
    reference_pdf = args.repo/'docs/design/OWNER-BASELINE-1836.pdf'
    reference = subprocess.check_output(['pdftoppm','-f','9','-l','9','-r','72','-singlefile','-png',str(reference_pdf)])
    assert Image.open(io.BytesIO(reference)).size == (1440,900)
    manifest = json.loads((args.repo/'evidence/remote-resume-0130/final-browser-133fe8f0/initial-artifact-manifest.json').read_text())
    remote_files = manifest['builtRemoteSHA256']
    for name, digest in remote_files.items():
        assert sha((args.site/'remote'/name).read_bytes()) == digest, name
    donor_receipt = json.loads((args.repo/'evidence/remote-resume-0130/final-browser-133fe8f0/owner-corrections.json').read_text())
    assert sha(args.retained.read_bytes()) == donor_receipt['states']['09-patterns']['screenshotSHA256']
    baseline_css = (args.site/'remote/style.css').read_bytes()
    old_css = subprocess.check_output(['git','-C',str(args.repo),'show','ca5e7eebb7a258379c00fb5abcce2404c33334ec:web/product-site/remote/style.css'])
    assert baseline_css == old_css
    candidate_css = (args.repo/'web/product-site/remote/style.css').read_bytes()
    assert baseline_css != candidate_css
    with server(args.site) as origin:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(chromium_sandbox=True)
            try:
                before, baseline = await capture(args,origin,browser,'before',baseline_css)
                after, candidate = await capture(args,origin,browser,'after',candidate_css)
                version=browser.version
            finally:
                await browser.close()
    assert baseline['state']==candidate['state']
    assert baseline['pads'][0]['background']!=candidate['pads'][0]['background']
    assert candidate['pads'][0]['background']=='rgb(255, 179, 55)'
    assert candidate['pads'][0]['color']=='rgb(5, 10, 13)'
    for prior,new in zip(baseline['pads'],candidate['pads']):
        assert {k:prior[k] for k in ('box','hit','pressed','label')}=={k:new[k] for k in ('box','hit','pressed','label')}
    assert baseline['pads'][1:] == candidate['pads'][1:]
    assert reference and args.retained.is_file()
    donor = args.retained.read_bytes()
    a,b,r = map(rgb,(before,after,reference))
    assert np.array_equal(a,rgb(donor)), 'Retained browser state did not replay exactly'
    changed=np.any(a!=b,axis=2)
    x,y,w,h = baseline['pads'][0]['box']
    x0,y0,x1,y1 = math.floor(x)-2,math.floor(y)-2,math.ceil(x+w)+2,math.ceil(y+h)+2
    assert changed.sum() == changed[y0:y1,x0:x1].sum() > 0, 'Changed pixels outside selected pad'
    # Use an agreed common interior, omitting text and rounded edges. Do not use this as a page gate.
    roi=(60,305,135,323)
    l,t,u,d=roi
    assert x+2<l<u<x+w-2 and y+2<t<d<y+h-2
    def different(image, ref):
        return round(float(np.mean(np.any(np.abs(image-ref)>25.5,axis=2))*100),6)
    metrics={'exactChangedPixels':int(changed.sum()),'changedPixelsOutsideSelectedPad':0,
             'fullPageDiagnosticPercent':[different(a,r),different(b,r)],
             'selectedPadInterior':{'crop':list(roi),'diagnosticPercent':[different(a[t:d,l:u],r[t:d,l:u]),
                                                                       different(b[t:d,l:u],r[t:d,l:u])]},
             'ownerAcceptance':'INELIGIBLE_FULL_PAGE_PROVIDER_AND_LAYOUT_DIFFERENCES'}
    assert metrics['selectedPadInterior']['diagnosticPercent'][1] < metrics['selectedPadInterior']['diagnosticPercent'][0]
    (args.output/'receipt.json').write_text(json.dumps({'baselineSource':'ca5e7eebb7a258379c00fb5abcce2404c33334ec',
        'retainedBuildSource':'133fe8f0f917eb8d390ca0788cd9710a076aee97','baseCaptureSHA256':sha(donor),
        'candidateCSSGitBlob':subprocess.check_output(['git','hash-object',str(args.repo/'web/product-site/remote/style.css')],text=True).strip(),
        'ownerPDFSHA256':sha(reference_pdf.read_bytes()),'chromium':version,'normalSandbox':True,
        'retainedBuiltRemoteFilesVerified':len(remote_files),
        'metrics':metrics,'baseline':baseline,'candidate':candidate},indent=2)+'\n')
    print(json.dumps(metrics,indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ('repo','site','retained','output'):
        parser.add_argument(name,type=lambda value:Path(value).resolve())
    arguments=parser.parse_args()
    arguments.output.mkdir(parents=True,exist_ok=True)
    asyncio.run(run(arguments))
