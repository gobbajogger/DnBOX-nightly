# SPDX-License-Identifier: GPL-3.0-only
"""Check every Remote page at 844×390 with the pinned emulator running locally."""
import argparse
from contextlib import suppress
import hashlib
import json
import runpy
import subprocess
import tempfile
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError, sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
PARTS = ('chicago', 'miami', 'drum909', 'drum808', 'breaks')


def expected_states():
    return {
        *(f'{view}-{part}' for view in ('roll', 'patterns', 'locks', 'drums') for part in PARTS),
        *(f'{view}-{kit}-{voice}' for view in ('sound', 'original')
          for kit in ('drum909', 'drum808') for voice in range(11)),
        *(f'sound-{part}-{bank}' for part in ('miami', 'chicago') for bank in ('MIAMI', 'CHICAGO', 'Synth One', 'SuperJ6', 'JUNO')),
        *(f'native-sound-{part}' for part in ('miami', 'chicago', 'choice-unavailable')),
        *(f'{source}-mix-{mode}' for source in ('draft', 'native') for mode in ('levels', 'pan', 'sends', 'fx')),
        'break-notes', 'sound-breaks', 'projects', 'song-empty', 'song-row', 'all-part-patterns',
        'review-dialog', 'more-menu', 'connect-feedback', 'draft-invalid', 'draft-import', 'device', 'identity',
    }


def inspect(origin, site, output):
    native_fixture = runpy.run_path(str(HERE / 'native-sound-browser.py'))
    probe = (HERE / 'landscape-reachability.js').read_text()
    state = []
    errors = []
    failures = []
    with sync_playwright() as pw:
        b = pw.chromium.launch(chromium_sandbox=True)
        browser_version = b.version
        ctx = b.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=1, has_touch=True, accept_downloads=True)
        ctx.add_init_script(native_fixture['INSTRUMENT'])
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))

        def snap(name, ref):
            page.evaluate('document.fonts.ready')
            page.wait_for_timeout(50)
            page.evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
            shot = page.screenshot(path=output / (name + '.png'))
            row = page.evaluate(probe)
            row.update(name=name, pdfPages=ref, sha256=hashlib.sha256(shot).hexdigest())
            state.append(row)
            if row['body'][0] != 844 or row['body'][1] != 844 or row['blocked'] or row['horizontalClips']:
                failures.append([name, 'Horizontal overflow or unreachable interactive content', row['body'], row['blocked'], row['horizontalClips']])
            roll = row.get('roll')
            if roll and (roll['row'] < 16 or roll['completeRows'] < 16 or roll['clippedLabels']):
                failures.append([name, 'Pitch rows or labels clipped in landscape', roll])
            print(name, row['controlCount'], len(row['blocked']), row['body'], row.get('roll'), flush=True)

        def view(v):
            if v in ('drums', 'locks', 'song'):
                page.locator('.overflow summary').click()
            page.locator('[data-view="' + v + '"]').click()
            if page.locator('.overflow').evaluate('e=>e.open'):
                page.locator('.overflow summary').click()

        def part(q):
            page.locator('[data-engine="' + q + '"]').click()

        def menu(q):
            if not page.locator('.overflow').evaluate('e=>e.open'):
                page.locator('.overflow summary').click()
            page.locator(q).click()
            if not page.locator('dialog[open]').count() and page.locator('.overflow').evaluate('e=>e.open'):
                page.locator('.overflow summary').click()

        def case(name, fn):
            try:
                fn()
            except Exception as e:
                failures.append([name, str(e)])
                print('CASE ERROR', name, str(e)[:250], flush=True)
                with suppress(PlaywrightError):
                    page.screenshot(path=output / (name + '-error.png'))

        def inspect_part(q):
            part(q)
            view('roll')
            snap('roll-' + q, [1, 2, 14, 15, 21] if q != 'breaks' else [11])
            if q == 'breaks':
                page.locator('[data-break-view="notes"]').click()
                snap('break-notes', [11])
                page.locator('[data-break-view="slices"]').click()
            view('sound')
            if q.startswith('drum'):
                vals = page.locator('#sound-voice option').evaluate_all('es=>es.map(e=>e.value)')
                for v in vals:
                    page.locator('#sound-voice').select_option(v)
                    snap('sound-' + q + '-' + v, [18])
                    page.get_by_role('button', name='Open original', exact=True).click()
                    snap('original-' + q + '-' + v, [18])
                    page.get_by_role('button', name='Return to Sound', exact=True).click()
            elif q in ['chicago', 'miami']:
                vals = page.locator('#sound-bank option').evaluate_all('es=>es.filter(e=>!e.disabled).map(e=>e.value)')
                for v in vals:
                    page.locator('#sound-bank').select_option(v)
                    snap('sound-' + q + '-' + v, [4, 5, 24])
            else:
                snap('sound-breaks', [11])
            for v, ref in [('patterns', [9, 19]), ('locks', [3, 17]), ('drums', [2, 15])]:
                view(v)
                snap(v + '-' + q, ref)

        def mixes(native=False):
            view('mix')
            if native:
                page.locator('[data-mix-source="emulator"]').click()
                page.locator('[data-runtime-key]:enabled').first.wait_for()
            for v in ['levels', 'pan', 'sends', 'fx']:
                page.locator('[data-mix-mode="' + v + '"]').click()
                snap(('native-' if native else 'draft-') + 'mix-' + v, [6, 7, 8, 16, 23])

        def dialogs():
            part('chicago')
            view('files')
            snap('projects', [12, 20])
            view('song')
            snap('song-empty', [10])
            view('patterns')
            page.locator('[data-pattern-scope="all"]').click()
            snap('all-part-patterns', [9, 19])
            for i in range(5):
                page.locator('[data-launch-part="' + str(i) + '"]').first.click()
            view('song')
            page.locator('#song-add').click()
            page.locator('[data-song-pattern]').first.wait_for()
            snap('song-row', [10])
            view('patterns')
            menu('#review')
            snap('review-dialog', [13])
            page.locator('#review-dialog button').click()
            page.locator('.overflow summary').click()
            snap('more-menu', [13])
            page.locator('.overflow summary').click()
            page.locator('#connect').click()
            snap('connect-feedback', [13])
            page.locator('#close-connection').click()
            page.locator('#draft-file').set_input_files({'name': 'invalid.json', 'mimeType': 'application/json', 'buffer': b'{}'})
            page.locator('#draft-dialog[open]').wait_for()
            snap('draft-invalid', [13])
            page.locator('#draft-cancel').click()
            with page.expect_download() as dl:
                menu('#draft-save')
            data = Path(dl.value.path()).read_bytes()
            page.locator('#draft-file').set_input_files({'name': 'session.json', 'mimeType': 'application/json', 'buffer': data})
            page.locator('#draft-dialog[open]').wait_for()
            snap('draft-import', [13])
            page.locator('#draft-cancel').click()

        def native():
            page.goto(origin + '/remote/', wait_until='networkidle')
            menu('#emulator-start')
            page.wait_for_function("document.querySelector('#native-playing').textContent.endsWith('off')", timeout=20000)
            for q in ('miami', 'chicago'):
                part(q)
                view('sound')
                page.locator('[data-sound-source="emulator"]').click()
                if q == 'chicago':
                    page.wait_for_function('soundErrors.length>0')
                    snap('native-sound-choice-unavailable', [5])
                    page.locator('[data-sound-source="draft"]').click()

                    def panel(msg, ms):
                        at = page.evaluate('nativeFrames.at(-1).time')
                        page.evaluate('m=>nativeNodes.at(-1).port.postMessage(m)', msg)
                        page.wait_for_function('t=>nativeFrames.at(-1).time>=t', arg=at + ms, timeout=5000)
                    for _ in range(4):
                        panel(dict(type='turn', role=1, delta=1), 240)
                    panel(dict(type='buttons', bits=16), 110)
                    panel(dict(type='buttons', bits=0), 110)
                    panel(dict(type='turn', role=0, delta=-1), 240)
                    panel(dict(type='turn', role=3, delta=-1), 240)
                    page.locator('[data-sound-source="emulator"]').click()
                page.locator('[data-native-param]:enabled').first.wait_for(timeout=10000)
                snap('native-sound-' + q, [4, 5, 24])
            mixes(True)
            menu('#emulator-stop')
        try:
            page.goto(origin + '/remote/', wait_until='networkidle')
            for q in PARTS:
                case(q, lambda q=q: inspect_part(q))
            case('mix', mixes)
            case('dialogs', dialogs)
            case('native', native)
            for q in ('device', 'identity'):
                page.goto(origin + '/remote/' + q + '/', wait_until='networkidle')
                snap(q, [13])
        finally:
            ctx.close()
            b.close()


    expected = expected_states()
    names = [row['name'] for row in state]
    if set(names) != expected or len(names) != len(expected):
        failures.append(['coverage', sorted(expected - set(names)), sorted(set(names) - expected)])
    report = {
        'browser': browser_version, 'count': len(state), 'failures': failures, 'pageErrors': errors,
        'enabledControlPresentations': sum(row['controlCount'] for row in state),
        'reachablePresentations': sum(row['reachable'] for row in state),
        'manifestSha256': hashlib.sha256((ROOT / 'web/product-site/SOURCE-MANIFEST.json').read_bytes()).hexdigest(),
        'kernelSha256': hashlib.sha256((site / 'emu/kernel.wasm').read_bytes()).hexdigest(),
    }
    (output / 'states.json').write_text(json.dumps(state, indent=2) + '\n')
    (output / 'execution.json').write_text(json.dumps(report, indent=2) + '\n')
    print('844×390 landscape', json.dumps(report), flush=True)
    return not failures and not errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', type=Path, help='existing product build with the pinned emulator')
    parser.add_argument('--output', type=Path, help='fresh directory for per-state screenshots and geometry')
    args = parser.parse_args()
    build = ROOT / '.output'
    build.mkdir(exist_ok=True)
    if args.output:
        output = args.output.resolve()
        output.mkdir(parents=True, exist_ok=False)
    else:
        output = Path(tempfile.mkdtemp(prefix='landscape-evidence-', dir=build))
    print('Landscape evidence:', output, flush=True)
    server = runpy.run_path(str(HERE / 'envelope-browser.py'))['server']
    if args.site:
        site = args.site.resolve()
        with server(site) as origin:
            return inspect(origin, site, output)
    with tempfile.TemporaryDirectory(prefix='landscape-site-', dir=build) as tmp:
        site = Path(tmp)
        subprocess.run(['node', 'scripts/build-product-site.mjs', '--output', site], cwd=ROOT, check=True)
        with server(site) as origin:
            return inspect(origin, site, output)


if __name__ == '__main__':
    raise SystemExit(0 if main() else 1)
