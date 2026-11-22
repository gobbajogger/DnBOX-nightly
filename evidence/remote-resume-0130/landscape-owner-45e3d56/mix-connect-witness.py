# SPDX-License-Identifier: GPL-3.0-only
"""Replay the remaining matched Levels and Files/Connect controls at 844×390."""
import argparse
import asyncio
import json
from pathlib import Path
import runpy

from playwright.async_api import async_playwright, expect

HELPERS = runpy.run_path(str(Path(__file__).with_name('roll-witness.py')))
WARNING = 'No reviewed firmware catalog. Apply stays off.'
NAV = '#other-view > .mix-modes > button'
MODES = ('levels', 'pan', 'sends', 'fx', 'master')


async def inventory(page, selector):
    return await page.locator(selector).evaluate_all("""elements => elements.map(element => {
        const box = element.getBoundingClientRect();
        const x = box.x + box.width / 2, y = box.y + box.height / 2;
        const scroller = element.closest('#other-view').getBoundingClientRect();
        return {label: element.getAttribute('aria-label') ?? element.textContent.trim(),
                box: [box.x, box.y, box.width, box.height],
                inside: box.top >= scroller.top && box.bottom <= scroller.bottom &&
                        box.left >= scroller.left && box.right <= scroller.right,
                hit: element.contains(document.elementFromPoint(x, y)),
                disabled: element.disabled};
    })""")


async def values(page, selector):
    return await page.locator(selector).evaluate_all("""inputs => inputs.map(input => ({
        id: input.dataset.nativeParam, raw: Number(input.value),
        label: input.getAttribute('aria-label'), display: input.getAttribute('aria-valuetext'),
        accent: getComputedStyle(input).accentColor
    }))""")


async def view(page, name):
    await page.locator(f'[data-view="{name}"]').first.press('Enter')
    await expect(page.locator('main')).to_have_attribute('data-layout-view', name)


async def compact_controls(page, origin, output, name):
    await HELPERS['page_ready'](page, origin)
    await page.locator('[data-engine="drum909"]').click()
    await page.locator('[data-view="sound"]').click()
    await page.locator('#sound-voice').select_option('0')
    header = page.locator('.drum-sound-toolbar h2')
    review = page.locator('.drum-sound-actions [data-project-action="review"]')
    voice = await header.inner_text()
    controls = await inventory(page, '[data-drum-sound-strip] .drum-step-buttons button')
    assert len(controls) == 12 and all(c['inside'] and c['hit'] for c in controls)
    roles = await page.locator('[data-drum-sound-unit]').evaluate_all('''units => units.map(unit => ({
        role:unit.dataset.drumRole,label:unit.querySelector('[data-drum-label]').textContent.trim(),
        value:unit.querySelector('[data-drum-value]').textContent.trim(),
        ids:[...unit.querySelectorAll('button[data-param]')].map(button=>button.dataset.param)
    }))''')
    assert [c['label'] for c in roles] == ['Tune', 'Attack', 'Decay', 'Pitch depth', 'Pitch', 'Velocity']
    paint = await review.evaluate('''button => {
        const style = getComputedStyle(button);
        return {color:style.color,background:style.backgroundColor};
    }''')
    review_target = (await inventory(page, '.drum-sound-actions [data-project-action="review"]'))[0]
    assert review_target['inside'] and review_target['hit'] and review_target['box'][3] == 44
    await page.screenshot(path=output / f'{name}-18-bassdrum.png', animations='disabled')
    await review.click()
    await expect(page.locator('#review-dialog')).to_be_visible()
    await page.locator('#review-dialog').get_by_role('button', name='Return').click()
    await page.locator('#sound-voice').select_option('1')
    second_voice = await header.inner_text()
    await page.locator('[data-engine="chicago"]').click()
    await view(page, 'patterns')
    await page.locator('[data-launch-part="2"][data-pattern="0"]').press('Enter')
    cells = '.patterns-grid-panel[data-scope="selected"] .perform-cell'
    pads = await inventory(page, cells)
    assert len(pads) == 32 and all(p['inside'] and p['hit'] for p in pads)
    type_sizes = await page.locator(cells).evaluate_all('pads => pads.map(p => getComputedStyle(p).fontSize)')
    selected = await page.locator(cells + '[aria-pressed=true]').evaluate('''p => {
        const style=getComputedStyle(p);
        return {text:p.textContent,background:style.backgroundColor,color:style.color};
    }''')
    assert selected['text'] == '01'
    await page.screenshot(path=output / f'{name}-19-patterns.png', animations='disabled')
    assert await page.evaluate('document.documentElement.scrollWidth === innerWidth')
    return {'drumHeading': voice, 'nextDrumHeading': second_voice, 'reviewPaint': paint,
            'reviewTarget': review_target, 'drumBindings': roles, 'drumTargets': controls,
            'patternTargets': pads, 'patternFont': type_sizes, 'patternSelection': selected}


async def check(browser, origin, output, name):
    context = await browser.new_context(viewport=HELPERS['VIEWPORT'], has_touch=True,
                                        device_scale_factor=1, accept_downloads=True)
    try:
        page = await context.new_page()
        page_errors = []
        page.on('pageerror', lambda error: page_errors.append(str(error)))
        await page.add_init_script("""window.midiCalls = 0;
            navigator.requestMIDIAccess = () => { midiCalls++; throw Error('Unexpected MIDI'); };""")
        await HELPERS['page_ready'](page, origin)
        await page.locator('[data-view="mix"]').click()
        nav = await inventory(page, NAV)
        await page.screenshot(path=output / f'{name}-16-levels.png', animations='disabled')
        assert [n['label'] for n in nav] == ['Draft', 'Emulator', 'Levels', 'Pan', 'Sends', 'FX', 'Master / More']
        tabs = []
        await page.locator(NAV).first.focus()
        for button in nav:
            if button['disabled']:
                continue
            tabs.append(await page.evaluate('document.activeElement.textContent.trim()'))
            await page.keyboard.press('Tab')
        assert tabs == [n['label'] for n in nav if not n['disabled']], tabs
        level_ranges = await inventory(page, '[data-mix-view="levels"] .mixer-fader')
        level_values = await values(page, '[data-mix-view="levels"] .mixer-fader')
        master_macros = await inventory(page, '[data-mix-view="levels"] .mix-master-panel [data-mix-param-label]')
        assert len(master_macros) == 4
        parts = {}
        for mode in MODES:
            await page.locator(f'[data-mix-mode="{mode}"]').press('Enter')
            await expect(page.locator(f'[data-mix-view="{mode}"]')).to_be_visible()
            if mode in ('pan', 'sends', 'fx'):
                selector = '.mix-fx-sends' if mode == 'fx' else '.mix-parts-panel'
                parts[mode] = await values(page, selector + ' .synth-range')
            assert await page.evaluate('document.documentElement.scrollWidth === innerWidth'), mode
        await view(page, 'patterns')
        await page.locator('[data-pattern-scope="all"]').press('Enter')
        for part in range(5):
            await page.locator(f'[data-launch-part="{part}"][data-pattern="0"]').press('Enter')
        await page.locator('[data-pattern-action="song"]').press('Enter')
        await page.locator('#song-add').press('Enter')
        await page.locator('[data-view="files"]').first.click()
        summary = await page.locator('.project-summary').inner_text()
        assert '1 song rows' in summary, summary
        before_connect = await HELPERS['draft'](page)
        assert before_connect['song'] == [{'patterns': [0] * 5, 'repeats': 1}]
        # Restore the normal Files display after Draft export feedback.
        await view(page, 'roll')
        await page.locator('[data-view="files"]').click()
        cards_before = await inventory(page, '.destinations button,.destinations a')
        initial = await page.locator('#conn-state').inner_text()
        await page.locator('#connect').click()
        await expect(page.locator('#connection-message')).to_have_text(WARNING)
        await expect(page.locator('#conn-state')).to_have_text(WARNING)
        await expect(page.locator('#apply')).to_be_disabled()
        await page.locator('#close-connection').click()
        await expect(page.locator('#connection-result')).to_be_hidden()
        await expect(page.locator('#connect')).to_be_focused()
        await expect(page.locator('#connection-message')).to_have_text(WARNING)
        dismissed = await page.locator('#conn-state').inner_text()
        await page.screenshot(path=output / f'{name}-20-projects.png', animations='disabled')
        assert await inventory(page, '.destinations button,.destinations a') == cards_before
        assert await HELPERS['draft'](page) == before_connect
        compact = await compact_controls(page, origin, output, name)
        assert not page_errors and await page.evaluate('midiCalls') == 0
        return {'navigation': nav, 'levelRanges': level_ranges, 'levels': level_values,
                'masterCards': master_macros, 'parts': parts, 'projects': cards_before, 'compact': compact,
                'connect': {'initial': initial, 'open': WARNING, 'dismissed': dismissed,
                            'localDraftUnchanged': True, 'midiCalls': 0},
                'shots': {page: HELPERS['digest'](output / f'{name}-{page}.png')
                          for page in ('16-levels', '18-bassdrum', '19-patterns', '20-projects')}}
    finally:
        await context.close()


def without_accent(rows):
    return [{key: value for key, value in row.items() if key != 'accent'} for row in rows]


async def run(args):
    server = runpy.run_path(str(args.root / 'tests/product-remote/envelope-browser.py'))['server']
    receipt = {'viewport': [844, 390], 'normalSandbox': True}
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(chromium_sandbox=True)
        try:
            receipt['browser'] = browser.version
            for name, site in (('before', args.before), ('after', args.after)):
                with server(site) as origin:
                    receipt[name] = await check(browser, origin, args.output, name)
                receipt[name]['served'] = {key: HELPERS['digest'](site / 'remote' / key) for key in
                                           ('app.mjs', 'firmware-link.mjs', 'index.html', 'style.css')}
        finally:
            await browser.close()
    (args.output / 'mix-connect-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    before, after = receipt['before'], receipt['after']
    assert len({nav['box'][1] for nav in before['navigation']}) == 2
    assert len({nav['box'][1] for nav in after['navigation']}) == 1
    for key in ('navigation', 'levelRanges', 'masterCards'):
        for old, new in zip(before[key], after[key], strict=True):
            assert old['label'] == new['label'] and old['disabled'] == new['disabled']
            assert old['box'][2:] == new['box'][2:]
            assert new['inside'] and (new['hit'] or new['disabled']), (key, new)
    assert all(nav['box'][3] >= 44 for nav in after['navigation'])
    assert before['levels'] == after['levels']
    assert [level['raw'] for level in after['levels']] == [75, 112, 100, 100, 120]
    assert before['parts']['pan'] == after['parts']['pan'] and len(after['parts']['pan']) == 1
    assert all(p['raw'] == 64 and p['display'] == 'C' for p in after['parts']['pan'])
    assert before['parts']['fx'] == after['parts']['fx']
    assert len(after['parts']['sends']) == len(after['parts']['fx']) == 10
    assert without_accent(before['parts']['sends']) == without_accent(after['parts']['sends'])
    assert after['parts']['sends'] == after['parts']['fx']
    assert before['connect']['dismissed'] == WARNING
    assert after['connect']['dismissed'] == after['connect']['initial'] == 'Not connected'
    old, new = before['compact'], after['compact']
    assert new['drumHeading'] == 'Sound · 909 / Bass drum'
    assert new['nextDrumHeading'] == 'Sound · 909 / Snare'
    assert old['reviewPaint'] != new['reviewPaint'] == {'color': 'rgb(5, 10, 13)', 'background': 'rgb(255, 179, 55)'}
    for key in ('reviewTarget', 'drumBindings', 'drumTargets', 'patternTargets', 'patternSelection'):
        assert old[key] == new[key], key
    assert old['patternFont'] == ['13px'] * 32 and new['patternFont'] == ['15px'] * 32
    print('PASS compact Bass drum title and Review cue, preserved bindings and hit boxes')
    print('PASS all 32 compact pattern values use the shared size, preserving target geometry and P01 selection')
    print('PASS one Mix navigation row, preserved 44px targets/levels/pan, identical Sends/FX bindings and colors')
    print('PASS failed Connect diagnostic, idle Files header on return, exact one-row Draft preserved, zero MIDI')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for argument in ('root', 'before', 'after', 'output'):
        parser.add_argument(argument, type=Path)
    asyncio.run(run(parser.parse_args()))
