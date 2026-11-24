# SPDX-License-Identifier: GPL-3.0-only
"""Row 12 'Remote 0 unbound': every visible control in every Remote view does something.

Walks the shipped Remote (built site, Draft host) view by view. For each visible,
enabled control it performs the control's own gesture (click, arrow key, option
change) and asserts that the host state changed: the page's rendered state,
control values, open dialogs, downloads, URL or the Draft status. A control whose
gesture changes nothing is unbound; the test fails listing every one of them.
Links must resolve to a built route instead of being clicked.

Scope: all five parts x eight views at 1440x900 against the Draft host (about
680 distinct controls). Already-selected choices are proved by selecting a
sibling first; Stop and All get their precondition (Play, None). A choice whose
alternatives are all unavailable in Draft (the Emulator source before it runs)
is listed, not failed. The emulator's native message path is covered by the
native-sound and native-mix browser tests. Making the REC or Clear point
handler a no-op makes this test fail.
"""
import asyncio, importlib.util, json, os, subprocess, sys, tempfile
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('fb', Path(__file__).with_name('funkybeats-browser.py'))
fb = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fb)

# 909/808 open the drum grid from Sequence ('roll'), so the drum grid is walked as each drum part's roll view.
VIEWS = ('roll', 'sound', 'mix', 'patterns', 'files', 'locks', 'song')
MENU_VIEWS = ('locks', 'song')
ENGINES = tuple(os.environ.get('UNBOUND_ENGINES', 'drum909,drum808,chicago,miami,breaks').split(','))
VIEWS = tuple(os.environ.get('UNBOUND_VIEWS', ','.join(VIEWS)).split(','))
# Controls whose effect needs a prior state: the precondition gesture runs first.
PRECONDITION = {'#stop': '#play', 'data-action=all': '[data-action="none"]'}
DOWNLOADS = []

MARK = '''()=>{let n=window.__unboundProbe||0;const out=[];for(const e of document.querySelectorAll('button,input,select,textarea,summary,a[href],[role=slider],[role=button],[tabindex]:not([tabindex="-1"])')){
 const r=e.getBoundingClientRect(),s=getComputedStyle(e);
 if(!(r.width>0&&r.height>0)||s.visibility==='hidden'||e.disabled||e.closest('[hidden],dialog:not([open])'))continue;
 if(e.matches('#roll-scroll'))continue; // the roll surface is covered by the gesture tests
 const id='c'+(n++);e.dataset.unboundProbe=id;
 const label=(e.getAttribute('aria-label')||e.textContent||e.id||'').trim().replace(/\\s+/g,' ').slice(0,60);
 out.push({id,tag:e.tagName.toLowerCase(),type:e.type||'',role:e.getAttribute('role')||'',href:e.getAttribute('href'),
  key:[e.tagName.toLowerCase(),e.id&&'#'+e.id,...[...e.attributes].filter(a=>/^data-(view|engine|param|mix-|sound-|project-|tab|mode|break-view|note|lane-step|step|cell|pattern|song|lock|voice|action)/.test(a.name)).map(a=>a.name+'='+a.value)].filter(Boolean).join(' '),
  label,current:e.getAttribute('aria-current')==='page'||(e.getAttribute('aria-pressed')==='true'&&!e.matches('#rec,#multi,#snap'))});}
 window.__unboundProbe=n;return out;}'''

SIBLING = '''id=>{const e=document.querySelector('[data-unbound-probe="'+id+'"]');if(!e)return 'none';
 const kind=x=>x.tagName+'|'+[...x.attributes].map(a=>a.name).filter(n=>n.startsWith('data-')&&n!=='data-unbound-probe').sort().join(',')+'|'+x.className;
 for(let p=e.parentElement;p&&p!==document.body;p=p.parentElement){const same=[...p.querySelectorAll(e.tagName)].filter(x=>x!==e&&kind(x)===kind(e)&&x.getBoundingClientRect().width>0);
  if(same.length){const ok=same.find(x=>!x.disabled);if(!ok)return 'disabled';ok.click();return 'clicked';}}
 return 'none';}'''

STATE = '''()=>{const vals=[...document.querySelectorAll('input,select,textarea')].map(e=>e.type==='checkbox'||e.type==='radio'?e.checked:e.value);
 const dlg=[...document.querySelectorAll('dialog,details')].map(e=>e.open);
 const html=document.body.innerHTML.replace(/ data-unbound-probe="c\\d+"/g,'');
 return JSON.stringify([location.href,html,vals,dlg]);}'''


async def open_view(page, view):
    if view in MENU_VIEWS:
        if not await page.locator('.overflow').evaluate('e=>e.open'):
            await page.locator('.overflow summary').click()
    await page.locator(f'[data-view="{view}"]').first.click()
    if await page.locator('.overflow').evaluate('e=>e.open'):
        await page.locator('.overflow summary').click()


def nth_match(items, item):
    matches = [i for i in items if same_control(i, item)]
    return matches[min(item.get('nth', 0), len(matches) - 1)] if matches else None


def same_control(a, b):
    # A control with its own id or parameter stays the same control when its label shows a new value.
    if a['key'] != b['key']:
        return False
    return ' ' in a['key'] or a['label'] == b['label']


async def resolve(page, item):
    loc = page.locator(f'[data-unbound-probe="{item["id"]}"]')
    if await loc.count():
        return loc
    # Re-rendered since it was listed: find the same control again.
    match = nth_match(await page.evaluate(MARK), item)
    return page.locator(f'[data-unbound-probe="{match["id"]}"]') if match else None


async def gesture(page, item):
    loc = await resolve(page, item)
    if loc is None or not await loc.is_visible() or not await loc.is_enabled():
        return 'gone'   # hidden or disabled by an earlier gesture: the caller retries from a fresh view
    if 'data-note=' in item['key'] or 'data-lane-step=' in item['key']:
        before = await page.evaluate(STATE)
        await loc.focus()
        await loc.press('ArrowUp')
        if await page.evaluate(STATE) != before:
            return None
    if await loc.get_attribute('role') == 'slider':
        # A slider (the BPM readout) moves with the arrow keys like a range input.
        await loc.focus()
        await loc.press('ArrowUp')
        return None
    if item['tag'] == 'select':
        options = await loc.evaluate('e=>[...e.options].filter(o=>!o.disabled).map(o=>o.value)')
        current = await loc.input_value()
        other = next((o for o in options if o != current), None)
        if other is None:
            return 'single option'
        await loc.select_option(other)
    elif item['tag'] == 'input' and item['type'] == 'range':
        before = await loc.input_value()
        await loc.press('ArrowRight')
        if await loc.input_value() == before:
            await loc.press('ArrowLeft')
    elif item['tag'] == 'input' and item['type'] == 'number':
        value = await loc.evaluate('''e=>{const v=Number(e.value||e.min||0),max=e.max===''?Infinity:Number(e.max),min=e.min===''?-Infinity:Number(e.min);
          return String(v+1<=max?v+1:Math.max(min,v-1));}''')
        await loc.fill(value)
        await loc.dispatch_event('change')
    elif item['tag'] == 'input' and item['type'] == 'file':
        return 'file'
    else:
        count = len(DOWNLOADS)
        try:
            await loc.click(timeout=2000)
        except Exception as error:
            if 'intercepts pointer events' not in str(error):
                raise
            # A gesture surface (for example the motion grid) owns the pointer over its cells:
            # press where the musician's finger lands.
            box = await loc.bounding_box()
            await page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        await page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
        if len(DOWNLOADS) > count:
            return 'download'
    return None


async def walk(browser, size):
    context = await browser.new_context(viewport={'width': size[0], 'height': size[1]}, has_touch=True, accept_downloads=True)
    await context.route('**/*', fb.serve)
    page = await context.new_page()
    page.set_default_timeout(5000)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('download', lambda d: DOWNLOADS.append(d))
    await page.add_init_script('navigator.requestMIDIAccess=()=>{throw Error("Device access forbidden in local draft test")};')

    async def fresh(engine, view):
        await page.goto(fb.ORIGIN + '/remote/')
        await page.wait_for_function('document.getElementById("status").textContent.includes("Disconnected")')
        await page.locator(f'[data-engine="{engine}"]').click()
        await open_view(page, view)
        # Panels such as the starting breaks finish loading after the view opens: wait until settled.
        last = None
        for _ in range(50):
            now = await page.evaluate(STATE)
            if now == last:
                break
            last = now
            await page.wait_for_timeout(150)

    unbound, checked, seen, current, tested, allowed = [], 0, set(), set(), set(), []
    for engine in ENGINES:
        for view in VIEWS:
            await fresh(engine, view)
            items = await page.evaluate(MARK)
            dirty = False
            occurrence = {}
            for item in items:
                item['nth'] = occurrence[(item['key'], item['label'])] = occurrence.get((item['key'], item['label']), -1) + 1
            for item in items:
                sig = (view, item['key'], item['label'], item['nth'])
                if sig in seen:
                    continue
                seen.add(sig)
                if item['href'] is not None:
                    target = urlparse(await page.locator(f'[data-unbound-probe="{item["id"]}"]').evaluate('e=>e.href'))
                    if target.netloc == urlparse(fb.ORIGIN).netloc:
                        ok = await page.evaluate('u=>fetch(u).then(r=>r.ok,()=>false)', target.geturl())
                        if not ok:
                            unbound.append(f'{engine}/{view}: link {item["label"]!r} -> {target.path} not built')
                    checked += 1
                    continue
                if dirty:
                    # The last gesture left this view (or opened a dialog): start this control fresh.
                    await fresh(engine, view)
                    fresh_items = await page.evaluate(MARK)
                    match = nth_match(fresh_items, item)
                    if match is not None:
                        match['nth'] = item['nth']
                    if match is None:
                        unbound.append(f'{engine}/{view}: {item["key"]} {item["label"]!r} not found again after reload')
                        print('UNBOUND', unbound[-1], flush=True)
                        continue
                    item = match
                    dirty = False
                pre = next((sel for part, sel in PRECONDITION.items() if part in item['key'].split(' ')), None)
                if pre:
                    await page.locator(pre).click()
                before = await page.evaluate(STATE)
                try:
                    note = await gesture(page, item)
                except Exception as error:
                    unbound.append(f'{engine}/{view}: {item["key"]} {item["label"]!r} gesture failed: {' | '.join(l.strip() for l in str(error).splitlines()[-4:])}')
                    print('UNBOUND', unbound[-1], flush=True)
                    dirty = True
                    continue
                if note == 'gone':
                    # Re-rendered away by an earlier gesture: start fresh and try this control once more.
                    await fresh(engine, view)
                    again = nth_match(await page.evaluate(MARK), item)
                    if again is not None:
                        again['nth'] = item['nth']
                        item = again
                        before = await page.evaluate(STATE)
                        note = await gesture(page, item)
                if note == 'gone':
                    unbound.append(f'{engine}/{view}: {item["key"]} {item["label"]!r} disappeared before its gesture')
                    print('UNBOUND', unbound[-1], flush=True)
                    dirty = True
                    continue
                checked += 1
                tested.add((item['key'], item['label']))
                after = await page.evaluate(STATE)
                if note not in ('download', 'file') and after == before and item.get('current'):
                    # Already selected: select a sibling of the same kind, then selecting this one must switch back.
                    sibling = await page.evaluate(SIBLING, item['id'])
                    if sibling == 'disabled':
                        allowed.append(f'{engine}/{view}: {item["key"]} {item["label"]!r} (alternatives unavailable in Draft)')
                        continue
                    if sibling == 'clicked':
                        await page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
                        before = await page.evaluate(STATE)
                        loc = await resolve(page, item)
                        if loc is not None:
                            await loc.click(timeout=2000, force=True)
                            await page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
                        after = await page.evaluate(STATE)
                        dirty = True
                if note not in ('download', 'file') and after == before:
                    unbound.append(f'{engine}/{view}: {item["key"]} {item["label"]!r}' + (f' ({note})' if note else ''))
                    print('UNBOUND', unbound[-1], flush=True)
                left = await page.evaluate("""v=>{const on=document.querySelector('[data-view="'+v+'"][aria-current="page"],[data-view="'+v+'"][aria-pressed="true"]');return !!document.querySelector('dialog[open]')||location.pathname!=='/remote/'||!on}""", view)
                dirty = dirty or left or bool(pre)
            print(f'VIEW {engine}/{view} items={len(items)} checked={checked} unbound={len(unbound)}', flush=True)
    # A selection control that was only ever already selected never proved it switches anything.
    for line in allowed:
        print('SELECTED_ONLY_OPTION', line, flush=True)
    await context.close()
    return checked, unbound, errors


async def main():
    out = ROOT / '.output'
    out.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='unbound-', dir=out) as output:
        fb.SOURCE = Path(output)
        subprocess.run(['node', 'scripts/build-product-site.mjs', '--output', output], cwd=ROOT, check=True)
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(chromium_sandbox=True)
            try:
                checked, unbound, errors = await walk(browser, (1440, 900))
            finally:
                await browser.close()
    assert not errors, errors
    if len(ENGINES) == 5 and len(VIEWS) == 7:
        assert checked > 100, checked
    assert not unbound, f'{len(unbound)} unbound controls'
    print(f'UNBOUND_BROWSER PASS controls={checked} unbound=0', flush=True)


if __name__ == '__main__':
    asyncio.run(main())
