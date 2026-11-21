#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Compare the mounted emulator's four stopped LCD states with native host frames."""
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
STATES = (("boot", None), ("fx", "FX"), ("save", "SAVE"), ("home", "HOME"))


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
    for name, button in STATES:
        before = 0
        if button:
            before = lcd.evaluate("c => Number(c.dataset.time)")
            page.get_by_role("button", name=button, exact=True).click(delay=80)
        # SAVE overlays the FX page briefly. Let its banner expire on HOME.
        delay_ms = {"boot": 500, "fx": 500, "save": 250, "home": 3000}[name]
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
                        page = browser.new_page(viewport={"width": 844, "height": 390})
                        errors = []
                        page.on("pageerror", lambda error: errors.append(str(error)))
                        check_page(page, f"http://127.0.0.1:{server.server_port}/emu/", manifest)
                        assert not errors, errors
                    finally:
                        browser.close()
            finally:
                server.shutdown()
                thread.join()


if __name__ == "__main__":
    main()
