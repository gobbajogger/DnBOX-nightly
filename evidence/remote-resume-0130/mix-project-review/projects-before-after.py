"""Measure the Projects desktop density repair and unchanged smaller layouts."""
import argparse
import asyncio
import hashlib
import importlib.util
import json
from pathlib import Path

import numpy as np
from PIL import Image
from playwright.async_api import async_playwright, expect


SIZES = [(1440, 900), (1024, 640), (844, 390), (390, 844)]
GEOMETRY = """
() => {
  const visible = e => e.checkVisibility({visibilityProperty:true, opacityProperty:true});
  const area = document.querySelector('#other-view');
  const cards = [...document.querySelectorAll('.destinations>section')].map(card => {
    const label = card.querySelector('h3');
    const style = getComputedStyle(label);
    return {title:label.innerText, font:style.fontSize, rect:card.getBoundingClientRect().toJSON()};
  });
  const targets = [...document.querySelectorAll('.destinations a, .destinations button, .project-tools a, .project-guide summary, .project-summary button')].filter(visible);
  const initial = area.getBoundingClientRect();
  const firstScreen = targets.map(target => {
    const rect = target.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x+rect.width/2, rect.y+rect.height/2);
    return {name: target.innerText, disabled: target.matches(':disabled'),
        width:rect.width, height:rect.height, hit:target.contains(hit),
        fullyVisible: rect.top>=initial.top && rect.left>=initial.left &&
                      rect.bottom<=initial.bottom && rect.right<=initial.right};
  });
  const scrolls = [area.scrollTop,area.scrollLeft];
  const blocked = [];
  for (const target of targets.filter(e => !e.matches(':disabled'))) {
    target.scrollIntoView({block:'nearest',inline:'nearest'});
    const r = target.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    if (!target.contains(hit)) blocked.push(target.innerText);
  }
  [area.scrollTop,area.scrollLeft] = scrolls;
  return {cards, firstScreen, blocked, documentWidth:document.documentElement.scrollWidth,
          viewportWidth:innerWidth, mainBounds:initial.toJSON()};
}
"""


def test_module(source):
    path = source / 'tests/product-remote/funkybeats-browser.py'
    spec = importlib.util.spec_from_file_location('funkybeats-test', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def pixels(path):
    with Image.open(path) as opened:
        return np.array(opened.convert('RGB'), dtype=np.int16)


def difference(left, right):
    changed = np.abs(left - right).max(axis=2)
    return {
        'changedExact': int((changed > 0).sum()),
        'changedTolerant': int((changed > 25.5).sum()),
        'changedTolerantPercent': float((changed > 25.5).mean() * 100),
    }


async def capture(browser, test, site, out, stage, width, height):
    test.SOURCE = site
    context = await browser.new_context(viewport={'width': width, 'height': height}, has_touch=True)
    try:
        await context.route('**/*', test.serve)
        page = await context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('crash', lambda _: errors.append('Chromium renderer crash'))
        await page.goto(test.ORIGIN + '/remote/')
        await expect(page.locator('main')).to_have_attribute('aria-busy', 'false')
        await page.locator('[data-view="files"]').click()
        await expect(page.get_by_role('heading', name='Current session')).to_be_visible()
        await page.evaluate('document.fonts.ready')
        shot = out / f'{stage}-{width}x{height}.png'
        await page.screenshot(path=shot, animations='disabled')
        result = await page.evaluate(GEOMETRY)
        result['sha256'] = hashlib.sha256(shot.read_bytes()).hexdigest()
        result['pageErrors'] = errors
        assert not errors, errors
        assert not result['blocked'], result
        assert result['documentWidth'] == width, result
        if width == 1440:
            if stage == 'before':
                assert max(row['rect']['height'] for row in result['cards']) < 100, result
            if stage == 'after':
                assert min(row['rect']['height'] for row in result['cards']) >= 150, result
                assert all(row['font'] == '26px' for row in result['cards']), result
                assert all(a['fullyVisible'] and a['width'] >= 44 and a['height'] >= 44
                           for a in result['firstScreen']), result
        return result
    finally:
        await context.close()


async def main(args):
    test = test_module(args.source)
    args.out.mkdir(parents=True, exist_ok=False)
    reference = pixels(args.reference)
    report = {}
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(chromium_sandbox=True)
        report['chromium'] = browser.version
        try:
            for width, height in SIZES:
                key = f'{width}x{height}'
                before = await capture(browser, test, args.before, args.out, 'before', width, height)
                after = await capture(browser, test, args.after, args.out, 'after', width, height)
                before_image = pixels(args.out / f'before-{key}.png')
                after_image = pixels(args.out / f'after-{key}.png')
                result = {'before': before, 'after': after, 'changed': difference(before_image, after_image)}
                if width == 1440:
                    result['ownerPdf'] = {'before': difference(reference, before_image),
                                          'after': difference(reference, after_image)}
                    Image.fromarray(np.concatenate((reference, after_image), axis=1).astype(np.uint8)).save(
                        args.out / 'owner-p12-candidate.png')
                else:
                    assert result['changed']['changedExact'] == 0, result
                report[key] = result
                (args.out / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
                print(key, result['changed'], result.get('ownerPdf'), 'controls', len(after['firstScreen']),
                      'body overflow 0, blocked 0', flush=True)
        finally:
            await browser.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ['source', 'before', 'after', 'reference', 'out']:
        parser.add_argument(name, type=lambda arg: Path(arg).resolve())
    asyncio.run(main(parser.parse_args()))
