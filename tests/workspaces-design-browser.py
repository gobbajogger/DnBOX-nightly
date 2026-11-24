# SPDX-License-Identifier: GPL-3.0-only
"""Locks the Samples and Songs & projects workspaces on the built product site to the
installer's R22 design (BASELINE-REVIEW site-breaks/site-projects; user U209-U214, U335-U347,
U538, U675): one site header, Barlow, amber controls, numbered panels, no X0X or technical
explainers, no native file buttons left unstyled, the embedded tool fully shown inside the
installer tab, and no horizontal overflow at 390x844, 844x390, 1024x640 and 1440x900. Also the
starting-break picker: names, and All / None / some reaching the install step.
No MIDI, device access or firmware writes."""
import re, shutil, subprocess, threading
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.output' / 'workspaces-design-test'
shutil.rmtree(OUT, ignore_errors=True)
subprocess.run(['node', 'scripts/build-product-site.mjs', '--output', str(OUT)], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw): super().__init__(*a, directory=str(OUT), **kw)
    def log_message(self, *a): pass

BANNED = re.compile(r'X0X|XOX|Listen locally|Mono reference|Encoded loop|source-executed|provider|Inspect a file offline|Find USB MIDI')
AMBER = 'rgb(255, 179, 55)'
count = 0
def check(ok, label):
    global count
    assert ok, label
    count += 1
    print('PASS ' + label, flush=True)

LOOK = """d=>{const b=d.body,btn=[...d.querySelectorAll('button')].find(e=>e.offsetParent&&!e.classList.contains('quiet')&&!e.disabled&&getComputedStyle(e).backgroundColor!=='rgba(0, 0, 0, 0)');
 return {sw:d.documentElement.scrollWidth,cw:d.documentElement.clientWidth,font:getComputedStyle(b).fontFamily,bg:getComputedStyle(b).backgroundColor,
  headers:[...d.querySelectorAll('header')].filter(e=>e.offsetParent).length,panels:[...d.querySelectorAll('.ws-panel')].filter(e=>e.offsetParent).length,
  kickers:[...d.querySelectorAll('.ws-kicker .no')].filter(e=>e.offsetParent).map(e=>getComputedStyle(e).color),
  rawFile:[...d.querySelectorAll('input[type=file]')].filter(e=>e.offsetParent&&!e.classList.contains('ws-file-input')).length,
  checks:[...d.querySelectorAll('input[type=checkbox]')].filter(e=>e.offsetParent).every(e=>getComputedStyle(e).appearance==='none'),
  text:b.innerText,sh:d.documentElement.scrollHeight}}"""

server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}'
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(chromium_sandbox=True)
        for w, h in [(390, 844), (844, 390), (1024, 640), (1440, 900)]:
            for name, path, frame_id, panels in [('samples', 'breaks', 'sample-frame', 3), ('projects', 'projects', 'project-frame', 4)]:
                for where in ('standalone', 'tab'):
                    tag = f'{name} {where} {w}x{h}'
                    page = browser.new_page(viewport={'width': w, 'height': h})
                    page.add_init_script("Object.defineProperty(navigator,'requestMIDIAccess',{value(){throw Error('no MIDI in design test')}})")
                    errors = []
                    page.on('pageerror', lambda e: errors.append(str(e)))
                    page.goto(f'{base}/{path}/' if where == 'standalone' else f'{base}/install/#{name}', wait_until='networkidle')
                    page.wait_for_timeout(300)
                    if where == 'tab':
                        outer = page.evaluate('()=>({sw:document.documentElement.scrollWidth,title:document.getElementById("page-title").textContent,headers:[...document.querySelectorAll("header")].filter(e=>e.offsetParent).length})')
                        check(outer['sw'] <= w, f'{tag} installer has no horizontal overflow')
                        check(outer['title'] == ('Samples' if name == 'samples' else 'Songs & projects'), f'{tag} page title follows the tab ({outer["title"]})')
                        check(outer['headers'] == 1, f'{tag} one site header')
                        frame = page.frame_locator('#' + frame_id)
                        doc = page.locator('#' + frame_id).element_handle().content_frame()
                        info = doc.evaluate('()=>(' + LOOK + ')(document)')
                        fh = page.locator('#' + frame_id).evaluate('e=>e.getBoundingClientRect().height')
                        check(info['sh'] <= fh + 2 and fh <= info['sh'] + 40, f'{tag} the tool is fully shown, no empty canvas (content {info["sh"]}, frame {fh})')
                        check(info['headers'] == 0, f'{tag} no second header inside the tab')
                    else:
                        info = page.evaluate('()=>(' + LOOK + ')(document)')
                        check(info['headers'] == 1, f'{tag} one site header')
                    check(info['sw'] <= info['cw'], f'{tag} no horizontal overflow ({info["sw"]}>{info["cw"]})')
                    check(info['font'].startswith('Barlow'), f'{tag} Barlow')
                    check(info['bg'] == 'rgb(7, 16, 20)', f'{tag} R22 background {info["bg"]}')
                    check(info['panels'] == panels and info['kickers'] and all(c == AMBER for c in info['kickers']), f'{tag} {panels} numbered panels with amber step numbers')
                    check(info['rawFile'] == 0 and info['checks'], f'{tag} styled file choosers and toggles')
                    check(not BANNED.search(info['text']), f'{tag} no X0X or technical text: {BANNED.findall(info["text"])}')
                    check(not errors, f'{tag} no script errors {errors}')
                    page.close()
            # Starting breaks: real names, and the choice the install step will write.
            page = browser.new_page(viewport={'width': w, 'height': h})
            page.add_init_script("Object.defineProperty(navigator,'requestMIDIAccess',{value(){throw Error('no MIDI in design test')}})")
            page.goto(f'{base}/install/', wait_until='networkidle')
            page.wait_for_function('document.querySelectorAll("#sample-picker [data-asset]").length===5')
            labels = page.locator('#sample-picker .break-rows label').all_inner_texts()
            check(any('Hot Pants' in l for l in labels) and any('Tasty' in l for l in labels), f'install {w}x{h} breaks shown by name {labels}')
            chosen = lambda: page.evaluate('globalThis.dnboxStartingBreaks.selectedIds()')
            page.click('#sample-picker [data-action=all]')
            check(len(chosen()) == 5, f'install {w}x{h} All chooses all five for the install')
            page.click('#sample-picker [data-action=none]')
            check(chosen() == [], f'install {w}x{h} None installs the firmware only')
            page.locator('#sample-picker [data-asset="personal-br2-zone2"]').check()
            check(chosen() == ['personal-br2-zone2'], f'install {w}x{h} one break chosen')
            check(page.evaluate('globalThis.dnboxStartingBreaks.names(["personal-br1-zone3","personal-br2-zone2"])') == ['Hot Pants', 'Tasty'], f'install {w}x{h} install messages use the names')
            check('with the firmware' in page.inner_text('#breaks-note'), f'install {w}x{h} step 02 says the breaks are installed')
            page.click('#sample-picker [data-action=all]')
            page.close()
        browser.close()
finally:
    server.shutdown()
    shutil.rmtree(OUT, ignore_errors=True)
print(f'{count} workspace design checks PASS')
