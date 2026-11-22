#!/usr/bin/env python3
"""Exercise the actual Remote page with one candidate test scalar and real firmware C."""
import argparse
import hashlib
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import subprocess
from threading import Thread

from playwright.sync_api import expect, sync_playwright


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


MIDI = """({catalog, many}) => {
    window.midiPermissionRequests = 0;
    if (catalog) window.__DNBOX_FIRMWARE_BUNDLE = catalog;
    const port = (id) => Object.assign(new EventTarget(), {
        id, name:id, state:'connected', open:async()=>{}, close:async()=>{},
    });
    const input = port('DnBOX test in');
    const output = Object.assign(port('DnBOX test out'), {
        async send(data) {
            const reply = await window.nativeExchange(Array.from(data));
            if (reply.length) input.dispatchEvent(Object.assign(new Event('midimessage'),
                {data:new Uint8Array(reply)}));
        },
    });
    const inputs = new Map([[input.id, input]]);
    const outputs = new Map([[output.id, output]]);
    if (many) {
        inputs.set('Other in', port('Other in'));
        outputs.set('Other out', port('Other out'));
    }
    Object.defineProperty(navigator, 'requestMIDIAccess', {value: async ({sysex}) => {
        if (!sysex) throw Error('SysEx permission missing');
        window.midiPermissionRequests++;
        return {inputs, outputs};
    }});
}"""


def verify(page, host, url, catalog, many=False):
    page_errors = []
    trace = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))

    def exchange(raw):
        command = bytes(raw)
        host.stdin.write(command.hex() + "\n")
        host.stdin.flush()
        reply = bytes.fromhex(host.stdout.readline())
        assert len(command) == len(reply) == 51
        assert command[:5] == reply[:5] == b"\xf0\x7dDN\x02"
        assert reply[5] == command[5] | 64
        def read(offset, width):
            return sum(byte << (7*i) for i, byte in enumerate(reply[offset:offset+width]))
        trace.append([command[5], reply[6], read(24, 4), read(30, 5)])
        return list(reply)

    page.expose_function("nativeExchange", exchange)
    environment = json.dumps({"catalog": catalog, "many": many})
    page.add_init_script(f"({MIDI})({environment})")
    page.goto(url, wait_until="networkidle")
    connect, status = page.locator("#connect"), page.locator("#conn-state")
    expect(connect).to_be_visible()
    connect.click()
    if not catalog:
        expect(status).to_contain_text("catalog", ignore_case=True)
        assert page.evaluate("window.midiPermissionRequests") == 0
        assert not trace
    elif many:
        expect(status).to_have_text("Multiple MIDI ports. Choose a pair.")
        assert page.evaluate("window.midiPermissionRequests") == 1
        assert not trace
    else:
        expect(status).to_have_attribute("data-session", "ready")
        expect(status).to_have_text("Connected. 1 controls confirmed.")
        page.get_by_label("More actions").click()
        control = page.locator("#fw-1")
        expect(control).to_have_value("75")
        control.fill("76")
        page.locator("#apply").click()
        expect(status).to_have_text("Stored 76. Update queued.")
        page.locator("#firmware-undo").click()
        expect(status).to_have_text("Restored stored value 75. Update queued.")
        expect(control).to_have_value("75")
        connect.click()
        expect(status).to_have_text("Disconnected")
        assert trace == [[0,0,1,0xecca5979], [1,0,1,0], [2,0,1,75], [3,1,2,76],
                         [2,0,2,76], [2,0,2,76], [3,1,3,75], [2,0,3,75], [7,0,3,0]], trace
    assert not page_errors, page_errors
    return {"status": status.inner_text(), "page_errors": page_errors, "trace": trace}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("nightly", type=Path)
    parser.add_argument("adapter", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    head = subprocess.check_output(["git", "-C", args.nightly, "rev-parse", "HEAD"], text=True).strip()
    catalog_file = args.nightly / "web/product-site/remote/device/catalog.mjs"
    assert "REVIEWED_BUNDLE = null" in catalog_file.read_text()
    catalog = {"catalog": {"admitted": True, "testOnly": True, "count": 1,
                           "crc": 0xecca5979,
                           "controls": [{"id": 1, "kind": 1, "min": 0, "max": 127,
                                         "label": "909 MIX Level"}]},
               "admission": {"testOnly": True, "catalogCrc": 0xecca5979,
                             "sourceSha": "1"*40, "reviewSha": "2"*64}}
    root = args.nightly / "web/product-site"
    with ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=root)) as server:
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            url = f"http://127.0.0.1:{server.server_port}/remote/"
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(chromium_sandbox=True)
                receipt = {"nightly": head, "chromium": browser.version, "viewport": [390, 844],
                           "software_only": True, "shipping_catalog_admitted": False,
                           "host_sha256": hashlib.sha256(args.adapter.read_bytes()).hexdigest()}
                for mode, bundle, many in (("shipping", None, False), ("ambiguous", catalog, True),
                                           ("candidate", catalog, False)):
                    with subprocess.Popen([str(args.adapter.resolve()), "--serve"], text=True,
                                          stdin=subprocess.PIPE, stdout=subprocess.PIPE) as host:
                        page = browser.new_page(viewport={"width":390, "height":844})
                        page.set_default_timeout(5000)
                        try:
                            receipt[mode] = verify(page, host, url, bundle, many)
                        finally:
                            page.close()
                            host.stdin.close()
                            assert host.wait(timeout=3) == 0
                browser.close()
        finally:
            server.shutdown()
            thread.join()
    args.output.write_text(json.dumps(receipt, indent=2) + "\n")


if __name__ == "__main__":
    main()
