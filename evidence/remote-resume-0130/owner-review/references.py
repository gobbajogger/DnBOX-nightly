# SPDX-License-Identifier: GPL-3.0-only
"""Capture all 32 registered Remote Workspace frames without writing baselines."""
import argparse
import hashlib
import json
import re
import runpy
import subprocess
import sys
from contextlib import closing
from io import BytesIO
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[3]
VISUAL = ROOT / 'tests/visual'


def source_closure(site, head):
    if not re.fullmatch(r'[0-9a-f]{40}', head):
        raise ValueError('Use the complete capture commit SHA')
    commit = subprocess.run(
        ['git', '-C', ROOT, 'rev-parse', '--verify', '--end-of-options', head + '^{commit}'],
        capture_output=True, text=True, check=False,
    )
    if commit.returncode or commit.stdout.strip() != head:
        raise ValueError('--head must identify a capture commit')
    comparison = subprocess.run(
        ['git', '-C', ROOT, 'diff', '--quiet', head, '--', 'web/product-site', 'tests/visual/visual_gate.py'],
        check=False,
    )
    if comparison.returncode:
        raise ValueError('Capture source or visual gate differs from --head')
    paths = subprocess.check_output(['git', '-C', ROOT, 'ls-files', '-z', '--', 'web/product-site'])
    filenames = [Path(name.decode()) for name in paths.split(b'\0') if name]
    if not filenames:
        raise ValueError('No tracked capture source files')
    manifest = hashlib.sha256()
    for name in filenames:
        data = (ROOT/name).read_bytes()
        relative = name.relative_to('web/product-site')
        if relative.parts[0] == 'remote' and (site/relative).read_bytes() != data:
            raise ValueError(f'Served {relative} differs from the capture source')
        manifest.update(f'{hashlib.sha256(data).hexdigest()}  {name.as_posix()}\n'.encode())
    return {'files': len(filenames), 'sortedManifestSHA256': manifest.hexdigest()}


def read_donor(path, report):
    donor = json.loads(path.read_text())
    if donor.get('source') != report['source']:
        raise ValueError('Donor captures came from a different commit')
    closure = donor.get('sourceClosure')
    if closure is None and 'sourceInputsManifest' in donor:
        name = donor['sourceInputsManifest']
        if not isinstance(name, str) or Path(name).name != name:
            raise ValueError('Donor source manifest must be a sibling file')
        inputs = json.loads(path.with_name(name).read_text())
        if inputs.get('source') != donor['source']:
            raise ValueError('Donor capture and source manifests name different commits')
        closure = inputs.get('sourceClosure')
    if closure != report['sourceClosure']:
        raise ValueError('Donor capture source closure does not match the target')
    for field in ('productAppSHA256', 'productStyleSHA256'):
        if donor.get(field) != report[field]:
            raise ValueError('Donor capture assets differ from the served product')
    return donor


def capture_output_path(path, snapshots):
    target = path.resolve()
    if target == snapshots or snapshots in target.parents:
        raise ValueError('Capture output must be outside the approved snapshot directory')
    if any(part.is_symlink() for part in (path, *path.parents)):
        raise ValueError('Capture output must not contain symlinks')
    return target


def capture(site, out, head, viewports, resume, gate_output, donor_manifest, collect_only):
    sys.path.insert(0, str(VISUAL))
    gate = runpy.run_path(str(VISUAL / 'visual_gate.py'))
    snapshots = gate['SNAP'].resolve()
    out = capture_output_path(out, snapshots)
    out.mkdir(parents=True, exist_ok=True)
    server = runpy.run_path(str(ROOT / 'tests/product-remote/envelope-browser.py'))['server']
    rows = {}
    errors = []
    def digest(name):
        return hashlib.sha256((site/'remote'/name).read_bytes()).hexdigest()

    app_hash, css_hash = digest('app.mjs'), digest('style.css')
    closure = source_closure(site, head)
    inventory_file = capture_output_path(out/'inventory.json', snapshots)

    def png_path(key):
        return capture_output_path(out/f'{key}.png', snapshots)

    report = {'states':rows, 'errors':errors, 'source':head, 'sourceClosure':closure,
              'productAppSHA256':app_hash, 'productStyleSHA256':css_hash}
    if resume and inventory_file.exists():
        previous = json.loads(inventory_file.read_text())
        for field in ('source', 'sourceClosure', 'productAppSHA256', 'productStyleSHA256'):
            if previous.get(field) != report[field]:
                raise ValueError('Resumed capture source does not match the target')
        for name, state in previous['states'].items():
            assert hashlib.sha256(png_path(name).read_bytes()).hexdigest() == state['sha256'], name
        rows.update(previous['states'])
        errors.extend(previous['errors'])

    def save():
        inventory_file.write_text(json.dumps(report, indent=2)+'\n')
    schedule = viewports or gate['SIZES']
    report['expected'] = [
        f'remote-{name}-{w}x{h}' for w, h in schedule for name, _ in gate['remote_states']()
    ]
    if gate_output:
        donor = read_donor(donor_manifest, report)
        verified = []
        for w, h in schedule:
            for name, _ in gate['remote_states']():
                key = f'remote-{name}-{w}x{h}'
                source = gate_output / f'{key}-actual.png'
                if key in rows or not source.is_file():
                    continue
                data = source.read_bytes()
                actual = hashlib.sha256(data).hexdigest()
                state = donor['states'].get(key)
                if not state or state.get('viewport') != [w, h] or state.get('sha256') != actual:
                    raise ValueError(f'Donor has no matching capture receipt for {key}')
                with Image.open(BytesIO(data)) as png:
                    if png.format != 'PNG' or png.size != (w, h):
                        raise ValueError(f'Invalid donor PNG: {key}')
                    png.verify()
                verified.append((key, png_path(key), data, state))
        for key, target, data, state in verified:
            target.write_bytes(data)
            rows[key] = {'viewport':state['viewport'], 'sha256':state['sha256'],
                         'source':donor['source'], 'capture':'Local gate actual'}
            print('ADOPT', key, state['sha256'], flush=True)
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
                    png = page.screenshot(path=png_path(key))
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
    parser.add_argument('--donor-manifest', type=Path, help='Source closure and per-PNG receipts for --gate-output')
    parser.add_argument('--collect-only', action='store_true', help='Adopt hashes without launching Chromium')
    args = parser.parse_args()
    if bool(args.gate_output) != bool(args.donor_manifest):
        parser.error('--gate-output and --donor-manifest must be supplied together')
    if args.collect_only and not args.gate_output:
        parser.error('--collect-only requires --gate-output')
    report = capture(args.site.resolve(), args.output, args.head, args.size, args.resume,
                     args.gate_output, args.donor_manifest, args.collect_only)
    viewports = {tuple(size) for size in args.size} if args.size else None
    matching = [state for state in report['states'].values()
                if viewports is None or tuple(state['viewport']) in viewports]
    print('Registered', len(matching), 'of', len(report['expected']), flush=True)
    if not args.collect_only:
        assert not report['errors'] and len(matching) == len(report['expected']), report
