"""Exercise the served admin page and its CSP with a local GitHub API fixture."""
import base64
from copy import deepcopy
import hashlib
import json
import os
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SITE = Path(os.environ.get("DNBOX_ADMIN_TEST_SITE", ROOT / "web/product-site"))
HEAD = "1" * 40
BASE = "https://api.github.com"
TOKEN = "_".join(("github", "pat", "fixture"))
CATALOG = {"latest":"test", "versions":[{"version":"test","display_version":"0.0.26","source_commit":HEAD,
    "source_tree":"2"*40,"status":"dev-checked","models":{
        model:{"sha256":digest*64,"size":1034,"controller_sha256":"c"*64,"controller_size":68,
               "controller_strategy":"bundled","product":"SMK-37 "+model.title()+"_900"}
        for model,digest in [("elite","a"),("pro","b")]}}]}

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

def run():
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=str(SITE)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f"http://127.0.0.1:{server.server_port}"
    calls = []
    notes = ["Original notes"]
    nightly = deepcopy(CATALOG)
    ledger = {"schema":1, "reports":[]}
    def api(route):
        request = route.request
        path = urlsplit(request.url).path
        assert TOKEN not in request.url
        calls.append((request.method, path, request.headers.get("authorization")))
        if path == "/user":
            assert request.headers["authorization"] == "Bearer " + TOKEN
            value = {"login":"gobbajogger"}
        elif path == "/search/issues":
            value = {"total_count":0,"incomplete_results":False,"items":[]}
        elif path.endswith("/pulls") or path.endswith("/issues"):
            value = []
        elif path.endswith("/git/ref/heads/gh-pages"):
            value = {"object":{"sha":HEAD}}
        elif "/contents/" in path:
            filename = path.split("/contents/")[1]
            if filename == "versions.json":
                data = nightly if "/DnBOX-nightly/" in path else CATALOG
            elif filename == "hardware-tests.json":
                data = ledger
            else:
                raise AssertionError(path)
            raw = json.dumps(data).encode()
            sha = hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()
            if request.method == "PUT":
                assert filename == "hardware-tests.json" and "/DnBOX-nightly/" in path
                body = json.loads(request.post_data)
                assert body["branch"] == "gh-pages" and body["sha"] == sha
                ledger.update(json.loads(base64.b64decode(body["content"])))
                value = {}
            else:
                value = {"sha":sha,"path":filename,"type":"file","size":len(raw),"encoding":"base64",
                         "content":base64.b64encode(raw).decode()}
        elif path.endswith("/releases/tags/v0.0.26"):
            value = {"id":26,"tag_name":"v0.0.26","body":notes[0],"updated_at":"2026-11-20T23:00:00Z"}
        elif path.endswith("/releases/26"):
            assert request.method == "PATCH" and json.loads(request.post_data) == {"body":"Edited notes"}
            notes[0] = "Edited notes"
            value = {"id":26}
        else:
            route.fulfill(status=404, json={"message":"Unknown endpoint"})
            return
        route.fulfill(json=value, headers={"Access-Control-Allow-Origin":"*"})
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(chromium_sandbox=True)
            page = browser.new_page(viewport={"width":390,"height":844})
            errors = []
            page.on("pageerror", lambda err: errors.append(str(err)))
            page.route(BASE+"/**", api)
            diagnostics = []
            page.on("console", lambda item: diagnostics.append(item.text) if item.type=="error" else None)
            page.on("requestfailed", lambda req: diagnostics.append((req.url, req.failure)))
            page.on("pageerror", lambda exc: diagnostics.append(str(exc)))
            response = page.goto(origin+"/admin/")
            assert response.status == 200
            try:
                expect(page.locator("#workspace")).to_be_visible()
            except AssertionError as error:
                raise AssertionError(f"Admin module failed to start. Browser diagnostics: {diagnostics}") from error
            expect(page.locator("#reports")).to_have_text("0 installs reported OK")
            expect(page.locator("#catalogs > details")).to_have_count(2)
            expect(page.locator("#mark")).to_be_disabled()
            page.locator("#token").fill(TOKEN)
            page.locator("#connect").click()
            expect(page.locator("#connection")).to_have_text("Connected as gobbajogger.")
            expect(page.locator("#token")).to_have_value("")
            page.locator("#verified").check()
            page.locator("#evidence").fill("https://github.com/gobbajogger/DnBOX/issues/9")
            selected = nightly["versions"][0]["models"]["elite"]
            selected["controller_sha256"] = "d"*64
            page.locator("#mark").click()
            expect(page.locator("#test-result")).to_contain_text("changed")
            assert not any(method=="PUT" for method,_,_ in calls)
            selected["controller_sha256"] = "c"*64
            nightly["versions"][0]["description"] = "Updated copy"
            page.locator("#mark").click()
            expect(page.locator("#test-result")).to_contain_text("Saved the hardware test")
            assert len(ledger["reports"]) == 1
            report = ledger["reports"][0]
            assert (report["version"], report["source_commit"], report["model"],
                    report["package_sha256"], report["controller_sha256"]) == ("0.0.26", HEAD, "elite", "a"*64, "c"*64)
            page.locator("#read-notes").click()
            expect(page.locator("#notes")).to_have_value("Original notes")
            page.locator("#notes").fill("Edited notes")
            page.locator("#save-notes").click()
            expect(page.locator("#notes-result")).to_have_text("Saved the release notes for v0.0.26.")
            assert page.evaluate("localStorage.length + sessionStorage.length") == 0
            assert not page.context.cookies()
            assert page.evaluate("document.documentElement.scrollWidth") <= 390
            page.locator("#lock").click()
            expect(page.locator("#save-notes")).to_be_disabled()
            assert [p for method,p,_ in calls if method!="GET"] == ["/repos/gobbajogger/DnBOX-nightly/contents/hardware-tests.json",
                                                         "/repos/gobbajogger/DnBOX/releases/26"]
            # Enforce the real CSP requests in the browser, including pinned module loading.
            denied = page.evaluate("""async () => {try {await fetch('https://example.org/private-test');return false} catch {return true}}""")
            assert denied
            page.goto(origin+"/admin/")
            expect(page.locator("#token")).to_have_value("")
            expect(page.locator("#lock")).to_be_disabled()
            assert not errors, errors
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    print("PASS admin browser: pinned CSP, two catalogs, public count, ephemeral owner login, stale controller rejection, ledger-only PUT, mocked notes update, disconnect and narrow layout")

if __name__ == "__main__":
    run()
