# SPDX-License-Identifier: GPL-3.0-only
from playwright.async_api import expect


async def exercise(page, draft_state, load_draft):
    old = await draft_state(page)
    lane = page.locator('#lane-kind')
    cycle = page.locator('#lane-param')
    cells = page.locator('#velocity [data-lane-step]')
    notes = old['notes']

    async def choose_lane():
        for _ in range(10):
            if await lane.input_value() == 'patternLock':
                return
            await cycle.click()
        raise AssertionError('Pattern lock missing from the thin lane')

    async def target(part, pattern):
        await page.locator('[data-view="patterns"]').click()
        await page.locator(f'[data-launch-part="{part}"][data-pattern="{pattern}"]').click()
        await page.locator('[data-view="roll"]').click()
        if part == 4:
            await page.locator('[data-break-view="notes"]').click()
        await choose_lane()
        await expect(cycle).to_contain_text('P' + str(pattern + 1).zfill(2))

    async def rows():
        doc = await draft_state(page)
        assert doc['notes'] == notes and doc['motion'] == old['motion']
        return {(r['catalogId'],r['pattern']):r['values'] for r in doc.get('patternLocks',[])}

    await choose_lane()
    await expect(cycle).to_contain_text('Pick pattern')
    assert 'Pick in Patterns' in await cycle.get_attribute('aria-label')
    assert await cells.count() == 16 and await cells.locator('xpath=self::*[@disabled]').count() == 16
    await target(2, 0)
    await cells.nth(15).press('ArrowUp')
    await expect(cells.nth(15)).to_be_focused()
    assert (await rows())[4098,0][15] == 33
    await page.locator('#undo').click();assert await rows() == {}
    await page.locator('#redo').click();assert (await rows())[4098,0][15] == 33
    await target(2,31)
    await expect(cells.nth(15)).to_have_attribute('aria-valuetext','Unset')
    await cells.nth(15).press('ArrowDown');assert (await rows())[4098,31][15] == 31
    await cells.nth(15).press('Delete');assert (4098,31) not in await rows()
    selected = (await draft_state(page))['context']['selected']
    await cells.nth(0).scroll_into_view_if_needed()
    a,b=await cells.nth(0).bounding_box(),await cells.nth(2).bounding_box()
    await page.mouse.move(a['x']+a['width']/2,a['y']+2);await page.mouse.down()
    await page.mouse.move(b['x']+b['width']/2,b['y']+2,steps=5)
    await page.mouse.move(b['x']+b['width']/2,b['y']+b['height']-2,steps=4);await page.mouse.up()
    points=(await rows())[4098,31]
    assert points[0]==127 and points[2]==0 and points[1] is not None,points
    assert (await draft_state(page))['context']['selected'] == selected
    await page.locator('#undo').click();assert (4098,31) not in await rows()
    await page.locator('#redo').click();assert (await rows())[4098,31]==points
    await page.locator('[data-engine="miami"]').click()
    assert await lane.input_value() != 'patternLock'
    await page.locator('[data-view="sound"]').click();await page.locator('#sound-bank').select_option('CHICAGO')
    await target(3,0)
    await cells.nth(0).press('ArrowDown')
    assert (await rows())[4130,0][0] == 31
    await page.locator('[data-engine="breaks"]').click()
    await target(4,2)
    await cells.nth(7).press('ArrowDown')
    assert (await rows())[1153,2][7] == 126
    if not await page.locator('.overflow').evaluate('e=>e.open'):
        await page.locator('.overflow summary').click()
    await page.locator('#review').click()
    await expect(page.locator('#changes')).to_contain_text('BREAK · P03 · Step 8 · Level lock: 126 raw')
    await page.locator('#review-dialog').get_by_role('button',name='Return').click()
    saved = await draft_state(page)
    await load_draft(page,saved);await page.locator('[data-break-view="notes"]').click();await choose_lane()
    await expect(cells.nth(7)).to_have_attribute('aria-valuetext','126 raw')
    assert await rows() == {(r['catalogId'],r['pattern']):r['values'] for r in saved['patternLocks']}
    await load_draft(page,old);assert await rows() == {}
    print('PATTERN_LOCK_BROWSER PASS owners 2/3/4, separate P01/P32, explicit target, empty steps, multi-point 127-to-0 gesture, Undo/Redo, delete, review and round trip',flush=True)
