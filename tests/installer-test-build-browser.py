# SPDX-License-Identifier: GPL-3.0-only
"""Verify the download-only test build and starting BREAKs in the actual product installer.

Provide the separately published artifacts with DNBOX_TEST_BUILD_DIR; no binaries
are committed by this test. All requests are provided by offline browser mocks.
"""
import asyncio
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('product', ROOT/'tests/product-remote/funkybeats-browser.py')
PRODUCT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PRODUCT)
FIXTURES = {
    'elite': '3cd2e16cc7119bf82e6274c3f46d2caad0dd576c0818dc43f9ab817a9dd1eee2',
    'pro': 'e62b1dfe4a03c32abc57660dd228fe40ce575d0dd1f2b7cf8920cce82029c785',
}
TEST_NAME = 'DnBOX-0.0.27-SMK37-{}-73749f55-test.fwsc'


async def run(browser, packages):
    context = await browser.new_context(viewport={'width':844, 'height':390}, accept_downloads=True)
    page = await context.new_page()
    await page.add_init_script('''window.midiCalls=0;
        navigator.requestMIDIAccess=()=>{window.midiCalls++;throw Error('No device in test');};''')
    seen = []
    corrupt = False
    async def serve(route):
        url = route.request.url
        for model, wanted in FIXTURES.items():
            suffix = f'/artifacts/nightly-dev/{wanted}/{TEST_NAME.format(model)}'
            if url == 'https://gobbajogger.github.io/DnBOX-nightly' + suffix:
                seen.append(model)
                data = packages[model]
                if corrupt:
                    data = data[:-1] + bytes([data[-1] ^ 1])
                await route.fulfill(status=200, content_type='application/octet-stream',
                                    headers={'Access-Control-Allow-Origin': PRODUCT.ORIGIN}, body=data)
                return
        if url.startswith(PRODUCT.ORIGIN+'/assets/starting-breaks/') and url.endswith('.wav'):
            seen.append(url.rsplit('/',1)[1])
        await PRODUCT.serve(route)
    await context.route('**/*', serve)
    await page.goto(PRODUCT.ORIGIN+'/install/', wait_until='load')
    version = page.locator('#version')
    before = await version.input_value()
    assert before == 'nightly-94197fc8-dev', before
    assert not seen
    await version.select_option('nightly-73749f55-dev')
    download_link = page.locator('#download')
    for model, digest in FIXTURES.items():
        await page.locator(f'#models input[value={model}]').check()
        await expect(download_link).to_have_attribute('download', TEST_NAME.format(model))
        actual = await download_link.evaluate('''async a =>
          Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await (await fetch(a.href)).arrayBuffer())),
                     b => b.toString(16).padStart(2, '0')).join('')''')
        assert actual == digest
    assert await page.locator('#go').is_disabled()
    await page.locator('#devagree').check()
    await page.locator('#go').click()
    await expect(page.locator('#inconfirmtext')).to_contain_text('require an atomic sample snapshot')
    await expect(page.locator('#inconfirmtext')).to_contain_text('Selected samples are download-only')
    await expect(page.locator('#inconfirmtext')).to_contain_text('stop before restart')
    await page.locator('#inconfirmno').click()
    assert await page.evaluate('midiCalls===0')
    corrupt = True
    await page.locator('#models input[value=elite]').check()
    await expect(page.locator('#status')).to_contain_text('The file to install is damaged')
    await expect(download_link).to_be_hidden()
    await expect(page.locator('#go')).to_be_disabled()
    corrupt = False
    await version.select_option(before)
    assert await version.input_value() == before
    seen.clear()
    await page.locator('.stock-options > summary').click()
    await page.locator('#stockfile').set_input_files({'name':TEST_NAME.format('elite'),'mimeType':'application/octet-stream','buffer':packages['elite']})
    await expect(page.locator('#status')).to_contain_text('matching command-line installer')
    await expect(page.locator('#stockgo')).to_be_disabled()
    choices = page.locator('#starting-breaks')
    await expect(choices.locator('[data-action=play]')).to_have_count(5)
    await expect(choices.locator('#breaks-note')).to_contain_text('does not write samples after restart')
    await choices.locator('[data-action=none]').click()
    for button in await choices.locator('[data-action=play]').all():
        await button.click()
        await expect(button).to_have_attribute('aria-pressed','true')
        await button.click()
    assert len(set(seen)) == 5,seen
    await choices.locator('[data-asset=personal-br2-zone2]').check()
    async with page.expect_download() as saving:
        await choices.locator('#download-breaks').click()
    prepared = await saving.value
    assert prepared.suggested_filename == 'DnBOX-starting-breaks.x0xslots'
    assert Path(await prepared.path()).read_bytes().startswith(b'X0XSLOTS')
    assert await page.evaluate('midiCalls===0 && document.documentElement.scrollWidth<=844')
    await context.close()


async def main(site, packages):
    PRODUCT.SOURCE = site
    async with async_playwright() as p:
        browser = await p.chromium.launch(chromium_sandbox=True)
        try:
            await run(browser,packages)
        finally:
            await browser.close()


if __name__ == '__main__':
    fixture_dir = Path(os.environ['DNBOX_TEST_BUILD_DIR'])
    packages = {model:(fixture_dir / TEST_NAME.format(model)).read_bytes() for model in FIXTURES}
    output = ROOT/'.output'
    output.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='installer-test-build-',dir=output) as directory:
        subprocess.run(['node','scripts/build-product-site.mjs','--output',directory],cwd=ROOT,check=True)
        asyncio.run(main(Path(directory),packages))
    print('INSTALLER TEST BUILD PASS: exact per-model files, corruption refused, stable unchanged, five previews, selected archive, zero MIDI calls')
