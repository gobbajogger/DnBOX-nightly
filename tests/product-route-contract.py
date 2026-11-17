"""W1 source/build route contract, not an HTTP or browser acceptance claim."""
import ast
import json
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

REPO = Path(__file__).resolve().parents[1]
SOURCE = REPO / 'web/product-site'
ROUTES = ['', 'install/', 'manual/', 'manual/legacy.html', 'manual/protocol.html',
          'manual/projects-guide.html', 'manual/original/', 'presets/legacy/',
          'help/', 'new/', 'presets/', 'projects/', 'breaks/', 'starting-breaks/',
          'builds/', 'tools/', 'reference/', 'reference/r22.html', 'reference/current-ui.html']
REDIRECTS = {'install.html': 'install/', 'remote.html': 'remote/'}

class Redirect(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refreshes = []
        self.links = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta' and attrs.get('http-equiv', '').lower() == 'refresh':
            self.refreshes.append(attrs.get('content', ''))
        if tag == 'a':
            self.links.append(attrs.get('href', ''))

def redirect_errors(html, expected):
    parser = Redirect()
    parser.feed(html)
    errors = []
    if len(parser.refreshes) != 1:
        return ['exactly one refresh required']
    delay, separator, target = parser.refreshes[0].partition(';')
    if delay.strip() != '0' or not separator or not target.strip().lower().startswith('url='):
        return ['immediate URL refresh required']
    target = target.strip()[4:].strip()
    url = urlsplit(target)
    if url.scheme or url.netloc or url.query or url.fragment or unquote(url.path) != expected:
        errors.append('unexpected redirect destination')
    if target not in parser.links:
        errors.append('matching accessible fallback link required')
    return errors

class ProductRoutes(unittest.TestCase):
    def test_all_nineteen_routes_are_manifested_and_built_byte_identically(self):
        self.assertEqual(len(ROUTES), 19)
        self.assertEqual(len(set(ROUTES)), 19)
        manifest = json.loads((SOURCE / 'SOURCE-MANIFEST.json').read_text())
        names = {row['path'] for row in manifest['files']}
        for route in ROUTES:
            name = route + 'index.html' if not route or route.endswith('/') else route
            self.assertIn(name, names)
            self.assertEqual((SOURCE / name).read_bytes(),
                             (REPO / '.output/product-site' / name).read_bytes(), name)

    def test_browser_runner_covers_the_same_nineteen_routes(self):
        tree = ast.parse((REPO / 'tests/product-site-browser.py').read_text())
        values = [ast.literal_eval(node.value) for node in tree.body
                  if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'routes' for t in node.targets)]
        self.assertEqual(values, [ROUTES])

    def test_both_legacy_redirects_keep_immediate_local_destination_and_fallback(self):
        for name, target in REDIRECTS.items():
            html = (SOURCE / name).read_text()
            self.assertEqual(redirect_errors(html, target), [], name)
            self.assertTrue((SOURCE / target / 'index.html').is_file())
            self.assertEqual((SOURCE / name).read_bytes(),
                             (REPO / '.output/product-site' / name).read_bytes())
            self.assertNotIn(target + 'index.html', REDIRECTS, 'no redirect chain')

    def test_redirect_mutants_fail_closed(self):
        good = '<meta http-equiv="refresh" content="0;url=install/"><a href="install/">Install</a>'
        self.assertEqual(redirect_errors(good, 'install/'), [])
        for mutant in [good.replace('0;', '5;'), good.replace('url=install/', 'url=https://example.com/'),
                       good.replace('url=install/', 'url=remote/'), good.replace('href="install/"', 'href="remote/"'),
                       good + '<meta http-equiv="refresh" content="0;url=remote/">',
                       good.replace('url=install/', 'url=install/?redirect=remote')]:
            self.assertTrue(redirect_errors(mutant, 'install/'), mutant)

if __name__ == '__main__':
    unittest.main()
