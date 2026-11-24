"""Live roll playhead and bar/beat hierarchy in the shipped Remote (local draft, no device)."""
import asyncio, importlib.util, re, subprocess, tempfile
from pathlib import Path
from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('funky', Path(__file__).with_name('funkybeats-browser.py'))
core = importlib.util.module_from_spec(spec)
spec.loader.exec_module(core)


async def offset(head):
    return await head.evaluate('e=>e.getBoundingClientRect().left')


async def cases():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(chromium_sandbox=True)
        try:
            for width, height in [(844, 390), (1440, 900)]:
                context = await browser.new_context(viewport={'width': width, 'height': height})
                await context.route('**/*', core.serve)
                page = await context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                await page.add_init_script('navigator.requestMIDIAccess=()=>Promise.reject(Error("no device in test"))')
                await page.goto(core.ORIGIN + '/remote/')
                await expect(page.locator('main')).to_have_attribute('aria-busy', 'false')
                head = page.locator('#roll-grid .roll-playhead')
                await expect(head).to_have_count(1)
                await expect(head).to_have_attribute('aria-label', 'Playhead at start')
                # Bar line outranks beat lines in the ruler.
                bar = page.locator('#beat-ruler .ruler-bar')
                beats = page.locator('#beat-ruler .ruler-beat')
                await expect(bar).to_have_text('Bar 1')
                await expect(beats).to_have_count(3)
                bar_style = await bar.evaluate('e=>[getComputedStyle(e).fontWeight,getComputedStyle(e).color]')
                beat_style = await beats.first.evaluate('e=>[getComputedStyle(e).fontWeight,getComputedStyle(e).color]')
                assert bar_style != beat_style and int(bar_style[0]) > int(beat_style[0]), (bar_style, beat_style)
                start = await offset(head)
                await page.locator('#play').click()
                seen = set()
                positions = []
                for _ in range(24):
                    await page.wait_for_timeout(60)
                    step = await head.get_attribute('data-step')
                    if step:
                        seen.add(int(step))
                        positions.append(await offset(head))
                assert len(seen) >= 4, seen
                assert max(positions) > start + 10, (start, positions)
                await expect(head).to_have_attribute('aria-label', re.compile(r'^Playhead at beat [1-4], step ([1-9]|1[0-6])$'))
                await expect(page.locator('#beat-ruler .current')).to_have_count(1)
                await page.locator('#stop').click()
                await expect(head).to_have_attribute('aria-label', 'Playhead at start')
                await expect(page.locator('#beat-ruler .current')).to_have_count(0)
                assert abs(await offset(head) - start) < 0.5
                # Draft playback is allowed, but cannot pretend the instrument is recording.
                # Actual Record panel and transport are covered through native WASM Web MIDI.
                await expect(page.locator('#rec')).to_be_disabled()
                await expect(page.locator('#rec')).to_have_attribute('aria-pressed', 'false')
                await expect(head).to_have_attribute('aria-label', 'Playhead at start')
                assert not errors, errors
                assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                print('PLAYHEAD', width, height, 'steps', sorted(seen), flush=True)
                await context.close()
        finally:
            await browser.close()
    print('PLAYHEAD PASS: Draft Play sweeps by step, Stop resets, and Record requires the instrument; Bar 1 outranks beats', flush=True)


def main():
    (ROOT / '.output').mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='playhead-', dir=ROOT / '.output') as output:
        core.SOURCE = Path(output)
        subprocess.run(['node', 'scripts/build-product-site.mjs', '--output', output], cwd=ROOT, check=True,
                       stdout=subprocess.DEVNULL)
        asyncio.run(cases())


if __name__ == '__main__':
    main()
