# SPDX-License-Identifier: GPL-3.0-only
"""What’s New archive layout after real lazy images have decoded."""
import argparse
import json
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('site', type=Path, help='Built product site directory')
site = parser.parse_args().site.resolve()
assert (site / 'new/index.html').is_file()


def serve(route):
    url = urlparse(route.request.url)
    if url.hostname != 'dnbox.test':
        return route.abort()
    path = site / url.path.lstrip('/')
    if path.is_dir():
        path /= 'index.html'
    if path.is_file():
        return route.fulfill(path=path)
    return route.fulfill(status=404)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(chromium_sandbox=True)
    failures = []
    for width, height in [(1440, 900), (390, 844), (844, 390)]:
        page = browser.new_page(viewport={'width': width, 'height': height})
        page.route('**/*', serve)
        page.goto('http://dnbox.test/new/')
        summary = page.get_by_text('Published project notes', exact=True)
        summary.focus()
        page.keyboard.press('Enter')
        expect(page.get_by_role('heading', level=1, name='What’s new')).to_be_visible()
        assert page.get_by_role('heading', level=1).count() == 1
        images = summary.locator('..').locator('.figs figure img')
        assert images.count() == 8
        for img in images.all():
            img.scroll_into_view_if_needed()
            img.evaluate('(image) => image.decode()')
        sizes = images.evaluate_all('''images => images.map(image => ({
            intrinsic: image.naturalWidth,
            rendered: image.getBoundingClientRect().width,
            figure: image.closest('figure').getBoundingClientRect().width
        }))''')
        doc_width = page.evaluate('document.documentElement.scrollWidth')
        print(json.dumps({'viewport': [width, height], 'chromium': browser.version,
                          'document_width': doc_width, 'images': sizes}), flush=True)
        if doc_width > width or any(x['rendered'] > x['figure'] + 0.5 for x in sizes):
            failures.append(f'{width}x{height}: decoded images overflow')
        page.close()
    browser.close()
    assert not failures, failures
