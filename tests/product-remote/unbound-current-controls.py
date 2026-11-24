# SPDX-License-Identifier: GPL-3.0-only
"""Real browser repros for four formerly false unbound reports."""
import asyncio, importlib.util, subprocess, tempfile
from pathlib import Path
from playwright.async_api import async_playwright, expect

spec=importlib.util.spec_from_file_location('sweep',Path(__file__).with_name('unbound-browser.py'))
sweep=importlib.util.module_from_spec(spec)
spec.loader.exec_module(sweep)

async def run():
    out=sweep.ROOT/'.output';out.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='interactive-repros-',dir=out) as site:
        sweep.fb.SOURCE=Path(site)
        subprocess.run(['node','scripts/build-product-site.mjs','--output',site],cwd=sweep.ROOT,check=True)
        async with async_playwright() as pw:
            browser=await pw.chromium.launch(chromium_sandbox=True)
            try:
                page=await browser.new_page(viewport={'width':1440,'height':900})
                await page.route('**/*',sweep.fb.serve)
                await page.add_init_script("navigator.requestMIDIAccess=()=>{throw Error('No physical device in this test')}")
                await page.goto(sweep.fb.ORIGIN+'/remote/')
                await expect(page.locator('#conn-state')).to_have_text('Disconnected')
                for view,engine,key,outcome in (
                    ('roll','drum909','data-drum-page=0','confirmed'),
                    ('mix','drum909','data-mix-mode=levels','confirmed'),
                    ('roll','chicago','data-roll-source=draft','disabled'),
                ):
                    await page.locator(f'[data-engine="{engine}"]').click()
                    await sweep.open_view(page,view)
                    item=next(x for x in await page.evaluate(sweep.MARK) if key in x['key'].split())
                    assert item['current'],(key,item)
                    await sweep.gesture(page,item) # reproduces the panel re-render
                    assert await sweep.reselect_semantic(page,item)==outcome,(key,outcome)
                    print(f'PASS {key}: {outcome}',flush=True)
                await sweep.open_view(page,'files')
                item=next(x for x in await page.evaluate(sweep.MARK) if 'data-project-action=open' in x['key'].split())
                assert await sweep.gesture(page,item)=='filechooser'
                print('PASS Open project: actual single project file chooser',flush=True)
            finally:
                await browser.close()

if __name__=='__main__':
    asyncio.run(run())
