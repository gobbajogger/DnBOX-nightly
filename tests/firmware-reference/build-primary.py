#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Build the browser panel from an immutable FWUI checkout using Zig 0.14.1."""
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

REVISION = '61827a714ca7b240c01a55ed347b5fd7b847c7c2'


def source_tree(repo, work):
    paths = ['assets', 'firmware', 'host', 'tools', 'experiments/original_synth',
             'experiments/wobble', 'tests/host', 'tests/ui_inventory',
             'tests/ui_geometry', 'tests/ui_defects/first_slice']
    with tempfile.TemporaryFile() as data:
        subprocess.run(['git', '-C', repo, 'archive', REVISION, '--', *paths], stdout=data, check=True)
        data.seek(0)
        with tarfile.open(fileobj=data) as archive:
            archive.extractall(work, filter='data')
    manifest = json.loads((work / 'experiments/original_synth/EXTERNAL-INPUTS.json').read_text())
    for row in manifest['excluded_data_inputs']:
        target = work / row['path']
        if row['required_by_active_original_profile'] and not target.exists():
            target.write_bytes((repo / row['path']).read_bytes())
    subprocess.run([sys.executable, 'tools/check_original_inputs.py'], cwd=work, check=True)


def prepare(work):
    sys.path.insert(0, str(work / 'tests/ui_inventory'))
    from run import prepare as prepare_inventory
    from source_inventory import inventory
    prepare_inventory(work, inventory(work))
    sys.path.insert(0, str(work / 'tests/ui_geometry'))
    from instrument import instrument
    instrument(work)


def browser_hooks(work):
    # Keep the published fixture's state selection, boot setup and LCD painters.
    # Replace only the native PNG output and keep geometry diagnostics in native runs.
    fixture = work / 'tests/host/smc_ui_test.c'
    code = fixture.read_text()
    a = code.index('static void shot(const char *name)')
    b = code.index('static void setup(', a)
    callback = '''#pragma push_macro("__attribute__")
#undef __attribute__
__attribute__((import_module("env"), import_name("capture")))
extern void w3_capture(const char *, const uint16_t *);
#pragma pop_macro("__attribute__")
static void shot(const char *name) { w3_capture(name, fb); }
'''
    fixture.write_text(code[:a] + callback + code[b:])
    walker = work / 'tests/ui_geometry/capture.c'
    code = walker.read_text().replace('geo_enabled=1;', 'geo_enabled=0;').replace('geo_audit(name);', '')
    entry = 'int main(void)\n{\n    unsigned total=0;'
    if code.count(entry) != 1:
        raise ValueError('FWUI walker entry changed')
    code = code.replace(entry, 'int w3_primary(void)\n{\n    unsigned total=0;')
    edits = (work / 'tests/host/ui_step_lane_edit_test.c').read_text().split('#include "smc_ui_test.c"\n', 1)[1]
    code += edits.replace('int main(void)', 'int w3_edits(void)')
    code += '''
#pragma push_macro("__attribute__")
#undef __attribute__
__attribute__((import_module("env"),import_name("family"))) extern int w3_family(void);
#pragma pop_macro("__attribute__")
int main(void) { return w3_family()==1 ? w3_edits() : w3_primary(); }
'''
    walker.write_text(code)


def compile_wasm(work, output, zig):
    include = work / 'build/include'
    include.mkdir(parents=True)
    # Use the same clip-control extraction as the independent GCC host fixture.
    script = (work / 'tests/host/smc_ui_test.sh').read_text()
    start = script.index("awk '/^static const char CK_FLD_N")
    end = script.index('test -s "$OUT/clip_smc.inc"', start)
    env = dict(os.environ, OUT=str(include), W3_ZIG=str(zig), W3_OUTPUT=str(output),
               ZIG_LOCAL_CACHE_DIR=str(work / 'build/zig-cache'))
    subprocess.run(['sh', '-ec', script[start:end]], cwd=work, env=env, check=True)
    subprocess.run(['sh', 'host/build_host.sh', '--generate-only'], cwd=work, check=True)
    # original_build.sh resolves the firmware's full production DSP source list.
    command = '''. tests/host/original_build.sh
"$W3_ZIG" cc -target wasm32-wasi -mcpu=baseline -O1 -std=c99 -ffp-contract=off -w \
  -DX0X_HOST -D_POSIX_C_SOURCE=200809L -Ifirmware/src -Ifirmware/src/app -Ifirmware/src/dsp \
  -Itests/host -Ibuild/gen -I"$OUT" tests/ui_geometry/capture.c $ORIGINAL_FLAGS $ORIGINAL_SOURCES \
  -Wl,--strip-all -Wl,-z,stack-size=4194304 -lm -o "$W3_OUTPUT"
'''
    subprocess.run(['sh', '-ec', command], cwd=work, env=env, check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('firmware_repo', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('zig', type=Path)
    args = parser.parse_args()
    zig = args.zig.resolve()
    if subprocess.check_output([zig, 'version'], text=True).strip() != '0.14.1':
        raise ValueError('Pinned Zig 0.14.1 is required to reproduce this binary')
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='fwui-primary-') as temp:
        work = Path(temp)
        source_tree(args.firmware_repo.resolve(), work)
        prepare(work)
        browser_hooks(work)
        artifact = work / 'fwui.wasm'
        compile_wasm(work, artifact, zig)
        data = artifact.read_bytes()
        pin = json.loads((Path(__file__).resolve().parents[2] / 'scripts/firmware-reference-pin.json').read_text())
        if {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()} != pin['files']['fwui.wasm']:
            raise ValueError('Rebuilt firmware screen module differs from the source-controlled pin')
        shutil.copyfile(artifact, output / 'fwui.wasm')
    print(f'{REVISION} fwui.wasm {len(data)} bytes {hashlib.sha256(data).hexdigest()}')


if __name__ == '__main__':
    main()
