#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Exercise the ordinary installer using the four original v0.0.26/v0.0.25.1 release assets."""
import argparse
import functools
import hashlib
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PINS = {
    "0.0.26": {
        "pro": (651730, "ce67d560eebd03cb8b9087f7723b1e0b71fb7cca256184cdfdd55a8c27c708b8"),
        "elite": (651732, "95b3195f4767ef5df33b365197b01203873e5eec3d7fa497c73e5e509484a4a6"),
    },
    "0.0.25.1": {
        "elite": (651721, "5e24e0d4afccc30906b334fbe73bcad3621df8df3c325790b7af2f94accffb1a"),
        "pro": (651721, "6f135a3d03bb1a2a4d09d63040c719313612b85590a6af69b293a928e22285bf"),
    },
}


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def run(site, packages):
    catalog = json.loads((site / "versions.json").read_bytes())
    rows = {r.get("display_version"): r for r in catalog["versions"]}
    responses = {}
    for version, models in PINS.items():
        for model, pin in models.items():
            raw = (packages / ("v" + version) / f"dnbox-x0x37-{version}-{model}.fwsc").read_bytes()
            assert (len(raw), hashlib.sha256(raw).hexdigest()) == pin
            package = rows[version]["models"][model]
            assert (package["size"], package["sha256"]) == pin
            assert package["pkg"].startswith("https://gobbajogger.github.io/DnBOX-nightly/artifacts/nightly-dev/" + pin[1] + "/")
            responses[package["pkg"]] = raw

    local = functools.partial(Handler, directory=site)
    with ThreadingHTTPServer(("127.0.0.1", 0), local) as server, sync_playwright() as pw:
        origin = f"http://127.0.0.1:{server.server_port}"
        threading.Thread(target=server.serve_forever, daemon=True).start()
        browser = pw.chromium.launch(chromium_sandbox=True)
        page = browser.new_page(locale="en-US", accept_downloads=True)
        errors, requests = [], []
        damage = False

        def serve(route):
            url = route.request.url
            if url.startswith(origin + "/"):
                return route.continue_()
            if url not in responses:
                return route.abort()
            requests.append(url)
            raw = responses[url]
            if damage:
                raw = raw[:-1] + bytes([raw[-1] ^ 1])
            route.fulfill(body=raw, content_type="application/octet-stream",
                          headers={"Access-Control-Allow-Origin": "*"})

        page.route("**/*", serve)
        page.add_init_script("""window.deviceAccessCount = 0;
            Object.defineProperty(navigator, 'requestMIDIAccess', {value() {
              window.deviceAccessCount++; throw Error('Unexpected MIDI access in picker test');
            }});""")
        page.on("pageerror", lambda error: errors.append(str(error)))
        try:
            page.goto(origin + "/install/", wait_until="domcontentloaded")
            picker, consent, install = (page.locator(s) for s in ("#version", "#devagree", "#go"))
            download = page.locator("#download")
            expect(picker).to_have_value(rows["0.0.26"]["version"])
            assert "Release" in picker.locator("option:checked").inner_text()
            assert not any("600b" in value for value in picker.locator("option").evaluate_all("a => a.map(o => o.value)"))
            for version, models in PINS.items():
                if picker.input_value() != rows[version]["version"]:
                    picker.select_option(rows[version]["version"])
                for model, (size, digest) in models.items():
                    page.locator(f'#models input[value="{model}"]').check()
                    pkg = rows[version]["models"][model]
                    filename = pkg["pkg"].rsplit("/", 1)[1]
                    expect(download).to_have_attribute("download", filename, timeout=20000)
                    assert requests[-1] == pkg["pkg"]
                    assert download.get_attribute("href").startswith("blob:")
                    expect(consent).not_to_be_checked()
                    expect(install).to_be_disabled()
                    label = page.locator("#consent-copy").inner_text()
                    assert ("backed up" if version == "0.0.26" else "hardware-untested") in label
                    with page.expect_download() as event:
                        download.click()
                    downloaded = event.value
                    assert downloaded.suggested_filename == filename
                    raw = downloaded.path().read_bytes()
                    assert (len(raw), hashlib.sha256(raw).hexdigest()) == (size, digest)
                    consent.check()
                    expect(install).to_be_enabled()
                    print(f"{version} {model}: {size} B {digest} verified through Download")
            damage = True
            picker.select_option(rows["0.0.26"]["version"])
            expect(page.locator("#status")).to_contain_text("damaged", timeout=20000)
            expect(download).to_be_hidden()
            assert not download.get_attribute("href")
            expect(consent).not_to_be_checked()
            consent.check()
            expect(install).to_be_disabled()
            assert all(frame.evaluate("window.deviceAccessCount") == 0 for frame in page.frames)
            assert not errors, errors
            print("Corrupted Pro bytes blocked after consent; zero MIDI access or device writes")
        finally:
            browser.close()
            server.shutdown()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site", type=Path, default=ROOT / ".output/product-site")
    parser.add_argument("--packages", type=Path, required=True,
                        help="Directory containing v0.0.26/ and v0.0.25.1/ with the original release .fwsc files")
    args = parser.parse_args()
    run(args.site.resolve(), args.packages.resolve())
