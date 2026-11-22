# SPDX-License-Identifier: GPL-3.0-only
"""Check owner drum voice rail ink and Draft history on the actual product."""
import argparse
import asyncio
import hashlib
import json
import runpy
from pathlib import Path

from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[3]
MEASURE = """() => {
  const glyphs = [...document.querySelectorAll('.sequencer-grid .drum-voice-glyph')].map(svg => {
    const label = svg.closest('.seq-channel-info');
    return {label:label.getAttribute('aria-label'),current:label.getAttribute('aria-current'),
      rgb:getComputedStyle(svg).color,id:svg.getAttribute('data-r22-glyph'),shape:svg.innerHTML};
  });
  const steps = [...document.querySelectorAll('.sequencer-grid [data-drum-note]')].map(e =>
    [e.dataset.drumNote,e.dataset.drumStart,e.getAttribute('aria-pressed'),e.getAttribute('aria-label')]);
  const shell = document.querySelector('.drum-layout');
  const css = getComputedStyle(shell);
  const paint = k => {
    const sample = document.createElement('span');
    sample.style.color = 'var(' + k + ')';
    shell.append(sample);
    const color = getComputedStyle(sample).color;
    sample.remove();
    return color;
  };
  return {glyphs,steps,ink:paint('--fg'),sound:document.querySelector('.drum-sound-panel .source-scene').dataset.sourceFrame,
    width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,
    gridBounds:[css.gridTemplateColumns,css.gridTemplateRows]};
}"""


def sha(data):
    return hashlib.sha256(data).hexdigest()


def check_rail(state, index, kit):
    assert len(state['glyphs']) == 11
    selected = [(i, g['current']) for i, g in enumerate(state['glyphs']) if g['current'] not in (None, 'false')]
    assert selected == [(index, 'true')], selected
    active = {'909':'rgb(255, 149, 41)', '808':'rgb(255, 72, 65)'}[kit]
    assert all(g['rgb'] == (active if i == index else state['ink']) for i, g in enumerate(state['glyphs'])), state['glyphs']
    assert state['sound'].endswith(f'/{kit}-voice-{index:02}.svg'), state['sound']


async def capture(site, out, source):
    helpers = ROOT / 'tests/product-remote'
    serve = runpy.run_path(str(helpers/'envelope-browser.py'))['server']
    draft = runpy.run_path(str(helpers/'funkybeats-browser.py'))['draft_state']
    receipt = {'source':source, 'files':{name:sha((site/'remote'/name).read_bytes()) for name in
               ['app.mjs','style.css','funkybeats-view.mjs','glyph-registry.mjs']}, 'states':{}, 'errors':[]}
    with serve(site) as origin:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(chromium_sandbox=True)
            receipt['browser'] = browser.version
            try:
                for w, h in [(1440,900),(844,390)]:
                    context = await browser.new_context(viewport={'width':w,'height':h}, has_touch=True,
                                                        reduced_motion='reduce', accept_downloads=True)
                    for kit in ['909','808']:
                        page = await context.new_page()
                        page.on('pageerror', lambda e: receipt['errors'].append(str(e)))
                        await page.goto(origin+'/remote/', wait_until='domcontentloaded')
                        await expect(page.locator('main')).to_have_attribute('aria-busy','false')
                        await page.locator(f'[data-engine="drum{kit}"]').click()
                        await page.locator('.overflow summary').click()
                        await page.locator('[data-view="drums"]').click()
                        if await page.locator('.overflow').get_attribute('open') is not None:
                            await page.locator('.overflow summary').click()
                        await expect(page.locator('#workspace-main')).to_have_attribute('data-layout-view','drums')
                        await page.evaluate('document.fonts.ready')
                        initial = await page.evaluate(MEASURE)
                        check_rail(initial, 0, kit)
                        assert [initial['width'],initial['height']] == [w,h]
                        filename = f'{kit}-{w}x{h}-initial.png'
                        png = await page.screenshot(path=out/filename, animations='disabled')
                        before = await draft(page)
                        target = page.locator(f'#drum{kit}-voice-1 [data-drum-note]').nth(15)
                        pressed = await target.get_attribute('aria-pressed')
                        await target.tap()
                        await expect(target).not_to_have_attribute('aria-pressed', pressed)
                        edited = await draft(page)
                        assert before['notes'] != edited['notes']
                        edited_grid = await page.evaluate(MEASURE)
                        select = page.locator('#sound-voice')
                        await select.select_option('1')
                        await expect(select).to_be_focused()
                        picked = await page.evaluate(MEASURE)
                        check_rail(picked, 1, kit)
                        assert picked['steps'] == edited_grid['steps']
                        stable = lambda state: [(g['id'],g['label'],g['shape']) for g in state['glyphs']]
                        assert stable(picked) == stable(initial)
                        changed = [i for i,(a,b) in enumerate(zip(edited_grid['glyphs'],picked['glyphs']))
                                   if (a['current'],a['rgb']) != (b['current'],b['rgb'])]
                        assert changed == [0,1], changed
                        picked_draft = await draft(page)
                        assert {k:v for k,v in edited.items() if k != 'context'} == {
                            k:v for k,v in picked_draft.items() if k != 'context'}
                        assert picked_draft['context'] == {**edited['context'], 'drumVoice':1}
                        await page.locator('#undo').click()
                        await expect(target).to_have_attribute('aria-pressed', pressed)
                        undone = await draft(page)
                        assert undone['notes'] == before['notes'] and undone['context']['drumVoice'] == 1
                        await page.locator('#redo').click()
                        await expect(target).not_to_have_attribute('aria-pressed', pressed)
                        redone = await draft(page)
                        assert redone['notes'] == edited['notes'] and redone['context']['drumVoice'] == 1
                        rechecked = await page.evaluate(MEASURE)
                        check_rail(rechecked, 1, kit)
                        assert rechecked['steps'] == picked['steps']
                        changed_image = filename.replace('initial','selected')
                        selected_png = await page.screenshot(path=out/changed_image, animations='disabled')
                        compact = lambda state: [{k:v for k,v in glyph.items() if k != 'shape'}
                                                 for glyph in state['glyphs']]
                        key = f'{kit}-{w}x{h}'
                        receipt['states'][key] = {
                            'initialGlyphs':compact(initial),'selectedGlyphs':compact(picked),
                            'changedRows':[i+1 for i in changed], 'gridTargets':len(initial['steps']),
                            'draftSelectionOnly':True,'undoAndRedoExactNoteState':True,
                            'images':{filename:sha(png),changed_image:sha(selected_png)}
                        }
                        (out/'voice-selection.json').write_text(json.dumps(receipt,indent=2)+'\n')
                        print('PASS',key,'11 glyphs, selection changes rows 1 and 2, Draft Undo/Redo',flush=True)
                        await page.close()
                    await context.close()
            finally:
                await browser.close()
    assert len(receipt['states']) == 4 and not receipt['errors'], receipt['errors']


if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('site',type=Path)
    cli.add_argument('output',type=Path)
    cli.add_argument('--source',required=True)
    args=cli.parse_args()
    args.output.mkdir(parents=True,exist_ok=True)
    asyncio.run(capture(args.site.resolve(),args.output.resolve(),args.source))
