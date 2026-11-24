#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Run against the actual built route (not a mock DOM). No live device or permissions."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
from threading import Thread
from playwright.sync_api import sync_playwright, expect
from visual_gate import CURRENT_HEADER_JS, SIZES, current_header_actions

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

MUTATIONS = {
    'hide reset': ("document.querySelector('[data-tempo=reset]').hidden=true",
                   "document.querySelector('[data-tempo=reset]').hidden=false", 'BPM reset hidden'),
    'occlude increase': ("""() => {const b=document.querySelector('[data-tempo=up]'),r=b.getBoundingClientRect(); const cover=document.createElement('div');
      cover.id='fixture-cover'; cover.style.cssText=`position:fixed;top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${r.height}px;z-index:9999`;
      document.body.append(cover);}""", "document.querySelector('#fixture-cover').remove()", 'BPM up not actionable at center'),
    'dim track': ("document.querySelector('[data-engine=drum909]').style.color='#182124'",
                  "document.querySelector('[data-engine=drum909]').style.removeProperty('color')", 'drum909 unreadable contrast'),
    'lose selected workspace': ("document.querySelector('[data-view=roll]').removeAttribute('aria-current')",
                                "document.querySelector('[data-view=roll]').setAttribute('aria-current','page')", 'Exactly one selected workspace'),
    'false hardware scope': ("document.querySelector('#tempo-state').textContent='Device'",
                             "document.querySelector('#tempo-state').textContent='Draft'", 'Draft edit provenance missing'),
}

def main():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=os.environ['DNBOX_AUDIT_SITE']))
    Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_address[1]}/remote/'
    try:
        with sync_playwright() as api:
            for w,h in SIZES:
                with api.chromium.launch(chromium_sandbox=True) as browser:
                    with browser.new_context(viewport={'width':w,'height':h},has_touch=w<1000,is_mobile=w<1000) as ctx:
                        pg=ctx.new_page()
                        pg.goto(url)
                        expect(pg.locator('main')).to_have_attribute('aria-busy','false')
                        pg.evaluate('document.fonts.ready')
                        issues=pg.evaluate(CURRENT_HEADER_JS,'draft')
                        assert not issues,(w,h,issues)
                        current_header_actions(pg)
                        for key,(mutation,reverse,reason) in MUTATIONS.items():
                            pg.evaluate(mutation)
                            issues=pg.evaluate(CURRENT_HEADER_JS,'draft')
                            assert reason in issues,(w,h,key,issues)
                            pg.evaluate(reverse)
                            assert not pg.evaluate(CURRENT_HEADER_JS,'draft'),(w,h,key,'fixture failed to restore')
                        print(f'PASS {w}×{h} real built header reads and edits; {len(MUTATIONS)} mutations rejected',flush=True)
    finally:
        server.shutdown()
        server.server_close()

if __name__=='__main__':
    main()
