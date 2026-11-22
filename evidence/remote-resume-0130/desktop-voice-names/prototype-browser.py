"""Focused owner page 2 desktop voice-name and unchanged compact drum layout review."""
import argparse
import asyncio
import hashlib
import json
import runpy
from pathlib import Path

from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[3]
GEOMETRY = """() => {
  const seq = document.querySelector('.funkybeats-sequencer');
  const box = e => e.getBoundingClientRect();
  const bounds = box(seq);
  const rows = [...seq.querySelectorAll('.sequencer-grid [id*="-voice-"]')];
  const voiceRows = rows.map(row => {
    const rails = row.querySelector('.seq-channel-info');
    const label = rails.querySelector('.seq-channel-full-name');
    const short = rails.querySelector('.seq-channel-name');
    const steps = [...row.querySelectorAll('[data-drum-note]')].map(step => {
      const r=box(step), hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return {wholeX:r.left>=bounds.left-.1&&r.right<=bounds.right+.1,
              centerHit:step.contains(hit),width:r.width,height:r.height};
    });
    const r=box(label), b=box(rails);
    const range=document.createRange();range.selectNodeContents(label);
    const text=range.getBoundingClientRect();
    return {label:label.textContent,visible:label.checkVisibility(),shortVisible:short.checkVisibility(),
            fits:text.left>=b.left-.1&&text.right<=b.right+.1&&text.top>=b.top-.1&&text.bottom<=b.bottom+.1,
            line:!!r.height,steps};
  });
  const accent = [...seq.querySelectorAll('[data-drum-accent-step]')].map(e=>({h:box(e).height,w:box(e).width}));
  const grid = box(rows[0]);
  return {viewport:[innerWidth,innerHeight],body:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
          rail:parseFloat(getComputedStyle(rows[0]).gridTemplateColumns),
          laneStart:box(seq.querySelector('#drum-lane')).left-grid.left,
          bodyOffsets:[document.body.scrollLeft,document.body.scrollTop,scrollX,scrollY],
          voiceRows,accent,active:seq.querySelector('.seq-channel-info[aria-current="true"]').getAttribute('aria-label')};
}"""
NAMES = {
 '909':['Bass drum','Snare','Low tom','Mid tom','High tom','Rim shot','Clap','Closed hat','Open hat','Crash','Ride'],
 '808':['Bass drum','Snare','Low tom','Mid tom','High tom','Rim shot','Clap','Cowbell','Cymbal','Open hat','Closed hat']
}


async def run(site, out):
    server=runpy.run_path(str(ROOT/'tests/product-remote/envelope-browser.py'))['server']
    result={'sourceBase':'ada3fef20de13b2603f959a3412cf777dbcf0f07',
            'sourceSha256':{name:hashlib.sha256((site/'remote'/name).read_bytes()).hexdigest()
                            for name in ['app.mjs','style.css','funkybeats-view.mjs','glyph-registry.mjs']},
            'states':{},'errors':[]}
    with server(site) as origin:
        async with async_playwright() as pw:
            browser=await pw.chromium.launch(chromium_sandbox=True)
            result['browser']=browser.version
            try:
                for w,h in [(1440,900),(1280,800),(844,390),(390,844)]:
                    context=await browser.new_context(viewport={'width':w,'height':h},has_touch=True,
                                                      reduced_motion='reduce')
                    for kit in ('909','808'):
                        page=await context.new_page()
                        page.on('pageerror',lambda error:result['errors'].append(str(error)))
                        await page.goto(origin+'/remote/',wait_until='domcontentloaded')
                        await expect(page.locator('main')).to_have_attribute('aria-busy','false')
                        await page.locator(f'[data-engine="drum{kit}"]').click()
                        await page.locator('.overflow summary').click()
                        await page.locator('[data-view="drums"]').click()
                        if await page.locator('.overflow').get_attribute('open') is not None:
                            await page.locator('.overflow summary').click()
                        await expect(page.locator('#workspace-main')).to_have_attribute('data-layout-view','drums')
                        await page.evaluate('document.fonts.ready')
                        data=await page.evaluate(GEOMETRY)
                        assert data['viewport']==data['body']==[w,h]
                        assert data['bodyOffsets']==[0]*4
                        assert data['active']=='BD'
                        rows=data['voiceRows']
                        cells=[step for row in rows for step in row['steps']]
                        assert len(cells)==176 and len(data['accent'])==16
                        assert [row['label'] for row in rows]==NAMES[kit]
                        assert abs(data['rail']-data['laneStart'])<.1
                        if w>=1280:
                            assert all(row['visible'] and not row['shortVisible'] and row['fits'] for row in rows)
                            assert all(cell['width']>=40 and cell['height']>=40 and cell['wholeX'] for cell in cells)
                            assert all(cell['w']>=40 and cell['h']>=44 for cell in data['accent'])
                            if w==1440:
                                assert all(cell['centerHit'] for cell in cells)
                            target=page.locator(f'#drum{kit}-voice-1 [data-drum-note]').nth(15)
                        else:
                            assert not any(row['visible'] for row in rows)
                            assert all(row['shortVisible'] for row in rows)==(w==390)
                            if w==844:
                                assert len(cells[:96])==96 and all(cell['centerHit'] and cell['wholeX'] for cell in cells[:96])
                            target=page.locator(f'#drum{kit}-voice-1 [data-drum-note]').first
                        if (kit,w,h)==('909',1440,900):
                            png=await page.screenshot(path=out/'owner-page-2-product.png',animations='disabled')
                            result['page2PngSHA256']=hashlib.sha256(png).hexdigest()
                        prior=await target.get_attribute('aria-pressed')
                        await target.tap()
                        await expect(target).not_to_have_attribute('aria-pressed',prior)
                        await page.locator('#undo').click()
                        await expect(target).to_have_attribute('aria-pressed',prior)
                        await page.locator('#redo').click()
                        await expect(target).not_to_have_attribute('aria-pressed',prior)
                        await page.locator('#undo').click()
                        await expect(target).to_have_attribute('aria-pressed',prior)
                        key=f'{kit}-{w}x{h}'
                        data['tapUndoRedo']=True
                        result['states'][key]=data
                        (out/'desktop-voice-names.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
                        print('PASS',key,'176 pads',sum(c['centerHit'] for c in cells),'center hits',flush=True)
                        await page.close()
                    await context.close()
            finally:
                await browser.close()
    assert not result['errors'] and len(result['states'])==8,result['errors']


if __name__=='__main__':
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument('product',type=Path)
    cli.add_argument('output',type=Path)
    args=cli.parse_args()
    args.output.mkdir(parents=True,exist_ok=True)
    asyncio.run(run(args.product.resolve(),args.output.resolve()))
