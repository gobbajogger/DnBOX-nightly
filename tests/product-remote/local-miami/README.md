# Local Miami Carrier WAVE fixture (one transaction)

Test source only. Nothing here is imported by Remote, the product build, the production runtime pin or the default gates. Do not check a pilot binary, staged site, original inputs or receipt into Git. This fixture admits one edit and Undo on Bass A / MIAMI / bank 1 / target 2 / parameter 0 only.

## Exact inputs and isolated build recipe

Nightly: `dc212587`. Firmware: `bb55c6347628d5b685c81078bba45ba1a1f2207e`, tree `f9410920ce9df6571707272d063a5b431af72f24`. The recipe extracts exactly the path closure used by Nightly's `scripts/firmware-emulator/build.sh`. The earlier verified 576-file baseline was firmware `5a9b1998be829b7a0534c12b7d36d28d40cfe3d9`; the selected source drift is only `firmware/src/app/ui.c`, `firmware/src/app/ui_drum_voice.inc`, `firmware/src/gfx.c` and `tools/gen_font.py`. The pinned firmware Git tree is authoritative.

Supply the authorized local original-input root, not an upload or archive. Its layout and each required asset's identity come from firmware `experiments/original_synth/EXTERNAL-INPUTS.json` (Git blob `2dcfda3aa23a08a7605a38aa3c2d955b2337a855`, SHA-256 `9c7ac9b0a71e775fb7009e2d4035fce827b2c56c4e8e692a7a8910c9c6c881bc`); the native verifier must accept all 10 active inputs. Use the previous runtime selected by Nightly `scripts/firmware-emulator/previous-runtime.json` (blob `5a8582b4bc8e871914022f85bcfd9bb46090520c`), not the currently served kernel. Zig is the official Linux x86_64 0.14.1 distribution (archive SHA-256 `24aeeec8af16c381934a6cd7d95c807a8cb2cf7df9fa40d359aa884195c4716c`); authenticate it before extraction. Use a disposable scratch filesystem with space for compiler caches and keep at least 65 MiB free.

Save the following as a Bash script, then invoke it with all seven arguments. OUT must not exist and must be outside both repositories. The already verified binary can instead be supplied directly to the tests.

```bash
#!/usr/bin/env bash
set -euo pipefail
[[ $# == 7 ]] || { echo 'Usage: build NIGHTLY_GIT FIRMWARE_GIT ORIGINAL_INPUT_ROOT PREVIOUS_RUNTIME ZIG FIXTURE_DIR NEW_OUT' >&2; exit 2; }
nightly=$(realpath "$1"); firmware=$(realpath "$2"); inputs=$(realpath "$3")
previous=$(realpath "$4"); zig=$(realpath "$5"); fixture=$(realpath "$6"); out=$(realpath -m "$7")
fw=bb55c6347628d5b685c81078bba45ba1a1f2207e
nw=$(git -C "$nightly" rev-parse 'dc212587^{commit}')
test "$(git -C "$firmware" rev-parse "$fw^{tree}")" = f9410920ce9df6571707272d063a5b431af72f24
test "$("$zig" version)" = 0.14.1
case "$out/" in "$nightly/"*|"$firmware/"*) exit 2;; esac
mkdir "$out"
mkdir -p "$out/src/web/emu" "$out/adapter/scripts/firmware-emulator" "$out/tmp"
export TMPDIR="$out/tmp" ZIG_GLOBAL_CACHE_DIR="$out/global" ZIG_LOCAL_CACHE_DIR="$out/local"
git -C "$firmware" ls-tree -r "$fw" -- firmware/src host tools tests/host/original_build.sh \
    experiments/original_synth experiments/wobble assets/fonts assets/909 assets/factory_banks assets/factory-breaks |
while IFS=$'\t' read -r metadata name; do
    read -r mode type blob <<<"$metadata"
    test "$type" = blob
    dest="$out/src/$name"
    mkdir -p "$(dirname "$dest")"
    git -C "$firmware" cat-file blob "$blob" >"$dest"
    if [[ "$mode" == 100755 ]]; then chmod +x "$dest"; fi
done
for f in web-hooks.patch kernel.c mix-transaction.h sound-transaction.h transaction-engine.c previous-runtime.json; do
    git -C "$nightly" show "$nw:scripts/firmware-emulator/$f" >"$out/adapter/scripts/firmware-emulator/$f"
done
cd "$out/adapter"
git apply --check "$fixture/native-fixture.patch"
git apply "$fixture/native-fixture.patch"
adapter="$out/adapter/scripts/firmware-emulator"
cd "$out/src"
echo '9c7ac9b0a71e775fb7009e2d4035fce827b2c56c4e8e692a7a8910c9c6c881bc  experiments/original_synth/EXTERNAL-INPUTS.json' | sha256sum -c -
python3 - "$inputs" <<'PY'
import json, shutil, sys
from pathlib import Path
m=json.loads(Path('experiments/original_synth/EXTERNAL-INPUTS.json').read_bytes())
for item in m['excluded_data_inputs']:
    if item['required_by_active_original_profile']:
        p=Path(item['path'])
        if p.is_absolute() or '..' in p.parts or p.exists(): raise SystemExit('Unexpected input path')
        p.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(Path(sys.argv[1])/p,p)
PY
python3 tools/check_original_inputs.py --scope active
git apply "$adapter/web-hooks.patch"
cp "$adapter"/{kernel.c,mix-transaction.h,sound-transaction.h,transaction-engine.c} web/emu/
sh host/build_host.sh --generate-only
node --input-type=module - "$adapter" "$previous" <<'JS' >exports.txt
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const [adapter,previous]=process.argv.slice(2);
for(const [n,p] of Object.entries(JSON.parse(fs.readFileSync(adapter+'/previous-runtime.json')).files)){
 const b=fs.readFileSync(previous+'/'+n);
 if(b.length!==p.bytes||createHash('sha256').update(b).digest('hex')!==p.sha256)throw Error('Wrong previous runtime: '+n);
}
for(const e of WebAssembly.Module.exports(new WebAssembly.Module(fs.readFileSync(previous+'/kernel.wasm'))))
 if(e.name.startsWith('web_'))console.log('-Wl,--export='+e.name);
JS
. tests/host/original_build.sh
sources=${ORIGINAL_SOURCES/firmware\/src\/app\/engine.c/web\/emu\/transaction-engine.c}
mapfile -t exports <exports.txt
for f in read_snapshot text revision choice token set_checked confirm undo_checked; do exports+=("-Wl,--export=web_pilot_miami_$f"); done
"$zig" cc -target wasm32-wasi -mcpu=baseline -mexec-model=reactor -O2 -g0 -std=c99 \
    -DX0X_HOST -DX0X_WEB -DX0X_SMK_CAPTIONS=0 -D_POSIX_C_SOURCE=200809L $ORIGINAL_FLAGS \
    -Ifirmware/src -Ifirmware/src/dsp -Ibuild/gen web/emu/kernel.c $sources "${exports[@]}" \
    -Wl,-z,stack-size=1048576 -Wl,--initial-memory=33554432 -Wl,--strip-all -lm -o "$out/admission-pilot.wasm"
(cd "$out"; echo 'db1d79bc8bfb5ab3fa9a8fdb78518e42abf99674253b1cb16a602da1e2e28f4e  admission-pilot.wasm' | sha256sum -c -)
```

This records the verified pilot compiler invocation and input pins; it is not a claim that a fresh Git extraction on another host reproduced the binary. A mismatching digest is unqualified: do not update the fixture pin merely to make it pass. Recheck the exact Git closure, generator environment and original/previous input verification first.

## Check the result

1. Run `node native-test.mjs LOCAL_BINARY_DIRECTORY NIGHTLY_WASI_MJS`. It checks the immutable pilot SHA-256 before instantiation.
2. Run `python3 stage.py EXACT_BUILT_NIGHTLY_SITE PATH_TO_ADMISSION_PILOT_WASM TEST_RUN_DIRECTORY/site`. Staging validates relevant base hashes and copies only the changed files into the separate test site. The deliberate staging action enables Miami only on loopback with an explicit port and exact firmware and kernel identity. There is no query or shared product setting.
3. With bundled Playwright Chromium and scratch `TMPDIR` outside the repository, run `python3 browser.py TEST_RUN_DIRECTORY EXACT_NIGHTLY_SOURCE`. It uses the existing harness to observe actual native traffic, including the preserved Chicago-on-Miami refusal, native SQR@127 → TRI@0 → Undo SQR@127 → fresh SQR@127, unchanged Draft bytes, no MIDI and Bass B Chicago's exact 20-control schema.

Production admission remains separate: qualify the non-SMK build guard (defined `BOARD_SMK37` default, preserving the explicit caption override), review the repeatable capability and guarded provider, and qualify an approved immutable product runtime and provenance pin. This fixture changes none of them. No stock or TouchOSC claim.
