#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Every link in every <nav> of the built site, plus the known entry routes, answers HTTP 200.

Builds the product site into a temporary directory, serves it over HTTP and requests each internal
nav target (directories resolve to index.html, as GitHub Pages does). With --live BASE it checks the
published site instead (e.g. --live https://gobbajogger.github.io/DnBOX-nightly/).
"""
import html.parser, http.server, subprocess, sys, tempfile, threading, urllib.request, urllib.error
from functools import partial
from pathlib import Path
from urllib.parse import urljoin, urlparse

ROOT = Path(__file__).resolve().parents[1]
# Entry routes people open directly; /emulator/ is the browser instrument's old name and redirects to /emu/.
ENTRY = ['', 'remote/', 'emu/', 'emulator/', 'install/', 'breaks/', 'projects/', 'presets/', 'manual/', 'builds/', 'new/', 'tools/', 'help/']

class Nav(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(); self.depth = 0; self.links = []; self.refresh = None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'nav': self.depth += 1
        elif tag == 'a' and self.depth and a.get('href'): self.links.append(a['href'])
        elif tag == 'meta' and (a.get('http-equiv') or '').lower() == 'refresh' and 'url=' in (a.get('content') or ''): self.refresh = a['content'].split('url=', 1)[1]
    def handle_endtag(self, tag):
        if tag == 'nav' and self.depth: self.depth -= 1

def get(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'dnbox-route-test'}), timeout=30) as r:
            return r.status, r.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, ''

def check(base, pages):
    base = base.rstrip('/') + '/'; host = urlparse(base).netloc; seen = {}; failures = []
    def visit(url, why):
        url = url.split('#', 1)[0]
        if url in seen: return seen[url]
        status, body = get(url); seen[url] = (status, body)
        if status != 200: failures.append(f'{status} {url} ({why})')
        return status, body
    queue = [(base + p, 'entry route') for p in ENTRY] + [(base + p, 'site page') for p in pages]
    for url, why in queue:
        status, body = visit(url, why)
        if status != 200 or not body: continue
        nav = Nav(); nav.feed(body)
        if nav.refresh:
            visit(urljoin(url, nav.refresh), 'redirect from ' + url)
        for href in nav.links:
            target = urljoin(url, href)
            if urlparse(target).scheme in ('http', 'https') and urlparse(target).netloc == host and target.startswith(base):
                visit(target, 'nav link on ' + url)
    return seen, failures

def main():
    if '--live' in sys.argv:
        base = sys.argv[sys.argv.index('--live') + 1]; pages = []
        seen, failures = check(base, pages)
    else:
        out_root = ROOT / '.output'; out_root.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='nav-routes-', dir=out_root) as output:
            subprocess.run(['node', 'scripts/build-product-site.mjs', '--output', output], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
            pages = [str(p.relative_to(output)) for p in Path(output).rglob('*.html')]
            class Quiet(http.server.SimpleHTTPRequestHandler):
                def log_message(self, *a): pass
            server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=output))
            threading.Thread(target=server.serve_forever, daemon=True).start()
            try:
                seen, failures = check(f'http://127.0.0.1:{server.server_address[1]}/', pages)
            finally:
                server.shutdown()
    for f in failures: print('FAIL', f)
    print(f'NAV-ROUTES checked={len(seen)} failures={len(failures)}')
    sys.exit(1 if failures else 0)

if __name__ == '__main__':
    main()
