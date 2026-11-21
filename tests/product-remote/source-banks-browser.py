# SPDX-License-Identifier: GPL-3.0-only
"""Exercise both source-backed sound views using the regular Draft bank picker."""
import argparse
import asyncio
import importlib.util
from pathlib import Path
import subprocess
import tempfile

from playwright.async_api import async_playwright, expect

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
spec = importlib.util.spec_from_file_location("funky", HERE / "funkybeats-browser.py")
core = importlib.util.module_from_spec(spec)
spec.loader.exec_module(core)
FIELDS = {78, 79, 82, 83, 88, 96, 100, 195, 196, 197, 202, 210, 211}


async def assert_compact_toolbar(page):
    bars = await page.locator("#other-view > .mix-modes, #other-view > h2, #sound-bank").evaluate_all(
        "nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return [r.top, r.bottom] })")
    assert len(bars) == 3 and max(top for top, _ in bars) < min(bottom for _, bottom in bars), bars


async def at_size(browser, size, output):
    width, height = size
    context = await browser.new_context(viewport={"width": width, "height": height},
                                        has_touch=width < 900, accept_downloads=True)
    errors = []
    try:
        await context.route("**/*", core.serve)
        page = await context.new_page()
        page.on("pageerror", lambda err: errors.append(str(err)))
        await page.add_init_script("window.midiCalls=0; navigator.requestMIDIAccess=()=>{midiCalls++;throw Error('Unrequested MIDI')}")
        await page.goto(core.ORIGIN + "/remote/")
        await page.locator('[data-view="sound"]').click()
        picker = page.locator("#sound-bank")
        for slot, part in enumerate(("chicago", "miami")):
            await page.locator(f'[data-engine="{part}"]').click()
            options = await picker.locator("option").evaluate_all("es=>es.map(e=>e.value)")
            assert options[:4] == ["CHICAGO", "MIAMI", "Synth One", "SuperJ6"], options
            await picker.select_option("Synth One")
            scene = page.locator(f'[data-synth-one-init="{slot}"]')
            await expect(scene.locator("[data-init-field]")).to_have_count(14)
            await expect(scene.locator('[data-init-field="cutoffHz"] output')).to_have_text("2000 Hz")
            await expect(scene.locator('[data-init-field="filter-release"] dd')).to_have_text("500 ms")
            await expect(scene.locator("button,input,select,[data-param]")).to_have_count(0)
            if width >= 1024:
                tops = await scene.locator(".encoder-grid > .init-readout").evaluate_all(
                    "cards => cards.map(card => card.getBoundingClientRect().top)")
                assert len(tops) == 6 and max(tops) - min(tops) <= 1, tops
            if size == (844, 390):
                await assert_compact_toolbar(page)
            if output:
                await page.screenshot(path=output / f"synth-one-{slot}-{width}x{height}.png")
            await picker.select_option("SuperJ6")
            panel = page.locator("[data-superj6]")
            assert set(await panel.locator("[data-sj6-field]").evaluate_all("es=>es.map(e=>Number(e.dataset.sj6Field))")) == FIELDS
            await expect(panel.locator('[data-sj6-display="82"]')).to_have_text("Square")
            await expect(panel.locator('[data-sj6-display="83"]')).to_have_text("Square")
            await expect(panel.locator('[data-sj6-display="96"]')).to_contain_text("tempo position")
            await expect(panel.locator('[data-sj6-display="88"]')).to_contain_text("Hz")
            await expect(page.locator('[data-sound-source="emulator"]')).to_be_disabled()
            if size == (844, 390):
                await assert_compact_toolbar(page)
                edits = await panel.locator("[data-sj6-field]").evaluate_all(
                    "nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return [r.height, r.bottom] })")
                assert len(edits) == 13 and all(h >= 44 and bottom <= height for h, bottom in edits), edits
            if output:
                await page.screenshot(path=output / f"superj6-{slot}-{width}x{height}.png")
            if slot == 0:
                wave = panel.locator('[data-sj6-field="82"]')
                key = await wave.get_attribute("data-sj6-id")
                old_glyph = await panel.locator('[data-sj6-glyph="82"] polyline').get_attribute("points")
                await wave.select_option(label="Sine")
                await expect(panel.locator('[data-sj6-display="82"]')).to_have_text("Sine")
                assert await panel.locator('[data-sj6-glyph="82"] polyline').get_attribute("points") != old_glyph
                await page.locator("#undo").click()
                await expect(panel.locator('[data-sj6-display="82"]')).to_have_text("Square")
                await page.locator("#redo").click()
                await expect(panel.locator('[data-sj6-display="82"]')).to_have_text("Sine")
                saved = await core.draft_state(page)
                assert any(row["id"] == key and row["value"] == 0 for row in saved["parameters"])
                await wave.select_option(label="Saw")
                await core.load_draft(page, saved)
                await expect(panel.locator('[data-sj6-display="82"]')).to_have_text("Sine")
                assert (await core.draft_state(page))["parameters"] == saved["parameters"]
            assert await page.evaluate("document.documentElement.scrollWidth === innerWidth")
        await page.locator('[data-engine="chicago"]').click()
        await expect(page.locator('[data-sj6-display="82"]')).to_have_text("Sine")
        assert await page.evaluate("midiCalls") == 0 and not errors, errors
        print(f"SOURCE_BANKS {width}x{height} PASS both parts, independent edit, genuine Draft round trip, MIDI=0", flush=True)
    finally:
        await context.close()


async def inspect(output):
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(chromium_sandbox=True)
        try:
            for size in ((1440, 900), (844, 390), (390, 844), (1024, 640)):
                await at_size(browser, size, output)
        finally:
            await browser.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evidence", type=Path)
    options = parser.parse_args()
    if options.evidence:
        options.evidence.mkdir(parents=True, exist_ok=False)
    (ROOT / ".output").mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="source-banks-", dir=ROOT / ".output") as tmp:
        core.SOURCE = Path(tmp)
        subprocess.run(["node", "scripts/build-product-site.mjs", "--output", tmp], cwd=ROOT, check=True)
        asyncio.run(inspect(options.evidence))


if __name__ == "__main__":
    main()
