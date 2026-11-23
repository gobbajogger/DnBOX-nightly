# SPDX-License-Identifier: GPL-3.0-only
"""File-open workspace navigation with real in-browser WAV/project decoding and no hardware."""
import functools, io, json, subprocess, threading, wave
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
SIZE = {"width": 844, "height": 390}

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

def audition_fixture():
    out = io.BytesIO()
    with wave.open(out, "wb") as file:
        file.setparams((1, 2, 44100, 0, "NONE", "not compressed"))
        file.writeframes(bytes((0, 0, 0, 16, 0, 0, 0, 240)) * 2205)
    return {"name": "offline-loop.wav", "mimeType": "audio/wav", "buffer": out.getvalue()}

def project_fixture():
    source = """
import {crc32} from './web/x0x_breaks.js';
import {makeProjectFile} from './web/x0x_projects.js';
const project = new Uint8Array(96), v = new DataView(project.buffer);
[0x50583058,1,64,crc32(project.subarray(32)),1,3,4,0].forEach((n,i)=>v.setUint32(i*4,n,true));
process.stdout.write(await makeProjectFile(project, {layout:{count:1,size:4096,slots:[{size:4096,nz:0}]},images:[null]}, {name:'Offline fixture',portable:false}));
"""
    return {"name": "offline-fixture.x0xproject", "mimeType": "application/octet-stream",
            "buffer": subprocess.check_output(["node", "--input-type=module", "-e", source], cwd=ROOT)}

def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=DOCS))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(chromium_sandbox=True)
            context = browser.new_context(viewport=SIZE)
            context.add_init_script("window.midiCalls=0; Object.defineProperty(navigator,'requestMIDIAccess',{value:()=>{window.midiCalls++;throw Error('Hardware forbidden in test');}});")
            page = context.new_page()
            installer = (DOCS / "install/index.html").as_uri()
            samples = (DOCS / "breaks/index.html").as_uri()
            projects = (DOCS / "projects/index.html").as_uri()
            page.goto(installer)
            expect(page.locator("#go")).to_be_disabled()
            page.locator("#samples-tab").click()
            expect(page).to_have_url(samples, timeout=2500)
            expect(page.get_by_role("heading", name="Import samples")).to_be_visible()
            page.locator("#auditionFile").set_input_files(audition_fixture())
            expect(page.locator("#auditionStatus")).to_contain_text("offline-loop.wav")
            expect(page.locator("#auditionReference")).to_be_enabled()
            page.locator("#auditionReference").click()
            page.locator("#auditionStop").click()
            expect(page.locator("#send")).to_be_disabled()
            assert page.evaluate("midiCalls === 0")
            page.locator("a.home").click()
            assert page.url == installer + "#firmware"
            page.locator("#projects-tab").click()
            expect(page).to_have_url(projects, timeout=2500)
            expect(page.get_by_role("heading", name="Songs & projects")).to_be_visible()
            page.locator("#file").set_input_files(project_fixture())
            expect(page.locator("#file-info")).to_contain_text("Offline fixture")
            expect(page.locator("#prepare")).to_be_disabled()
            expect(page.locator("#export")).to_be_disabled()
            assert page.evaluate("midiCalls === 0")
            page.get_by_role("link", name="Import samples").click()
            assert page.url == samples
            page.goto(installer + "#projects")
            expect(page).to_have_url(projects)
            page.get_by_role("link", name="Install firmware").click()
            assert page.url == installer + "#firmware"
            page.locator("a.home").click()
            assert page.url == installer + "#firmware"

            base = f"http://127.0.0.1:{server.server_port}"
            page.goto(base + "/install/")
            for task, frame, heading in (("samples", "sample", "Import samples"), ("projects", "project", "Songs & projects")):
                page.locator(f"#{task}-tab").click()
                assert page.url == base + "/install/#" + task
                expect(page.frame_locator(f"#{frame}-frame").get_by_role("heading", name=heading)).to_be_visible()
            page.locator("#firmware-tab").click()
            expect(page.locator("#go")).to_be_disabled()
            assert page.evaluate("midiCalls === 0")
            print(json.dumps({"sandboxed_chromium": browser.version, "file_routes": True,
                              "local_wav": True, "offline_project": True, "hosted_iframes": True, "midi_calls": 0}))
    finally:
        server.shutdown()

if __name__ == "__main__":
    main()
