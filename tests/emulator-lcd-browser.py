#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Check the emulator LCD and the four historical HTML screens against their native frames."""
import base64
import hashlib
import io
import json
import subprocess
import tempfile
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from struct import iter_unpack
from threading import Thread

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests/fixtures/emulator-lcd-06bd40"
# Each state names its native frame, accessible control and minimum simulated delay.
# Capture SAVE while its banner is up. Wait for it to expire on HOME.
STATES = (
    ("boot", None, 500),
    ("fx", "FX", 500),
    ("save", "SAVE", 250),
    ("home", "HOME", 3000),
    ("mix", "LFO", 1700),
    ("mix-level", "K1 up", 1700),
    ("kick-909", "EDIT", 1700),
    ("kick-808", "Algorithm up", 1700),
    ("seq-808", "SEQ", 1700),
    ("global", "GLOBE", 1700),
    ("midi-clock", "SEL", 1700),
)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def rgb565(image, *, browser):
    """The host's PNG uses floor, while the canvas's Uint8ClampedArray rounds."""
    if image.size != (240, 240):
        raise AssertionError(f"LCD dimensions {image.size}")
    if image.mode == "RGBA" and image.getchannel("A").getextrema() != (255, 255):
        raise AssertionError("Nonopaque LCD pixel")
    def levels(maximum):
        return {round(i * 255 / maximum) if browser else i * 255 // maximum: i
                for i in range(maximum + 1)}
    rb, green = levels(31), levels(63)
    packed = bytearray()
    for r, g, b in iter_unpack("BBB", image.convert("RGB").tobytes()):
        word = (rb[r] << 11) | (green[g] << 5) | rb[b]
        packed.extend(word.to_bytes(2, "big"))
    return packed


def check_page(page, url, manifest):
    page.goto(url)
    page.locator("#start").click()
    lcd = page.locator("#lcd")
    for name, button, delay_ms in STATES:
        before = 0
        if button:
            before = lcd.evaluate("c => Number(c.dataset.time)")
            page.get_by_role("button", name=button, exact=True).click(delay=80)
        page.wait_for_function("t => Number(document.querySelector('#lcd').dataset.time) > t",
                               arg=before + delay_ms)
        source = page.locator("#source").text_content()
        assert source == f"Firmware source {manifest['firmware']} · kernel {manifest['kernel']}", source
        assert page.locator("#transport").text_content() == "Stopped"
        png = lcd.evaluate("c => c.toDataURL('image/png').split(',')[1]")
        with Image.open(io.BytesIO(base64.b64decode(png))) as actual:
            pixels = rgb565(actual, browser=True)
        with Image.open(FIXTURES / f"{name}.png") as native:
            expected = rgb565(native, browser=False)
        assert hashlib.sha256(expected).hexdigest() == manifest["frames"][name], name
        if pixels != expected:
            changed = sum(pixels[i:i+2] != expected[i:i+2] for i in range(0, len(pixels), 2))
            raise AssertionError(f"{name}: {changed}/57600 RGB565 pixels differ from native")
        print(f"PASS {name}: 57600/57600 RGB565 pixels match {manifest['frames'][name]}")


def check_historical_reference(page, origin, presentation):
    source = "3c41ef4bedf9701f549ce2752b73306e2fab1eb8"
    assert presentation["native_source"] == source
    names = ["Voice", "Pattern", "Miami", "Juno"]
    first_frames = {frame["id"]: frame["proof"]["native_sha256"] for frame in presentation["frames"]}
    page.set_viewport_size({"width": 1440, "height": 900})
    response = page.goto(f"{origin}/reference/current-ui.html")
    assert response and response.ok, "Historical HTML reference failed to load"
    assert page.get_by_role("heading", level=1).inner_text() == "Firmware UI at 3c41ef4b"
    tools_link = page.get_by_role("link", name="Tools", exact=True)
    assert tools_link.get_attribute("href") == "../tools/"
    assert tools_link.evaluate("(a) => getComputedStyle(a).color === getComputedStyle(document.body).color")
    articles = page.locator("article")
    assert articles.locator("h2").all_text_contents() == names
    for article, name in zip(articles.all(), names):
        panel = article.locator(".native-screen")
        panel.scroll_into_view_if_needed()
        box = panel.bounding_box()
        assert box and (box["width"], box["height"]) == (240, 240), (name, box)
        # CSS text flow may place the panel origin between physical pixels.
        # At device scale 1 the browser paints its integer runs at the nearest pixel.
        clip = {"x": round(box["x"]), "y": round(box["y"]), "width": 240, "height": 240}
        with Image.open(io.BytesIO(page.screenshot(clip=clip))) as image:
            digest = hashlib.sha256(rgb565(image, browser=False)).hexdigest()
        expected = first_frames[f"{name.lower()}-0"]
        assert digest == expected, f"{name} HTML raster {digest} differs from {source} {expected}"
        print(f"PASS historical {name}: 57600/57600 RGB565 pixels match {expected}")


def main():
    manifest = json.loads((FIXTURES / "frames.json").read_text())
    output_root = ROOT / '.output'
    output_root.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='lcd-', dir=output_root) as output:
        site = Path(output) / "site"
        subprocess.run(["node", "scripts/build-product-site.mjs", "--output", str(site)],
                       cwd=ROOT, check=True)
        runtime = site / "emu"
        metadata = json.loads((runtime / "runtime.json").read_text())
        assert metadata["firmware_source"] == manifest["firmware"]
        assert metadata["kernel_source"] == manifest["kernel"]
        assert hashlib.sha256((runtime / "kernel.wasm").read_bytes()).hexdigest() == manifest["wasm_sha256"]
        with ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(site))) as server:
            thread = Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                with sync_playwright() as pw:
                    browser = pw.chromium.launch(chromium_sandbox=True)
                    try:
                        page = browser.new_page(viewport={"width": 844, "height": 390}, device_scale_factor=1)
                        errors = []
                        page.on("pageerror", lambda error: errors.append(str(error)))
                        origin = f"http://127.0.0.1:{server.server_port}"
                        check_page(page, f"{origin}/emu/", manifest)
                        presentation = json.loads((site / "APPROVED-PRESENTATION.json").read_text())
                        check_historical_reference(page, origin, presentation)
                        assert not errors, errors
                    finally:
                        browser.close()
            finally:
                server.shutdown()
                thread.join()


if __name__ == "__main__":
    main()
