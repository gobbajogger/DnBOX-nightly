# SPDX-License-Identifier: GPL-3.0-only
"""#120 feature votes on the built site, against a stubbed GitHub reactions API.

A vote is a 👍 reaction on the proposal's first post; GitHub stores it once per
account. The page must show the stored votes, count each account once (a
replayed reaction does not add a vote), mark the owner's vote, refresh to the
newly stored count, and never turn a failed read into zero votes.
"""
import asyncio, mimetypes, subprocess, tempfile
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
REPO = '/repos/gobbajogger/DnBOX'
OWNER = 255244738
TITLE = ('[Feature]: Show note names on the pads ' + 'and keep them while recording ' * 3).rstrip()


async def case(browser, site, width, height):
    context = await browser.new_context(viewport={'width': width, 'height': height})
    page = await context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    stored = []          # GitHub's stored +1 reactions (user ids, may repeat on replay)
    broken = {'on': False}
    methods = []

    async def site_route(route):
        u = urlparse(route.request.url)
        path = (site / unquote(u.path).lstrip('/')).resolve()
        if path.is_dir():
            path = path / 'index.html'
        if not path.is_relative_to(site.resolve()) or not path.is_file():
            await route.fulfill(status=404, body='')
            return
        await route.fulfill(body=path.read_bytes(), content_type=mimetypes.guess_type(str(path))[0] or 'application/octet-stream')

    async def github(route):
        methods.append(route.request.method)
        u = urlparse(route.request.url)
        if broken['on'] and u.path.endswith('/reactions'):
            await route.fulfill(status=403, body='')
        elif u.path == REPO:
            await route.fulfill(json={'id': 1426904592, 'owner': {'id': OWNER}})
        elif u.path == REPO + '/issues':
            await route.fulfill(json=[
                {'number': 7, 'title': TITLE, 'labels': [], 'reactions': {'+1': len(stored)}},
                {'number': 8, 'title': 'Build log', 'labels': [], 'reactions': {'+1': 2}},
                {'number': 9, 'title': 'A merged change', 'labels': [{'name': 'enhancement'}], 'pull_request': {}, 'reactions': {'+1': 1}},
            ])
        elif u.path == REPO + '/issues/7/reactions':
            await route.fulfill(json=[{'content': '+1', 'user': {'id': user}} for user in stored])
        else:
            await route.fulfill(status=404, body='')

    await context.route('https://dnbox.test/**', site_route)
    await context.route('https://api.github.com/**', github)
    await page.goto('https://dnbox.test/help/')
    await page.get_by_role('link', name='Feature ideas and votes').click()
    await page.wait_for_url('**/help/ideas/')
    proposal = page.get_by_role('link', name='#7 ' + TITLE, exact=True)
    await expect(proposal).to_have_attribute('href', 'https://github.com/gobbajogger/DnBOX/issues/7')
    rows = page.locator('#proposals li')
    await expect(rows).to_have_count(1)            # only feature proposals, no PRs or other issues
    await expect(rows).to_have_text('#7 ' + TITLE + ' · 0 votes')
    refresh = page.get_by_role('button', name='Refresh votes')

    stored.append(1001)                             # a musician votes on GitHub
    await refresh.click()
    await expect(rows).to_have_text('#7 ' + TITLE + ' · 1 vote')
    stored.append(1001)                             # the same account's reaction replayed
    await refresh.click()
    await expect(refresh).to_be_enabled()
    await expect(rows).to_have_text('#7 ' + TITLE + ' · 1 vote')
    stored.append(OWNER)                            # the owner votes
    await refresh.click()
    await expect(rows).to_have_text('#7 ' + TITLE + ' · 2 votes · Owner voted 👍')

    await page.reload()                             # stored votes persist across visits
    await expect(rows).to_have_text('#7 ' + TITLE + ' · 2 votes · Owner voted 👍')

    broken['on'] = True                             # a failed read never shows zero votes
    await refresh.click()
    await expect(page.locator('#status')).to_have_text('GitHub could not return the votes. Open the issue list or try again.')
    await expect(rows).to_have_count(0)

    assert set(methods) == {'GET'}, methods         # the site only reads; votes are stored by GitHub
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'), width
    assert not errors, errors
    await context.close()
    print(f'PASS feature votes {width}x{height}: stored, counted once per account, owner marked, refresh, failure kept honest', flush=True)


async def main(site):
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(chromium_sandbox=True)
        try:
            for width, height in [(1440, 900), (844, 390), (390, 844)]:
                await case(browser, site, width, height)
        finally:
            await browser.close()
    print('FEATURE_INBOX PASS')


if __name__ == '__main__':
    (ROOT / '.output').mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='feature-inbox-', dir=ROOT / '.output') as tmp:
        site = Path(tmp) / 'site'
        subprocess.run(['node', 'scripts/build-product-site.mjs', '--output', str(site)], cwd=ROOT, check=True)
        asyncio.run(main(site))
