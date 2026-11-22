#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Run the actual Page collector on source-only fixtures and optional UI roots.

No sandbox workaround is used. A denied browser launch is NOT_RUN/exit2, never
PASS. Public fixture source has no screenshots, private captures or raw audio.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('structural_slice', HERE.parents[1] / 'web_structural_slice.py')
gate = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(gate)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_miami_portrait_captions(page, result):
    """Complete the two known clipped observations through the user scroll path."""
    from playwright.sync_api import TimeoutError

    glyphs = {f'source-sound/MIAMI/1|1:2:1:{i}:1': text for i, text in
              ((11, 'SHAPE'), (13, 'RATE'))}
    missing = [row['glyph'] for row in result['checks'][3]['failures']
               if row['reason'] == 'missing-unpainted-or-cryptic-caption'
               and row['glyph'].get('param') in glyphs and not row['glyph']['captionPainted']]
    if not missing:
        return result
    pane = page.locator('#other-view')
    box = pane.bounding_box()
    before = pane.evaluate('e=>({top:e.scrollTop,hasUserScroll:["auto","scroll"].includes(getComputedStyle(e).overflowY)&&e.scrollHeight>e.clientHeight})')
    if not box or not before['hasUserScroll']:
        return result
    try:
        page.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] * .75)
        page.mouse.wheel(0, 520)
        page.wait_for_function('top=>document.querySelector("#other-view").scrollTop>top', arg=before['top'], timeout=1500)
        revealed = gate.collect_structural(page)
        post = {g['param']: g for g in revealed['glyphs'] if g.get('param') in glyphs}
        changes = {}
        for original in missing:
            param = original['param']
            row = post.get(param)
            if not row or row['type'] != original['type'] or not row['captionPainted'] or row['caption'] != glyphs[param]:
                continue
            unit = page.locator(f'#other-view button[data-param="{param}"]')
            if unit.count() != 1 or not unit.evaluate("""e=>{
              const r=e.getBoundingClientRect(),b=e.closest('#other-view').getBoundingClientRect();
              return r.left>=b.left && r.right<=b.right && r.top>=b.top && r.bottom<=b.bottom
                && !e.disabled && e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
            }"""):
                continue
            changes[original['id']] = {'initial': original, 'revealed': row}
        if not changes or revealed['collectionErrors']:
            return result
        evidence = [{'scrollTop':pane.evaluate('e=>e.scrollTop'), **item} for item in changes.values()]
        merged = [{**g, **{name:changes[g['id']]['revealed'][name]
                          for name in ('caption','captionPainted','captionRects')}}
                  if g['id'] in changes else g for g in result['glyphs']]
        observed = gate.analyze_snapshot({**result, 'glyphs':merged})
        return {**result, 'glyphs':merged,
                'checks':[*result['checks'][:3],observed['checks'][3]],
                'accepted':observed['accepted'], 'captionRevealEvidence':evidence,
                'initialCaptionCheck':result['checks'][3]}
    except TimeoutError:
        return result
    finally:
        pane.evaluate('(e,top)=>{e.scrollTop=top}', before['top'])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--fixtures-only',action='store_true',help='Explicit fixture contract mode; never product acceptance')
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--old-url', help='Already-served immutableR3remote root URL')
    parser.add_argument('--current-url', help='Already-served current remote root URL')
    parser.add_argument('--old-root', type=Path, help='Local immutableR3remote directory backing old URL')
    parser.add_argument('--current-root', type=Path, help='Local current remote directory backing current URL')
    args = parser.parse_args()
    manifest = json.loads((HERE / 'manifest.json').read_text())
    report = {'schema': 'dnbox-web-structural-fixtures/1', 'accepted': False,
              'tools': {str(p.name): digest(p) for p in [Path(gate.__file__), Path(__file__)]},
              'fixtures': {p.name: digest(p) for p in sorted(HERE.glob('*.html'))},
              'cases': [], 'actualSources': [], 'browser': {'status': 'NOT_RUN'}}
    roots = {'old': args.old_root, 'current': args.current_root}
    def closure(root):
        files = {str(p.relative_to(root)): digest(p) for p in sorted(root.rglob('*')) if p.is_file()}
        return {'files': files, 'sha256': hashlib.sha256(json.dumps(files, sort_keys=True, separators=(',', ':')).encode()).hexdigest()}
    report['sourcePinsBefore'] = {label: closure(root) if root else None for label, root in roots.items()}
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            # Explicitly ENABLE the browser sandbox. No --no-sandbox, namespace
            # workaround, security setting change, or alternate security context.
            browser = pw.chromium.launch(chromium_sandbox=True)
            report['browser'] = {'status': 'RUN', 'version': browser.version, 'sandbox': True}
            for case in manifest['cases']:
                page = browser.new_page(viewport={'width': 400, 'height': 300}, reduced_motion='reduce')
                page.goto((HERE / case['file']).as_uri(), wait_until='load')
                page.evaluate('document.fonts.ready')
                result = gate.collect_structural(page)
                statuses = {str(c['id']): c['status'] for c in result['checks']}
                ok = all(statuses[str(k)] == v for k, v in case['expected'].items()) and not result['collectionErrors']
                report['cases'].append({'file': case['file'], 'expectationMatched': ok, 'actualExit': 0 if result['accepted'] else 1, 'result': result})
                page.close()
            for label, url in [('old', args.old_url), ('current', args.current_url)]:
                if not url:
                    report['actualSources'].append({'source': label, 'status': 'NOT_RUN', 'exit': None, 'reason': 'No served source URL supplied'})
                    continue
                for w, h in [(1440, 900), (390, 844), (844, 390)]:
                    page = browser.new_page(viewport={'width': w, 'height': h}, reduced_motion='reduce')
                    page.goto(url, wait_until='networkidle')
                    page.wait_for_function("document.querySelectorAll('[data-note]').length>0")
                    for part in ['drum909', 'drum808', 'chicago', 'miami']:
                        page.locator('#part').select_option(part)
                        for view in ['roll', 'sound', 'mix']:
                            page.locator('nav.tabs [data-view="'+view+'"]').click()
                            page.evaluate('document.fonts.ready')
                            result = gate.collect_structural(page)
                            if label=='current' and (w,h)==(390,844) and part=='miami' and view=='sound':
                                result = verify_miami_portrait_captions(page, result)
                            report['actualSources'].append({'source': label, 'status': 'RUN', 'viewport': [w, h], 'part': part, 'view': view, 'exit': 0 if result['accepted'] else 1, 'result': result})
                    page.close()
            browser.close()
        report['fixturesAccepted']=bool(report['cases']) and all(c['expectationMatched'] for c in report['cases'])
        current=[r for r in report['actualSources']if r['source']=='current']
        report['productStatus']='FAIL'if any(r.get('exit')==1 for r in current)else'NOT_RUN'
        report['accepted']=False
        code=0 if args.fixtures_only and report['fixturesAccepted'] else 1 if not report['fixturesAccepted']or report['productStatus']=='FAIL'else 2
    except Exception as exc:
        report['error'] = {'type': type(exc).__name__, 'message': str(exc)}
        # Partial fixture execution remains partial, no fabricated old/current exit.
        for label in ('old', 'current'):
            if not any(r['source'] == label for r in report['actualSources']):
                report['actualSources'].append({'source': label, 'status': 'NOT_RUN', 'exit': None, 'reason': 'Browser did not complete this source'})
        code = 2
    report['sourcePinsAfter'] = {label: closure(root) if root else None for label, root in roots.items()}
    report['sourceStability'] = {label: ('PASS' if report['sourcePinsBefore'][label] == report['sourcePinsAfter'][label] else 'FAIL') if roots[label] else 'NOT_RUN' for label in roots}
    if any(status == 'FAIL' for status in report['sourceStability'].values()):
        report['accepted'] = False
        code = max(code, 1)
    report['exit'] = code
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2))
    print(json.dumps({'exit': code, 'accepted': report['accepted'], 'browser': report['browser'], 'fixturesObserved': len(report['cases']), 'report': str(args.output)}))
    return code


if __name__ == '__main__':
    sys.exit(main())
