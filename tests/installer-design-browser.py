# SPDX-License-Identifier: GPL-3.0-only
"""Locks the musician installer design on the built product site (user U057,
U209-U214, U290, U335-U347, U538, U674, U675): one site header, Barlow, no
technical explainers, clean picker with the stable default and the newer test
build marked as a test, BREAK choose-with-preview inside the firmware task,
and no horizontal overflow at 390x844, 844x390, 1024x640 and 1440x900.
No MIDI, device access or firmware writes."""
import re, shutil, subprocess, threading
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.output' / 'installer-design-test'
shutil.rmtree(OUT, ignore_errors=True)
subprocess.run(['node', 'scripts/build-product-site.mjs', '--output', str(OUT)], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw): super().__init__(*a, directory=str(OUT), **kw)
    def log_message(self, *a): pass

BANNED = re.compile(r'X0X|withdrawn|hardware-test candidate|Upcoming UI|Closer look|Prepare a sample|Public install reports|owner verified|Model naming help|Development build')
count = 0
def check(ok, label):
    global count
    assert ok, label
    count += 1
    print('PASS ' + label, flush=True)

server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/install/'
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(chromium_sandbox=True)
        for w, h in [(390, 844), (844, 390), (1024, 640), (1440, 900)]:
            page = browser.new_page(viewport={'width': w, 'height': h})
            page.add_init_script("Object.defineProperty(navigator,'requestMIDIAccess',{value(){throw Error('no MIDI in design test')}})")
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(url, wait_until='networkidle')
            page.wait_for_selector('#sample-picker [data-asset]')
            tag = f'{w}x{h}'
            check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'), f'{tag} no horizontal overflow')
            check(page.evaluate('[...document.querySelectorAll("#firmware-panel *")].every(e=>{const r=e.getBoundingClientRect();return r.width===0||r.right<=innerWidth+1})'), f'{tag} nothing clipped past the right edge')
            check(page.evaluate('document.fonts.check("16px Barlow") && getComputedStyle(document.body).fontFamily.startsWith("Barlow")'), f'{tag} Barlow is the page font')
            check(page.evaluate('[...document.fonts].some(f=>f.family.replace(/"/g,"")==="Barlow"&&f.status==="loaded")'), f'{tag} Barlow loaded')
            check(page.locator('.brand').count() == 1 and page.locator('.site-head,.channel-label,.release-notice').count() == 0, f'{tag} one site header, no second embedded header')
            text = page.inner_text('body')
            check(not BANNED.search(text), f'{tag} no technical explainers or X0X: {BANNED.findall(text)}')
            check(page.locator('#firmware-panel .step-kicker').count() == 3, f'{tag} three numbered steps')
            check(page.locator('#firmware-panel #sample-picker [data-asset]').count() == 5 and page.locator('#firmware-panel #sample-picker [data-action=play]').count() == 5, f'{tag} five BREAK samples with preview inside the firmware task')
            check(page.locator('#firmware-panel #sample-picker input[type=checkbox]').evaluate_all('a=>a.every(e=>getComputedStyle(e).appearance==="none")'), f'{tag} BREAK choices use styled toggles')
            check(page.locator('#go').is_visible() and page.locator('#go').is_disabled(), f'{tag} install visible and locked before consent')
            sel = page.locator('#version')
            caption = sel.locator('option:checked').inner_text()
            check('Stable' in caption and '0.0.26' in caption, f'{tag} stable 0.0.26 is the default ({caption})')
            check(page.locator('#build-kind').get_attribute('data-kind') == 'stable', f'{tag} stable build tag')
            top = sel.locator(':scope > option').all_inner_texts()
            check(any('0.0.27' in t and 'Test build' in t for t in top), f'{tag} 0.0.27 listed and marked as a test build')
            check(len(top) <= 3 and sel.locator(':scope > optgroup option').count() > 0, f'{tag} earlier builds grouped, picker stays short')
            if w >= 800:
                tops = page.locator('#firmware-panel .step:not(.step-connect)').evaluate_all('a=>a.map(e=>Math.round(e.getBoundingClientRect().top))')
                check(len(set(tops)) == 1, f'{tag} steps side by side (landscape/desktop)')
            if w == 1440:
                check(page.locator('#go').evaluate('e=>e.getBoundingClientRect().bottom<=innerHeight'), f'{tag} install action in the first view')
            test_value = sel.locator('option', has_text='0.0.27').get_attribute('value')
            sel.select_option(test_value)
            page.wait_for_function('document.getElementById("build-kind").dataset.kind==="test"')
            check('Test build' in page.text_content('#build-kind'), f'{tag} selecting 0.0.27 shows the test tag')
            check(page.locator('#devagreewrap').is_visible() and page.locator('#go').is_disabled(), f'{tag} test build still needs consent')
            check(not errors, f'{tag} no script errors {errors}')
            page.close()
        browser.close()
finally:
    server.shutdown()
    shutil.rmtree(OUT, ignore_errors=True)
print(f'{count} installer design checks PASS')
