# SPDX-License-Identifier: GPL-3.0-only
"""Replay a single source-owned control in the actual Remote and compiled C host."""
import argparse
import ast
import asyncio
import json
from pathlib import Path
import runpy

from playwright.async_api import async_playwright, expect

HELPERS = runpy.run_path(str(Path(__file__).with_name('roll-witness.py')))
CORE = 'ba56645b2142b134be3aeee2236406e1c95b2bde'
BINDING = '3b18684ccadfd418675a75357806555c6c0ce9a1672ce8a5cabfba903dc2f608'
PRODUCER = '4094e27b3e25a6436a3e7ac09a899f4a039b6d0076b6f3f8e4666ebe130c9881'
CRC = 0xECCA5979
BUNDLE = {
    'catalog': {'crc': CRC, 'count': 1, 'admitted': True, 'testOnly': True, 'controls': [
        {'id': 1, 'kind': 1, 'min': 0, 'max': 127, 'label': '909 MIX Level'}]},
    'admission': {'catalogCrc': CRC, 'sourceSha': CORE, 'reviewSha': BINDING, 'testOnly': True},
}
UNCONFIRMED = 'Release was not confirmed.'


async def check(browser, origin, producer, injection, drop_close):
    engine = await asyncio.create_subprocess_exec(
        producer, '--serve', stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE)
    context = await browser.new_context(viewport=HELPERS['VIEWPORT'], has_touch=True)
    try:
        page = await context.new_page()
        errors = []
        trace = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        io = asyncio.Lock()

        async def transport(_source, command):
            async with io:
                engine.stdin.write((command + '\n').encode())
                await engine.stdin.drain()
                reply = (await asyncio.wait_for(engine.stdout.readline(), timeout=2)).decode().strip()
            raw = bytes.fromhex(command)
            assert len(raw) == len(bytes.fromhex(reply)) == 51
            delivered = not (drop_close and raw[5] == 7)
            trace.append({'command': command, 'reply': reply, 'delivered': delivered})
            return {'hex': reply if delivered else None}

        await page.expose_binding('dnboxMidi', transport)
        await page.add_init_script(injection)
        await HELPERS['page_ready'](page, origin)
        assert not trace
        assert await page.evaluate("""async () => (await import('/remote/device/catalog.mjs')).REVIEWED_BUNDLE === null""")
        await page.locator('#connect').click()
        await expect(page.locator('#conn-state')).to_have_text('Connected. 1 controls confirmed.')
        controls = page.locator('#firmware-controls [data-fw]')
        await expect(controls).to_have_count(1)
        await expect(controls).to_have_value('75')
        await expect(controls).to_have_attribute('data-fw', '1')
        await expect(page.locator('#apply')).to_be_disabled()
        await page.locator('.overflow summary').click()
        if not drop_close:
            since_read = len(trace)
            await controls.press('ArrowUp')
            await expect(controls).to_have_value('76')
            await expect(page.locator('#apply')).to_be_enabled()
            assert len(trace) == since_read
            await page.locator('#apply').click()
            await expect(page.locator('#conn-state')).to_have_text('Stored 76. Update queued.')
            await expect(controls).to_have_value('76')
            await page.get_by_role('button', name='Undo stored 909 MIX Level value').click()
            await expect(page.locator('#conn-state')).to_have_text('Restored stored value 75. Update queued.')
            await expect(controls).to_have_value('75')
            await expect(page.locator('#firmware-undo')).to_have_count(0)
        await page.locator('.overflow summary').click()
        await page.locator('#connect').click()
        expected_close = UNCONFIRMED if drop_close else 'Disconnected'
        await expect(page.locator('#conn-state')).to_have_text(expected_close)
        await expect(page.locator('#connection-message')).to_have_text(expected_close)
        after_close = len(trace)
        await page.locator('#close-connection').click()
        await expect(page.locator('#connection-result')).to_be_hidden()
        await expect(page.locator('#connect')).to_be_focused()
        after_dismissal = UNCONFIRMED if drop_close else 'Not connected'
        await expect(page.locator('#conn-state')).to_have_text(after_dismissal)
        await expect(page.locator('#apply')).to_be_disabled()
        assert not errors and len(trace) == after_close
        decoded = await page.evaluate("""async trace => {
            const {decodeCommand,decodeReply}=await import('/remote/device/vendor/codec.mjs');
            const data=hex=>Uint8Array.from(hex.match(/../g), bytes=>parseInt(bytes,16));
            return trace.map(({command,reply,delivered})=>({
                command:decodeCommand(data(command)),reply:decodeReply(data(reply)),delivered}));
        }""", trace)
        hello = next(row['reply'] for row in decoded if row['command']['op'] == 0)
        assert (hello['status'], hello['value'], hello['control']) == (0, CRC, 1), hello
        addressed = []
        for row in decoded:
            command, reply = row['command'], row['reply']
            assert command['request'] == reply['request'] and command['op'] == reply['op'], row
            if command['op'] in (2, 3):
                assert command['control'] == reply['control'] == 1, row
                addressed.append([reply[key] for key in ('op', 'status', 'revision', 'value')])
        expected_apply = [[2, 0, 1, 75], [3, 1, 2, 76], [2, 0, 2, 76],
                          [2, 0, 2, 76], [3, 1, 3, 75], [2, 0, 3, 75]]
        assert addressed == (expected_apply[:1] if drop_close else expected_apply), addressed
        assert decoded[-1]['reply']['op'] == 7
        assert decoded[-1]['reply']['status'] == 0
        assert decoded[-1]['delivered'] != drop_close
        return {'wire': trace, 'decoded': decoded, 'addressed': addressed,
                'dismissedHeader': after_dismissal, 'framesAfterDismiss': 0}
    finally:
        await context.close()
        engine.stdin.close()
        assert await asyncio.wait_for(engine.wait(), timeout=3) == 0


async def run(args):
    assert HELPERS['digest'](args.producer) == PRODUCER
    source = (args.root / 'tests/product-remote/firmware-browser.py').read_text()
    tree = ast.parse(source)
    transport = next(ast.literal_eval(node.value) for node in tree.body
                     if isinstance(node, ast.Assign) and
                     any(isinstance(t, ast.Name) and t.id == 'MIDI' for t in node.targets))
    injection = transport.replace('__FIXTURE_BUNDLE_JSON__', json.dumps(BUNDLE))
    server = runpy.run_path(str(args.root / 'tests/product-remote/envelope-browser.py'))['server']
    with server(args.site) as origin:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(chromium_sandbox=True)
            try:
                result = {'browser': browser.version, 'normalSandbox': True, 'viewport': [844, 390],
                          'softwareOnly': True, 'transport': 'browser MIDI adapter to actual C host stdio',
                          'producerSha256': PRODUCER, 'firmwareSourceEvidence': CORE,
                          'testOnlyBundle': BUNDLE,
                          'shippingBundle': None, 'stockAdmitted': False,
                          'confirmed': await check(browser, origin, args.producer, injection, False),
                          'unconfirmed': await check(browser, origin, args.producer, injection, True)}
            finally:
                await browser.close()
    files = ('app.mjs', 'firmware-link.mjs', 'device/catalog.mjs', 'device/session.mjs',
             'device/vendor/client.mjs', 'device/vendor/codec.mjs')
    result['served'] = {name: HELPERS['digest'](args.site / 'remote' / name) for name in files}
    args.output.write_text(json.dumps(result, indent=2) + '\n')
    print('PASS actual 844×390 browser read75, keyboard stage and Apply76, fresh read76, guarded Undo75, fresh read75')
    print('PASS confirmed CLOSE and idle dismissal, dropped CLOSE reply preserves unconfirmed release, zero extra traffic')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('root', 'site', 'producer', 'output'):
        parser.add_argument(name, type=lambda value: Path(value).resolve())
    asyncio.run(run(parser.parse_args()))
