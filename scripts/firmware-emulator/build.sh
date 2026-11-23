#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-only
# build.sh FIRMWARE_CHECKOUT PREVIOUS_RUNTIME OUTPUT_DIRECTORY
set -euo pipefail
fw=8f97fe7d2bbf4f878cd0061c657c13c6f4322ea6
here=$(cd "$(dirname "$0")" && pwd)
checkout=$(realpath "${1:?Firmware checkout required}")
previous=$(realpath "${2:?Previous runtime directory required}")
output=$(realpath -m "${3:?New output directory required}")
zig=${ZIG:-zig}
test "$("$zig" version)" = 0.14.1
test ! -e "$output"
tmp=$(mktemp -d)
trap 'rm -rf -- "$tmp"' EXIT
mkdir -p "$tmp/src/web/emu" "$tmp/output/previous"
cd "$tmp/src"
# Extract only the pinned build inputs. Never modify the firmware checkout.
git -C "$checkout" ls-tree -r "$fw" -- firmware/src host tools tests/host/original_build.sh \
    experiments/original_synth experiments/wobble assets/fonts assets/909 assets/factory_banks assets/factory-breaks |
while read -r mode type blob name; do
    test "$type" = blob
    mkdir -p "$(dirname "$name")"
    git -C "$checkout" cat-file blob "$blob" > "$name"
    if [[ "$mode" == 100755 ]]; then chmod +x "$name"; fi
done
python3 - "$checkout" <<'PY'
import json, shutil, sys
from pathlib import Path
for item in json.loads(Path('experiments/original_synth/EXTERNAL-INPUTS.json').read_bytes())['excluded_data_inputs']:
    if item['required_by_active_original_profile']:
        path = Path(item['path'])
        path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(Path(sys.argv[1]) / path, path)
PY
python3 tools/check_original_inputs.py --scope active
sh host/build_host.sh --generate-only
git apply "$here/web-hooks.patch"
cp "$here"/{kernel.c,mix-transaction.h,sound-transaction.h,transaction-engine.c} web/emu/
. tests/host/original_build.sh
sources=${ORIGINAL_SOURCES/firmware\/src\/app\/engine.c/web\/emu\/transaction-engine.c}
# Retain the full public firmware control surface of the previous runtime.
node --input-type=module - "$here" "$previous" "$tmp/output" <<'JS'
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const [here, previous, out]=process.argv.slice(2);
const pin=JSON.parse(fs.readFileSync(path.join(here,'previous-runtime.json')));
for (const [name,expected] of Object.entries(pin.files)) {
  const bytes=fs.readFileSync(path.join(previous,name));
  if (bytes.length!==expected.bytes || createHash('sha256').update(bytes).digest('hex')!==expected.sha256)
    throw Error('Wrong previous runtime file: '+name);
  fs.writeFileSync(path.join(out,'previous',name),bytes);
  fs.writeFileSync(path.join(out,name),bytes);
}
const old=new WebAssembly.Module(fs.readFileSync(path.join(previous,'kernel.wasm')));
const exports=WebAssembly.Module.exports(old).filter(e=>e.name.startsWith('web_'));
fs.writeFileSync('exports.txt',exports.map(e=>'-Wl,--export='+e.name).join('\n')+'\n');
JS
mapfile -t exports < exports.txt
"$zig" cc -target wasm32-wasi -mcpu=baseline -mexec-model=reactor -O2 -g0 -std=c99 \
    -DX0X_HOST -DX0X_WEB -D_POSIX_C_SOURCE=200809L $ORIGINAL_FLAGS \
    -Ifirmware/src -Ifirmware/src/dsp -Ibuild/gen web/emu/kernel.c $sources "${exports[@]}" \
    -Wl,-z,stack-size=1048576 -Wl,--initial-memory=33554432 -Wl,--strip-all -lm -o "$tmp/output/kernel.wasm"
cp "$here"/{index.html,wasi.mjs} "$tmp/output/"
python3 - "$tmp/output" "$fw" <<'PY'
import hashlib,json,sys
from pathlib import Path
out=Path(sys.argv[1])
meta=json.loads((out/'previous/runtime.json').read_bytes())
wasm=(out/'kernel.wasm').read_bytes()
# kernel_source identifies the original adapter. firmware_source identifies its firmware.
meta.update(firmware_source=sys.argv[2],wasm_bytes=len(wasm),wasm_sha256=hashlib.sha256(wasm).hexdigest())
(out/'runtime.json').write_text(json.dumps(meta, separators=(',',':'))+'\n')
PY
mkdir -p "$(dirname "$output")"
mv -T "$tmp/output" "$output"
