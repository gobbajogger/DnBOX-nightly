#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Reproduce and authenticate all seven browser reference modules from pinned source."""
import argparse
import hashlib
import json
import os
import runpy
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
EVIDENCE = '3e67b59c8e4dd3d5994680d857ec4e2ea755ab6d'
PRIMARY = runpy.run_path(str(HERE / 'build-primary.py'))


def gitfile(repo, revision, path):
    return subprocess.check_output(['git', '-C', repo, 'show', revision + ':' + path])


def build_synthone(repo, evidence, dest, zig):
    # This FWUI producer performs the three-way composition with the pinned
    # Sound provider, runs both native C fixtures and checks the source identities.
    qualifier = evidence / 'tests/host/qualify_fwui_s1.py'
    root = dest / 'synthone'
    subprocess.run([sys.executable, qualifier, root, '--repo', repo, '--fwui', PRIMARY['REVISION'],
                    '--test-ref', EVIDENCE], check=True)
    source = root / 'source'
    fixture = source / 'tests/host/smc_ui_test.c'
    code = fixture.read_text()
    start = code.index('static void shot(const char *name)')
    end = code.index('static void setup(', start)
    fixture.write_text(code[:start] + '''#pragma push_macro("__attribute__")
#undef __attribute__
__attribute__((import_module("env"), import_name("capture")))
extern void web_capture(const char *, const uint16_t *);
#pragma pop_macro("__attribute__")
static void shot(const char *name) { web_capture(name, fb); }
''' + code[end:])
    env = dict(os.environ, X0X_SYNTHONE_PATCH='1', W3_ZIG=str(zig), W3_PANEL=str(root / 'panel'),
               W3_DEST=str(dest), ZIG_LOCAL_CACHE_DIR=str(dest / 'zig-cache'))
    command = '''. tests/host/original_build.sh
for fixture in patch frame; do
  "$W3_ZIG" cc -target wasm32-wasi -mcpu=baseline -O2 -g0 -ffp-contract=off -std=c99 \
    -DX0X_HOST -DX0X_SYNTHONE_PATCH=1 -D_POSIX_C_SOURCE=200809L -Ifirmware/src -Ifirmware/src/app \
    -Ifirmware/src/dsp -Ibuild/gen -I"$W3_PANEL" "tests/host/ui_synthone_${fixture}_test.c" \
    $ORIGINAL_FLAGS $ORIGINAL_SOURCES -Wl,-z,stack-size=4194304 -Wl,--strip-all -lm \
    -o "$W3_DEST/synthone-${fixture}.wasm"
done
'''
    subprocess.run(['sh', '-ec', command], cwd=source, env=env, check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('firmware_repo', type=Path)
    parser.add_argument('output', type=Path, help='new or empty directory for the seven authenticated modules')
    parser.add_argument('zig', type=Path, help='Zig 0.14.1 executable')
    args = parser.parse_args()
    repo, output, zig = args.firmware_repo.resolve(), args.output.resolve(), args.zig.resolve()
    if output.exists() and any(output.iterdir()):
        raise ValueError('Choose an empty output directory')
    if subprocess.check_output([zig, 'version'], text=True).strip() != '0.14.1':
        raise ValueError('Zig 0.14.1 is required for this pin')
    pin = json.loads((HERE.parents[1] / 'scripts/firmware-reference-pin.json').read_text())
    with tempfile.TemporaryDirectory(prefix='dnbox-firmware-reference-') as tmp:
        dest = Path(tmp)
        source, evidence = dest / 'production', dest / 'evidence'
        source.mkdir()
        PRIMARY['source_tree'](repo, source)
        for path in ['tests/ui_inventory/stock_guard_oracle.c', 'tests/host/qualify_fwui_s1.py',
                     'docs/lanes/fwui/current/native-routes/stock-guard.json']:
            (evidence / path).parent.mkdir(parents=True, exist_ok=True)
            (evidence / path).write_bytes(gitfile(repo, EVIDENCE, path))
        with tempfile.TemporaryDirectory(dir=dest, prefix='primary-') as temp:
            work = Path(temp)
            for folder in ['assets', 'firmware', 'host', 'tools', 'experiments', 'tests']:
                shutil.copytree(source / folder, work / folder)
            PRIMARY['prepare'](work)
            PRIMARY['browser_hooks'](work)
            PRIMARY['compile_wasm'](work, dest / 'fwui.wasm', zig)
        subprocess.run([sys.executable, HERE / 'build-supplement.py', source, dest, zig], check=True)
        subprocess.run([sys.executable, HERE / 'build-guard.py', source, evidence, dest, zig], check=True)
        build_synthone(repo, evidence, dest, zig)
        for name, expected in pin['files'].items():
            data = (dest / name).read_bytes()
            digest = hashlib.sha256(data).hexdigest()
            if {'bytes': len(data), 'sha256': digest} != expected:
                raise ValueError(f'{name} differs from its qualified pin: {digest}')
        output.mkdir(parents=True, exist_ok=True)
        for name in pin['files']:
            shutil.copyfile(dest / name, output / name)
    print(f'Rebuilt and authenticated {len(pin["files"])} firmware screen modules')


if __name__ == '__main__':
    main()
