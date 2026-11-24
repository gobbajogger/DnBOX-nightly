# SPDX-License-Identifier: GPL-3.0-only
"""Remote controls in a real browser at the four review sizes; no device access.

Drum tracks open the drum sequencer with all 16 steps of a page on screen, step pages and the
firmware parameter page; BREAK is third; BREAK steps, tempo, double-tap reset and keybed
scrolling work; the only states are Connected / Disconnected, and a connected (mocked Web MIDI,
spec-encoded) instrument receives each edit as its DNR3 request.
"""
import asyncio, re
import mimetypes
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import unquote, urlparse
from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
SOURCE = None
ORIGIN = 'https://dnbox.test'
SIZES = [(390, 844), (844, 390), (1024, 640), (1440, 900)]

async def serve(route):
    url = urlparse(route.request.url)
    if url.netloc != 'dnbox.test':
        await route.abort(); return
    path = (SOURCE / unquote(url.path).lstrip('/')).resolve()
    if not path.is_relative_to(SOURCE.resolve()):
        await route.fulfill(status=403, body='Forbidden'); return
    if path.is_dir(): path /= 'index.html'
    if not path.is_file():
        await route.fulfill(status=404, body='Not found'); return
    mime = 'text/javascript' if path.suffix == '.mjs' else mimetypes.guess_type(path)[0] or 'application/octet-stream'
    await route.fulfill(status=200, content_type=mime, body=path.read_bytes())

# A Web MIDI port pair that answers DNR3 like the spec (REMOTE-FW-PROTOCOL.md), or stays silent.
MOCK = r"""
window.__dnr3Sent = [];
window.__dnr3Replies = [];
window.__installDnbox = async (answer) => {
  const d = await import('/remote/dnr3.mjs');
  const listeners = new Set();
  let bpmX10 = 1250;
  const input = {name: 'DnBOX',state: 'connected', addEventListener: (t, f) => listeners.add(f), removeEventListener: (t, f) => listeners.delete(f), open: async () => {}};
  const reply = (op, seq, fields) => { const frame = d.encodeReply(op, seq, d.STATUS.OK, 1, fields); setTimeout(() => {
    window.__dnr3Replies.push({op, fields}); listeners.forEach(f => f({data: frame}));
  }, 1); };
  const output = {name: 'DnBOX',state: 'connected', open: async () => {}, send(bytes) {
    const b = Uint8Array.from(bytes);
    if (b[0] !== 0xF0) { window.__dnr3Sent.push({midi: Array.from(b)}); return; }
    const r = d.decodeRequest(b); window.__dnr3Sent.push({op: r.op, fields: r.fields});
    if (!answer) return;
    const f = r.fields;
    if (r.op === d.OP.TEMPO) bpmX10 = f.bpm_x10;
    const out = {
      [d.OP.HELLO]: {proto: 3, minor: 0, fw_commit: Array(20).fill(0), board: 1, caps: 0, npat: 32, nsteps: 64, ntracks: 11, ndrum: 11, clip_mode: 0, clk_src: 0, watch_max_hz: 30},
      [d.OP.OPEN]: {epoch: 1, lease_ms: 5000}, [d.OP.KEEPALIVE]: {}, [d.OP.CLOSE]: {},
      [d.OP.STEP_SET]: {part: f.part, pat: f.pat, step: f.step, record: f.record, pattern_crc: 0},
      [d.OP.PARAM_SET]: {kind: f.kind, a: f.a, b: f.b, c: f.c, value: f.value},
      [d.OP.PART_SET]: {part: f.part, pat: f.pat, field: f.field, value: f.value},
      [d.OP.TEMPO]: {bpm_x10: bpmX10},
      [d.OP.STATE]: {playing: 0, clk_src: 0, clip_mode: 0, send_notes: 0, bpm_x10: bpmX10,
        ppat: Array(5).fill(0), pcue: Array(5).fill(127), mute: 0, vmute: 0, part_off: 0, song_on: 0,
        song_pos: 0, ch: [0, 1, 2, 3, 4], step_pos: Array(5).fill(127), pattern_crc: Array(32).fill(0)}}[r.op];
    if (out) reply(r.op, r.seq, out);
  }};
  Object.defineProperty(navigator, 'requestMIDIAccess', {configurable: true, value: async () => ({inputs: new Map([['i', input]]), outputs: new Map([['o', output]])})});
};
"""

async def open_remote(browser, w, h):
    context = await browser.new_context(viewport={'width': w, 'height': h}, has_touch=True)
    await context.route('**/*', serve)
    page = await context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    await page.add_init_script('navigator.requestMIDIAccess=()=>{throw Error("no device in this test")};' + MOCK)
    await page.goto(ORIGIN + '/remote/')
    await expect(page.locator('#conn-state')).to_have_text('Disconnected')
    return context, page, errors

async def drums_default(page, w, h):
    order = await page.eval_on_selector_all('[data-engine]', 'e => e.map(x => x.dataset.engine)')
    assert order == ['drum909', 'drum808', 'breaks', 'chicago', 'miami'], order
    for kit in ('drum909', 'drum808'):
        await page.locator(f'[data-engine="{kit}"]').click()
        await expect(page.locator('#other-view .funkybeats-sequencer [data-drum-note]').first).to_be_visible()
        assert not await page.locator('#roll-grid').is_visible(), 'piano roll must not open for ' + kit
        assert await page.get_attribute('.tab[data-view="roll"]', 'aria-current') is not None, 'Sequence tab stays current'
        inview = await page.evaluate("""() => { const vw = document.documentElement.clientWidth;
          const row = [...document.querySelectorAll('#other-view .seq-row:not(.seq-numbers)')][0];
          const cells = [...row.querySelectorAll('.seq-step')];
          return cells.filter(c => { const r = c.getBoundingClientRect(); return r.width > 4 && r.left >= -0.5 && r.right <= vw + 0.5; }).length; }""")
        assert inview == 16, f'{kit} {w}x{h}: {inview} of 16 steps on screen'
    # Switching away and back keeps the default per track type.
    await page.locator('[data-engine="chicago"]').click()
    await expect(page.locator('#roll-grid')).to_be_visible()
    await page.locator('[data-engine="drum909"]').click()
    await expect(page.locator('#other-view [data-drum-note]').first).to_be_visible()

async def pages_and_params(page, w, h):
    await page.locator('[data-engine="drum909"]').click()
    await page.locator('[data-drum-page="1"]').click()
    cell = page.locator('#other-view [data-drum-step="16"][data-drum-voice="0"]')
    await expect(cell).to_have_attribute('aria-pressed', 'false')
    await cell.click()
    await expect(page.locator('#other-view [data-drum-step="16"][data-drum-voice="0"]')).to_have_attribute('aria-pressed', 'true')
    await expect(page.locator('#other-view .seq-numbers span').nth(1)).to_have_text('17')
    await page.locator('#undo').click()
    await expect(page.locator('#other-view [data-drum-step="16"][data-drum-voice="0"]')).to_have_attribute('aria-pressed', 'false')
    await page.locator('[data-drum-params]').click()
    opts = await page.eval_on_selector_all('[data-seq-option]', 'e => e.map(x => x.dataset.seqOption)')
    assert opts == ['R_DLEN', 'R_DRATE', 'R_SWING', 'R_ACCENT'], opts
    await page.locator('[data-seq-opt="R_DRATE"][data-seq-value="4"]').click()
    await expect(page.locator('[data-seq-value-of="R_DRATE"]')).to_have_text('1/8')
    length = page.locator('input[data-seq-opt="R_DLEN"]')
    await length.fill('31')
    await expect(page.locator('[data-seq-value-of="R_DLEN"]')).to_have_text('32 steps')
    await expect(page.locator('.drum-len')).to_have_text('LEN 32')
    await page.locator('input[data-seq-opt="R_DLEN"]').dblclick()
    await expect(page.locator('[data-seq-value-of="R_DLEN"]')).to_have_text('16 steps')
    await page.locator('[data-drum-page="0"]').click()
    await expect(page.locator('#other-view [data-drum-note]').first).to_be_visible()

async def accent_row(page, w, h):
    await page.locator('[data-engine="drum808"]').click()
    acc = page.locator('#other-view [data-drum-accent="3"]')
    await expect(acc).to_have_attribute('aria-pressed', 'false')
    await acc.click()
    await expect(page.locator('#other-view [data-drum-accent="3"]')).to_have_attribute('aria-pressed', 'true')

async def break_screen(page, w, h):
    await page.locator('[data-engine="breaks"]').click()
    await expect(page.locator('#break-sequence [data-break-on]')).to_have_count(16)
    assert await page.locator('#break-sequence select').count() == 0, 'no dropdowns'
    on = page.locator('#break-sequence [data-break-on="4"]')
    await on.click()
    await expect(on).to_have_attribute('aria-pressed', 'true')
    cell = page.locator('#break-sequence [data-break-step="4"]')
    await cell.click()
    await page.locator('[data-break-open-slices]').click()
    await page.locator('[data-break-slice="7"]').click()
    await expect(cell).to_have_attribute('data-value', '7')
    await cell.dblclick()
    await cell.press('ArrowUp')
    await expect(cell).to_have_attribute('data-value', '7')
    await cell.press('ArrowRight')
    await expect(page.locator('[data-break-target]')).to_have_text('Step 6')
    await cell.press('Enter')
    await expect(page.locator('[data-break-target]')).to_have_text('Step 5')
    await page.locator('[data-break-slice="0"]').click()
    await expect(cell).to_have_attribute('data-value', '0')
    await expect(on).to_have_attribute('aria-pressed', 'true')

async def tempo(page, w, h):
    t = page.locator('#tempo')
    await expect(t).to_have_text('125 BPM')
    await page.locator('[data-tempo="up"]').click()
    await expect(t).to_have_text('126 BPM')
    tap = page.locator('[data-tempo="tap"]')
    await tap.click()
    await expect(tap).to_have_attribute('aria-pressed', 'true')  # the first tap is acknowledged
    await expect(t).to_have_text('126 BPM')
    await t.dblclick()
    await expect(t).to_have_text('125 BPM')
    await t.focus(); await page.keyboard.press('PageUp')
    await expect(t).to_have_text('135 BPM')
    await t.tap(); await t.tap()
    await expect(t).to_have_text('125 BPM')

async def keybed(page, w, h):
    await page.locator('[data-engine="chicago"]').click()
    await expect(page.locator('#roll-grid')).to_be_visible()
    rail, scroll = page.locator('#pitch-rail'), page.locator('#roll-scroll')
    await scroll.evaluate('s => { s.scrollTop = 600; }')
    before = await scroll.evaluate('s => s.scrollTop')
    box = await rail.bounding_box()
    x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + 80, steps=6); await page.mouse.up()
    after = await scroll.evaluate('s => s.scrollTop')
    assert after < before - 40, f'mouse drag on the keybed scrolls ({before} -> {after})'
    await page.mouse.click(x, y)
    assert await scroll.evaluate('s => s.scrollTop') == after, 'a tap does not scroll'

async def reset_knob(page, w, h):
    await page.locator('[data-engine="chicago"]').click()
    await page.locator('.tab[data-view="sound"]').click()
    knob = page.locator('#other-view input[type="range"]').first
    await expect(knob).to_be_visible()
    start = await knob.input_value()
    mx = await knob.get_attribute('max')
    target = '0' if start != '0' else (mx or '1')
    await knob.fill(target); await knob.dispatch_event('change')
    knob = page.locator('#other-view input[type="range"]').first
    assert await knob.input_value() == target
    await knob.dblclick()
    await expect(page.locator('#other-view input[type="range"]').first).to_have_value(start)
    # Step lanes: double-click (mouse) and double-tap (touch) reset the step to the default velocity 100.
    await page.locator('[data-engine="drum909"]').click()
    await page.locator('.tab[data-view="roll"]').click()
    lane = page.locator('#drum-lane [data-lane-step="0"]')
    await expect(lane).to_have_attribute('aria-label', 'Step 1, 1 notes, velocity 88')
    await lane.dblclick()
    await expect(page.locator('#drum-lane [data-lane-step="0"]')).to_have_attribute('aria-label', 'Step 1, 1 notes, velocity 100')
    await page.locator('[data-engine="chicago"]').click()
    await page.locator('.tab[data-view="roll"]').click()
    step = page.locator('#velocity [data-lane-step]').first
    await step.tap(); await step.tap()
    await expect(page.locator('#velocity [data-lane-step]').first).to_contain_text('100')

async def connection(page, w, h):
    html = await page.content()
    for gone in ('emulator-start', 'emulator-stop', 'data-sound-source', 'data-mix-source', 'Apply to instrument'):
        assert gone not in html, gone
    await page.evaluate('window.__installDnbox(false)')
    await page.locator('#connect').click()
    await expect(page.locator('#conn-state')).to_have_text('Disconnected', timeout=5000)
    await page.wait_for_timeout(1200)
    await expect(page.locator('#conn-state')).to_have_text('Disconnected')
    await page.evaluate('window.__installDnbox(true)')
    await page.locator('#connect').click()
    await expect(page.locator('#conn-state')).to_have_text('Connected', timeout=5000)
    await page.wait_for_function('window.__dnr3Replies.some(r => r.op === 0x30 && r.fields.bpm_x10 === 1250)')
    await expect(page.locator('#tempo')).to_have_text('125 BPM')
    await expect(page.locator('#tempo-state')).to_have_text('Device')
    await page.evaluate('window.__dnr3Sent.length = 0')
    await page.locator('[data-engine="drum909"]').click()
    await expect(page.locator('[data-drum-source=draft]')).to_contain_text('not sent')
    await page.locator('#other-view [data-drum-note="38"]').nth(4).click()
    await page.locator('#other-view [data-drum-accent="5"]').click()
    await page.locator('[data-tempo="up"]').click()
    await page.locator('[data-drum-params]').click()
    await page.locator('[data-seq-opt="R_DRATE"][data-seq-value="1"]').click()
    await page.locator('[data-engine="breaks"]').click()
    await page.locator('#break-sequence [data-break-on="2"]').click()
    await page.wait_for_function('window.__dnr3Sent.some(r => r.op === 0x27 && r.fields.bpm_x10 === 1260)')
    sent = await page.evaluate('window.__dnr3Sent')
    ops = [(s['op'], s['fields']) for s in sent if 'op' in s]
    want = [
        (0x27, lambda f: f['bpm_x10'] == 1260),
    ]
    assert await page.locator('[data-break-source]').get_attribute('data-break-source') == 'draft'
    assert not any(o in (0x21,0x22) for o,f in ops), ops # no STEP capability
    for op, ok in want:
        assert any(o == op and ok(f) for o, f in ops), (hex(op), ops)
    await expect(page.locator('#tempo')).to_have_text('126 BPM')
    await expect(page.locator('#tempo-state')).to_have_text('Device')
    # Reopen the same fixture/firmware session target: read back retained BPM via STATE,
    # not the prior receipt or a local retained optimistic value.
    await page.evaluate('window.__dnr3Replies.length = 0')
    await page.locator('#connect').click()
    await page.wait_for_function('window.__dnr3Replies.some(r => r.op === 0x07)')
    await expect(page.locator('#conn-state')).to_have_text('Disconnected')
    await page.locator('#connect').click()
    await expect(page.locator('#conn-state')).to_have_text('Connected')
    await page.wait_for_function('window.__dnr3Replies.some(r => r.op === 0x30 && r.fields.bpm_x10 === 1260)')
    await expect(page.locator('#tempo')).to_have_text('126 BPM')
    await expect(page.locator('#tempo-state')).to_have_text('Device')

async def fw_motion(page, w, h):
    # Firmware glyph motion: playhead column, hit flash, held pad, play beat flash, BREAK step playhead.
    await page.locator('[data-engine="drum909"]').click()
    cell = page.locator('#other-view .fw-drum-grid [data-channel="0"][data-step="0"]')
    if await cell.get_attribute('aria-pressed') != 'true':
        await cell.click()
    await page.evaluate("() => { const t = document.getElementById('tempo'); if (t) t.textContent = '300'; }")
    await page.locator('#play').click()
    cols = await page.evaluate("""() => new Promise(done => { const seen = new Set(); let fired = false, beat = false;
      const t0 = performance.now(); (function tick() {
        document.querySelectorAll('#other-view .fw-drum-grid .seq-step.ph').forEach(c => seen.add(c.dataset.col));
        if (document.querySelector('#other-view .fw-drum-grid .seq-step.fired')) fired = true;
        if (document.getElementById('play').classList.contains('beat')) beat = true;
        if (performance.now() - t0 > 4200) done({cols: [...seen], fired, beat}); else requestAnimationFrame(tick); })(); })""")
    assert len(cols['cols']) >= 4, cols
    assert not cols['fired'], 'Draft playhead cannot claim that a firmware voice fired'
    assert cols['beat'], 'play triangle flashes white on the beat'
    ph_rows = await page.eval_on_selector_all('#other-view .fw-drum-grid .seq-step.ph', 'e => new Set(e.map(c => c.dataset.col)).size')
    assert ph_rows <= 1, 'one playhead column'
    await page.locator('#stop').click()
    await expect(page.locator('#other-view .fw-drum-grid .seq-step.ph')).to_have_count(0)
    box = await page.locator('#other-view .fw-drum-grid [data-channel="2"][data-step="5"]').bounding_box()
    await page.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    await page.mouse.down()
    await expect(page.locator('#other-view .fw-drum-grid [data-channel="2"][data-step="5"]')).to_have_class(re.compile(r'\bheld\b'))
    await page.mouse.up()
    await expect(page.locator('#other-view .fw-drum-grid .held')).to_have_count(0)
    assert await page.locator('#play svg.fw-transport').count() == 1
    assert await page.locator('.engine .fw-lane').count() == 5
    await page.locator('[data-engine="breaks"]').click()
    await page.locator('#play').click()
    await expect(page.locator('#break-sequence .break-on.ph')).to_have_count(1)
    await page.locator('#stop').click()
    await expect(page.locator('#break-sequence .break-on.ph')).to_have_count(0)

async def preset_banks(page, w, h):
    # SuperJ6 / Synth One: bank selector, then that bank's presets in the original order with real names.
    await page.locator('[data-engine="miami"]').click()
    await page.locator('.tab[data-view="sound"]').click()
    await page.locator('#sound-bank').select_option('JUNO')
    await expect(page.locator('#sound-preset-bank option')).to_have_count(13)
    await page.locator('#sound-preset-bank').select_option('3')
    await expect(page.locator('#sound-preset option')).to_have_count(21)
    await expect(page.locator('#sound-preset option').first).to_have_text('001 DelicateCutters-DD')
    await expect(page.locator('[data-preset-unsent]')).to_be_visible()
    await page.locator('#sound-preset-bank').select_option('0')
    await page.locator('#sound-preset').select_option('0:1')
    await expect(page.locator('[data-preset-unsent]')).to_have_count(0)
    await page.locator('#sound-bank').select_option('SYNTH ONE')
    await page.locator('#sound-preset-bank').select_option('1')
    await expect(page.locator('#sound-preset option')).to_have_count(135)
    await expect(page.locator('#sound-preset option').first).to_have_text('001 Synthwave 1974')
    await page.locator('#sound-preset').select_option('1:4')
    await expect(page.locator('#sound-preset')).to_have_value('1:4')
    await expect(page.locator('#sound-preset-bank')).to_have_value('1')

async def main():
    global SOURCE
    out_root = ROOT / '.output'; out_root.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='remote-controls-', dir=out_root) as output:
        SOURCE = Path(output)
        subprocess.run(['node', 'scripts/build-product-site.mjs', '--output', output], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(chromium_sandbox=True)
            n = 0
            try:
                for w, h in SIZES:
                    for case in (drums_default, pages_and_params, accent_row, break_screen, tempo, keybed, reset_knob, connection, fw_motion, preset_banks):
                        context, page, errors = await open_remote(browser, w, h)
                        await case(page, w, h)
                        assert not errors, errors
                        await context.close(); n += 1
                        print(f'PASS remote {case.__name__} {w}x{h}', flush=True)
            finally:
                await browser.close()
    print(f'REMOTE-CONTROLS-BROWSER cases={n} failures=0')

if __name__ == '__main__':
    asyncio.run(main())
