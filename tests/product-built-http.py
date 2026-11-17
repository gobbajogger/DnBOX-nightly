"""Real loopback HTTP checks of built bytes; not browser, device or live Pages proof."""
from functools import partial
from hashlib import sha256
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
import unittest
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import urlopen

REPO = Path(__file__).resolve().parents[1]
OUTPUT = REPO / '.output/product-site'
ROUTES = ['', 'install/', 'manual/', 'manual/legacy.html', 'manual/protocol.html',
          'manual/projects-guide.html', 'manual/original/', 'presets/legacy/',
          'help/', 'new/', 'presets/', 'projects/', 'breaks/', 'starting-breaks/',
          'builds/', 'tools/', 'reference/', 'reference/r22.html', 'reference/current-ui.html']

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

class BuiltHTTP(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((REPO / 'web/product-site/SOURCE-MANIFEST.json').read_text())
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(OUTPUT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}/'
    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join(timeout=3)
    def get(self, name):
        return urlopen(self.base + quote(name, safe='/'), timeout=10)
    def test_all_nineteen_routes_return_exact_built_bytes(self):
        self.assertEqual(len(set(ROUTES)), 19)
        for route in ROUTES:
            name = route + 'index.html' if not route or route.endswith('/') else route
            with self.get(route) as response:
                self.assertEqual(response.status, 200, route)
                self.assertEqual(response.read(), (OUTPUT / name).read_bytes(), route)
    def test_every_manifested_asset_is_served_with_exact_length_and_digest(self):
        for row in self.manifest['files']:
            with self.get(row['path']) as response:
                data = response.read()
                self.assertEqual(response.status, 200, row['path'])
                self.assertEqual(len(data), row['bytes'], row['path'])
                self.assertEqual(sha256(data).hexdigest(), row['sha256'], row['path'])
    def test_all_five_public_preview_urls_serve_verified_wav_not_private_paths(self):
        contract = json.loads((REPO / 'web/product-site/sample-contract.json').read_text())
        for asset in contract['assets']:
            with self.get(f"assets/starting-breaks/{asset['id']}.wav") as response:
                self.assertIn('wav', response.headers.get_content_type())
                self.assertEqual(sha256(response.read()).hexdigest(), asset['preview_sha256'])
            with self.assertRaises(HTTPError) as error:
                self.get(f"private-audio/{asset['id']}.wav")
            self.assertEqual(error.exception.code, 404)
            error.exception.close()
    def test_legacy_redirect_documents_are_available(self):
        for name, target in [('install.html', 'install/'), ('remote.html', 'remote/')]:
            with self.get(name) as response:
                html = response.read().decode()
                self.assertIn(f'content="0;url={target}"', html)
                self.assertIn(f'href="{target}"', html)

if __name__ == '__main__': unittest.main()
