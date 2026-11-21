#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""One real installer page, an original release asset, simulated WebMIDI and read-only issue fixtures."""
import argparse
import functools
import hashlib
import json
import re
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import expect, sync_playwright


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


# The virtual loader consumes test messages in memory. USB and the native MIDI API are inaccessible.
FAKE_MIDI = """
window.board = (() => {
  const access = Object.assign(new EventTarget(), {inputs: new Map(), outputs: new Map()});
  let loader = true, phase = 0, input, output;
  const stats = {access: 0, identity: 0, simulatedTransfer: 0};
  const portName = 'DnBOX 0.0.26 SMK-37 Elite';
  function plug() {
    input = {id: 'keyboard-in', type: 'input', state: 'connected', name: portName, async open() {}};
    output = {id: 'keyboard-out', type: 'output', state: 'connected', name: portName, async open() {},
      send(data) {
        const emit = frame => input.onmidimessage({data: frame});
        const bytes = Array.from(data).join();
        if (bytes === '240,0,50,69,0,0,0,64,127,247') {
          stats.identity++; emit(loader ? FRAMES.loader : FRAMES.application);
        } else if (bytes === '240,34,36,53,127,247' && loader && phase === 0) {
          phase = 1; emit(FRAMES.header); emit(FRAMES.terminal);
        } else if (phase === 1) { phase = 2; }
        else if (phase === 2) { phase = 0; loader = false; stats.simulatedTransfer++; }
        else { throw Error('Unexpected virtual MIDI message'); }
      }};
    access.inputs.set(input.id, input);
    access.outputs.set(output.id, output);
  }
  function signal(port) {
    const e = Object.assign(new Event('statechange'), {port});
    access.dispatchEvent(e);
    access.onstatechange?.(e);
  }
  plug();
  Object.defineProperty(navigator, 'requestMIDIAccess', {value: async () => {stats.access++;return access;}});
  return {stats, unplug(){input.state = output.state = 'disconnected';signal(input);signal(output);},
    replug(){plug();signal(input);signal(output);}};
})();
"""


def frame(command, payload):
    raw = [0, 0x59, command, len(payload), 0, 0, *payload, ~sum(payload) & 255]
    packed, bits, count = [], 0, 0
    for byte in raw:
        bits |= byte << count
        count += 8
        while count >= 7:
            packed.append(bits & 127)
            bits >>= 7
            count -= 7
    if count:
        packed.append(bits & 127)
    return [240, *packed, 247]


def run(site, package):
    page_html = (site / "install/index.html").read_text()
    catalog = json.loads(re.search(r"^const catalog = (.+);$", page_html, re.M)[1])
    row = next(v for v in catalog["versions"] if v["version"] == catalog["latest"])
    model = row["models"]["elite"]
    data = package.read_bytes()
    digest = "95b3195f4767ef5df33b365197b01203873e5eec3d7fa497c73e5e509484a4a6"
    assert hashlib.sha256(data).hexdigest() == digest == model["sha256"]
    assert len(data) == model["size"] == 651732
    submitted = dict(build_id=row["version"], version=row["display_version"], sha256=digest, model="elite",
                     product=model["product"], port_name="DnBOX 0.0.26 SMK-37 Elite", browser="Example",
                     time="2026-11-21T03:00:00Z", startup_ok=True, restart_ok=True, version_matched=True)
    fixture = Path(__file__).with_name("fixtures") / "install-report-rendered.md"
    issue = dict(number=2, title="[Install report] ", labels=[], body=fixture.read_text(), created_at=submitted["time"])
    limited, opened = False, []
    with ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=site)) as server, sync_playwright() as pw:
        threading.Thread(target=server.serve_forever, daemon=True).start()
        origin = f"http://127.0.0.1:{server.server_port}"
        browser = pw.chromium.launch(chromium_sandbox=True)
        context = browser.new_context(locale="en-US")
        cors = {"Access-Control-Allow-Origin": "*"}

        def serve(route):
            url = route.request.url
            if route.request.method != "GET":
                raise AssertionError("unexpected external or local mutation: " + route.request.method)
            if url.startswith(origin + "/"):
                return route.continue_()
            if url == model["pkg"]:
                return route.fulfill(body=data, content_type="application/octet-stream", headers=cors)
            if url.startswith("https://api.github.com/search/issues?"):
                return route.fulfill(status=403 if limited else 200, body=json.dumps(dict(total_count=1, incomplete_results=False, items=[issue])),
                                     content_type="application/json", headers=cors)
            if url.startswith("https://github.com/gobbajogger/DnBOX/issues/new?"):
                opened.append(url)
                return route.fulfill(status=200, body="Local issue preview only", content_type="text/html")
            return route.abort()

        context.route("**/*", serve)
        frames = {key: frame(0x11, list(identity.encode().ljust(27, b"\0")))
                  for key, identity in [("loader", "ota-SMK-37 Elite_900"), ("application", "SMK-37 Elite_900")]}
        frames["header"] = frame(0x30, [0, 0, 0, 0, 0, 8, 0, 0])
        frames["terminal"] = frame(0x30, [0, 0, 0, 0, 0xf0, 8, 0, 0])
        context.add_init_script("window.FRAMES = " + json.dumps(frames) + ";\n" + FAKE_MIDI)
        page = context.new_page()
        try:
            page.goto(origin + "/install/", wait_until="domcontentloaded")
            expect(page.locator("#public-installs")).to_contain_text("0 installs reported OK")
            expect(page.locator("#install-check")).to_be_hidden()
            assert page.evaluate("board.stats.access") == 0 and not opened
            page.locator('#models input[value="elite"]').check()
            expect(page.locator("#public-installs")).to_contain_text("1 install reported OK")
            expect(page.locator("#download")).to_have_attribute("href", re.compile("^blob:"), timeout=20000)
            page.locator("#devagree").check()
            page.locator("#go").click()
            page.locator("#inconfirmok, #main-confirm-yes").click()
            expect(page.locator("#receipt-result")).to_have_text("Startup OK · Restart pending · version matched", timeout=20000)
            expect(page.locator("#receipt-next")).to_contain_text("Unplug")
            assert not opened
            page.evaluate("board.unplug()")
            expect(page.locator("#receipt-next")).to_contain_text("Reconnect")
            page.evaluate("board.replug()")
            expect(page.locator("#receipt-result")).to_have_text("Startup OK · Restart OK · version matched", timeout=20000)
            receipt = json.loads(page.locator("#receipt-json").text_content())
            assert receipt["build_id"] == row["version"] and receipt["sha256"] == digest
            assert receipt["model"] == "elite" and receipt["port_name"] == submitted["port_name"]
            assert receipt["browser"] and receipt["time"] and receipt["startup_ok"] and receipt["restart_ok"]
            assert page.evaluate("board.stats.simulatedTransfer") == 1 and page.evaluate("board.stats.identity") >= 4
            with page.expect_popup() as popup:
                page.get_by_role("button", name="Report this install").click()
            popup.value.wait_for_load_state()
            assert len(opened) == 1
            form = parse_qs(urlsplit(opened[0]).query)
            assert form["template"] == ["install-report.yml"] and form["title"][0].startswith("[Install report] ")
            assert form["model"] == ["SMK-37 Elite"] and form["build_id"] == [row["version"]]
            assert form["startup_ok"] == ["Yes"] and form["restart_ok"] == ["Yes"] and form["sha256"] == [digest]
            assert form["port_name"] == [receipt["port_name"]] and form["browser"] == [receipt["browser"]]
            assert json.loads(form["notes"][0].split("```json\n", 1)[1].split("\n```", 1)[0]) == receipt
            assert "labels" not in form
            limited = True
            page.reload(wait_until="domcontentloaded")
            expect(page.locator("#public-installs")).to_have_text("Public install reports unavailable.")
            expect(page.locator("#install-check")).to_be_hidden()
            assert page.evaluate("board.stats.access") == 0
            print("PASS real release picker, simulated transfer, real finishApplication and normal replug scan; user-opened receipt; no-device, per-model count and HTTP 403 cases")
        finally:
            browser.close()
            server.shutdown()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site", type=Path, required=True, help="Directory containing install/index.html")
    parser.add_argument("--elite-package", type=Path, required=True, help="Original v0.0.26 Elite release .fwsc")
    args = parser.parse_args()
    run(args.site.resolve(), args.elite_package.resolve())
