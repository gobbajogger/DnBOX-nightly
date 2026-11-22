#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Drive the actual packed TouchOSC Lua through the pinned firmware C dispatchers."""

import argparse
import asyncio
from collections import Counter
from hashlib import sha256
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
import zlib

HERE = Path(__file__).resolve().parent
PACK = HERE.parents[1] / "tools/touchosc-parameters/pack.py"
STOCK_SOURCE = "f1786ebec2616477163b62b029c7e77405a9c3de"
OPS = {0: "HELLO", 1: "OPEN", 2: "READ", 3: "SET", 6: "KEEPALIVE", 7: "CLOSE"}


def unpack(frame, offset, count):
    return sum(frame[offset + i] << (7 * i) for i in range(count))


def extract_layout(path, work, closed=False):
    work.mkdir()
    root = ET.fromstring(zlib.decompress(path.read_bytes()))
    controls = {}
    frames = {}
    for node in root.iter("node"):
        props = {p.findtext("key"): p.find("value") for p in node.findall("properties/property")}
        name = props["name"].text
        assert name not in controls
        controls[name] = (node.get("type"), props.get("script").text if "script" in props else None)
        frames[name] = tuple(int(props["frame"].findtext(key)) for key in "xywh")
        assert not name.startswith("note_") and node.find("messages") is None
    width, height = frames["dnbox_parameters"][2:]
    for x, y, w, h in frames.values():
        assert x >= 0 and y >= 0 and x + w <= width and y + h <= height
    buttons = [script for kind, script in controls.values() if kind == "BUTTON"]
    assert len(buttons) == (0 if closed else 13)
    if buttons:
        assert len(set(buttons)) == 1 and buttons[0]
        (work / "button.lua").write_text(buttons[0])
    (work / "names.txt").write_text("\n".join(controls) + "\n")
    (work / "controller.lua").write_text(controls["dnbox_parameters"][1])


async def exercise(lua, mode, layout, binary, stock):
    driver = await asyncio.create_subprocess_exec(lua, HERE / "touchosc-parameters-host.lua", layout, mode,
                                                  stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE,
                                                  stderr=asyncio.subprocess.STDOUT)
    server = None
    frames, diagnostic, lines = [], [], []
    try:
        if mode not in ("closed", "stock"):
            server = await asyncio.create_subprocess_exec(binary, "--serve", stdin=asyncio.subprocess.PIPE,
                                                          stdout=asyncio.subprocess.PIPE)
        while line := await asyncio.wait_for(driver.stdout.readline(), 15):
            tag, _, payload = line.decode().rstrip().partition(" ")
            if tag == "PASS":
                assert payload == mode
                break
            if tag == "wire":
                wire = bytes.fromhex(payload)
                op = wire[5]
                assert len(wire) == 51 and op in OPS and wire[:5] == bytes((240, 125, 68, 78, 2))
                command = {"op": OPS[op], "id": unpack(wire, 26, 2), "revision": unpack(wire, 22, 4),
                           "value": unpack(wire, 30, 5), "request": unpack(wire, 18, 4)}
                if mode == "stock":
                    assert op == 0
                    response = json.loads(subprocess.check_output([stock, payload], timeout=10))
                    assert response == {"editor_deferred": True, "reply_hex": ""}, response
                    answer = "-"
                else:
                    server.stdin.write((payload + "\n").encode())
                    await server.stdin.drain()
                    response = json.loads(await asyncio.wait_for(server.stdout.readline(), 6))
                    assert response["admitted"] is False
                    actual = bytes.fromhex(response["hex"])
                    assert len(actual) == 51 and actual[5] == (64 | op)
                    command["reply"] = {"status": actual[6], "id": unpack(actual, 28, 2),
                                        "revision": unpack(actual, 24, 4), "value": unpack(actual, 30, 5)}
                    if mode == "mismatch" and op == 0:
                        perturb = bytearray(actual)
                        perturb[30] ^= 1
                        actual = bytes(perturb)
                    answer = actual.hex()
                frames.append(command)
            elif tag in ("advance", "external"):
                server.stdin.write(line)
                await server.stdin.drain()
                reply = json.loads(await asyncio.wait_for(server.stdout.readline(), 6))
                assert not reply.get("invalid") and reply["admitted"] is False
                diagnostic.append({"command": tag, "value": int(payload), "revision": reply["revision"]})
                answer = "ok"
            else:
                lines.append(line.decode().rstrip())
                continue
            driver.stdin.write((answer + "\n").encode())
            await driver.stdin.drain()
        result = await asyncio.wait_for(driver.wait(), 6)
        if result or not line or tag != "PASS":
            raise AssertionError(f"{mode} Lua exit {result}: {lines[-10:]} wire tail {frames[-5:]}")
    finally:
        for process in (driver, server):
            if process is not None and process.returncode is None:
                process.stdin.close()
                try:
                    await asyncio.wait_for(process.wait(), 6)
                except asyncio.TimeoutError:
                    process.kill()
                    await process.wait()

    counts = Counter(row["op"] for row in frames)
    if mode == "closed":
        assert not frames
    elif mode in ("stock", "mismatch"):
        assert counts == {"HELLO": 1}
    else:
        assert counts["HELLO"] == counts["OPEN"] == counts["CLOSE"] == 1 and counts["KEEPALIVE"] >= 1
        first_reads = [row for row in frames if row["op"] == "READ"][:326]
        assert [row["id"] for row in first_reads] == list(range(1, 327))
        assert Counter(row["reply"]["status"] for row in first_reads) == {0: 294, 6: 32}
    if mode == "happy":
        cutoff = [row for row in frames if row["id"] == 257 and row["op"] in ("READ", "SET")]
        assert [(r['op'], r['reply']['status'], r['reply']['revision'], r['reply']['value']) for r in cutoff] == [
            ('READ', 0, 1, 32), ('SET', 1, 2, 33), ('READ', 0, 2, 33), ('READ', 0, 2, 33),
            ('SET', 1, 3, 32), ('READ', 0, 3, 32), ('SET', 1, 4, 33), ('READ', 0, 4, 33),
            ('READ', 0, 6, 33), ('READ', 0, 6, 33),
        ], cutoff
    elif mode == "coupled":
        assert counts["SET"] == 1
        before = {r['id']: r['reply']['value'] for r in frames if r['op'] == 'READ' and r['reply']['revision'] == 1}
        after = {r['id']: r['reply']['value'] for r in frames if r['op'] == 'READ' and r['reply']['revision'] == 2}
        assert {id: (before[id], after[id]) for id in before if before[id] != after[id]} == {241: (64, 60), 253: (95, 96)}
    interesting = {row['id'] for row in frames if row['op'] == 'SET'} | {241, 245}
    return {"case": mode, "counts": counts, "diagnostic": diagnostic,
            "frames": [row for row in frames if row["op"] != "READ" or row["id"] in interesting]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archived_firmware", type=Path)
    parser.add_argument("stock_firmware", type=Path)
    parser.add_argument("--lua", default=shutil.which("lua") or shutil.which("texlua"))
    parser.add_argument("--json", type=Path)
    args = parser.parse_args()
    if not args.lua:
        parser.error("Lua or texlua is required")
    archived, stock = args.archived_firmware.resolve(), args.stock_firmware.resolve()
    assert subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=stock, text=True).strip() == STOCK_SOURCE
    subprocess.run(["git", "diff", "--quiet", "HEAD", "--"], cwd=stock, check=True)
    with tempfile.TemporaryDirectory() as tmp:
        temp = Path(tmp)
        pilot, closed = temp / "pilot.tosc", temp / "closed.tosc"
        subprocess.run([sys.executable, PACK, "--archived-host", archived, "--output", pilot], check=True)
        subprocess.run([sys.executable, PACK, "--output", closed], check=True)
        stock_probe = temp / "stock-probe"
        subprocess.run(["cc", "-std=c11", "-O2", "-I", stock, "-I", stock / "build/gen",
                        HERE / "stock-editor-probe.c", "-o", stock_probe], check=True)
        extract_layout(pilot, temp / "pilot")
        extract_layout(closed, temp / "closed", closed=True)
        binary = archived / "build/host/remote-actual-core/test"
        cases = []
        for mode in ("closed", "stock", "mismatch", "happy", "coupled"):
            cases.append(asyncio.run(exercise(args.lua, mode, temp / ('closed' if mode == 'closed' else 'pilot'), binary, stock_probe)))
            print(mode, "PASS", dict(cases[-1]["counts"]))
        if args.json:
            args.json.write_text(json.dumps({
                "stockFirmware": STOCK_SOURCE,
                "archivedFirmware": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=archived, text=True).strip(),
                "stockClosedSha256": sha256(closed.read_bytes()).hexdigest(),
                "archivedLayoutSha256": sha256(pilot.read_bytes()).hexdigest(),
                "cases": cases,
                "scope": "Actual packed Lua callbacks and archived real C pilot over stdio. Stock C dispatcher checks HELLO only. No native TouchOSC or physical keyboard execution.",
            }, indent=2) + "\n")


if __name__ == "__main__":
    main()
