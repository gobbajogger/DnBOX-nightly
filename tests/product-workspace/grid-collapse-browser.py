"""Focused viewport witness for the Remote time-grid SVG; not the full product.

Run from repository root: python3 tests/product-workspace/grid-collapse-browser.py
Optional: DNBOX_GRID_CAPTURE_DIR=/tmp/grid-captures to keep screenshots.
"""
from __future__ import annotations
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
OUT=Path(os.getenv('DNBOX_GRID_CAPTURE_DIR', '/tmp/dnbox-grid-captures'))

def main():
    errors=[]
    html=(ROOT/'tests/product-workspace/grid-collapse-visual.html').read_text()
    module=(ROOT/'web/product-site/remote/grid.mjs').read_text()
    assert module.count('export function verticalGrid(')==1
    html=html.replace("""<script type="module">\nimport {verticalGrid} from '../../web/product-site/remote/grid.mjs';""",
      '<script>\n'+module.replace('export function verticalGrid(','function verticalGrid('))
    with sync_playwright() as playwright:
        browser=playwright.chromium.launch(headless=True,executable_path=os.getenv('DNBOX_CHROMIUM','/usr/bin/chromium'))
        try:
            for width,height in [(844,390),(390,844)]:
                page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.set_content(html,wait_until='load')
                assert page.evaluate('window.__ready === true')
                data=page.evaluate('''() => ({
                      outer:document.documentElement.scrollWidth,inner:innerWidth,
                      outerHeight:document.documentElement.scrollHeight,innerHeight:innerHeight,
                      rows:[...document.querySelectorAll('#grid-tests section')].length,
                      overhanging:[...document.querySelectorAll('#grid-tests section')].filter(el=>el.getBoundingClientRect().right>innerWidth+0.5).length,
                      svg:[...document.querySelectorAll('.grid')].map(el=>getComputedStyle(el).backgroundImage.includes('data:image/svg+xml'))
                    })''')
                assert data['rows']==9,data
                assert data['outer']<=data['inner'],data
                assert data['outerHeight']<=data['innerHeight'],data
                assert data['overhanging']==0,data
                assert all(data['svg']),data
                assert not errors,errors
                OUT.mkdir(parents=True,exist_ok=True)
                destination=OUT/f'grid-only-{width}x{height}.png'
                page.screenshot(path=str(destination),full_page=True)
                print(f'PASS grid-only {width}x{height} rows={data["rows"]} document={data["outer"]}x{data["outerHeight"]} viewport={data["inner"]}x{data["innerHeight"]} overflow=0 pageerrors=0 capture={destination}')
                page.close()
        finally:
            browser.close()
    print('PASS 2/2 grid-only browser viewports (not complete Remote page acceptance)')

if __name__=='__main__':
    main()
