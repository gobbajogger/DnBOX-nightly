# SPDX-License-Identifier: GPL-3.0-only
"""Independent owner pages 15 and 18, with real Chromium touch and keyboard input."""
import argparse
import asyncio
import hashlib
import json
import runpy
from pathlib import Path

from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[3]
VIEWPORTS = [(844, 390), (740, 390), (736, 414), (640, 360), (390, 844), (1440, 900)]
MEASURE = r"""() => {
  const box = e => {
    const r = e?.getBoundingClientRect();
    return r ? [r.left, r.top, r.width, r.height] : null;
  };
  function visibleRect(element, r = element.getBoundingClientRect()) {
    const tolerance = .55;
    let [left, top, right, bottom] = [0, 0, innerWidth, innerHeight];
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent), bounds = parent.getBoundingClientRect();
      if (/(auto|scroll|clip|hidden)/.test(style.overflowX)) {
        left = Math.max(left, bounds.left + parent.clientLeft);
        right = Math.min(right, bounds.left + parent.clientLeft + parent.clientWidth);
      }
      if (/(auto|scroll|clip|hidden)/.test(style.overflowY)) {
        top = Math.max(top, bounds.top + parent.clientTop);
        bottom = Math.min(bottom, bounds.top + parent.clientTop + parent.clientHeight);
      }
    }
    return element.checkVisibility() && r.width > 0 && r.height > 0 &&
      r.left >= left - tolerance && r.right <= right + tolerance &&
      r.top >= top - tolerance && r.bottom <= bottom + tolerance;
  }
  function hit(element, x = .5, y = .5) {
    const r = element.getBoundingClientRect();
    const candidate = document.elementFromPoint(r.left + r.width*x, r.top + r.height*y);
    return element === candidate || element.contains(candidate);
  }
  function text(element) {
    const nodes = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const rows = [];
    for (let node; node = nodes.nextNode();) {
      if (!node.textContent.trim() || !node.parentElement.checkVisibility()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()];
      if (!rects.length) continue;
      const bounds = element.getBoundingClientRect();
      const clipped = rects.some(r => !visibleRect(node.parentElement, r) ||
        r.left < bounds.left - .55 || r.right > bounds.right + .55 ||
        r.top < bounds.top - .55 || r.bottom > bounds.bottom + .55);
      rows.push({value:node.textContent.trim(), clipped, font:getComputedStyle(node.parentElement).fontSize});
    }
    return rows;
  }
  const step = e => ({
    box:box(e), whole:visibleRect(e), hits:[[.5,.5],[.25,.25],[.75,.25],[.25,.75],[.75,.75]]
      .map(([x,y])=>hit(e,x,y)), name:e.getAttribute('aria-label'),
    pressed:e.getAttribute('aria-pressed'), text:text(e)
  });
  const rows = [...document.querySelectorAll('.sequencer-grid [id*="-voice-"]')]
    .map(row => {
      const label = row.querySelector('.seq-channel-info'), icon = label?.querySelector('svg,img');
      return {id:row.id, label:label?.getAttribute('aria-label'), labelText:label ? text(label) : [],
        icon:icon ? {tag:icon.tagName, box:box(icon), whole:visibleRect(icon),
          appearance:icon.outerHTML, label:icon.getAttribute('aria-label')} : null,
        cells:[...row.querySelectorAll('[data-drum-note]')].map(step)};
    });
  const buttons = selector => [...document.querySelectorAll(selector)]
    .map(e => ({name:e.getAttribute('aria-label') || e.textContent.trim(), whole:visibleRect(e),
      hit:hit(e), box:box(e), text:text(e)}));
  const strips = [...document.querySelectorAll('[data-drum-sound-unit]')].map(unit => {
    const label=unit.querySelector('[data-drum-label]');
    const value=unit.querySelector('[data-drum-value]');
    const glyph=unit.querySelector('.drum-source-glyph');
    return {label:label?.textContent, value:value?.textContent, text:[...text(label),...text(value)],
      glyph:box(glyph), glyphVisible:visibleRect(glyph),
      semantic:glyph.querySelector('[data-glyph-semantic]')?.getAttribute('data-glyph-semantic'),
      origin:glyph.querySelector('[data-glyph-origin]')?.getAttribute('data-glyph-origin'),
      buttons:[...unit.querySelectorAll('.drum-step-buttons button')]
        .map(e=>({name:e.getAttribute('aria-label'), whole:visibleRect(e), hit:hit(e), box:box(e)})),
      identity:unit.querySelector('[data-source-control]').dataset.sourceControl};
  });
  const header = [...document.querySelectorAll('.seq-numbers .seq-step-group span')]
    .map(e=>({value:e.textContent, whole:visibleRect(e), text:text(e)}));
  const lane = document.querySelector('.drum-step-lane');
  return {body:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
    workspace:box(document.querySelector('#other-view')), grid:box(document.querySelector('.sequencer-grid')),
    sound:box(document.querySelector('.drum-sound-panel')), lane:box(lane),
    laneValues:[...document.querySelectorAll('#drum-lane output')]
      .flatMap(e=>text(e).map(t=>({...t, box:box(e)}))),
    rows, header, navigation:buttons('.drum-grid-navigation button'),
    soundActions:buttons('.drum-sound-actions :is(button, select)'), strips};
}"""


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


async def review(site, out, head, viewports):
    server = runpy.run_path(str(ROOT / 'tests/product-remote/envelope-browser.py'))['server']
    receipt = {
        'source': head,
        'product': {name: digest(site / 'remote' / name) for name in
                    ['app.mjs', 'style.css', 'funkybeats-view.mjs', 'drum-strip.mjs']},
        'pdf': digest(ROOT / 'docs/design/OWNER-BASELINE-1836.pdf'),
        'states': {}, 'actions': {}, 'navigation': {}, 'errors': []
    }

    def save():
        (out / 'results.json').write_text(json.dumps(receipt, separators=(',', ':')) + '\n')
    with server(site) as origin:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(chromium_sandbox=True)
            receipt['chromium'] = browser.version
            try:
                for w, h in viewports:
                    context = await browser.new_context(viewport={'width': w, 'height': h},
                                                        has_touch=True, reduced_motion='reduce')
                    page = await context.new_page()
                    page.set_default_timeout(10000)
                    page.on('pageerror', lambda error: receipt['errors'].append(str(error)))
                    await page.goto(origin + '/remote/', wait_until='domcontentloaded')
                    await expect(page.locator('main')).to_have_attribute('aria-busy', 'false')

                    async def layout():
                        return await page.evaluate("""() => ({
                          viewport:[innerWidth, innerHeight, scrollX, scrollY],
                          scrolling: [document.documentElement, document.body].map(e=>({
                            scrollLeft:e.scrollLeft, width:e.scrollWidth, client:e.clientWidth
                          })),
                          boxes:Object.fromEntries(['.top','.brand','.tabs','.engines','.engine-list',
                            '#part-title','.transport','.history','.overflow summary','#workspace-main']
                            .map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [s,[r.left,r.right]]}))
                        })""")

                    async def view(name, key):
                        if name == 'drums':
                            receipt['navigation'][key] = {'engineSelected':await layout()}
                            await page.locator('.overflow summary').click()
                            receipt['navigation'][key]['overflowOpened'] = await layout()
                        await page.locator(f'[data-view="{name}"]').click()
                        if await page.locator('.overflow').get_attribute('open') is not None:
                            await page.locator('.overflow summary').click()
                        await expect(page.locator('#workspace-main')).to_have_attribute('data-layout-view', name)
                        if name == 'drums':
                            receipt['navigation'][key]['drumsOpened'] = await layout()

                    async def snap(key):
                        await page.evaluate('document.fonts.ready')
                        await page.evaluate('new Promise(resolve => requestAnimationFrame(resolve))')
                        data = await page.evaluate(MEASURE)
                        path = out / f'{key}.png'
                        await page.screenshot(path=path, animations='disabled')
                        data['pngSha256'] = digest(path)
                        receipt['states'][key] = data
                        save()
                        return data

                    if h < w < 740:
                        default = f'{w}x{h}-default'
                        receipt['navigation'][default] = {'before': await layout()}
                        await page.locator('.overflow summary').click()
                        receipt['navigation'][default]['after'] = await layout()
                        await page.goto(origin + '/remote/', wait_until='domcontentloaded')
                        await expect(page.locator('main')).to_have_attribute('aria-busy', 'false')
                    for kit in ['909', '808']:
                        await page.locator(f'[data-engine="drum{kit}"]').click()
                        key = f'{w}x{h}-{kit}'
                        await view('drums', key)
                        state = await snap(f'{key}-grid')
                        first = [cell for row in state['rows'][:6] for cell in row['cells']]
                        complete = sum(cell['whole'] and all(cell['hits']) for cell in first)
                        print(key, complete, 'first-bank pads with full bounds and five hits', flush=True)
                        if w == 844 and len(first) == complete == 96:
                            for row, step_number in enumerate([1, 16, 1, 16, 1, 16]):
                                cell = page.locator(f'#drum{kit}-voice-{row + 1} [data-drum-note]').nth(step_number - 1)
                                before = await cell.get_attribute('aria-pressed')
                                await cell.tap()
                                after = 'false' if before == 'true' else 'true'
                                await expect(cell).to_have_attribute('aria-pressed', after)
                                await page.locator('#undo').click()
                                await expect(cell).to_have_attribute('aria-pressed', before)
                                receipt['actions'].setdefault(key, []).append([row + 1, step_number, before, after, before])
                        await view('sound', key)
                        sound = await snap(f'{key}-sound')
                        if w in (740, 844) and len(sound['strips']) >= 2:
                            control = page.locator('[data-drum-sound-unit]').filter(has_text='Attack').first
                            readout = control.locator('[data-drum-value]')
                            expected = await readout.text_content()
                            increasing = control.locator('[data-drum-increment]')
                            await increasing.press('Enter')
                            await expect(readout).not_to_have_text(expected)
                            edited = await readout.text_content()
                            await page.locator('#undo').press('Enter')
                            await expect(readout).to_have_text(expected)
                            await control.locator('.drum-strip-control').click()
                            await snap(f'{key}-sound-expanded')
                            receipt['actions'][key+'-sound'] = [expected, edited, expected]
                            save()
                    await context.close()
            finally:
                await browser.close()
    return receipt


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('site', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--head', required=True, help='Source identity recorded by the build caller')
    parser.add_argument('--size', nargs=2, type=int, action='append', metavar=('WIDTH', 'HEIGHT'))
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    result = asyncio.run(review(args.site.resolve(), args.output, args.head, args.size or VIEWPORTS))
    (args.output / 'results.json').write_text(json.dumps(result, separators=(',', ':')) + '\n')
    assert not result['errors'], result['errors']
