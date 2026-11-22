"""Retake only six owner frames whose prior fixture selected the wrong state."""
from __future__ import annotations
import asyncio
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import runpy
import subprocess
import sys

from PIL import Image
from playwright.async_api import async_playwright, expect

ROOT=Path('/workspace/scratch/857bb2409f82/rt-133fe8f0')
RUN=Path(__file__).resolve().parent/'run-133fe8f0f917'
SITE=ROOT/'.output/site'
OUT=RUN/'owner-corrections'
SHA='133fe8f0f917eb8d390ca0788cd9710a076aee97'
TREE='4a4835d7a9dfec983d0f3a94dcdbb6f4dd69a1cc'
KEYS=('06-levels','07-master','08-fx','09-patterns','12-projects','16-levels')
BASELINE=RUN/'owner/inventory.json.gz'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def identity():
    def git(*args):return subprocess.check_output(['git','-C',str(ROOT),*args],text=True).strip()
    assert (git('rev-parse','HEAD'),git('rev-parse','HEAD^{tree}'),git('status','--porcelain','--untracked-files=no'))==(SHA,TREE,'')
    return {name:digest(SITE/'remote'/name) for name in ('app.mjs','style.css','index.html')}


async def run():
    source=identity()
    prior=json.load(gzip.open(BASELINE,'rt'))
    assert source=={'app.mjs':prior['appSHA256'],'style.css':prior['styleSHA256'],'index.html':prior['indexSHA256']}
    assert (prior['source'],prior['tree'])==(SHA,TREE)
    helper=ROOT/'tests/product-remote'
    server=runpy.run_path(str(helper/'envelope-browser.py'))['server']
    driver_path=ROOT/'evidence/remote-owner-pages-20261121/1f6d7602-review/capture.py'
    measure=runpy.run_path(str(driver_path))['INVENTORY']
    spec=importlib.util.spec_from_file_location('owner_state_draft',helper/'native-sound-browser.py')
    native=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(native)
    OUT.mkdir(parents=True,exist_ok=False)
    receipt={'source':SHA,'tree':TREE,'builtRemoteSHA256':source,
             'inventoryProbeSHA256':digest(driver_path),'captureScriptSHA256':digest(Path(__file__)),
             'originalInventorySHA256':digest(BASELINE),'states':{},'errors':[],
             'captureProfile':{'deviceScaleFactor':1,'hasTouch':True,'clock':'unfrozen',
                               'animations':'disabled at screenshot','chromiumSandbox':True}}

    def save():
        temp=OUT/'inventory.json.tmp'
        temp.write_text(json.dumps(receipt,indent=2)+'\n')
        temp.replace(OUT/'inventory.json')

    def prior_state(key):
        data=prior['states'][key]
        assert digest(RUN/'owner'/(key+'.png'))==data['screenshotSHA256'],key
        return {'source':SHA,'tree':TREE,'screenshotSHA256':data['screenshotSHA256'],
                'observed':data['observed'],'headings':data['headings'],'visibleText':data['visibleText']}

    async def setup(context,origin):
        page=await context.new_page()
        await page.add_init_script("window.ownerMidiCalls=0;navigator.requestMIDIAccess=()=>{ownerMidiCalls++;throw Error('Unrequested MIDI');};")
        page.on('pageerror',lambda error:receipt['errors'].append(str(error)))
        await page.goto(origin+'/remote/',wait_until='domcontentloaded')
        await expect(page.locator('main')).to_have_attribute('aria-busy','false')
        return page

    async def view(page,name):
        if name=='song':await page.locator('.overflow').evaluate('e=>e.open=true')
        await page.locator(f'[data-view="{name}"]').evaluate('e=>e.click()')
        await page.locator('.overflow').evaluate('e=>e.open=false')
        await expect(page.locator('main')).to_have_attribute('data-layout-view',name)

    async def part(page,engine):
        await page.locator(f'[data-engine="{engine}"]').click()
        await expect(page.locator(f'[data-engine="{engine}"]')).to_have_attribute('aria-pressed','true')

    async def mode(page,name):
        await page.locator(f'[data-mix-mode="{name}"]').click()
        await expect(page.locator(f'[data-mix-mode="{name}"]')).to_have_attribute('aria-pressed','true')
        await expect(page.locator('[data-mix-source="draft"]')).to_have_attribute('aria-pressed','true')

    async def mix_values(page):
        return await page.evaluate('''() => [...document.querySelectorAll('#other-view [data-param],#other-view input[data-native-param]')].map(e=>{
          const cell=e.matches('input')?e.closest('.funkybeats-typed-unit'):e;
          const glyph=cell.querySelector('[data-glyph-fn]');
          return {id:e.dataset.param??e.dataset.nativeParam,current:e.value||null,
            normalized:glyph?.dataset.glyphValue??null,output:cell.querySelector('output')?.textContent??null};
        })''')

    async def snap(page,key,why):
        await page.evaluate('document.fonts.ready')
        old=prior_state(key)
        data=await page.evaluate(measure)
        data['pages']=prior['states'][key]['pages']
        data['observed']=await page.evaluate('''() => ({
          viewport:[innerWidth,innerHeight],body:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
          scroll:[scrollX,scrollY,document.body.scrollLeft,document.body.scrollTop],
          part:document.querySelector('#part').value,pattern:document.querySelector('#pattern-no').textContent,
          view:document.querySelector('main').dataset.layoutView,lane:document.querySelector('#lane-kind').value,
          tempo:document.querySelector('#tempo').textContent,clockEpochMs:Date.now(),midiCalls:ownerMidiCalls,
          connection:document.querySelector('#conn-state').textContent,
          status:document.querySelector('#status').textContent,
          selectedPart:document.querySelector('[data-engine][aria-pressed="true"]')?.dataset.engine
        })''')
        observed=data['observed']
        assert observed['body']==observed['viewport']==old['observed']['viewport'] and not any(observed['scroll']),observed
        assert observed['part']==observed['selectedPart']=='chicago' and observed['pattern']=='P01',observed
        assert not observed['midiCalls'] and not receipt['errors'] and observed['tempo']=='120 BPM',observed
        assert observed['connection']=='Not connected',observed
        png=OUT/(key+'.png')
        await page.screenshot(path=png,animations='disabled')
        with Image.open(png) as image:
            assert list(image.size)==observed['viewport'],key
            image.verify()
        data.update(filename=png.name,screenshotSHA256=digest(png),previousRejectedFixture=old,
                    correctedKnownState=why)
        assert data['screenshotSHA256']!=old['screenshotSHA256'],key
        receipt['states'][key]=data
        save()
        print('PASS',key,observed['part'],observed['connection'],data['screenshotSHA256'],flush=True)
        return data

    async def dto(page):
        data=json.loads(await native.draft_bytes(page))
        assert data['parameters']==[] and len(data['notes'])==10,data
        return data

    with server(SITE) as origin:
      async with async_playwright() as playwright:
        browser=await playwright.chromium.launch(chromium_sandbox=True)
        try:
            receipt['browser']=browser.version
            desktop=await browser.new_context(viewport={'width':1440,'height':900},has_touch=True,accept_downloads=True)
            try:
                page=await setup(desktop,origin)
                await part(page,'miami');await view(page,'sound')
                await page.locator('#sound-bank').select_option('MIAMI')
                await page.locator('#sound-bank').select_option('SuperJ6')
                await view(page,'mix')
                for mode_name,key in (('levels','06-levels'),('master','07-master'),('fx','08-fx')):
                    await part(page,'miami');await mode(page,mode_name)
                    levels=await mix_values(page)
                    assert levels and all(row['id'] for row in levels),levels
                    await part(page,'chicago')
                    await view(page,'sound')
                    await expect(page.locator('#sound-bank')).to_have_value('CHICAGO')
                    await view(page,'mix');await mode(page,mode_name)
                    assert await mix_values(page)==levels,key
                    state=await snap(page,key,'Bass A / CHICAGO selected; actual global Draft controls unchanged')
                    state['sameGlobalControlValuesAcrossPartSwitch']=levels
                    save()
                await view(page,'patterns')
                await expect(page.locator('[data-pattern-scope="selected"]')).to_have_attribute('aria-pressed','true')
                p01=page.locator('[data-launch-part="2"][data-pattern="0"]')
                await expect(p01).to_have_attribute('aria-pressed','false')
                await p01.click()
                await expect(p01).to_have_attribute('aria-pressed','true')
                await expect(p01).to_have_attribute('aria-label','Bass A P01, not loaded')
                p09=await snap(page,'09-patterns','Bass A P01 explicitly selected locally; remains Not loaded')
                p09['localSelection']={'part':'Bass A / CHICAGO','pattern':'P01','loaded':False,
                    'ariaPressed':await p01.get_attribute('aria-pressed'),'ariaLabel':await p01.get_attribute('aria-label')}
                p09_doc=await dto(page)
                assert p09_doc['launch']==[None,None,0,None,None] and p09_doc['song']==[],p09_doc
                p09['draftReadback']={'launch':p09_doc['launch'],'song':p09_doc['song'],'parameters':p09_doc['parameters']}
                await page.locator('[data-pattern-scope="all"]').click()
                for index in range(5):
                    await page.locator(f'[data-launch-part="{index}"][data-pattern="0"]').click()
                await view(page,'song')
                await page.locator('#song-add').click()
                await expect(page.locator('.song-table tbody tr')).to_have_count(1)
                await part(page,'chicago');await view(page,'files')
                await expect(page.locator('.project-summary p')).to_have_text('10 notes · 0 sound edits · 1 song rows')
                p12=await snap(page,'12-projects','Bass A / CHICAGO selected with the same authored one-row local Draft')
                p12_doc=await dto(page)
                assert p12_doc['launch']==[0]*5 and p12_doc['song']==[{'patterns':[0]*5,'repeats':1}],p12_doc
                p12['draftReadback']={'launch':p12_doc['launch'],'song':p12_doc['song'],'parameters':p12_doc['parameters']}
                save()
            finally:
                await desktop.close()
            compact=await browser.new_context(viewport={'width':844,'height':390},has_touch=True,accept_downloads=True)
            try:
                page=await setup(compact,origin)
                await part(page,'chicago');await view(page,'sound')
                await expect(page.locator('#sound-bank')).to_have_value('CHICAGO')
                await view(page,'mix');await mode(page,'levels')
                p16=await snap(page,'16-levels','Fresh disconnected Bass A / CHICAGO Draft Levels; no inherited Connect warning')
                assert p16['previousRejectedFixture']['visibleText'].find('No reviewed firmware catalog')!=-1
                assert 'No reviewed firmware catalog' not in p16['visibleText']
                controls=await mix_values(page)
                assert controls==receipt['states']['06-levels']['sameGlobalControlValuesAcrossPartSwitch'],controls
                p16['sameGlobalControlValuesAs06']=controls
                doc=await dto(page)
                assert doc['song']==[] and doc['launch']==[None]*5,doc
                p16['draftReadback']={'launch':doc['launch'],'song':doc['song'],'parameters':doc['parameters']}
                save()
            finally:
                await compact.close()
        finally:
            await browser.close()
    assert identity()==source and not receipt['errors']
    assert set(receipt['states'])==set(KEYS)
    receipt['result']='PASS'
    save()


if __name__=='__main__':
    asyncio.run(run())
