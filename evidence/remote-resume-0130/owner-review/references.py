# SPDX-License-Identifier: GPL-3.0-only
"""Capture all 32 registered Remote Workspace frames without writing baselines."""
import argparse
import hashlib
import json
import runpy
import shutil
import sys
from contextlib import closing
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[3]
VISUAL = ROOT / 'tests/visual'


def capture(site, out, head, viewports, resume, gate_output, collect_only):
    sys.path.insert(0, str(VISUAL))
    gate = runpy.run_path(str(VISUAL / 'visual_gate.py'))
    server = runpy.run_path(str(ROOT / 'tests/product-remote/envelope-browser.py'))['server']
    rows = {}
    errors = []
    def digest(name):
        return hashlib.sha256((site/'remote'/name).read_bytes()).hexdigest()

    app_hash, css_hash = digest('app.mjs'), digest('style.css')
    inventory_file = out/'inventory.json'
    report = {'states':rows, 'errors':errors, 'source':head,
              'productAppSHA256':app_hash, 'productStyleSHA256':css_hash}
    if resume and inventory_file.exists():
        previous = json.loads(inventory_file.read_text())
        assert (previous['source'], previous['productAppSHA256'], previous['productStyleSHA256']) == (
            head, app_hash, css_hash)
        for name, state in previous['states'].items():
            assert hashlib.sha256((out/f'{name}.png').read_bytes()).hexdigest() == state['sha256'], name
        rows.update(previous['states'])
        errors.extend(previous['errors'])

    def save():
        inventory_file.write_text(json.dumps(report, indent=2)+'\n')
    schedule = viewports or gate['SIZES']
    report['expected'] = [
        f'remote-{name}-{w}x{h}' for w, h in schedule for name, _ in gate['remote_states']()
    ]
    if gate_output:
        for w, h in schedule:
            for name, _ in gate['remote_states']():
                key = f'remote-{name}-{w}x{h}'
                source = gate_output / f'{key}-actual.png'
                if key in rows or not source.is_file():
                    continue
                with Image.open(source) as png:
                    assert png.format == 'PNG' and png.size == (w, h), key
                    png.verify()
                target = out / f'{key}.png'
                shutil.copyfile(source, target)
                actual = hashlib.sha256(target.read_bytes()).hexdigest()
                assert actual == hashlib.sha256(source.read_bytes()).hexdigest(), key
                rows[key] = {'viewport':[w,h], 'sha256':actual, 'capture':'Local gate actual'}
                print('ADOPT', key, actual, flush=True)
        save()
    if collect_only:
        return report
    if viewports:
        gate['viewport_contexts'].__globals__['SIZES'] = viewports
    if set(report['expected']) <= rows.keys():
        return report
    with server(site) as origin, sync_playwright() as pw, closing(gate['viewport_contexts'](pw)) as viewports:
        for w, h, context in viewports:
            report['browser'] = context.browser.version
            for name, action in gate['remote_states']():
                key = f'remote-{name}-{w}x{h}'
                if key in rows:
                    continue
                page = context.new_page()
                page.on('pageerror', lambda error: errors.append(f'{key}: {error}'))
                try:
                    page.goto(origin + '/remote/index.html')
                    page.add_style_tag(content=gate['FREEZE_CSS'])
                    page.evaluate('document.fonts.ready')
                    page.wait_for_load_state('networkidle')
                    expect(page.locator('main')).to_have_attribute('aria-busy', 'false')
                    page.wait_for_timeout(250)
                    if action:
                        action(page)
                        page.wait_for_timeout(150)
                    if name.startswith('lane-'):
                        expect(page.locator('#lane-kind')).to_have_value(name.removeprefix('lane-'))
                    if name in ('sound', 'mix', 'patterns', 'files'):
                        expect(page.locator('#workspace-main')).to_have_attribute('data-layout-view', name)
                    detail = page.evaluate("""() => ({
                      body:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
                      hiddenScroll:[document.body.scrollLeft,document.body.scrollTop,scrollX,scrollY],
                      part:document.querySelector('#part').value,
                      view:document.querySelector('#workspace-main').dataset.layoutView,
                      lane:document.querySelector('#lane-kind').value
                    })""")
                    png = page.screenshot(path=out / f'{key}.png')
                    rows[key] = {'viewport':[w,h], 'sha256':hashlib.sha256(png).hexdigest(),
                                 'capture':'Focused replay', **detail}
                    save()
                    print(key, detail, flush=True)
                finally:
                    page.close()
    save()
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('site', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--head', required=True)
    parser.add_argument('--size', nargs=2, type=int, action='append', metavar=('WIDTH', 'HEIGHT'))
    parser.add_argument('--resume', action='store_true', help='Reuse completed captures with exact source and file hashes')
    parser.add_argument('--gate-output', type=Path, help='Adopt native actual PNGs from the exact Local gate')
    parser.add_argument('--collect-only', action='store_true', help='Adopt hashes without launching Chromium')
    args = parser.parse_args()
    if args.collect_only and not args.gate_output:
        parser.error('--collect-only requires --gate-output')
    args.output.mkdir(parents=True, exist_ok=True)
    report = capture(args.site.resolve(), args.output, args.head, args.size, args.resume,
                     args.gate_output, args.collect_only)
    viewports = {tuple(size) for size in args.size} if args.size else None
    matching = [state for state in report['states'].values()
                if viewports is None or tuple(state['viewport']) in viewports]
    print('Registered', len(matching), 'of', len(report['expected']), flush=True)
    if not args.collect_only:
        assert not report['errors'] and len(matching) == len(report['expected']), report
