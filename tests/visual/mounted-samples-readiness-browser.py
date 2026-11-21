#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Require the mounted Samples chooser, its initialized controls and its shipped assets."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import unittest

from playwright.sync_api import TimeoutError as BrowserTimeout, sync_playwright

from visual_gate import wait_for_mounted_samples


class Assets(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


class MountedSamplesReadiness(unittest.TestCase):
    def test_initialized_chooser_and_assets(self):
        web = Path(__file__).resolve().parents[2] / 'web'
        with ThreadingHTTPServer(('127.0.0.1', 0), partial(Assets, directory=str(web))) as server:
            Thread(target=server.serve_forever, daemon=True).start()
            try:
                self.check_chooser(f'http://127.0.0.1:{server.server_port}/product-site/breaks/index.html')
            finally:
                server.shutdown()

    def check_chooser(self, url):
        with sync_playwright() as pw, pw.chromium.launch(chromium_sandbox=True) as browser:
            page = browser.new_page()
            held = []
            page.route('**/readiness-background', lambda route: held.append(route))
            page.add_init_script("""if (!sessionStorage.testedBackground) {
                sessionStorage.testedBackground = '1';
                addEventListener('DOMContentLoaded', () => { void fetch('/readiness-background') });
            }""")
            page.goto(url)
            wait_for_mounted_samples(page)
            self.assertEqual(len(held), 1)
            self.assertTrue(page.locator('#auditionFile').is_visible())
            with self.assertRaises(BrowserTimeout):
                page.wait_for_load_state('networkidle', timeout=700)
            held[0].fulfill(status=204)

            page.eval_on_selector('#auditionFile', 'input => { input.onchange = null }')
            with self.assertRaises(BrowserTimeout):
                wait_for_mounted_samples(page, timeout=700)

            for pattern in ('**/tool-theme.css', '**/BarlowSemiCondensed-Bold.ttf'):
                with self.subTest(asset=pattern):
                    page.route(pattern, lambda route: route.fulfill(status=404, body='Missing'))
                    with page.expect_response(lambda response: response.status == 404):
                        page.reload()
                    page.evaluate('document.fonts.ready')
                    self.assertTrue(page.locator('#auditionFile').is_visible())
                    self.assertEqual(page.evaluate("typeof document.querySelector('#auditionFile').onchange"), 'function')
                    with self.assertRaises(BrowserTimeout):
                        wait_for_mounted_samples(page, timeout=700)
                    page.unroute(pattern)


if __name__ == '__main__':
    unittest.main()
