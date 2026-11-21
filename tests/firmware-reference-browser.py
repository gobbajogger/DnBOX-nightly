#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Compare rendered browser canvas pixels to independent native FWUI captures."""
import argparse
import base64
import hashlib
import io
import json
import subprocess
import tempfile
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ORACLE = ROOT / 'tests/firmware-reference/native-rgb.tsv'
SHA = '61827a714ca7b240c01a55ed347b5fd7b847c7c2'


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def sweep(page, origin, site):
    expected = dict(line.split('\t') for line in ORACLE.read_text().splitlines())
    manifest = json.loads((site / 'reference/screens/states.json').read_text())
    states = manifest['states']
    assert manifest['firmware'] == SHA
    assert len(expected) == len(states) == 1838
    assert {row[0] for row in states} == set(expected)
    page.goto(origin + '/reference/screens/')
    page.wait_for_selector('#lcd[data-state]')
    assert page.locator('a[href$="' + SHA + '"]').count() == 1
    actual = {}
    observations = 0
    # Drive the same WASM program and paint function used by the public selector.
    # Encode each rendered canvas immediately; retrieve compact PNGs in small batches.
    for mod, family in sorted({(row[3], row[4]) for row in states}):
        required = {r[0] for r in states if r[3:] == [mod, family]}
        captured = set()
        length = page.evaluate("""async ([file, family]) => {
          const {runFixture} = await import('./runner.mjs');
          const {paintFrame} = await import('./render.mjs');
          const response = await fetch(file);
          if (!response.ok) throw Error('Missing firmware module ' + file);
          const module = await WebAssembly.compile(await response.arrayBuffer());
          const canvas = document.querySelector('#lcd');
          const context = canvas.getContext('2d');
          window.screenSweep = [];
          runFixture(module, family, (id, pixels) => {
            paintFrame(context, pixels);
            window.screenSweep.push([id, canvas.toDataURL('image/png').split(',')[1]]);
          });
          return window.screenSweep.length;
        }""", [manifest['modules'][mod], family])
        observations += length
        for first in range(0, length, 24):
            for name, png in page.evaluate('n => window.screenSweep.slice(n,n+24)', first):
                with Image.open(io.BytesIO(base64.b64decode(png))) as im:
                    assert im.format == 'PNG' and im.size == (240, 240), name
                    if im.mode == 'RGBA':
                        assert im.getchannel('A').getextrema() == (255, 255), name
                    digest = hashlib.sha256(im.convert('RGB').tobytes()).hexdigest()
                assert digest == expected[name], f'{name}: {digest} differs from native {expected[name]}'
                actual[name] = digest
                captured.add(name)
        assert required <= captured, required - captured
        page.evaluate('delete window.screenSweep')
    assert actual == expected
    assert observations == 1912, observations
    # Exercise visible selection, group routing, URL restoration, and actual 1:1 CSS size.
    for viewport in [(1440, 900), (390, 844), (844, 390)]:
        page.set_viewport_size(dict(zip(('width', 'height'), viewport)))
        for mod in range(len(manifest['modules'])):
            name, group, *_ = next(r for r in states if r[3] == mod)
            page.locator('#group').select_option(str(group))
            page.locator('#state').select_option(name)
            page.wait_for_function('s => document.querySelector("#lcd").dataset.state === s', arg=name)
            assert page.url.endswith('#' + name)
            page.locator('#lcd').scroll_into_view_if_needed()
            box = page.locator('#lcd').bounding_box()
            assert box['width'] == box['height'] == 240
            # The page's text layout can start the LCD between device pixels.
            # Capture the 240 integer rows Chromium actually paints.
            clip = {key: round(value) for key, value in box.items()}
            with Image.open(io.BytesIO(page.screenshot(clip=clip))) as im:
                assert im.size == (240, 240), name
                assert hashlib.sha256(im.convert('RGB').tobytes()).hexdigest() == expected[name], name
    # Changing the group or pressing an arrow repeatedly must discard the old
    # walk before another large state selection can start behind it.
    late = next(r for r in states if r[0] == 'window-part3-page3')
    page.locator('#group').select_option(str(late[1]))
    page.evaluate("""target => {
      const control = document.querySelector('#state');
      const ids = Array.from(control.options, opt => opt.value);
      for (const id of [...ids.slice(-10), target]) {
        control.value = id;
        control.dispatchEvent(new Event('change'));
      }
    }""", late[0])
    name = late[0]
    page.wait_for_function('s => document.querySelector("#lcd").dataset.state === s', arg=name)
    page.reload()
    page.wait_for_function('s => document.querySelector("#lcd").dataset.state === s', arg=name)
    print(f'PASS {len(actual)} named screens, {observations} browser canvas frames, {len(actual)*57600:,} unique-state pixels')


def check(site):
    errors = []
    with ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=site)) as server:
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with sync_playwright() as pw:
                browser = pw.chromium.launch(chromium_sandbox=True)
                try:
                    page = browser.new_page(device_scale_factor=1)
                    page.on('pageerror', lambda err: errors.append(str(err)))
                    sweep(page, f'http://127.0.0.1:{server.server_port}', site)
                    assert not errors, errors
                finally:
                    browser.close()
        finally:
            server.shutdown()
            thread.join()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', type=Path)
    args = parser.parse_args()
    if args.site:
        check(args.site.resolve())
    else:
        output = ROOT / '.output'
        output.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='fwui-', dir=output) as run:
            subprocess.run(['node', 'scripts/build-product-site.mjs', '--output', run], cwd=ROOT, check=True)
            check(Path(run))
