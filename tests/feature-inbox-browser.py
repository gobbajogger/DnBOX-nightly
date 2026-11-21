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
    if url.endswith(("/new/", "/projects/", "/breaks/")):
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



def check_mounted_installer(page, origin, width):
    packages = "https://gobbajogger.github.io/DnBOX-nightly/artifacts/nightly-dev/**"
    page.route(packages, lambda route: route.abort("internetdisconnected"))
    page.goto(origin + "/install/")
    expect(page.locator("#status")).to_contain_text("Could not load")
    expect(page.locator("#go")).to_be_disabled()
    expect(page.locator("#download")).to_be_hidden()
    page.unroute(packages)
    page.locator("#sample-picker input[type=checkbox]").first.wait_for()
    navigation = page.evaluate("""() => {
        const links = selector => [...document.querySelectorAll(selector)];
        const global = links('#dnbox-global-header nav a');
        const tasks = links('.workspace-nav a');
        const all = [...global, ...tasks];
        return {
            global: global.map(a => a.getAttribute('href')),
            tasks: tasks.map(a => a.getAttribute('href')),
            homes: links('#dnbox-global-header .brand, .header-top .home').length,
            current: global.filter(a => a.getAttribute('aria-current') === 'page').map(a => a.getAttribute('href')),
            tabLabel: document.querySelector('#firmware-tab').textContent.trim(),
            title: document.querySelector('.hero h1').textContent.trim(),
            fits: all.every(a => {
                const box = a.getBoundingClientRect();
                return box.width > 0 && box.height >= 44 && box.left >= 0 && box.right <= innerWidth;
            }) && document.documentElement.scrollWidth === innerWidth,
            firmwareFirst: document.querySelector('.hero h1').getBoundingClientRect().bottom
                <= document.querySelector('#sample-picker').getBoundingClientRect().top
        };
    }""")
    expected = ["../index.html#sounds", "../remote/", "../breaks/", "../projects/",
                "../presets/", "../manual/", "../builds/", "../install/"]
    assert navigation["global"] == expected and navigation["tasks"] == ["#firmware", "#samples", "#projects"], navigation
    assert navigation["homes"] == 1 and navigation["current"] == ["../install/"], navigation
    assert (navigation["tabLabel"], navigation["title"]) == ("Firmware", "Install firmware"), navigation
    assert navigation["fits"] and navigation["firmwareFirst"], (width, navigation)
    print(f"PASS {width}px mounted installer navigation and firmware heading")


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
                        check_mounted_installer(page, origin, width)
                        page.goto(origin + "/builds/")
                        page.evaluate("document.fonts.ready")
                        history_width = page.evaluate("document.documentElement.scrollWidth")
                        if history_width > width:
                            failures.append(f"Build history extends to {history_width}px at {width}px")
                        for path, selector in [("/new/", "body > header a:visible"),
                                               ("/projects/", "#dnbox-global-header header a:visible"),
                                               ("/breaks/", "body > header a:visible"),
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
