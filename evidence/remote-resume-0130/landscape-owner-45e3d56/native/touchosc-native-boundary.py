#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Run the two exact packed Lua layouts against the one-control native host."""
import argparse
import asyncio
import hashlib
import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory

PRODUCER = '4094e27b3e25a6436a3e7ac09a899f4a039b6d0076b6f3f8e4666ebe130c9881'
PACKAGES = {
    'closed': ('dnbox-parameters-unavailable.tosc',
               'ee8581b6b8043f9afdbe41f43f3b12785edf23548f59050d4cab1de25bd4ec04'),
    'mismatch': ('dnbox-parameters-archived-host.tosc',
                 '83977fa73340823f259b7dc3f15504e00d3ea5d62f8f45d5e075a35f390b80a5'),
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def midi_number(data, offset, length):
    return sum(byte << (7 * index)
               for index, byte in enumerate(data[offset:offset + length]))


async def exercise(driver, producer, layout, case):
    driver = await asyncio.create_subprocess_exec(
        'texlua', driver, layout, case, stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT)
    native = None
    frames = []
    output = []
    try:
        if case == 'mismatch':
            native = await asyncio.create_subprocess_exec(
                producer, '--serve', stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE)
        while line := await asyncio.wait_for(driver.stdout.readline(), timeout=5):
            text = line.decode().strip()
            tag, _, command = text.partition(' ')
            if tag != 'wire':
                output.append(text)
                continue
            assert native is not None and bytes.fromhex(command)[5] == 0, text
            native.stdin.write((command + '\n').encode())
            await native.stdin.drain()
            reply = (await asyncio.wait_for(native.stdout.readline(), timeout=5)).decode().strip()
            raw = bytes.fromhex(reply)
            assert len(raw) == 51 and raw[5:7] == bytes([64, 0])
            count, crc = midi_number(raw, 28, 2), midi_number(raw, 30, 5)
            assert (count, crc) == (1, 0xecca5979)
            frames.append({'command': command, 'reply': reply, 'op': 'HELLO', 'count': count, 'crc': crc})
            driver.stdin.write((reply + '\n').encode())
            await driver.stdin.drain()
        assert await asyncio.wait_for(driver.wait(), timeout=5) == 0
        assert output == ['PASS ' + case] and len(frames) == int(case == 'mismatch')
        return {'case': case, 'driverOutput': output, 'frames': frames}
    finally:
        for process in (driver, native):
            if process and process.returncode is None:
                process.stdin.close()
                assert await asyncio.wait_for(process.wait(), timeout=5) == 0


def run(args):
    assert digest(args.producer) == PRODUCER
    driver = args.root / 'tests/product-remote/touchosc-parameters-host.lua'
    extractor = driver.with_suffix('.py')
    spec = importlib.util.spec_from_file_location('packed_extractor', extractor)
    layouts = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(layouts)
    cases = []
    with TemporaryDirectory(prefix='touchosc-native-') as path:
        for case, (name, sha) in PACKAGES.items():
            packed = args.root / 'evidence/remote-resume-0130/touchosc-parameters' / name
            layout = Path(path) / case
            assert digest(packed) == sha
            layouts.extract_layout(packed, layout, closed=case == 'closed')
            result = asyncio.run(exercise(driver, args.producer, layout, case))
            assert digest(packed) == sha
            cases.append({**result, 'layout': name, 'packedSHA256': sha,
                          'extractedControllerSHA256': digest(layout / 'controller.lua')})
    receipt = {'result': 'PASS', 'scope': 'Exact packed Lua catalog rejection with real C host',
               'softwareOnly': True, 'producerSHA256': PRODUCER, 'driverSHA256': digest(driver),
               'extractorSHA256': digest(extractor), 'native': {'crc': 'ecca5979', 'count': 1},
               'default': {'crc': '00000000', 'count': 0}, 'archived': {'crc': 'eec38bc1', 'count': 326},
               'cases': cases}
    args.output.write_text(json.dumps(receipt, indent=2) + '\n')
    print('PASS exact packed default emits zero frames')
    print('PASS exact packed archived Lua rejects genuine native HELLO before OPEN, READ or SET')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for argument in ('root', 'producer', 'output'):
        parser.add_argument(argument, type=lambda value: Path(value).resolve())
    run(parser.parse_args())
