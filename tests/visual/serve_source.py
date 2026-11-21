# SPDX-License-Identifier: GPL-3.0-only
"""Serve site sources with the same canonical package assignments as the product build."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[2]
ASSIGNMENTS_URL = '/product-site/package-version-assignments.json'


class SiteSourceHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        if urlsplit(path).path == ASSIGNMENTS_URL:
            return str(ROOT / 'package-version-assignments.json')
        return super().translate_path(path)


if __name__ == '__main__':
    handler = partial(SiteSourceHandler, directory=ROOT / 'web')
    with ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1])), handler) as server:
        server.serve_forever()
