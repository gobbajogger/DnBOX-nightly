# SPDX-License-Identifier: GPL-3.0-only
"""Exercise the public inbox with a local GitHub read fixture and a valid long title."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

SITE = Path(__file__).resolve().parents[1] / "web/product-site"
TITLE = "[Feature]: Show SHA-256 for " + "e01ddf2b" * 8
OWNER = 255244738
REPO = "/repos/gobbajogger/DnBOX"


class SiteHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def check_inbox(page, origin):
    voted = False

    def github(route):
        path = urlsplit(route.request.url).path
        if path == REPO:
            route.fulfill(json={"id": 1426904592, "owner": {"id": OWNER}})
        elif path == REPO + "/issues":
            issue = {"number": 2, "title": TITLE, "reactions": {"+1": int(voted)}}
            route.fulfill(json=[issue])
        elif path == REPO + "/issues/2/reactions":
            route.fulfill(json=[{"content": "+1", "user": {"id": OWNER}}])
        else:
            route.fulfill(status=404)

    page.route("https://api.github.com/**", github)
    page.goto(origin + "/help/")
    page.get_by_role("link", name="Feature proposals and voting").click()
    proposal = page.get_by_role("link", name="#2 " + TITLE, exact=True)
    expect(proposal).to_have_attribute("href", "https://github.com/gobbajogger/DnBOX/issues/2")
    expect(page.locator("#proposals li")).to_contain_text("0 votes")
    voted = True
    page.get_by_role("button", name="Refresh votes").click()
    expect(page.locator("#proposals li")).to_contain_text("1 vote · Owner voted")
    page.evaluate("document.fonts.ready")
    return page.evaluate("document.documentElement.scrollWidth")



def check_links(page, url, selector, width):
    page.goto(url)
    page.evaluate("document.fonts.ready")
    if url.endswith(("/new/", "/projects/")):
        nav = page.get_by_role("navigation", name="Main", exact=True)
        for name in ("Sounds", "Remote", "Samples", "Projects", "Presets", "Manual", "History", "Install nightly"):
            link = nav.get_by_role("link", name=name, exact=True)
            if not link.is_visible():
                return f"{name} link hidden or missing at {width}px on {url}"
    handles = page.locator(selector)
    assert handles.count() >= 2, f"Missing navigation links on {url}"
    boxes = [item.bounding_box() for item in handles.all()]
    for box in boxes:
        if box["x"] < 0 or box["x"] + box["width"] > width + 1:
            return f"{selector} extends outside {width}px viewport on {url}"
    for left, right in zip(boxes, boxes[1:]):
        if max(left["y"], right["y"]) < min(left["y"] + left["height"], right["y"] + right["height"]):
            if right["x"] - (left["x"] + left["width"]) < 8:
                return f"{selector} has less than 8px separation at {width}px on {url}"
    return None


def main():
    failures = []
    handler = partial(SiteHandler, directory=str(SITE))
    with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
        Thread(target=server.serve_forever, daemon=True).start()
        try:
            with sync_playwright() as playwright, playwright.chromium.launch(chromium_sandbox=True) as browser:
                for width, height in [(1440, 900), (1024, 640), (844, 390), (390, 844), (240, 240)]:
                    with browser.new_page(viewport={"width": width, "height": height}) as page:
                        origin = f"http://127.0.0.1:{server.server_port}"
                        actual = check_inbox(page, origin)
                        for path, selector in [("/new/", "body > header a:visible"),
                                               ("/projects/", "#dnbox-global-header header a:visible"),
                                               ("/starting-breaks/", ".install-links a:visible")]:
                            error = check_links(page, origin + path, selector, width)
                            if error:
                                failures.append(error)
                    if actual > width:
                        failures.append(f"{width}x{height}: document width {actual}px")
                    else:
                        print(f"PASS {width}x{height}: proposal title wraps and owner vote refreshes")
        finally:
            server.shutdown()
    assert not failures, ", ".join(failures)


if __name__ == "__main__":
    main()
