# SPDX-License-Identifier: GPL-3.0-only
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import urlopen

import serve_source


class SourceServer(unittest.TestCase):
    def test_only_exact_asset_url_reads_the_canonical_file(self):
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            site = root / 'web/product-site'
            site.mkdir(parents=True)
            (site / 'index.html').write_bytes(b'real source')
            (root / 'package-version-assignments.json').write_bytes(b'current assignments')
            (root / 'private.txt').write_bytes(b'outside web')
            stale = root / '.output/product-site/package-version-assignments.json'
            stale.parent.mkdir(parents=True)
            stale.write_bytes(b'stale product output')
            handler = partial(serve_source.SiteSourceHandler, directory=root / 'web')
            with patch.object(serve_source, 'ROOT', root), ThreadingHTTPServer(('127.0.0.1', 0), handler) as server:
                thread = Thread(target=server.serve_forever)
                thread.start()
                try:
                    base = f'http://127.0.0.1:{server.server_port}'
                    with urlopen(base + serve_source.ASSIGNMENTS_URL + '?v=1') as response:
                        self.assertEqual(response.read(), b'current assignments')
                    with urlopen(base + '/product-site/index.html') as response:
                        self.assertEqual(response.read(), b'real source')
                    for missing in ['/package-version-assignments.json', '/product-site/private.txt',
                                    serve_source.ASSIGNMENTS_URL + '/extra']:
                        with self.subTest(missing=missing), self.assertRaises(HTTPError) as caught:
                            urlopen(base + missing)
                        self.assertEqual(caught.exception.code, 404)
                finally:
                    server.shutdown()
                    thread.join()
