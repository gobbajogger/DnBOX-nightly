"""Inspect the exact short-landscape Drum page before and after the CSS patch."""
import argparse
import asyncio
import hashlib
import importlib.util
import json
from pathlib import Path
import runpy
import sys

import numpy as np
from PIL import Image
from playwright.async_api import async_playwright, expect

MEASURE_CSS = """
() => {
  const q = selector => document.querySelector(selector);
  const box = selector => q(selector).getBoundingClientRect().toJSON();
  const pads = [...q('.sequencer-grid').querySelectorAll('[data-drum-note]')];
  const lane = [...q('#drum-lane').querySelectorAll('[data-lane-step]')];
  const first = pads[0].getBoundingClientRect();
  const second = pads[1].getBoundingClientRect();
  const fifth = pads[4].getBoundingClientRect();
  const fourth = pads[3].getBoundingClientRect();
  const dimensions = pads.map(p => p.getBoundingClientRect());
  const pane = q('.funkybeats-sequencer');
  return {
    pad: first.toJSON(),
    minPadWidth: Math.min(...dimensions.map(r => r.width)),
    minPadHeight: Math.min(...dimensions.map(r => r.height)),
    gap: second.left - first.right,
    groupGap: fifth.left - fourth.right,
    rail: q('.seq-channel-info').getBoundingClientRect().width,
    panel: pane.getBoundingClientRect().toJSON(),
    panelBackground: getComputedStyle(pane).backgroundColor,
    panelRadius: getComputedStyle(pane).borderRadius,
    inactiveFill: getComputedStyle(pads.find(p => !p.classList.contains('hit'))).backgroundColor,
    reviewFill: getComputedStyle(q('.drum-grid-navigation [aria-controls="review-dialog"]')).backgroundColor,
    laneOffsets: lane.map((target, i) => {
      const l = target.getBoundingClientRect(), r = dimensions[i];
      return (l.x + l.width / 2) - (r.x + r.width / 2);
    }),
    sound: box('.drum-sound-panel'),
  };
}
"""


def load_test(source):
    tests = source / 'tests/product-remote'
    sys.path.insert(0, str(tests))
    path = tests / 'composition-browser.py'
    spec = importlib.util.spec_from_file_location('composition', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module, runpy.run_path(str(tests / 'page15-density-browser.py'))['MEASURE']


async def check_view(browser, test, measure, site, output, phase, width, height):
    test.core.SOURCE = site
    errors = []
    context = await browser.new_context(viewport={'width': width, 'height': height}, has_touch=True)
    try:
        await context.route('**/*', test.core.serve)
        page = await context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.add_init_script("window.midiCalls=0;navigator.requestMIDIAccess=()=>{midiCalls++;throw Error('No device')}")
        results = {}
        for kit in ('909', '808'):
            await page.goto(test.core.ORIGIN + '/remote/')
            await expect(page.locator('main')).to_have_attribute('aria-busy', 'false')
            await page.locator(f'[data-engine="drum{kit}"]').click()
            await page.locator('.overflow summary').click()
            await page.locator('[data-view="drums"]').click()
            await page.locator('.overflow summary').click()
            await page.evaluate('document.fonts.ready')
            cells = page.locator('.sequencer-grid [data-drum-note]')
            await expect(cells).to_have_count(176)
            state = await page.evaluate(measure)
            css = await page.evaluate(MEASURE_CSS)
            initial = {(row, step) for row in range(6) for step in range(16)}
            assert initial <= {tuple(cell) for cell in state['visible']}, state
            assert state['hiddenScroll'] == [0, 0, 0, 0] and state['body'] == [width, height], state
            nav = page.get_by_role('navigation', name=kit + ' step navigation')
            for button in await nav.get_by_role('button').all():
                box = (await test.full_bounds(button))['box']
                assert box['width'] >= 44 and box['height'] >= 44, box
            if width == 844:
                await page.screenshot(path=output / f'{phase}-{kit}-{width}x{height}.png',
                                      animations='disabled')

            result = {'initialPads': 96, 'mounted': 176, 'css': css, 'navigation': state['navigation']}
            if phase == 'candidate':
                assert css['minPadHeight'] == 24
                assert css['panelRadius'] == '7px' and css['panelBackground'] == 'rgb(16, 26, 31)'
                assert css['inactiveFill'] == 'rgb(41, 61, 67)' and css['reviewFill'] == 'rgb(255, 179, 55)'
                assert css['rail'] == (52 if width >= 820 else 40)
                if width >= 820:
                    assert css['minPadWidth'] >= 24 and css['gap'] == css['groupGap'] == 4, css
                    assert max(map(abs, css['laneOffsets'])) < .2, css
                # Check pad edit and reversal as the owner fixture does.
                for index in (15, 95):
                    pad = cells.nth(index)
                    await test.full_bounds(pad)
                    was = await pad.get_attribute('aria-pressed')
                    await pad.tap()
                    await expect(pad).not_to_have_attribute('aria-pressed', was)
                    await page.locator('#undo').click()
                    await expect(pad).to_have_attribute('aria-pressed', was)
                if width == 844:
                    result['wheel'] = await test.check_landscape_drum_banks(page, cells)
                    footer = nav.get_by_role('button', name='Review draft', exact=True)
                    await footer.press('Enter')
                    await page.locator('#review-dialog').get_by_role('button', name='Return', exact=True).click()
                    await expect(footer).to_be_focused()
                    await top_action(nav, cells, 96, 'Voices 7–11')
                    await top_action(nav, cells, 0, 'Voices 1–6')
            results[kit] = result
            print(phase, width, height, kit, '96 initial, 176 mounted, 4 whole footer actions', flush=True)
        assert not errors and await page.evaluate('midiCalls') == 0, errors
        return results
    finally:
        await context.close()


async def top_action(nav, cells, index, name):
    await nav.get_by_role('button', name=name, exact=True).press('Enter')
    await expect(cells.nth(index)).to_be_focused()


def pixels(path):
    return np.array(Image.open(path).convert('RGB'), dtype=np.int16)


def delta(left, right):
    changed = np.abs(left - right).max(axis=2)
    return {'differentExact': int(np.count_nonzero(changed)),
            'differentTolerant': int(np.count_nonzero(changed > 25.5)),
            'differentTolerantPercent': float((changed > 25.5).mean() * 100)}


async def main(args):
    args.out.mkdir(exist_ok=False, parents=True)
    test, measure = load_test(args.source)
    reference = pixels(args.owner)
    report = {'baseCommit': 'ada3fef20de13b2603f959a3412cf777dbcf0f07', 'views': {}, 'pixelComparison': {}}
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(chromium_sandbox=True)
        report['chromium'] = browser.version
        try:
            for phase, site, sizes in [('base', args.base, [(844,390)]),
                                       ('candidate', args.candidate, [(844,390), (820,390), (740,390)])]:
                report['views'][phase] = {
                    'styleSha256': hashlib.sha256((site / 'remote/style.css').read_bytes()).hexdigest(),
                    'sizes': {},
                }
                for width, height in sizes:
                    result = await check_view(browser, test, measure, site, args.out, phase, width, height)
                    report['views'][phase]['sizes'][f'{width}x{height}'] = result
                    (args.out / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
        finally:
            await browser.close()
    for phase in ('base', 'candidate'):
        actual = pixels(args.out / f'{phase}-909-844x390.png')
        report['pixelComparison'][phase] = {
            'fullPage': delta(reference, actual),
            'gridRegion': delta(reference[125:348, 12:569], actual[125:348, 12:569]),
        }
        print(phase, json.dumps(report['pixelComparison'][phase]), flush=True)
    (args.out / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    Image.fromarray(np.concatenate((reference, pixels(args.out / 'candidate-909-844x390.png')),
                                   axis=1).astype(np.uint8)).save(args.out / 'owner-15-candidate.png')
    assert report['pixelComparison']['candidate']['fullPage']['differentTolerant'] <            report['pixelComparison']['base']['fullPage']['differentTolerant']


if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    for name in ('source', 'base', 'candidate', 'owner', 'out'):
        cli.add_argument(name, type=lambda arg: Path(arg).resolve())
    asyncio.run(main(cli.parse_args()))
