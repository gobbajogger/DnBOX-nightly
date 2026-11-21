#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Capture the initialized product homepage while an unrelated request is pending."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from threading import Thread
import unittest

from PIL import Image
from playwright.sync_api import TimeoutError as BrowserTimeout, sync_playwright

from visual_gate import FREEZE_CSS, FREEZE_JS, wait_for_homepage


class Assets(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


class HomepageReadiness(unittest.TestCase):
    def test_rendered_replay_is_required_with_a_request_still_pending(self):
        web = Path(__file__).resolve().parents[2] / 'web'
        handler = partial(Assets, directory=str(web))
        with ThreadingHTTPServer(('127.0.0.1', 0), handler) as server:
            Thread(target=server.serve_forever, daemon=True).start()
            try:
                self.check_page(f'http://127.0.0.1:{server.server_port}/product-site/index.html')
            finally:
                server.shutdown()

    def check_page(self, url):
        with sync_playwright() as pw, pw.chromium.launch(chromium_sandbox=True) as browser:
            page = browser.new_page(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
            held = []
            page.route('**/readiness-background', lambda route: held.append(route))
            page.add_init_script(FREEZE_JS)
            page.add_init_script("addEventListener('DOMContentLoaded', () => {void fetch('/readiness-background')})")
            page.goto(url)
            page.add_style_tag(content=FREEZE_CSS)
            wait_for_homepage(page)
            self.assertEqual(len(held), 1)
            with Image.open(BytesIO(page.locator('#replay-display svg').screenshot())) as frame:
                self.assertGreater(frame.width, 100)
                self.assertGreater(frame.height, 100)
                self.assertTrue(any(lo < hi for lo, hi in frame.convert('RGB').getextrema()))
            held[0].fulfill(status=204)

            # The pre-rendered fallback already contains an SVG; it cannot prove
            # that the replay module initialized the demo or painted the right frame.
            page.set_default_timeout(700)
            page.eval_on_selector('#demo-status', "el => {el.textContent = 'Source replay. Choose a control demo.'}")
            with self.assertRaises(BrowserTimeout):
                wait_for_homepage(page)
            page.eval_on_selector('#demo-status', "el => {el.textContent = 'Ready.'}")
            page.eval_on_selector('#replay-display svg', "el => el.setAttribute('viewBox', '0 0 1 1')")
            with self.assertRaises(BrowserTimeout):
                wait_for_homepage(page)


if __name__ == '__main__':
    unittest.main()
