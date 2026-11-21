#!/usr/bin/env python3
"""Check the built musician routes in Chromium. Requires Python Playwright and its bundled browser."""
import argparse
import functools
import hashlib
import json
import threading
from contextlib import contextmanager
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROUTES = (
    "index.html", "breaks/index.html", "builds/index.html", "help/index.html", "install/index.html",
    "manual/index.html", "manual/legacy.html", "manual/original/index.html",
    "manual/projects-guide.html", "manual/protocol.html", "new/index.html", "presets/index.html",
    "presets/legacy/index.html", "projects/index.html", "remote/index.html", "remote/device/index.html",
    "remote/identity/index.html", "starting-breaks/index.html", "tools/index.html",
)
SIZES = ((1440, 900), (390, 844), (844, 390))


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@contextmanager
def serve(root):
    handler = functools.partial(QuietHandler, directory=root)
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


def inspect_route(page, origin, root, route, size, screenshots):
    errors = []
    responses = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("response", lambda response: responses.append(response.status) if response.status >= 400 else None)
    response = page.goto(f"{origin}/{route}", wait_until="load")
    page.evaluate("document.fonts.ready")
    if route == "remote/index.html":
        page.locator('main[aria-busy="false"]').wait_for()
        assert page.locator("#workspace-error").is_hidden(), "Remote failed to start"
    if screenshots:
        image = screenshots / f"{size[0]}-{route.replace('/', '-')}.png"
        page.screenshot(path=image)
    return {
        "route": route, "viewport": size, "title": page.title(), "status": response.status,
        "scroll_width": page.evaluate("document.documentElement.scrollWidth"),
        "page_errors": errors, "failed_resources": responses,
        "page_sha256": hashlib.sha256((root / route).read_bytes()).hexdigest(),
    }


def check_projects(page, origin):
    page.goto(f"{origin}/manual/projects-guide.html")
    guide = page.locator("main")
    assert "tools/make_pages.py" not in guide.inner_text()
    assert "Find USB MIDI keyboard" in guide.inner_text()
    details = guide.locator("details").filter(has=page.get_by_text("File format and MIDI protocol", exact=True))
    assert not details.evaluate("element => element.open")
    details.locator("summary").click()
    assert details.evaluate("element => element.open")
    guide.get_by_role("link", name="Projects", exact=True).click()
    page.get_by_role("button", name="Find USB MIDI keyboard").wait_for()
    page.goto(f"{origin}/manual/")
    link = page.locator('a[href="../install/#projects"]').first
    for detail in link.locator("xpath=ancestor::details").all():
        detail.evaluate("element => element.open = true")
    link.click()
    page.locator("#projects-panel:visible").wait_for()
    assert page.locator("#projects-tab").get_attribute("aria-current") == "page"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("built", type=Path)
    parser.add_argument("--screenshots", type=Path)
    parser.add_argument("--baseline", action="store_true", help="Report old widths and skip new guide assertions")
    args = parser.parse_args()
    root = args.built.resolve()
    if args.screenshots:
        args.screenshots.mkdir(parents=True, exist_ok=True)
    rows = []
    with serve(root) as origin, sync_playwright() as pw:
        browser = pw.chromium.launch(chromium_sandbox=True)
        version = browser.version
        for w, h in SIZES:
            context = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=1,
                                          reduced_motion="reduce", has_touch=w < 1000)
            for route in ROUTES:
                page = context.new_page()
                rows.append(inspect_route(page, origin, root, route, (w, h), args.screenshots))
                page.close()
            if not args.baseline:
                page = context.new_page()
                check_projects(page, origin)
                page.close()
            context.close()
        browser.close()
    print(json.dumps({"browser": version, "rows": rows}, indent=2))
    failed = any(row["status"] != 200 or row["page_errors"] or row["failed_resources"]
                 or not row["title"] or (not args.baseline and row["scroll_width"] != row["viewport"][0])
                 for row in rows)
    return int(failed)


if __name__ == "__main__":
    raise SystemExit(main())
