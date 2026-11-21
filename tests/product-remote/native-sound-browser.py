# SPDX-License-Identifier: GPL-3.0-only
"""Remote Chicago acceptance against the explicitly pinned WASM/AudioWorklet.

This complements native-mix-browser.py (Mix29 remains its own gate). Instrumentation
only records actual owning-port traffic; it never supplies a native reply or state.
"""
import asyncio
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('envelope_core', Path(__file__).with_name('envelope-browser.py'))
core = importlib.util.module_from_spec(spec)
spec.loader.exec_module(core)
SIZES = [(1440, 900), (390, 844), (844, 390)]
INSTRUMENT = Path(__file__).with_name('native-sound-instrument.js').read_text()

def control(voice, parameter):
    return f'[data-native-param="source-sound/CHICAGO/{voice}|1:2:{voice}:{parameter}:0"]'

async def menu_action(page, selector):
    summary = page.locator('.overflow summary')
    if not await page.locator('.overflow').evaluate('e=>e.open'):
        await summary.click()
    await page.locator(selector).click()
    if await page.locator('.overflow').evaluate('e=>e.open'):
        await summary.click()

async def draft_bytes(page):
    async with page.expect_download() as info:
        await menu_action(page, '#draft-save')
    download = await info.value
    assert await download.failure() is None
    return Path(await download.path()).read_bytes()

async def native_elapsed(page, milliseconds):
    at = await page.evaluate('nativeFrames.at(-1)?.time??0')
    await page.wait_for_function('([at,ms])=>nativeFrames.at(-1)?.time>=at+ms', arg=[at, milliseconds])

async def turn(page, role, delta):
    await page.evaluate('([role,delta])=>nativeNodes.at(-1).port.postMessage({type:"turn",role,delta})', [role, delta])
    await native_elapsed(page, 240)

async def held(page, kind, bits):
    await page.evaluate('([type,bits])=>nativeNodes.at(-1).port.postMessage({type,bits})', [kind, bits])
    await native_elapsed(page, 110)

async def pulse(page, kind, bits):
    await held(page, kind, bits)
    await held(page, kind, 0)

async def start(page):
    await menu_action(page, '#emulator-start')
    await expect(page.locator('#status')).to_contain_text('Emulator running', timeout=20000)
    await native_elapsed(page, 240)

async def stop(page):
    await menu_action(page, '#emulator-stop')
    await page.wait_for_function('nativeContext.state==="closed"')

async def select_source(page, voice):
    await page.locator('[data-engine="'+('chicago' if voice == 0 else 'miami')+'"]').click()
    await page.locator('[data-view="sound"]').click()
    await page.locator('[data-sound-source="emulator"]').click()
    await expect(page.locator(control(voice, 0))).to_be_enabled()

async def packet_after(page, count):
    await page.wait_for_function('n=>soundPackets.length>n', arg=count)
    return await page.evaluate('soundPackets.at(-1)')

async def assert_readings(page, packet):
    assert packet['engine'] == 'CHICAGO' and packet['sourceBank'] == 0
    assert 0 <= packet['choiceSerial'] <= 0xffffffff
    assert isinstance(packet['revision'], str) and packet['revision']
    assert len(packet['controls']) == 20
    assert {c['parameter'] for c in packet['controls']} == set(range(20))
    for c in packet['controls']:
        assert c['target'] == 2 and c['voice'] == packet['voice'] and c['kind'] == 'u32'
        assert c['min'] == 0 and c['max'] == (11 if c['parameter'] == 17 else 127)
        assert 0 <= c['value'] <= c['max']
        assert isinstance(c['display'], str) and len(c['display']) <= 63
        assert isinstance(c['unit'], str) and len(c['unit']) <= 31
        field = page.locator(control(packet['voice'], c['parameter']))
        await expect(field).to_have_value(str(c['value']))
        await expect(field).to_have_attribute('min', '0')
        await expect(field).to_have_attribute('max', str(c['max']))
        # The consumer may add whitespace between native display and unit only.
        rendered = await field.get_attribute('aria-valuetext')
        assert ''.join(rendered.split()) == ''.join((c['display']+c['unit']).split()), (c, rendered)
        out = await field.evaluate('e=>e.closest(".funkybeats-typed-unit").querySelector("[data-param-value]").textContent')
        assert out == rendered, (c, out, rendered)

async def edit(page, voice, parameter):
    old = await page.evaluate('soundPackets.at(-1)')
    c = next(c for c in old['controls'] if c['parameter'] == parameter)
    counts = await page.evaluate('() => ({packets:soundPackets.length, requests:soundRequests.length, errors:soundErrors.length})')
    key = 'ArrowLeft' if c['value'] == c['max'] else 'ArrowRight'
    await page.locator(control(voice, parameter)).press(key)
    try:
        after = await packet_after(page, counts['packets'])
    except Exception as error:
        error.native_edit = {
            'voice': voice, 'parameter': parameter, 'key': key, 'countsBefore': counts,
            'previousValue': c['value'], 'maximum': c['max'],
            'previousPacket': {k: old.get(k) for k in ('session', 'request', 'voice', 'revision')},
        }
        raise
    expected = c['value'] + (-1 if c['value'] == c['max'] else 1)
    assert next(x for x in after['controls'] if x['parameter'] == parameter)['value'] == expected
    request = await page.evaluate('soundRequests.at(-1)')
    assert request['op'] == 'set' and request['revision'] == old['revision']
    assert request['expected'] == c['value'] and request['value'] == expected
    assert after['undoToken'], after
    await assert_readings(page, after)
    return after

async def undo(page, token):
    count = await page.evaluate('soundPackets.length')
    await page.locator('#undo').click()
    after = await packet_after(page, count)
    request = await page.evaluate('soundRequests.at(-1)')
    assert request['op'] == 'undo' and request['token'] == token
    await assert_readings(page, after)
    return after

async def draft_controls(page):
    # Observed envelope animation may keep running in Draft. Record editable
    # consumer controls/readouts, which pending native completions must not touch.
    return await page.evaluate("""()=>({
      controls:[...document.querySelectorAll('#other-view [data-native-param]')].map(e=>({
       id:e.dataset.nativeParam,value:e.value,text:e.getAttribute('aria-valuetext'),
       disabled:e.disabled,output:e.closest('.funkybeats-typed-unit')?.querySelector('[data-param-value]')?.textContent})),
      bank:document.querySelector('#sound-bank')?.value,
      source:[...document.querySelectorAll('[data-sound-source]')].map(e=>[e.dataset.soundSource,e.getAttribute('aria-pressed')]),
      undo:document.querySelector('#undo').disabled,redo:document.querySelector('#redo').disabled
    })""")

async def record_failure(page, out, page_errors, error):
    receipt = out / 'failure.json'
    observation = {'exception': str(error), 'pageErrors': page_errors}
    if hasattr(error, 'native_edit'):
        observation['edit'] = error.native_edit
    receipt.write_text(json.dumps(observation, indent=2) + '\n')
    try:
        state = await asyncio.wait_for(page.evaluate("""() => {
          const packets = window.soundPackets ?? [];
          return {
            status: document.querySelector('#status')?.textContent,
            requests: window.soundRequests ?? [], errors: window.soundErrors ?? [],
            packetCount: packets.length,
            recentPackets: packets.slice(-3).map(({session, request, voice, revision}) =>
                ({session, request, voice, revision})),
            audioState: window.nativeContext?.state, frameTime: window.nativeFrames?.at(-1)?.time
          };
        }"""), timeout=5)
        observation.update(state)
    except Exception as observation_error:
        observation['observationError'] = repr(observation_error)
    receipt.write_text(json.dumps(observation, indent=2) + '\n')
    try:
        await page.screenshot(path=str(out/'failure.png'), full_page=True)
    except Exception as capture_error:
        observation['captureError'] = str(capture_error)
        receipt.write_text(json.dumps(observation, indent=2) + '\n')

async def cases(origin, meta):
    async with async_playwright() as pw:
        for width, height in SIZES:
            browser = await pw.chromium.launch(chromium_sandbox=True)
            try:
                context = await browser.new_context(viewport={'width': width, 'height': height}, accept_downloads=True, has_touch=True)
                page = await context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                await page.add_init_script(INSTRUMENT)
                out = ROOT/'test-results/native-sound'/f'{width}x{height}'
                out.mkdir(parents=True, exist_ok=True)
                try:
                    await page.goto(origin+'/remote/', wait_until='networkidle')
                    # Author real Draft Sound values with both bank choices away
                    # from defaults before native admission. These must survive too.
                    authored = []
                    for part, bank in [('chicago', 'JUNO'), ('miami', 'CHICAGO')]:
                        await page.locator('[data-engine="'+part+'"]').click()
                        await page.locator('[data-view="sound"]').click()
                        await page.locator('#sound-bank').select_option(bank)
                        parameter = page.locator('.source-sound-list button[data-param]').first
                        identity = await parameter.get_attribute('data-param')
                        await parameter.press('Enter')
                        field = page.locator('#parameter-value')
                        value = float(await field.input_value())
                        maximum = float(await field.get_attribute('max'))
                        step = float(await field.get_attribute('step'))
                        changed = value + (-step if value == maximum else step)
                        await field.fill(str(changed))
                        await field.press('Tab')
                        assert float(await field.input_value()) == changed
                        authored.append({'id': identity, 'value': changed, 'before': value, 'part': part, 'bank': bank})
                    await page.locator('[data-engine="chicago"]').click()
                    await page.locator('[data-view="roll"]').click()
                    note = page.locator('#roll-grid [data-note]').first
                    note_id = await note.get_attribute('data-note')
                    before_note = await note.get_attribute('aria-label')
                    await note.press('ArrowUp')
                    edited_note = await note.get_attribute('aria-label')
                    assert edited_note != before_note
                    draft = await draft_bytes(page)
                    saved_draft = json.loads(draft)
                    assert saved_draft['soundBanks'] == ['JUNO', 'CHICAGO']
                    for change in authored:
                        assert {'id': change['id'], 'value': change['value']} in saved_draft['parameters'], (change, saved_draft['parameters'])
                    endpoint_proof = []
                    for voice in (1, 0):
                        await start(page)
                        if voice == 0:
                            # Refuse Bass A's actual boot engine (Miami), preserving
                            # native choice and Draft selection until panel input.
                            await page.locator('[data-engine="chicago"]').click()
                            await page.locator('[data-view="sound"]').click()
                            refused = await page.evaluate('soundErrors.length')
                            await page.locator('[data-sound-source="emulator"]').click()
                            await page.wait_for_function('n=>soundErrors.length>n', arg=refused)
                            await expect(page.locator('#status')).to_contain_text('unavailable')
                            assert await page.locator('[data-native-param]').count() == 0
                            assert await page.evaluate('!nativePackets.at(-1).voices.some(v=>v.slot===0&&v.engine==="CHICAGO"&&v.available)')
                            await page.locator('[data-sound-source="draft"]').click()
                            # Actual native boot selects 909. Bass A is initially Miami;
                            # these are the ordinary native panel selectors, not Draft.
                            for _ in range(4):
                                await turn(page, 1, 1)
                            await pulse(page, 'buttons', 1 << 4)  # EDIT
                            await turn(page, 0, -1)  # SOUND page
                            await turn(page, 3, -1)  # Miami -> Chicago
                            await page.wait_for_function('nativePackets.at(-1)?.voices.some(v=>v.slot===0&&v.engine==="CHICAGO"&&v.available)')
                        await select_source(page, voice)
                        baseline = await page.evaluate('soundPackets.at(-1)')
                        assert baseline['firmware'] == meta['firmware_source'] and baseline['kernel'] == meta['wasm_sha256']
                        await assert_readings(page, baseline)
                        for parameter in range(20):
                            receipt = await edit(page, voice, parameter)
                            restored = await undo(page, receipt['undoToken'])
                            assert restored['controls'] == baseline['controls'], parameter
                        # Exercise native p17's actual endpoint, not a single
                        # interior increment. Every endpoint write is opaque-Undone.
                        endpoint_tokens = []
                        p17 = next(c for c in baseline['controls'] if c['parameter'] == 17)
                        for value in ([11, 0] if p17['value'] == 0 else [0, 11]):
                            count = await page.evaluate('soundPackets.length')
                            previous = await page.evaluate('soundPackets.at(-1)')
                            previous_control = next(c for c in previous['controls'] if c['parameter'] == 17)
                            await page.locator(control(voice, 17)).press('End' if value == 11 else 'Home')
                            endpoint = await packet_after(page, count)
                            confirmed_p17 = next(c for c in endpoint['controls'] if c['parameter'] == 17)
                            assert confirmed_p17['value'] == value and confirmed_p17['max'] == 11
                            request = await page.evaluate('soundRequests.at(-1)')
                            assert request['value'] == value and request['expected'] == previous_control['value']
                            assert request['revision'] == previous['revision']
                            await assert_readings(page, endpoint)
                            endpoint_tokens.append(endpoint['undoToken'])
                            requests = await page.evaluate('soundRequests.length')
                            await page.locator(control(voice, 17)).press('ArrowRight' if value == 11 else 'ArrowLeft')
                            await native_elapsed(page, 110)
                            assert await page.evaluate('soundRequests.length') == requests, 'Outward endpoint key submitted a native write'
                            await expect(page.locator(control(voice, 17))).to_have_value(str(value))
                            assert (await page.evaluate('soundPackets.at(-1)'))['controls'] == endpoint['controls']
                            endpoint_proof.append({'voice': voice, 'control': confirmed_p17, 'revision': endpoint['revision'], 'outwardKeySubmittedNothing': True})
                        for token in reversed(endpoint_tokens):
                            restored = await undo(page, token)
                        assert restored['controls'] == baseline['controls']
                        first = await edit(page, voice, 2)
                        second = await edit(page, voice, 3)
                        restored = await undo(page, second['undoToken'])
                        assert restored['controls'] == first['controls']
                        restored = await undo(page, first['undoToken'])
                        assert restored['controls'] == baseline['controls']
                        await page.screenshot(path=str(out/f'voice-{voice}.png'), full_page=True)
                        if voice == 1:
                            await stop(page)
                            await page.locator('[data-sound-source="draft"]').click()
                    # Active-note rejection must preserve the exact opaque Undo token.
                    receipt = await edit(page, 0, 2)
                    await held(page, 'keys', 1 << 1)
                    await page.wait_for_function('nativePackets.slice(-5).some(p=>p.voices.some(v=>v.slot===0&&v.engine==="CHICAGO"&&v.available&&(v.snapshot.level??0)>0))')
                    count = await page.evaluate('soundErrors.length')
                    await page.locator('#undo').click()
                    await page.wait_for_function('n=>soundErrors.length>n', arg=count)
                    busy = await page.evaluate('soundErrors.at(-1)')
                    assert busy['code'] == 'busy' and busy['noWrite'] is True, busy
                    assert (await page.evaluate('soundRequests.at(-1)'))['token'] == receipt['undoToken']
                    await assert_readings(page, receipt)
                    requests = await page.evaluate('soundRequests.length')
                    await held(page, 'keys', 0)
                    await native_elapsed(page, 400)
                    assert await page.evaluate('soundRequests.length') == requests, 'Unexpected automatic busy retry'
                    count = await page.evaluate('soundPackets.length')
                    await page.locator('[data-sound-retry]').click()
                    restored = await packet_after(page, count)
                    assert (await page.evaluate('soundRequests.at(-1)'))['token'] == receipt['undoToken']
                    assert restored['controls'] == baseline['controls']
                    await assert_readings(page, restored)
                    # Native selector away/back invalidates prior admission even when
                    # engine and scalar values match again: choiceSerial is causal.
                    old_choice = restored['choiceSerial']
                    await turn(page, 3, 1)
                    await turn(page, 3, -1)
                    count = await page.evaluate('soundErrors.length')
                    await page.locator(control(0, 0)).press('ArrowRight' if restored['controls'][0]['value'] < 127 else 'ArrowLeft')
                    await page.wait_for_function('n=>soundErrors.length>n', arg=count)
                    assert (await page.evaluate('soundErrors.at(-1)'))['code'] != 'busy'
                    await expect(page.locator('#status')).to_contain_text('unavailable')
                    assert await page.locator('[data-native-param]').count() == 0
                    await page.locator('[data-sound-source="draft"]').click()
                    await select_source(page, 0)
                    fresh = await page.evaluate('soundPackets.at(-1)')
                    assert fresh['choiceSerial'] != old_choice and fresh['controls'] == baseline['controls']
                    await page.screenshot(path=str(out/'stale-reconnected.png'), full_page=True)
                    # Freeze only the real owning audio clock. Each operation queues
                    # on its real port, then the source/view is retired before reply.
                    for operation, retirement in [('set', 'source'), ('undo', 'source'), ('set', 'view'), ('undo', 'view'), ('set', 'stop'), ('undo', 'stop')]:
                        if await page.evaluate('nativeContext.state') == 'closed':
                            await start(page)
                            for _ in range(4):
                                await turn(page, 1, 1)
                            await pulse(page, 'buttons', 1 << 4)
                            await turn(page, 0, -1)
                            await turn(page, 3, -1)
                        await select_source(page, 0)
                        if operation == 'undo':
                            await edit(page, 0, 4)
                        confirmed = await page.evaluate('soundPackets.at(-1)')
                        await page.evaluate('nativeContext.suspend()')
                        requests = await page.evaluate('soundRequests.length')
                        if operation == 'undo':
                            await page.locator('#undo').click()
                        else:
                            c = next(c for c in confirmed['controls'] if c['parameter'] == 4)
                            await page.locator(control(0, 4)).press('ArrowRight' if c['value'] < c['max'] else 'ArrowLeft')
                        assert await page.evaluate('soundRequests.length') == requests+1
                        await assert_readings(page, confirmed)  # no optimistic readings
                        if retirement == 'source':
                            await page.locator('[data-sound-source="draft"]').click()
                        elif retirement == 'view':
                            await page.locator('[data-view="roll"]').click()
                        else:
                            await stop(page)
                            await page.locator('[data-sound-source="draft"]').click()
                        status = await page.locator('#status').text_content()
                        draft_view = await draft_controls(page)
                        if retirement != 'stop':
                            count = await page.evaluate('soundPackets.length+soundErrors.length')
                            await page.evaluate('nativeContext.resume()')
                            await page.wait_for_function('n=>soundPackets.length+soundErrors.length>n', arg=count)
                            await native_elapsed(page, 240)
                        assert await page.locator('#status').text_content() == status
                        assert await draft_controls(page) == draft_view
                    # Retire a real pending READ before it can admit any native
                    # values. Source, view and Stop each own separate queued reads.
                    for retirement in ['source', 'view', 'stop']:
                        if await page.evaluate('nativeContext.state') == 'closed':
                            await start(page)
                            for _ in range(4):
                                await turn(page, 1, 1)
                            await pulse(page, 'buttons', 1 << 4)
                            await turn(page, 0, -1)
                            await turn(page, 3, -1)
                        await page.locator('[data-engine="chicago"]').click()
                        await page.locator('[data-view="sound"]').click()
                        await page.evaluate('nativeContext.suspend()')
                        requests = await page.evaluate('soundRequests.length')
                        await page.locator('[data-sound-source="emulator"]').click()
                        assert await page.evaluate('soundRequests.length') == requests + 1
                        assert (await page.evaluate('soundRequests.at(-1)'))['op'] == 'read'
                        assert await page.locator('[data-native-param]').count() == 0
                        if retirement == 'source':
                            await page.locator('[data-sound-source="draft"]').click()
                        elif retirement == 'view':
                            await page.locator('[data-view="roll"]').click()
                        else:
                            await stop(page)
                            await page.locator('[data-sound-source="draft"]').click()
                        status = await page.locator('#status').text_content()
                        draft_view = await draft_controls(page)
                        if retirement != 'stop':
                            count = await page.evaluate('soundPackets.length+soundErrors.length')
                            await page.evaluate('nativeContext.resume()')
                            await page.wait_for_function('n=>soundPackets.length+soundErrors.length>n', arg=count)
                            await native_elapsed(page, 240)
                        assert await page.locator('#status').text_content() == status
                        assert await draft_controls(page) == draft_view
                    # A seventeenth native edit evicts only the oldest opaque
                    # token. Sixteen consecutive UI Undos stop at that first edit.
                    await start(page)
                    for _ in range(4):
                        await turn(page, 1, 1)
                    await pulse(page, 'buttons', 1 << 4)
                    await turn(page, 0, -1)
                    await turn(page, 3, -1)
                    # Supersede an unresolved voice0 admission with a distinct
                    # voice1 admission on the same real owner. Actual worklet busy
                    # is a valid no-write refusal; an old voice0 reply is never an
                    # admission for the current voice1 UI.
                    await page.locator('[data-engine="chicago"]').click()
                    await page.locator('[data-view="sound"]').click()
                    await page.evaluate('nativeContext.suspend()')
                    await page.locator('[data-sound-source="emulator"]').click()
                    retired_read = await page.evaluate('soundRequests.at(-1)')
                    assert retired_read['op'] == 'read' and retired_read['voice'] == 0
                    await page.locator('[data-sound-source="draft"]').click()
                    await page.locator('[data-engine="miami"]').click()
                    await page.locator('[data-sound-source="emulator"]').click()
                    current_read = await page.evaluate('soundRequests.at(-1)')
                    assert current_read['op'] == 'read' and current_read['voice'] == 1
                    assert retired_read['session'] == current_read['session']
                    assert retired_read['request'] != current_read['request']
                    await page.evaluate('nativeContext.resume()')
                    await page.wait_for_function('r=>soundPackets.some(p=>p.session===r.session&&p.request===r.request&&p.voice===r.voice)', arg=retired_read)
                    await page.wait_for_function('r=>soundPackets.some(p=>p.session===r.session&&p.request===r.request&&p.voice===r.voice)||soundErrors.some(p=>p.session===r.session&&p.request===r.request)', arg=current_read)
                    current_error = await page.evaluate('r=>soundErrors.find(p=>p.session===r.session&&p.request===r.request)??null', current_read)
                    if current_error:
                        assert current_error['code'] == 'busy' and current_error['noWrite'] is True, current_error
                        await expect(page.locator('#status')).to_contain_text('unavailable')
                        assert await page.locator('[data-native-param]').count() == 0
                        unavailable_status = await page.locator('#status').text_content()
                        await native_elapsed(page, 240)
                        assert await page.locator('#status').text_content() == unavailable_status
                        assert await page.locator('[data-native-param]').count() == 0
                        await page.locator('[data-sound-source="draft"]').click()
                        await page.locator('[data-sound-source="emulator"]').click()
                    await expect(page.locator(control(1, 0))).to_be_enabled()
                    assert await page.locator('[data-native-param^="source-sound/CHICAGO/0|"]').count() == 0
                    current = await page.evaluate('soundPackets.at(-1)')
                    assert current['voice'] == 1 and current['session'] == current_read['session']
                    await assert_readings(page, current)
                    await native_elapsed(page, 240)
                    await assert_readings(page, current)
                    supersession_proof = {'retiredRead': retired_read, 'currentRead': current_read, 'currentError': current_error, 'admittedVoice': current['voice'], 'revision': current['revision']}
                    await select_source(page, 0)
                    history = []
                    for _ in range(17):
                        history.append(await edit(page, 0, 2))
                    assert len({receipt['undoToken'] for receipt in history}) == 17
                    for index in range(16, 0, -1):
                        restored = await undo(page, history[index]['undoToken'])
                        assert restored['controls'] == history[index-1]['controls']
                    await expect(page.locator('#undo')).to_be_disabled()
                    assert restored['controls'] == history[0]['controls']
                    depth_proof = {'edits': 17, 'undoDepth': 16, 'tokens': [receipt['undoToken'] for receipt in history], 'retainedFirstEdit': restored['controls']}
                    await page.screenshot(path=str(out/'undo16.png'), full_page=True)
                    await stop(page)
                    await page.locator('[data-sound-source="draft"]').click()
                    await page.locator('[data-engine="chicago"]').click()
                    await page.locator('[data-view="roll"]').click()
                    await expect(page.locator('[data-note="'+note_id+'"]')).to_have_attribute('aria-label', edited_note)
                    assert await draft_bytes(page) == draft, 'Native source changed exported Draft bytes'
                    await page.locator('#undo').click()
                    await expect(page.locator('[data-note="'+note_id+'"]')).to_have_attribute('aria-label', before_note)
                    # Native history never replaced the two authored Draft Sound
                    # entries. Undo/Redo both slots through the actual UI and inspect
                    # their parameter values while bank choices remain unchanged.
                    draft_values = {change['id']: change['value'] for change in authored}
                    for direction, changes in [('undo', list(reversed(authored))), ('redo', authored)]:
                        for change in changes:
                            await page.locator('#'+direction).click()
                            expected = change['before'] if direction == 'undo' else change['value']
                            draft_values[change['id']] = expected
                            await page.locator('[data-engine="'+change['part']+'"]').click()
                            await page.locator('[data-view="sound"]').click()
                            await expect(page.locator('[data-sound-source="draft"]')).to_have_attribute('aria-pressed', 'true')
                            await expect(page.locator('#sound-bank')).to_have_value(change['bank'])
                            await page.locator('[data-param="'+change['id']+'"]').press('Enter')
                            assert float(await page.locator('#parameter-value').input_value()) == expected
                            saved = json.loads(await draft_bytes(page))
                            assert saved['soundBanks'] == saved_draft['soundBanks']
                            parameters = {c['id']: c['value'] for c in saved['parameters']}
                            for identity, value in draft_values.items():
                                assert parameters[identity] == value
                    await page.locator('#redo').click()
                    await page.locator('[data-engine="chicago"]').click()
                    await page.locator('[data-view="roll"]').click()
                    await expect(page.locator('[data-note="'+note_id+'"]')).to_have_attribute('aria-label', edited_note)
                    assert await draft_bytes(page) == draft, 'Draft Sound Undo/Redo did not restore exact authored bytes'
                    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                    assert await page.evaluate('midiCalls') == 0
                    assert await page.locator('#apply').is_disabled()
                    assert not errors, errors
                    proof = {'viewport': [width, height], 'firmware': meta['firmware_source'], 'kernel': meta['wasm_sha256'], 'controls': 40, 'p17Endpoints': endpoint_proof, 'nativeHistory': depth_proof, 'pendingReadRetirements': ['source', 'view', 'stop'], 'readSupersession': supersession_proof, 'draftSoundUndoRedoSlots': [0, 1], 'authoredDraft': authored, 'draftBanks': saved_draft['soundBanks'], 'midiCalls': 0, 'draftSha256': hashlib.sha256(draft).hexdigest(), 'requests': await page.evaluate('soundRequests'), 'errors': await page.evaluate('soundErrors')}
                    (out/'proof.json').write_text(json.dumps(proof, indent=2)+'\n')
                    print(f'PASS actual native Chicago40/p17max11/formatter/Undo16/busy retry/choice stale/read-set-undo lifecycle/authored Draft/MIDI0 {width}x{height}', flush=True)
                except BaseException as error:
                    await record_failure(page, out, errors, error)
                    raise
                finally:
                    await context.close()
            finally:
                await browser.close()

def main():
    value = os.environ.get('DNBOX_EMULATOR_RUNTIME')
    assert value, 'Explicit qualified native runtime required'
    runtime = Path(value).resolve()
    meta = json.loads((runtime/'runtime.json').read_text())
    binary = (runtime/'kernel.wasm').read_bytes()
    assert len(binary) == meta['wasm_bytes'] and hashlib.sha256(binary).hexdigest() == meta['wasm_sha256']
    assert meta['device_control'] is False
    assert 'createNativeSoundProvider' in (runtime/'native-session.mjs').read_text()
    out = ROOT/'.output'
    out.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='native-sound-', dir=out) as site:
        subprocess.run(['node', 'scripts/build-product-site.mjs', '--output', site], cwd=ROOT, check=True)
        assert (Path(site)/'emu/kernel.wasm').read_bytes() == binary
        assert not (Path(site)/'emu/native.pcm').exists()
        with core.server(site) as origin:
            asyncio.run(cases(origin, meta))

if __name__ == '__main__':
    main()
