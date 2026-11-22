"""Trace the unmodified Delay type Browser Remote journey in an immutable product build."""
import argparse
import asyncio
import hashlib
import importlib.util
import json
from pathlib import Path

from playwright.async_api import async_playwright, expect


TRACE = """
window.midiCalls = 0;
window.historyTrace = [];
navigator.requestMIDIAccess = () => {
    midiCalls++;
    throw Error('Physical MIDI is not part of this fixture');
};
const snapshot = (phase, event) => {
    const select = document.querySelector('[data-delay-type]');
    const elements = ['undo','redo','parameter-undo'].map(id => document.getElementById(id)).filter(Boolean);
    const controls = elements.map(node => {
        const box = node.getBoundingClientRect();
        const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return { id: node.id, disabled: node.disabled, hit: node.contains(hit), box: box.toJSON() };
    });
    historyTrace.push({
        phase, target: event?.target?.closest('button')?.id, active: document.activeElement?.id,
        controls, mode: document.querySelector('[data-mix-view]')?.dataset.mixView,
        value: select?.value, scope: document.getElementById('workspace-main')?.dataset.layoutView,
        status: document.getElementById('status')?.textContent,
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
    });
};
document.addEventListener('click', event => {
    if (!event.target.closest('#undo,#redo,#parameter-undo,[data-delay-type]')) return;
    snapshot('before', event);
    queueMicrotask(() => snapshot('microtask', event));
    requestAnimationFrame(() => snapshot('frame', event));
}, true);
window.diagnosticSnapshot = snapshot;
"""


def path_module(path):
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


async def run(args):
    test = path_module(args.source / 'tests/product-remote/mix-family-browser.py')
    test.core.SOURCE = args.site
    args.out.mkdir(parents=True, exist_ok=True)
    errors = []
    report = {
        'testedGitCommit': args.commit,
        'viewport': args.size,
        'assets': {name: hashlib.sha256((args.site / name).read_bytes()).hexdigest()
                   for name in ['SOURCE-TRACE.json', 'remote/app.mjs', 'remote/style.css']},
        'pageErrors': errors,
    }
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(chromium_sandbox=True)
        report['chromium'] = browser.version
        context = await browser.new_context(
            viewport=dict(zip(['width', 'height'], args.size)), has_touch=True, accept_downloads=True
        )
        await context.route('**/*', test.core.serve)
        page = await context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('crash', lambda _: errors.append('Chromium renderer crash'))
        page.on('close', lambda _: report.update(closed=True))
        await page.add_init_script(TRACE)
        try:
            await page.goto(test.core.ORIGIN + '/remote/')
            await expect(page.locator('main')).to_have_attribute('aria-busy', 'false')
            await page.locator('[data-view="mix"]').click()
            await page.locator('.mixer-fader').first.wait_for()
            before = await test.state(page)
            await test.check_master_destination(page, before, *args.size)
            for mode in ['levels', 'pan', 'sends', 'fx']:
                await test.mode(page, mode)
            await test.check_delay_type(page)
            report['result'] = 'pass'
        except Exception as err:
            report['result'] = 'fail'
            report['error'] = str(err)
            if not page.is_closed() and 'Chromium renderer crash' not in errors:
                await page.screenshot(path=args.out / 'failure.png', timeout=4000)
        finally:
            if not page.is_closed() and 'Chromium renderer crash' not in errors:
                await page.evaluate("diagnosticSnapshot('end')")
                report['historyTrace'] = await page.evaluate('historyTrace')
                report['midiCalls'] = await page.evaluate('midiCalls')
            (args.out / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
            await browser.close()
    print(json.dumps({k: v for k, v in report.items() if k != 'historyTrace'}, indent=2))
    return report['result'] != 'pass' or bool(errors)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('site', type=Path)
    parser.add_argument('out', type=Path)
    parser.add_argument('--commit', required=True)
    parser.add_argument('--size', type=int, nargs=2, default=[1440, 900])
    raise SystemExit(asyncio.run(run(parser.parse_args())))
