# SPDX-License-Identifier: GPL-3.0-only
"""Five real-browser FunkyBeats surfaces, local draft only; no device access.

Serve repository bytes through Playwright routing, without a test HTTP server.
Use Playwright's bundled Chromium with its normal sandbox. Never fall back to
an unsandboxed browser. Each case receives a fresh page and tests an edit plus
its persistence/undo, rather than accepting only that a heading is visible.
"""
import asyncio
import mimetypes
from pathlib import Path
from urllib.parse import unquote, urlparse
from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'web/product-site'
ORIGIN = 'https://dnbox.test'

async def serve(route):
    url = urlparse(route.request.url)
    if url.netloc != 'dnbox.test':
        await route.abort()
        return
    path = (SOURCE / unquote(url.path).lstrip('/')).resolve()
    if not path.is_relative_to(SOURCE.resolve()):
        await route.fulfill(status=403, body='Forbidden')
        return
    if path.is_dir():
        path /= 'index.html'
    if not path.is_file():
        await route.fulfill(status=404, body='Not found')
        return
    mime = 'text/javascript' if path.suffix == '.mjs' else mimetypes.guess_type(path)[0] or 'application/octet-stream'
    await route.fulfill(status=200, content_type=mime, body=path.read_bytes())

async def roll(page):
    note = page.locator('#roll-grid [data-note]').first
    identity = await note.get_attribute('data-note')
    before = await note.get_attribute('aria-label')
    await note.press('ArrowUp')
    target = page.locator(f'#roll-grid [data-note="{identity}"]')
    await expect(target).not_to_have_attribute('aria-label', before)
    await page.locator('#undo').click()
    await expect(target).to_have_attribute('aria-label', before)

async def sequencer(page):
    await page.locator('.overflow summary').click()
    await page.locator('[data-view="drums"]').click()
    await page.locator('.overflow summary').click()
    cells = page.locator('.funkybeats-sequencer [data-drum-note]')
    await expect(cells).to_have_count(176)
    cell = cells.first
    before = await cell.get_attribute('aria-pressed')
    await cell.click()
    await expect(cells.first).to_have_attribute('aria-pressed', 'false' if before == 'true' else 'true')
    await page.locator('#undo').click()
    await expect(cells.first).to_have_attribute('aria-pressed', before)

async def mixer(page):
    await page.locator('[data-view="mix"]').click()
    faders = page.locator('input.mixer-fader[data-native-param]')
    await expect(faders).to_have_count(5)
    slider = faders.first
    before = await slider.input_value()
    await slider.press('ArrowRight')
    await expect(slider).not_to_have_value(before)
    after = await slider.input_value()
    await page.locator('[data-view="roll"]').click()
    await page.locator('[data-view="mix"]').click()
    await expect(faders.first).to_have_value(after)
    await page.locator('#undo').click()
    await expect(faders.first).to_have_value(before)

async def launcher(page):
    await page.locator('[data-view="patterns"]').click()
    await expect(page.locator('[data-launch-part]')).to_have_count(160)
    cell = page.locator('[data-launch-part="0"][data-pattern="1"]')
    await cell.click()
    await expect(cell).to_have_attribute('aria-pressed', 'true')
    await page.locator('[data-view="roll"]').click()
    await page.locator('[data-view="patterns"]').click()
    await expect(cell).to_have_attribute('aria-pressed', 'true')
    await expect(page.locator('[data-launch-part="0"][aria-pressed="true"]')).to_have_count(1)

async def synth(page):
    await page.locator('[data-engine="chicago"]').click()
    await page.locator('[data-view="sound"]').click()
    slider = page.locator('.funkybeats-typed-unit input[data-native-param]').first
    await expect(slider).to_be_visible()
    before = await slider.input_value()
    await slider.press('ArrowRight')
    await expect(slider).not_to_have_value(before)
    await expect(slider).not_to_have_attribute('aria-valuetext', '—')
    await page.locator('#undo').click()
    await expect(slider).to_have_value(before)

async def main():
    notice = (ROOT / 'LICENSES/FunkyBeats-MIT.md').read_text()
    assert 'Permission is hereby granted' in notice
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(chromium_sandbox=True)
        try:
            for case in (roll, sequencer, mixer, launcher, synth):
                context = await browser.new_context(viewport={'width': 844, 'height': 390})
                await context.route('**/*', serve)
                page = await context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                await page.add_init_script('navigator.requestMIDIAccess=()=>{throw Error("Device access forbidden in local draft test")};')
                await page.goto(ORIGIN + '/remote/')
                await page.wait_for_function('document.getElementById("status").textContent.includes("Draft")')
                await case(page)
                assert not errors, errors
                print(f'PASS FunkyBeats {case.__name__}', flush=True)
                await context.close()
        finally:
            await browser.close()
    print('FUNKYBEATS-BROWSER pages=5 failures=0')

if __name__ == '__main__':
    asyncio.run(main())
