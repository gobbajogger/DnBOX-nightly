"""Every website route and every Remote page fits a landscape phone (844x390).

Builds the real product site into a scoped .output directory and serves it
through Playwright routing (no test HTTP server). For each of the 19 entry
routes it checks HTTP 200, no page errors, no failed same-origin resources and
no horizontal overflow. It then opens every Remote page (the five tabs plus the
Drums, Motion and Song views) and checks the same overflow rule on each.
"""
import asyncio, importlib.util, subprocess, tempfile
from pathlib import Path
from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('funky', ROOT / 'tests/product-remote/funkybeats-browser.py')
core = importlib.util.module_from_spec(spec)
spec.loader.exec_module(core)

ROUTES = (
    'index.html', 'breaks/index.html', 'builds/index.html', 'help/index.html', 'install/index.html',
    'manual/index.html', 'manual/legacy.html', 'manual/original/index.html',
    'manual/projects-guide.html', 'manual/protocol.html', 'new/index.html', 'presets/index.html',
    'presets/legacy/index.html', 'projects/index.html', 'remote/index.html', 'remote/device/index.html',
    'remote/identity/index.html', 'starting-breaks/index.html', 'tools/index.html',
)
REMOTE_TABS = ('roll', 'sound', 'mix', 'patterns', 'files')
REMOTE_MENU = ('drums', 'locks', 'song')
WIDTH, HEIGHT = 844, 390
OVERFLOW = '''()=>{const d=document.documentElement,w=innerWidth;
 const wide=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();
  if(!r.width||!r.height)return false;const s=getComputedStyle(e);if(s.visibility==='hidden'||s.position==='fixed')return false;
  for(let p=e.parentElement;p&&p!==document.body;p=p.parentElement){const o=getComputedStyle(p).overflowX;if(o!=='visible'&&o!=='clip'||getComputedStyle(p).overflow==='hidden')return false;}
  return r.right>w+0.5||r.left<-0.5;}).slice(0,5).map(e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\\s+/).join('.'):''));
 return {scrollWidth:d.scrollWidth,bodyScroll:document.body.scrollWidth,width:w,wide};}'''


async def fits(page, label):
    result = await page.evaluate(OVERFLOW)
    assert result['scrollWidth'] <= WIDTH and result['bodyScroll'] <= WIDTH and not result['wide'], (label, result)
    print('FITS_844', label, result['scrollWidth'], flush=True)


async def cases():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(chromium_sandbox=True)
        try:
            context = await browser.new_context(viewport={'width': WIDTH, 'height': HEIGHT},
                                                device_scale_factor=1, has_touch=True, reduced_motion='reduce')
            await context.route('**/*', core.serve)
            for route in ROUTES:
                page = await context.new_page()
                errors, failed = [], []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('response', lambda r: failed.append((r.status, r.url)) if r.status >= 400 else None)
                await page.add_init_script('navigator.requestMIDIAccess=()=>Promise.reject(Error("no device in test"))')
                response = await page.goto(f'{core.ORIGIN}/{route}', wait_until='load')
                assert response.status == 200, (route, response.status)
                await page.evaluate('document.fonts.ready')
                if route == 'remote/index.html':
                    await expect(page.locator('main')).to_have_attribute('aria-busy', 'false')
                    assert await page.locator('#workspace-error').is_hidden(), 'Remote failed to start'
                await fits(page, route)
                if route == 'remote/index.html':
                    for view in REMOTE_TABS:
                        await page.locator(f'.tab[data-view="{view}"]').click()
                        await fits(page, 'remote:' + view)
                    for view in REMOTE_MENU:
                        await page.locator('.overflow summary').click()
                        await page.locator(f'.overflow [data-view="{view}"]').click()
                        if await page.locator('.overflow').evaluate('e=>e.open'):
                            await page.locator('.overflow summary').click()
                        await fits(page, 'remote:' + view)
                assert not errors, (route, errors)
                assert not failed, (route, failed)
                await page.close()
            await context.close()
        finally:
            await browser.close()
    print(f'ROUTES_844 PASS {len(ROUTES)} routes and {len(REMOTE_TABS) + len(REMOTE_MENU)} Remote pages fit 844x390', flush=True)


def main():
    (ROOT / '.output').mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='routes-844-', dir=ROOT / '.output') as output:
        core.SOURCE = Path(output)
        subprocess.run(['node', 'scripts/build-product-site.mjs', '--output', output], cwd=ROOT, check=True,
                       stdout=subprocess.DEVNULL)
        asyncio.run(cases())


if __name__ == '__main__':
    main()
