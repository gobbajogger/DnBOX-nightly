# SPDX-License-Identifier: GPL-3.0-only
import json
from pathlib import Path
from playwright.async_api import expect
from superj6_bank_journey import fixture

async def exercise(page, save, load):
    dialog = page.locator('#review-dialog')
    def content(doc):
        return {key:value for key,value in doc.items() if key != 'context'}
    async def review():
        await page.locator('[data-view="files"]').click()
        await page.locator('[data-project-action="review"]').click()
        await expect(dialog).to_be_visible()
    async def accept():
        await page.locator('#review-discard').tap()
        await expect(page.locator('#review-keep')).to_be_focused()
        await page.locator('#review-reset').tap()
        await expect(dialog).not_to_be_visible()
    async def song():
        await page.locator('.overflow summary').tap()
        await page.locator('[data-view="song"]').tap()
        await page.locator('.overflow summary').tap()

    initial = await save(page)
    await review()
    await expect(page.locator('#review-discard')).to_be_disabled()
    await dialog.get_by_role('button',name='Return').click()
    # A separate original Synth One file copy must survive local workspace discard.
    await page.locator('[data-view="sound"]').click()
    await page.locator('#sound-bank').select_option('Synth One')
    await page.locator('[data-open-synth-one-files="0"]').click()
    file=page.locator('.s1-file-dialog')
    await file.locator('[data-bank]').select_option('Starter Bank.json')
    cutoff=file.locator('[data-s1-field="cutoff"]')
    await expect(cutoff).to_have_value('2000')
    await cutoff.fill('4321')
    await cutoff.press('Tab')
    await file.locator('[data-close]').click()
    # Seed every core workspace domain with a valid saved Draft, then make ordinary edits.
    original=await save(page)
    original['notes'][0]['velocity']=70
    original['parameters']=[{'id':'current-state-and-reference/mix-parts-live.svg|1:5:0:0','value':61}]
    original['motion']['values'][2]=32
    original['launch']=[3,4,5,6,7]
    original['song']=[{'patterns':[1,2,3,4,5], 'repeats':2,'muteMask':3}]
    original['patternLocks']=[{'catalogId':4098,'pattern':31,'values':[0,127]+[None]*14}]
    original['stepLanes']={'drum909':{'drumAccent':[True]+[None]*15},'chicago':{'gate':[1]+[None]*15,'release':[3]+[None]*15}}
    original['breakSequence']={'loops':[None,None],'slices':[3]+[0]*15,'rate':'1/8','chance':[95]+[None]*15}
    await load(page,original)
    await page.locator('#sound-bank').select_option('SuperJ6')
    name,data=fixture()
    await page.locator('[data-sj6-file]').set_input_files({'name':name,'mimeType':'application/json','buffer':data})
    await expect(page.locator('[data-sj6-program]')).to_be_visible()
    await song()
    before_add=await save(page)
    await page.locator('#song-add').tap()
    before=await save(page)
    assert len(before['song'])==2 and 'superJ6Banks' in before
    await review()
    await expect(page.locator('#changes')).to_contain_text('Song row 2')
    await expect(page.locator('#review-selections')).to_contain_text('SuperJ6 bank')
    await page.locator('#review-discard').tap()
    await expect(page.locator('#review-keep')).to_be_focused()
    await page.keyboard.press('Escape')
    await expect(page.locator('#review-discard')).to_be_focused()
    await page.locator('#review-discard').tap()
    await page.locator('#review-keep').tap()
    await dialog.get_by_role('button',name='Return').click()
    assert content(await save(page))==content(before)
    await review()
    await accept()
    assert content(await save(page))==content(initial)
    await review()
    await expect(page.locator('#review-discard')).to_be_disabled()
    await expect(page.locator('#changes')).to_have_text('No changes.')
    await dialog.get_by_role('button',name='Return').click()
    await page.locator('#undo').tap()
    assert content(await save(page))==content(before)
    # The older Song command keeps its subordinate history on either side of Discard.
    await page.locator('#undo').tap()
    assert content(await save(page))==content(before_add)
    await page.locator('#redo').tap()
    assert content(await save(page))==content(before)
    await page.locator('#redo').tap()
    assert content(await save(page))==content(initial)
    await page.locator('#undo').tap()
    await page.locator('[data-view="sound"]').click()
    async with page.expect_download() as downloaded:
        await page.locator('[data-sj6-save]').tap()
    assert Path(await (await downloaded.value).path()).read_bytes()==data
    await page.locator('#sound-bank').select_option('Synth One')
    await page.locator('[data-open-synth-one-files="0"]').click()
    await expect(cutoff).to_have_value('4321')
    await file.locator('[data-close]').click()
    print('PASS Review discard, keep/escape, all Draft domains, prior shared history, original file copies',flush=True)
