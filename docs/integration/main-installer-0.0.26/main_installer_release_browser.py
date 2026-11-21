"""Exercise the served MAIN installer and compare downloads against the published release manifests.

python main_installer_release_browser.py PATH_TO_PAGES PATH_TO_EXTRACTED_RELEASE_ASSET_DIRS
The second directory contains v0.0.26/ and v0.0.25.1/ with the original GitHub assets.
"""
import argparse
from copy import deepcopy
import hashlib
import json
import re
import zlib
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ORIGIN = "https://gobbajogger.github.io/DnBOX/"
RELEASES = {
    "nightly-94197fc8-dev": ("0.0.26", "94197fc839b00aff47b98ca02f3c6396e4a6eabf", {
        "elite": (651732, "95b3195f4767ef5df33b365197b01203873e5eec3d7fa497c73e5e509484a4a6", "a5953c62"),
        "pro": (651730, "ce67d560eebd03cb8b9087f7723b1e0b71fb7cca256184cdfdd55a8c27c708b8", "d8957148"),
    }),
    "nightly-79280e76-dev": ("0.0.25.1", "79280e763341d03ba43266d3e25dad66f12de860", {
        "elite": (651721, "5e24e0d4afccc30906b334fbe73bcad3621df8df3c325790b7af2f94accffb1a", "8ff3ba29"),
        "pro": (651721, "6f135a3d03bb1a2a4d09d63040c719313612b85590a6af69b293a928e22285bf", "45560337"),
    }),
}

def verify(raw, expected):
    assert (len(raw), hashlib.sha256(raw).hexdigest(), f"{zlib.crc32(raw):08x}") == expected

def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("pages", type=Path)
    cli.add_argument("release_assets", type=Path)
    args = cli.parse_args()
    html = (args.pages / "install/index.html").read_text()
    catalog = json.loads((args.pages / "versions.json").read_text())
    embedded = re.search(r"^const catalog = (.*);$", html, re.M)
    assert embedded and json.loads(embedded[1]) == catalog
    assert catalog["latest"] == next(iter(RELEASES))
    assert catalog["installer_promotion_schema"] == 1
    ledger = json.loads(re.search(r"^let currentHardwareLedger = (.*);$", html, re.M)[1])
    assets = {}
    for row in catalog["versions"]:
        version = row["version"]
        if version not in RELEASES:
            continue
        label, commit, models = RELEASES[version]
        assert row["source_commit"] == commit
        assert row["display_version"] == label
        for model, expected in models.items():
            pkg = row["models"][model]
            url = pkg["pkg"]
            assert url.startswith("https://gobbajogger.github.io/DnBOX-nightly/artifacts/nightly-dev/" + expected[1] + "/")
            assert (pkg["size"], pkg["sha256"]) == expected[:2]
            raw = (args.release_assets / f"v{label}" / f"dnbox-x0x37-{label}-{model}.fwsc").read_bytes()
            verify(raw, expected)
            assets[url] = raw
    assert len(assets) == 4
    with sync_playwright() as pw:
        browser = pw.chromium.launch(chromium_sandbox=True)
        page = browser.new_page()
        def serve(route):
            url = route.request.url
            if url == ORIGIN + "versions.json":
                route.fulfill(json=catalog)
            elif url == "https://gobbajogger.github.io/DnBOX-nightly/hardware-tests.json":
                route.fulfill(json=ledger)
            elif url in assets:
                route.fulfill(body=assets[url], content_type="application/octet-stream")
            elif url == ORIGIN + "install/":
                route.fulfill(body=html, content_type="text/html; charset=utf-8")
            elif url == ORIGIN:
                route.fulfill(path=args.pages / "index.html", content_type="text/html; charset=utf-8")
            else:
                route.fulfill(status=404, body="")

        page.route("**/*", serve)
        page.goto(ORIGIN)
        page.get_by_role("link", name="Install firmware", exact=True).click()
        picker = page.locator("#version")
        expect(picker).to_have_value(next(iter(RELEASES)))
        expect(picker.locator("option")).to_have_text(["DnBOX 0.0.26 · Latest", "DnBOX 0.0.25.1 · Fallback"])
        for version, (label, commit, models) in RELEASES.items():
            picker.select_option(version)
            for model, expected in models.items():
                page.locator(f'#models [value="{model}"]').check(force=True)
                expect(page.locator("#download")).to_be_visible()
                expect(page.locator("#buildprovenance")).to_contain_text(commit)
                expect(page.locator("#buildprovenance")).to_contain_text(expected[1])
                expect(page.locator("#pkgmeta")).to_contain_text(f"SMK-37 {model.title()}_900")
                expect(page.locator("#controllerstatus")).to_contain_text("included")
                expect(page.locator("#go")).to_be_disabled()
                with page.expect_download() as event:
                    page.locator("#download").click()
                verify(event.value.path().read_bytes(), expected)
                page.locator("#devagree").check()
                expect(page.locator("#go")).to_be_enabled()
                page.locator("#go").click()
                expect(page.locator("#main-confirm")).to_be_visible()
                expect(page.locator("#main-confirm-text")).to_contain_text(f"SMK-37 {model.title()}_900")
                page.locator("#main-confirm-no").click()
                print(f"PASS {label} {model}, original package bytes, controller, consent and cancel")

        picker.select_option("nightly-94197fc8-dev")
        bad_url = next(url for url in assets if RELEASES["nightly-94197fc8-dev"][2]["elite"][1] in url)
        assets[bad_url] = assets[bad_url][:-1] + bytes([assets[bad_url][-1] ^ 1])
        page.locator('#models [value="elite"]').check(force=True)
        expect(page.locator("#status")).to_contain_text("damaged")
        expect(page.locator("#download")).to_be_hidden()
        expect(page.locator("#go")).to_be_disabled()
        print("PASS same-length corrupted package blocked before download or install")
        original = deepcopy(catalog["versions"][0])
        future = deepcopy(original)
        future.update(version="nightly-12345678-dev", display_version="0.0.27",
                      source_commit="12345678" + "a" * 32, source_tree="b" * 40)
        for model, pkg in future["models"].items():
            old = pkg["pkg"]
            pkg["pkg"] = ORIGIN + "artifacts/releases/" + pkg["sha256"] + "/" + old.rsplit("/", 1)[-1]
            assets[pkg["pkg"]] = assets[old]
        catalog["versions"].insert(0, future)
        catalog["latest"] = future["version"]
        proofs = [{**record, "version":"0.0.27", "source_commit":future["source_commit"]} for record in ledger["reports"]]
        ledger["reports"].append(proofs[0])
        page.reload()
        expect(picker.locator("option")).to_have_count(2)
        expect(picker.locator('option[value="nightly-12345678-dev"]')).to_have_count(0)
        ledger["reports"].append(proofs[1])
        page.reload()
        expect(picker).to_have_value(future["version"])
        expect(page.locator("#download")).to_be_visible()
        expect(page.locator("#buildprovenance")).to_contain_text(future["source_commit"])
        print("PASS data-only future promotion reads live versions and both exact model reports")
        future["models"]["pro"]["pkg"] = "https://untrusted.invalid/" + future["models"]["pro"]["sha256"] + "/fake.fwsc"
        page.reload()
        expect(picker.locator('option[value="nightly-12345678-dev"]')).to_have_count(0)
        print("PASS noncanonical promoted URL rejected")
        catalog["versions"].pop(0)
        catalog["latest"] = original["version"]
        catalog["versions"][0]["source_commit"] = "600b" + "0" * 36
        page.reload()
        expect(picker.locator("option")).to_have_text(["DnBOX 0.0.25.1 · Fallback"])
        print("PASS changed source and withdrawn/unlisted package excluded")
        browser.close()

if __name__ == "__main__":
    main()
