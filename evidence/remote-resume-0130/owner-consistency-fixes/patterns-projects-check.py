"""Owner pages 19 and 20 from the supported P01 and one-Song-row Draft."""
import argparse
import asyncio
import hashlib
import json
import runpy
from pathlib import Path
import numpy as np
from PIL import Image
from playwright.async_api import async_playwright, expect

ROOT=Path(__file__).resolve().parents[2]
SERVER=runpy.run_path(str(ROOT/'tests/product-remote/envelope-browser.py'))['server']
CSS='''() => {
  const rect=e=>e.getBoundingClientRect();
  const visible=e=>e.checkVisibility()&&rect(e).width>0&&rect(e).height>0;
  const hit=e=>{const p=rect(e);return p.width>=43.99&&p.height>=43.99&&p.left>=-.1&&p.right<=innerWidth+.1&&p.top>=-.1&&p.bottom<=innerHeight+.1&&e.contains(document.elementFromPoint(p.x+p.width/2,p.y+p.height/2));};
  const pads=[...document.querySelectorAll('.patterns-grid-panel[data-scope="selected"] [data-launch-part]')];
  const actions=[...document.querySelectorAll('.destinations :is(a,button), .project-tools a, .project-guide summary, .project-summary button')].filter(visible);
  const selected=pads.find(e=>e.getAttribute('aria-pressed')==='true');
  return {body:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
     offsets:[document.body.scrollLeft,document.body.scrollTop,scrollX,scrollY], midiCalls:window.ownerMidi,
     pads:pads.length,padWhole:pads.filter(hit).length,
     selected:selected?.textContent??null, paint:selected?getComputedStyle(selected).backgroundColor:null,
     textInk:selected?getComputedStyle(selected).color:null,
     scope:[...document.querySelectorAll('.pattern-scope button')].map(b=>[b.textContent,hit(b)]),
     subtitles:[...document.querySelectorAll('.destinations header>p')].filter(visible).map(e=>e.textContent),
     actions:actions.map(e=>[e.textContent.trim(),hit(e),rect(e).height]),
     cards:[...document.querySelectorAll('.destinations section')].map(e=>rect(e).height)};
}'''


def hash_bytes(data):return hashlib.sha256(data).hexdigest()


async def phase(browser,site,out,name,reference,size,errors):
    width,height=size
    context=await browser.new_context(viewport={'width':width,'height':height},has_touch=True,reduced_motion='reduce')
    await context.add_init_script("window.ownerMidi=0;navigator.requestMIDIAccess=()=>{ownerMidi++;throw Error('No device access')};")
    page=await context.new_page()
    page.on('pageerror',lambda err:errors.append(str(err)))
    try:
        with SERVER(site) as origin:
            await page.goto(origin+'/remote/',wait_until='domcontentloaded')
            await expect(page.locator('main')).to_have_attribute('aria-busy','false')
            async def view(v):
                if v=='song': await page.locator('.overflow summary').click()
                await page.locator(f'[data-view="{v}"]').click()
                if await page.locator('.overflow').get_attribute('open') is not None:
                    await page.locator('.overflow summary').click()
                await expect(page.locator('main')).to_have_attribute('data-layout-view',v)
            if size==(844,390):
                await view('patterns')
                await page.locator('[data-pattern-scope="all"]').click()
                for part in range(5):await page.locator(f'[data-launch-part="{part}"][data-pattern="0"]').click()
                await view('song')
                await page.locator('#song-add').click()
                await expect(page.locator('.song-table tbody tr')).to_have_count(1)
                await view('patterns')
                await page.locator('[data-pattern-scope="selected"]').click()
                await page.evaluate('document.fonts.ready')
                patterns=await page.evaluate(CSS)
                assert patterns['body']==list(size) and not any(patterns['offsets']) and patterns['midiCalls']==0,patterns
                assert patterns['selected']=='01' and patterns['pads']==patterns['padWhole']==32,patterns
                assert all(hit for label,hit in patterns['scope']),patterns
                await page.screenshot(path=out/f'{name}-19.png',animations='disabled')
                if name=='candidate':
                    assert patterns['paint']=='rgb(255, 179, 55)' and patterns['textInk']=='rgb(5, 10, 13)',patterns
                    await page.locator('[data-launch-part="2"][data-pattern="1"]').tap()
                    await expect(page.locator('#pattern-target')).to_have_text('P02')
                    await page.locator('[data-launch-part="2"][data-pattern="0"]').tap()
                    await expect(page.locator('#pattern-target')).to_have_text('P01')
            else:
                patterns=None
            await view('files')
            await page.evaluate('document.fonts.ready')
            projects=await page.evaluate(CSS)
            assert projects['body']==list(size) and not any(projects['offsets']) and projects['midiCalls']==0,projects
            if size==(844,390):
                await expect(page.locator('.project-summary p')).to_contain_text('1 song rows')
                await page.screenshot(path=out/f'{name}-20.png',animations='disabled')
                if name=='candidate':
                    assert len(projects['subtitles'])==3,projects
                    labels={label:hit for label,hit,_ in projects['actions']}
                    assert all(labels[t] for t in ('Export backup','Inspect restore','Open original','Choose range','Samples','Manual')),projects
                    assert all(h>=44 for _,_,h in projects['actions']),projects
                    for action in await page.locator('.destinations :is(a,button), .project-tools a, .project-guide summary, .project-summary button').all():
                        if await action.is_visible():
                            await action.scroll_into_view_if_needed()
                            assert await action.evaluate('e=>{const r=e.getBoundingClientRect();return r.top>=-.2 && r.bottom<=innerHeight+.2 && e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}'),await action.inner_text()
                    assert not any((await page.evaluate(CSS))['offsets'])
            else:
                if size==(1440,900):
                    assert len(projects['actions'])==13 and all(h>=44 for _,_,h in projects['actions']),projects
                projects['rasterSHA256']=hash_bytes(await page.screenshot(animations='disabled'))
            print(name,width,height,'PASS',flush=True)
            return {'patterns':patterns,'projects':projects}
    finally:await context.close()


async def main(o):
    o.out.mkdir(exist_ok=False)
    report={'errors':[],'states':{},'pixels':{}}
    async with async_playwright() as playwright:
        browser=await playwright.chromium.launch(chromium_sandbox=True)
        report['browser']=browser.version
        try:
            for name,site in [('base',o.base),('candidate',o.candidate)]:
                report['states'][name]={}
                for size in [(844,390),(1440,900),(1024,640),(390,844)]:
                    report['states'][name][str(size)]=await phase(browser,site,o.out,name,o.reference,size,report['errors'])
        finally:await browser.close()
    assert not report['errors'],report['errors']
    for size in [(1440,900),(1024,640),(390,844)]:
        assert report['states']['base'][str(size)]['projects']==report['states']['candidate'][str(size)]['projects'],size
    def rgb(path):return np.asarray(Image.open(path).convert('RGB'),dtype=np.int16)
    for number in [19,20]:
        reference=rgb(o.reference/f'owner-{number}.png')
        report['pixels'][number]={}
        for phase_name in ['base','candidate']:
            actual_path=o.out/f'{phase_name}-{number}.png'
            actual=rgb(actual_path); delta=np.max(abs(actual-reference),axis=2)
            report['pixels'][number][phase_name]={'tolerantPercent':round(float((delta>25.5).mean()*100),4),'tolerantPixels':int((delta>25.5).sum()),'sha256':hash_bytes(actual_path.read_bytes())}
    (o.out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report['pixels'],indent=2),flush=True)
    assert all(x['candidate']['tolerantPixels']<x['base']['tolerantPixels'] for x in report['pixels'].values()),report['pixels']


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    for key in ['base','candidate','reference','out']:p.add_argument(key,type=lambda s:Path(s).resolve())
    asyncio.run(main(p.parse_args()))
