#!/bin/bash
set -euo pipefail
d=$(cd "$(dirname "$0")" && pwd)
root=$(realpath "$d/..")
src="$root/remote206-audit/web"
test "$(git -C "$src" rev-parse HEAD)" = b77e49a0a2d288c9dc3a1e93191857377a9406ae
test "$(git -C "$src" rev-parse 'HEAD^{tree}')" = aa2595ff6bcec286d3f75623812ced7b82ee1359
test -z "$(git -C "$src" status --porcelain)"
w=$(mktemp -d "$root/.remote-typed-ci.XXXXXX"); trap 'rm -rf "$w"' EXIT
(cd "$src";tar --exclude=.git -cf - .)|tar -xf - -C "$w"
cd "$w"
patch --no-backup-if-mismatch --fuzz=0 -s -p1 <"$d/typed-synth-206.patch"
node --check web/product-site/remote/app.mjs
DNBOX_FIRMWARE_DIR="$root/fw" node --test tests/product-remote/{typed-synth,remote-controls,dnr3-codec,dnr3-client,dnr3-break-steps}.test.mjs
