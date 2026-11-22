# SPDX-License-Identifier: GPL-3.0-only
"""Exercise the actual page 14 Draft at 844×390 before and after its roll correction."""
import argparse
import asyncio
import hashlib
import json
from pathlib import Path
import runpy

from playwright.async_api import async_playwright, expect

VIEWPORT = {'width': 844, 'height': 390}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


async def snapshot(page):
    return await page.evaluate("""() => {
        const roll = document.querySelector('#roll-scroll');
        const rail = document.querySelector('#pitch-rail');
        const pane = roll.getBoundingClientRect();
        const notes = [...roll.querySelectorAll('.note:not(.pulse)')].map(note => {
            const box = note.getBoundingClientRect();
            const x = box.x + box.width / 2, y = box.y + box.height / 2;
            return {id: note.dataset.note, label: note.getAttribute('aria-label'),
                    bounds: [box.x, box.y, box.width, box.height],
                    inside: box.top >= pane.top && box.bottom <= pane.bottom &&
                            box.left >= pane.left && box.right <= pane.right,
                    hit: note.contains(document.elementFromPoint(x, y))};
        });
        const clipped = [...rail.querySelectorAll('.pitch')].filter(pitch => {
            const range = document.createRange();
            range.selectNodeContents(pitch);
            const ink = range.getBoundingClientRect();
            return ink.bottom > pane.top && ink.top < pane.bottom &&
                (ink.top < pane.top - .5 || ink.bottom > pane.bottom + .5);
        }).map(pitch => pitch.textContent);
        return {pane: [pane.x, pane.y, pane.width, pane.height], notes, clipped,
                part: document.querySelector('#part').value,
                row: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--row')),
                offsets: [roll.scrollLeft, roll.scrollTop], rail: rail.scrollTop,
                terminal: [...roll.querySelectorAll('.note.pulse')].map(note => note.getAttribute('aria-label')),
                outer: [scrollX, scrollY, document.documentElement.scrollWidth,
                        document.documentElement.scrollHeight]};
    }""")


async def draft(page):
    menu = page.locator('.overflow')
    await menu.evaluate('e => e.open = true')
    try:
        async with page.expect_download() as download:
            await page.locator('#draft-save').click()
        return json.loads(Path(await (await download.value).path()).read_bytes())
    finally:
        await menu.evaluate('e => e.open = false')


async def page_ready(page, origin):
    await page.goto(origin + '/remote/', wait_until='domcontentloaded')
    await expect(page.locator('main')).to_have_attribute('aria-busy', 'false')
    await page.evaluate('document.fonts.ready')


async def check(browser, origin, path, phase):
    context = await browser.new_context(viewport=VIEWPORT, has_touch=True,
                                        device_scale_factor=1, accept_downloads=True)
    try:
        page = await context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        await page.add_init_script("""window.midiCalls = 0;
            navigator.requestMIDIAccess = () => { midiCalls++; throw Error('Unexpected MIDI'); };""")
        await page_ready(page, origin)
        fresh = await snapshot(page)
        await page.locator('[data-engine="chicago"]').click()
        selected = await snapshot(page)
        await page.screenshot(path=path / f'{phase}-14-notes.png', animations='disabled')
        await page.mouse.move(selected['pane'][0] + 250, selected['pane'][1] + 30)
        await page.mouse.wheel(0, 27)
        await page.wait_for_function('top => document.querySelector("#roll-scroll").scrollTop !== top',
                                     arg=selected['offsets'][1])
        panned = await snapshot(page)
        await page.locator('[data-view="sound"]').first.click()
        await page.locator('[data-view="roll"]').first.click()
        returned = await snapshot(page)
        await page.locator('[data-engine="miami"]').click()
        await page.locator('[data-view="sound"]').first.click()
        await page.locator('[data-engine="chicago"]').click()
        await page.locator('[data-view="roll"]').first.click()
        changed_part = await snapshot(page)
        note = page.locator('#roll-grid [data-note="n6"]')
        note_edit = None
        if next(n for n in changed_part['notes'] if n['id'] == 'n6')['hit']:
            await note.tap()
            await note.press('ArrowUp')
            await expect(note).to_be_focused()
            edited_note = next(n for n in (await draft(page))['notes'] if n['id'] == 'n6')
            await page.locator('#undo').press('Enter')
            restored_note = next(n for n in (await draft(page))['notes'] if n['id'] == 'n6')
            note_edit = {'edited': edited_note, 'afterUndo': restored_note}
        lane = page.locator('#velocity [data-lane-step="15"]')
        endpoint = {'disabled': await lane.is_disabled(), 'label': await lane.get_attribute('aria-label')}
        await page.locator('[data-engine="drum909"]').click()
        await page.locator('.overflow summary').click()
        await page.locator('[data-view="drums"]').click()
        pad = page.locator('.sequencer-grid [data-drum-track="drum909"][data-drum-note="36"]').nth(15)
        drum_lane = page.locator('#drum-lane [data-lane-step="15"]')
        drum_before = {'disabled': await drum_lane.is_disabled(),
                       'label': await drum_lane.get_attribute('aria-label'),
                       'pad': await pad.get_attribute('aria-pressed')}
        original = await draft(page)
        assert [(n['id'], n['velocity']) for n in original['notes']
                if n['start'] == n['end'] == 88200] == [('n8', 88), ('n9', 93)]
        await pad.tap()
        armed = await drum_lane.get_attribute('aria-label')
        await drum_lane.press('ArrowUp')
        edited = await draft(page)
        await page.locator('#undo').press('Enter')
        reverted_edit = await draft(page)
        await page.locator('#undo').press('Enter')
        reverted_pad = await draft(page)
        new = [n for n in edited['notes'] if n['id'] not in {old['id'] for old in original['notes']}]
        assert len(new) == 1 and new[0]['start'] == 82688 and new[0]['pulse'], new
        assert reverted_pad['notes'] == original['notes']
        assert not errors and await page.evaluate('midiCalls') == 0
        return {'fresh': fresh, 'selected': selected, 'panned': panned, 'returned': returned,
                'changedPart': changed_part, 'noteEdit': note_edit, 'sequenceEndpoint': endpoint, 'drumEndpoint': drum_before,
                'drumLastStep': {'armed': armed, 'edited': new[0],
                                 'afterLaneUndo': next(n for n in reverted_edit['notes'] if n['id'] == new[0]['id']),
                                 'sourceEndpointNotesUnchanged': all(n in edited['notes'] for n in original['notes']
                                                                     if n['start'] == n['end'] == 88200),
                                 'notesAfterBothUndo': reverted_pad['notes']}}
    finally:
        await context.close()


def qualify(result):
    for path in ('fresh', 'selected', 'changedPart'):
        case = result[path]
        assert case['part'] == 'chicago' and case['row'] >= 16, (path, case)
        assert all(note['inside'] and note['hit'] for note in case['notes']), (path, case)
        assert not case['clipped'] and case['outer'] == [0, 0, 844, 390], (path, case)
    assert result['panned']['offsets'][1] - result['selected']['offsets'][1] == 27
    assert result['returned']['offsets'] == result['panned']['offsets']
    assert result['returned']['rail'] == result['returned']['offsets'][1]
    edited, restored = result['noteEdit']['edited'], result['noteEdit']['afterUndo']
    assert edited == {**restored, 'note': 58}
    assert (restored['note'], restored['start'], restored['end'], restored['velocity']) == (57, 27562, 30318, 100)
    assert all(result[key]['disabled'] and result[key]['label'] == 'Step 16, 0 notes, velocity empty'
               for key in ('sequenceEndpoint', 'drumEndpoint'))
    last = result['drumLastStep']
    assert last['armed'] == 'Step 16, 1 notes, velocity 100'
    assert last['edited']['velocity'] == 101 and last['afterLaneUndo']['velocity'] == 100
    assert last['sourceEndpointNotesUnchanged']


async def run(args):
    server = runpy.run_path(str(args.root / 'tests/product-remote/envelope-browser.py'))['server']
    receipt = {'viewport': [844, 390], 'normalSandbox': True}
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(chromium_sandbox=True)
        try:
            receipt['browser'] = browser.version
            for name, site in (('before', args.before), ('after', args.after)):
                if site is None:
                    continue
                with server(site) as origin:
                    case = await check(browser, origin, args.output, name)
                case['served'] = {key: digest(site / 'remote' / key) for key in
                                  ('app.mjs', 'step-lane.mjs', 'index.html', 'style.css')}
                case['screenshotSHA256'] = digest(args.output / f'{name}-14-notes.png')
                receipt[name] = case
        finally:
            await browser.close()
    (args.output / 'roll-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    if args.after:
        for path in ('fresh', 'selected', 'changedPart'):
            before, after = receipt['before'][path], receipt['after'][path]
            assert [(n['id'], n['label']) for n in before['notes']] == [(n['id'], n['label']) for n in after['notes']]
            assert before['terminal'] == after['terminal'] and before['pane'] == after['pane']
            assert [note['bounds'][2:] for note in before['notes']] == [note['bounds'][2:] for note in after['notes']]
        assert any(not note['hit'] for note in receipt['before']['selected']['notes'])
    qualify(receipt['after'] if args.after else receipt['before'])
    print('PASS Chicago P01 pitch framing, free pan and parked view, and an actual 909 last-step edit and Undo')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path)
    parser.add_argument('before', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--after', type=Path)
    asyncio.run(run(parser.parse_args()))
