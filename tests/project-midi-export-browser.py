# SPDX-License-Identifier: GPL-3.0-only
"""Exercise project -> real pinned firmware WASM -> uploaded-in-browser SMF download."""
import functools
import json
import struct
import subprocess
import tempfile
import threading
import zipfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]

def project_fixture():
    source = """
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {makeProjectFile} from './web/product-site/projects/exchange/vendor/x0x_projects.js';
const f=JSON.parse(readFileSync('tests/fixtures/project-midi-current.json'));
const project=new Uint8Array(inflateSync(Buffer.from(f.zlib_base64,'base64')));
if(!f.synthetic || createHash('sha256').update(project).digest('hex')!==f.sha256) throw Error('Bad fixture');
const snapshot={layout:{count:1,size:4096,slots:[{size:4096,nz:0}]},images:[null]};
process.stdout.write(await makeProjectFile(project,snapshot,{name:'MIDI qualification',portable:false}));
"""
    return {"name": "midi-qualification.x0xproject", "mimeType": "application/octet-stream",
            "buffer": subprocess.check_output(["node", "--input-type=module", "-e", source], cwd=ROOT)}

def parse_smf1(data, track_count):
    # Independent read-only SMF decoder, not the JavaScript writer's helpers.
    assert struct.unpack('>4sIHHH', data[:14]) == (b'MThd', 6, 1, track_count, 9600)
    offset, result = 14, []
    while offset < len(data):
        tag, size = struct.unpack_from('>4sI', data, offset)
        offset += 8
        assert tag == b'MTrk' and 0 < size <= len(data)-offset
        track = data[offset:offset+size]
        offset += size
        at, tick, rows, ended = 0, 0, [], False

        def vlq():
            nonlocal at
            value=0
            for _ in range(4):
                octet=track[at]
                at+=1
                value=(value<<7)|(octet&127)
                if octet<128:
                    return value
            raise AssertionError('SMF VLQ over four bytes')

        while at < len(track):
            tick+=vlq()
            status=track[at]
            at+=1
            if status==255:
                kind=track[at]
                at+=1
                size=vlq()
                payload=track[at:at+size]
                assert len(payload)==size
                at+=size
                rows.append((tick,status,kind,payload))
                if kind==47:
                    assert not payload and at==len(track)
                    ended=True
            else:
                assert status>>4 in (8,9)
                note,velocity=track[at:at+2]
                at+=2
                assert note<128 and velocity<128
                rows.append((tick,status,note,velocity))
        assert ended
        result.append(rows)
    assert offset==len(data) and len(result)==track_count
    return result

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

def case(output):
    pin = json.loads((output/'projects/exchange/runtime-pin.json').read_text())
    assert pin['schema'] == 1, 'Build with the exact firmware runtime, including MIDI trace exports.'
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=output))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(chromium_sandbox=True)
            page = browser.new_page(viewport={'width':844, 'height':390}, accept_downloads=True)
            page.add_init_script("""window.midiCalls=0;
                navigator.requestMIDIAccess=()=>{window.midiCalls++;throw Error('No device in browser test');};""")
            failures = []
            page.on('pageerror', lambda error: failures.append(str(error)))
            violations=[]
            def request_boundary(route):
                if route.request.url.startswith(origin+'/') and route.request.method in ('GET','HEAD'):
                    route.continue_()
                else:
                    violations.append((route.request.method,route.request.url))
                    route.abort()
            page.context.route('**/*', request_boundary)
            page.goto(origin+'/projects/', wait_until='load')
            page.locator('details.ws-midi > summary').click()
            root = page.locator('#project-exchange-root')
            expect(root.get_by_role('heading', name='Take your sequences into Live')).to_be_visible()
            root.locator('input[type=file]').set_input_files(project_fixture())
            root.locator('input[type=number]').fill('1')
            with page.expect_download() as download:
                root.get_by_role('button', name='Prepare MIDI export').click()
            path = download.value.path()
            assert not failures, failures
            assert not violations, violations
            assert page.evaluate('midiCalls===0')
            assert page.locator('body').evaluate('b=>b.scrollWidth') <= 844
            with zipfile.ZipFile(path) as z:
                assert set(z.namelist()) == {
                    'project.mid','clips/drum909.mid','clips/drum808.mid','clips/synth-a.mid',
                    'clips/synth-b.mid','clips/break.mid','annotations.json','manifest.json','READ-ME.txt'}
                names=['drum909','drum808','synth-a','synth-b','break']
                tracks=parse_smf1(z.read('project.mid'),6)
                assert (0,255,81,bytes.fromhex('075300')) in tracks[0]
                assert all(track[-1]==(20000,255,47,b'') for track in tracks)
                for i,name in enumerate(names,1):
                    clip=parse_smf1(z.read('clips/'+name+'.mid'),2)
                    assert clip==[tracks[0],tracks[i]]
                for i,channel,note in [(3,1,60),(4,2,64)]:
                    onset=next(row for row in tracks[i] if row[1:]==(0x90|channel,note,110))
                    release=next(row for row in tracks[i] if row[1:]==(0x80|channel,note,0))
                    assert 0<=onset[0]<release[0]<=20000
                manifest = json.loads(z.read('manifest.json'))
                assert manifest['authority']['kind'] == 'source-executed'
                assert manifest['authority']['source'] == pin['source']
                fixture=json.loads((ROOT/'tests/fixtures/project-midi-current.json').read_text())
                assert manifest['authority']['projectSha256'] == fixture['sha256']
                assert manifest['endSample'] == 44100
                assert manifest['tempos'] == [{'sample':0,'microsecondsPerQuarter':480000}]
            # Identical-length corrupt WASM must be refused by the worker's hash gate.
            bad=bytearray((output/'emu/kernel.wasm').read_bytes())
            bad[-1]^=1
            page.context.route(origin+'/emu/kernel.wasm',
                lambda route: route.fulfill(content_type='application/wasm',body=bytes(bad)))
            rejected_downloads=[]
            page.on('download',lambda event:rejected_downloads.append(event))
            root.get_by_role('button',name='Prepare MIDI export').click()
            expect(root.get_by_text('MIDI export needs a valid range and the matching firmware renderer.')).to_be_visible()
            assert not rejected_downloads and page.evaluate('midiCalls===0')
            assert not failures and not violations
            browser.close()
    finally:
        server.shutdown()
        server.server_close()

if __name__ == '__main__':
    parent = ROOT/'.output'
    parent.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='midi-export-browser-',dir=parent) as directory:
        subprocess.run(['node','scripts/build-product-site.mjs','--output',directory],cwd=ROOT,check=True)
        case(Path(directory))
    print('PROJECT MIDI EXPORT PASS (real pinned firmware, standard MIDI and clips, no device calls)')
