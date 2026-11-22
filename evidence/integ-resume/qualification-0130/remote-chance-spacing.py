#!/usr/bin/env python3
"""Check readable spacing between adjacent full-value Chance labels."""
import argparse
import functools
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('site', type=Path, help='A built Nightly product site')
    args = parser.parse_args()
    handler = functools.partial(SimpleHTTPRequestHandler, directory=str(args.site.resolve()))
    with ThreadingHTTPServer(('127.0.0.1', 0), handler) as server, sync_playwright() as playwright:
        threading.Thread(target=server.serve_forever, daemon=True).start()
        browser = playwright.chromium.launch(
            chromium_sandbox=True,
            args=['--disable-dev-shm-usage', '--force-color-profile=srgb'],
        )
        failed = False
        for width, height in [(1440, 900), (844, 390), (390, 844)]:
            page = browser.new_page(viewport={'width': width, 'height': height})
            page.goto(f'http://127.0.0.1:{server.server_port}/remote/?fixture=1')
            page.locator('#lane-param').click()
            page.wait_for_function("""() =>
                [...document.querySelectorAll('#velocity .step-slider output')]
                    .filter(label => label.textContent.trim() === '100%').length >= 2
            """)
            measurements = page.evaluate("""() => {
                const labels = [...document.querySelectorAll('#velocity .step-slider output')];
                const fullValues = labels.flatMap((label, index) => {
                    if (label.textContent.trim() !== '100%') return [];
                    const text = document.createRange();
                    text.selectNodeContents(label);
                    const {left, right} = text.getBoundingClientRect();
                    const {left: cellLeft, right: cellRight} = label.getBoundingClientRect();
                    return [{index, left, right, cellLeft, cellRight}];
                });
                return fullValues.flatMap((label, index) => {
                    const next = fullValues[index + 1];
                    if (!next || next.index !== label.index + 1) return [];
                    return [{
                        steps: [label.index + 1, next.index + 1],
                        gap: next.left - label.right,
                        clipped: label.left < label.cellLeft || label.right > label.cellRight ||
                            next.left < next.cellLeft || next.right > next.cellRight,
                    }];
                });
            }""")
            minimum_gap = 3
            passed = bool(measurements) and all(
                pair['gap'] >= minimum_gap and not pair['clipped'] for pair in measurements
            )
            print(json.dumps({'viewport': [width, height], 'minimum_gap': minimum_gap,
                              'pairs': measurements, 'pass': passed}))
            failed |= not passed
            page.close()
        browser.close()
        server.shutdown()
    return int(failed)


if __name__ == '__main__':
    raise SystemExit(main())
