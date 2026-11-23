# SPDX-License-Identifier: GPL-3.0-only
"""Publish gate: every Remote control changes firmware state and reflects back.

Walks every visible control of the built Remote (all parts x views, the same
enumeration and gestures as unbound-browser.py) with the emulator running the
pinned firmware. For each control it records:
  sent       the page posted a firmware-bound message to the emulator (MIDI or DNR3 SysEx;
             the emulator-only native control API is recorded separately because a real
             instrument cannot receive it)
  changed    the firmware state moved: sha256 of the firmware's own project save
             (web_snapshot / project_save) plus the sequencer's playing flag
  reflected  the page follows a change made in the firmware by someone else (a probe per
             control group that changes firmware state directly, not through the page)
A control passes only with all three. Page-only controls (navigation, files, view
options) are listed by rule and do not count. Nothing is stubbed: when the firmware
lacks a capability (no DNR3 handler yet) the affected controls fail with that reason.

Not part of npm test (it fails until the Remote is fully wired). Run:
  DNBOX_EMULATOR_RUNTIME=... python3 tests/product-remote/firmware-e2e-browser.py
Report: .output/firmware-e2e/report.json (rebuildable). Exit 0 only when every
firmware control passes.
"""
import asyncio, hashlib, importlib.util, json, os, subprocess, sys, tempfile
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
def load(name, file):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(file))
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); return mod
ub = load('ub', 'unbound-browser.py')
core = load('envelope_core', 'envelope-browser.py')
ORIGIN = None

ENGINES = tuple(os.environ.get('E2E_ENGINES', 'drum909,drum808,chicago,miami,breaks').split(','))
VIEWS = tuple(os.environ.get('E2E_VIEWS', 'roll,sound,mix,patterns,files,drums,locks,song').split(','))
FIRMWARE_TYPES = ('midi', 'sysex')
NATIVE_TYPES = ('controls', 'sound-controls', 'buttons', 'keys', 'turn')

# Page-only controls: they change what the page shows or stores, never the instrument.
PAGE_ONLY = [
    ('data-view=', 'switches the page view'),
    ('data-engine=', 'selects which part the page shows'),
    ('select #part', 'selects which part the page shows'),
    ('data-mix-source=', 'chooses Draft or Emulator as the page source'),
    ('data-sound-source=', 'chooses Draft or Emulator as the page source'),
    ('data-mix-mode=', 'switches mixer page'),
    ('data-break-view=', 'switches break page'),
    ('data-project-action=', 'page file actions'),
    ('#draft-save', 'downloads the page draft'), ('#draft-file', 'opens a page draft'), ('#review', 'opens the review dialog'),
    ('#emulator-start', 'starts the emulator'), ('#emulator-stop', 'stops the emulator'),
    ('summary', 'opens a menu'), ('#close-connection', 'closes a dialog'),
    ('#zoom', 'page zoom'), ('#snap', 'page snap'), ('#multi', 'page multi-select'),
]
def page_only(item):
    for pattern, why in PAGE_ONLY:
        if pattern in item['key'] or (pattern.startswith('#') and item['key'].split(' ')[1:2] == [pattern]):
            return why
    if item['href'] is not None:
        return 'link'
    return None

def group(view, item):
    k = item['key']
    if any(t in k for t in ('#play', '#stop', '#rec')): return 'transport'
    return {'mix': 'mixer', 'sound': 'knobs', 'roll': 'roll', 'drums': 'steps', 'patterns': 'clip-launch',
            'song': 'song', 'locks': 'motion', 'files': 'files'}.get(view, view)

INIT = '''
window.__fw={out:[],inbound:{playing:null},nodes:[],snap:0,snaps:new Map()};
const AW=window.AudioWorkletNode;
window.AudioWorkletNode=class extends AW{constructor(...a){super(...a);const node=this;__fw.nodes.push(node);
 const post=node.port.postMessage.bind(node.port);
 node.port.postMessage=(m,t)=>{if(m&&m.type&&!m.__e2e)__fw.out.push({type:m.type,bytes:m.bytes?Array.from(m.bytes):undefined});return post(m,t);};
 node.port.addEventListener('message',({data:m})=>{if(m?.type==='frame')__fw.inbound.playing=m.playing;
  if((m?.type==='snapshot'||m?.type==='snapshot-error')&&__fw.snaps.has(m.request)){__fw.snaps.get(m.request)(m);__fw.snaps.delete(m.request);}});}};
window.__fwPost=m=>{const n=__fw.nodes.at(-1);if(!n)throw Error('no emulator');n.port.postMessage({...m,__e2e:1});};
window.__fwSnapshot=()=>new Promise((resolve,reject)=>{const n=__fw.nodes.at(-1);if(!n){resolve(null);return;}
 const id=1e9+(++__fw.snap);const t=setTimeout(()=>{__fw.snaps.delete(id);reject(Error('snapshot timeout'))},3000);
 __fw.snaps.set(id,m=>{clearTimeout(t);if(m.type!=='snapshot'){reject(Error(m.message));return;}
  crypto.subtle.digest('SHA-256',m.bytes).then(d=>resolve([...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')));});
 n.port.postMessage({type:'snapshot',request:id,__e2e:1});});
window.__fwCaps=()=>new Promise(resolve=>{const n=__fw.nodes.at(-1);if(!n){resolve(null);return;}
 const f=({data:m})=>{if(m?.type==='remote-caps'){n.port.removeEventListener('message',f);resolve(m);}};n.port.addEventListener('message',f);
 n.port.postMessage({type:'remote-caps',__e2e:1});setTimeout(()=>{n.port.removeEventListener('message',f);resolve(null)},1500);});
navigator.requestMIDIAccess=()=>{throw Error("e2e uses the emulator")};
'''

async def settle(page, ms=200):
    await page.wait_for_timeout(ms)

async def fingerprint(page):
    snap = await page.evaluate('__fwSnapshot()')
    playing = await page.evaluate('__fw.inbound.playing')
    return (snap, playing)

async def start_emulator(page):
    if not await page.locator('.overflow').evaluate('e=>e.open'):
        await page.locator('.overflow summary').click()
    await page.locator('#emulator-start').click()
    try:
        await page.wait_for_function('document.getElementById("status").textContent.includes("Emulator running")', timeout=30000)
    except Exception:
        raise RuntimeError('emulator did not start: ' + await page.locator('#status').text_content())
    if await page.locator('.overflow').evaluate('e=>e.open'):
        await page.locator('.overflow summary').click()
    await page.wait_for_function('__fw.inbound.playing!==null', timeout=10000)

async def reflect_probes(page):
    """Change firmware state directly (not through the page) and see whether the page follows."""
    probes = {}
    # Transport: realtime Start/Stop straight into the firmware's MIDI input.
    await page.evaluate('__fwPost({type:"midi",bytes:[0xFA]})'); await settle(page, 400)
    fw_on = await page.evaluate('__fw.inbound.playing')
    shown_on = await page.locator('#play').get_attribute('aria-pressed') == 'true'
    await page.evaluate('__fwPost({type:"midi",bytes:[0xFC]})'); await settle(page, 400)
    fw_off = await page.evaluate('__fw.inbound.playing')
    shown_off = await page.locator('#play').get_attribute('aria-pressed') != 'true'
    probes['transport'] = {'firmware_followed': fw_on == 1 and fw_off == 0, 'page_followed': shown_on and shown_off}
    # Other groups need DNR3 readback (STATE/PARAM/STEP/NOTIFY) to observe firmware changes from elsewhere.
    caps = await page.evaluate('__fwCaps()')
    for g in ('knobs', 'mixer', 'roll', 'steps', 'clip-launch', 'song', 'motion', 'pads'):
        probes[g] = {'firmware_followed': None, 'page_followed': False,
                     'reason': 'needs DNR3 NOTIFY/STATE readback' + ('' if caps and caps.get('dnr3') else '; firmware has no DNR3 handler yet')}
    return probes, caps

async def walk(browser):
    context = await browser.new_context(viewport={'width': 1440, 'height': 900}, has_touch=True, accept_downloads=True)
    page = await context.new_page(); page.set_default_timeout(8000)
    await page.add_init_script(INIT)
    page.on('download', lambda d: ub.DOWNLOADS.append(d))

    async def fresh(engine, view):
        await page.goto(ORIGIN + '/remote/', wait_until='networkidle')
        await page.wait_for_function('document.getElementById("status").textContent.includes("Draft")')
        await start_emulator(page)
        await page.locator(f'[data-engine="{engine}"]').click()
        await ub.open_view(page, view)
        # Where the page can drive the emulator directly, use that source (it is the page's own firmware path).
        for sel in ('[data-sound-source="emulator"]', '[data-mix-source="emulator"]'):
            loc = page.locator(sel)
            if await loc.count() and await loc.first.is_enabled() and await loc.first.get_attribute('aria-pressed') != 'true':
                await loc.first.click()
        await settle(page, 400)

    await fresh(ENGINES[0], 'sound')
    probes, caps = await reflect_probes(page)
    rows, seen = [], set()
    for engine in ENGINES:
        for view in VIEWS:
            await fresh(engine, view)
            items = await page.evaluate(ub.MARK)
            occ = {}
            for item in items:
                item['nth'] = occ[(item['key'], item['label'])] = occ.get((item['key'], item['label']), -1) + 1
            dirty = False
            for item in items:
                sig = (engine if view in ('sound', 'roll', 'drums') else '*', view, item['key'], item['label'], item['nth'])
                if sig in seen: continue
                seen.add(sig)
                why = page_only(item)
                row = {'part': engine, 'view': view, 'group': group(view, item), 'control': item['key'], 'label': item['label']}
                if why:
                    rows.append({**row, 'status': 'page-only', 'reason': why}); continue
                if dirty:
                    await fresh(engine, view)
                    match = ub.nth_match(await page.evaluate(ub.MARK), item)
                    if match is None:
                        rows.append({**row, 'status': 'FAIL', 'reason': 'control not found again'}); continue
                    match['nth'] = item['nth']; item = match; dirty = False
                pre = next((sel for part, sel in ub.PRECONDITION.items() if part in item['key'].split(' ')), None)
                if pre: await page.locator(pre).click()
                before_fp = await fingerprint(page)
                out_before = await page.evaluate('__fw.out.length')
                try:
                    note = await ub.gesture(page, item)
                except Exception as error:
                    rows.append({**row, 'status': 'FAIL', 'reason': 'gesture failed: ' + str(error).splitlines()[0][:120]}); dirty = True; continue
                await settle(page, 250)
                after_fp = await fingerprint(page)
                sent = await page.evaluate('n=>__fw.out.slice(n).map(m=>m.type)', out_before)
                fw_sent = [t for t in sent if t in FIRMWARE_TYPES]
                native = [t for t in sent if t in NATIVE_TYPES]
                changed = after_fp != before_fp
                probe = probes.get(row['group'], {'page_followed': False, 'reason': 'no reflect probe for this group'})
                reflected = bool(probe.get('page_followed'))
                if fw_sent and changed and reflected:
                    status, reason = 'PASS', ''
                elif not fw_sent and not native:
                    status, reason = 'FAIL', 'page sends nothing to the firmware'
                elif not fw_sent:
                    status, reason = 'FAIL', 'emulator-only native API (%s); no MIDI/SysEx path a device can receive' % ','.join(sorted(set(native)))
                elif not changed:
                    status, reason = 'FAIL', 'firmware state unchanged after ' + ','.join(sorted(set(fw_sent)))
                else:
                    status, reason = 'FAIL', 'page does not follow firmware changes: ' + probe.get('reason', 'not shown')
                rows.append({**row, 'status': status, 'reason': reason, 'sent': sorted(set(sent)), 'firmware_changed': changed, 'reflected': reflected})
                left = await page.evaluate("""v=>{const on=document.querySelector('[data-view="'+v+'"][aria-current="page"],[data-view="'+v+'"][aria-pressed="true"]');return !!document.querySelector('dialog[open]')||location.pathname!=='/remote/'||!on;}""", view)
                dirty = dirty or left or bool(pre) or note == 'gone'
            print(f'VIEW {engine}/{view} rows={len(rows)}', flush=True)
    # The Remote has no pad surface yet: the musician cannot play pads from the page.
    for engine in ENGINES:
        rows.append({'part': engine, 'view': '-', 'group': 'pads', 'control': 'pads', 'label': 'play pads / keys',
                     'status': 'FAIL', 'reason': 'no pad or key control on the page (remote/midi-out.mjs padOn is ready)'})
    await context.close()
    return rows, probes, caps

async def main():
    assert os.environ.get('DNBOX_EMULATOR_RUNTIME'), 'DNBOX_EMULATOR_RUNTIME (pinned emulator) required'
    out = ROOT / '.output'; out.mkdir(exist_ok=True)
    report_dir = out / 'firmware-e2e'; report_dir.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='firmware-e2e-', dir=out) as site:
        global ORIGIN
        subprocess.run(['node', 'scripts/build-product-site.mjs', '--output', site], cwd=ROOT, check=True)
        runtime = json.loads((Path(site) / 'emu/runtime.json').read_text())
        with core.server(site) as origin:
            ORIGIN = origin
            async with async_playwright() as pw:
                browser = await pw.chromium.launch(chromium_sandbox=True)
                try:
                    rows, probes, caps = await walk(browser)
                finally:
                    await browser.close()
    head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    firmware_rows = [r for r in rows if r['status'] != 'page-only']
    summary = {}
    for r in firmware_rows:
        s = summary.setdefault(r['group'], {'PASS': 0, 'FAIL': 0, 'reasons': {}})
        s[r['status']] += 1
        if r['reason']: s['reasons'][r['reason']] = s['reasons'].get(r['reason'], 0) + 1
    report = {'nightly': head, 'firmware_source': runtime['firmware_source'], 'kernel_source': runtime['kernel_source'],
              'wasm_sha256': runtime['wasm_sha256'], 'emulator_caps': caps, 'reflect_probes': probes,
              'controls': len(firmware_rows), 'passed': sum(r['status'] == 'PASS' for r in firmware_rows),
              'page_only': len(rows) - len(firmware_rows), 'groups': summary, 'rows': rows}
    (report_dir / 'report.json').write_text(json.dumps(report, indent=1) + '\n')
    print(f"FIRMWARE-E2E nightly={head[:8]} firmware={runtime['firmware_source'][:9]} caps={caps}")
    for g, s in sorted(summary.items()):
        print(f"  {g:12s} PASS {s['PASS']:4d}  FAIL {s['FAIL']:4d}  " + '; '.join(f'{k} x{v}' for k, v in s['reasons'].items()))
    print(f"RESULT {'PASS' if report['passed'] == report['controls'] else 'FAIL'} {report['passed']}/{report['controls']} firmware controls (page-only {report['page_only']}); report {report_dir / 'report.json'}")
    return 0 if report['passed'] == report['controls'] and report['controls'] > 0 else 1

if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
