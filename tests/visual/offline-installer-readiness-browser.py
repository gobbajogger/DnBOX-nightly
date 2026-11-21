#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Require the rendered empty installer and both initialized workspace frames."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import unittest

from playwright.sync_api import TimeoutError as BrowserTimeout, sync_playwright

from visual_gate import wait_for_offline_installer


class Assets(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


class OfflineInstallerReadiness(unittest.TestCase):
    def test_rendered_preview_with_pending_frame_activity(self):
        directory = Path(__file__).resolve().parents[2] / 'docs'
        with ThreadingHTTPServer(('127.0.0.1', 0), partial(Assets, directory=str(directory))) as server:
            Thread(target=server.serve_forever, daemon=True).start()
            try:
                self.check_preview(f'http://127.0.0.1:{server.server_port}/install/index.html')
            finally:
                server.shutdown()

    def check_preview(self, url):
        with sync_playwright() as pw, pw.chromium.launch(chromium_sandbox=True) as browser:
            page = browser.new_page(viewport={'width': 1024, 'height': 640}, reduced_motion='reduce')
            held = []
            page.route('**/readiness-background', lambda route: held.append(route))
            page.add_init_script("""if (location.pathname === '/projects/') {
                addEventListener('DOMContentLoaded', () => { void fetch('/readiness-background') });
            }""")
            page.goto(url)
            wait_for_offline_installer(page)
            self.assertEqual(len(held), 1)
            self.assertTrue(page.locator('#noversion').is_visible())
            self.assertTrue(page.locator('#go').is_disabled())
            held[0].fulfill(status=204)

            page.eval_on_selector('#noversion', 'notice => {notice.hidden = true}')
            with self.assertRaises(BrowserTimeout):
                wait_for_offline_installer(page, timeout=700)
            page.eval_on_selector('#noversion', 'notice => {notice.hidden = false}')
            page.frame_locator('#project-frame').locator('body').evaluate(
                '() => { window.projectWorkspace = undefined }')
            with self.assertRaises(BrowserTimeout):
                wait_for_offline_installer(page, timeout=700)


if __name__ == '__main__':
    unittest.main()
