#!/usr/bin/env bash
# Run the saved software-only scalar checks against a newly measured host.
set -euo pipefail

if [[ $# -ne 5 || ! "$3" =~ ^[0-9a-f]{64}$ || ! "$5" =~ ^(lua|chromium)$ ]]; then
  echo 'Usage: bash replay.sh FIRMWARE_CHECKOUT HOST HOST_SHA256 NEW_OUTPUT_DIR lua|chromium' >&2
  exit 2
fi
nightly="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)"
firmware="$(realpath -e -- "$1")"
host="$(realpath -e -- "$2")"
expected_host="$3"
output="$(realpath -m -- "$4")"
suite="$5"
readonly proof="$nightly/evidence/integ-resume/branch-scalar-54266973"
readonly reviewed="$nightly/.output/verified-909-mix"
[[ "$(git -C "$nightly" rev-parse HEAD)" == b0af34316dad63815fadee07863318b5310f140e ]]
[[ -x "$host" ]]
printf '%s  %s\n' "$expected_host" "$host" | sha256sum --check --status
mkdir -- "$output"
cp -- "$reviewed/candidate-catalog.mjs" "$reviewed/reviewed-scalar-staging.tosc" "$output/"
cmp -- "$output/candidate-catalog.mjs" "$proof/candidate-catalog.mjs"
cmp -- "$output/reviewed-scalar-staging.tosc" "$proof/reviewed-scalar-staging.tosc"
{
  git -C "$nightly" rev-parse HEAD
  git -C "$firmware" rev-parse HEAD
  git -C "$firmware" status --porcelain --untracked-files=no
  sha256sum -- "$host" "$output/candidate-catalog.mjs" "$output/reviewed-scalar-staging.tosc" \
    "$proof/test_staging_browser.py" "$proof/test_staging_lua.py" \
    "$firmware/docs/remote-scalar-catalog.json" "$firmware/firmware/src/app/dnr2_native_catalog.h"
} > "$output/inputs.log"
cd -- "$nightly"
if [[ "$suite" == lua ]]; then
  timeout 30s python3 -B "$proof/test_staging_lua.py" "$nightly" "$firmware" "$host" \
    "$output/staged-lua.json" 2>&1 | tee "$output/staged-lua.log"
else
  python3 -B - "$proof/test_staging_browser.py" "$output/test_staging_browser.py" "$expected_host" <<'PY'
from pathlib import Path
import sys

original, output = map(Path, sys.argv[1:3])
previous = "5dccda64220867a87a770ba1a669b251fff140d719b35d32de42b3084cb05793"
driver = original.read_text()
assert driver.count(previous) == 1
with output.open("x") as stream:
    stream.write(driver.replace(previous, sys.argv[3], 1))
PY
  sha256sum -- "$output/test_staging_browser.py" >> "$output/inputs.log"
  mkdir -p -- "$nightly/.cache"
  browser_tmp="$(mktemp -d "$nightly/.cache/scalar-wet-profile.XXXXXXXX")"
  trap 'rmdir -- "$browser_tmp" "$nightly/.cache" 2>/dev/null || true' EXIT
  TMPDIR="$browser_tmp" timeout 65s python3 -B "$output/test_staging_browser.py" \
    "$output/candidate-catalog.mjs" "$host" "$output/staged-browser.json" 2>&1 | tee "$output/staged-browser.log"
fi
