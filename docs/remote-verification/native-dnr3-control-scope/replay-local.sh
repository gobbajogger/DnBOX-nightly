#!/bin/bash
set -euo pipefail
d=$(cd "$(dirname "$0")" && pwd)
root=$(realpath "${1:-$d/..}")
q="$root/source-ui-exact/restart/source/DnBOX-73749f55-to-DNR3-adf3eee.patch"
printf 'b9522e55b12791f3d341812c00f192263ac76b0228d1b196fc909bc1712d3f3e  %s\n' "$q"|sha256sum -c -
test "$(git -C "$root/fw" rev-parse HEAD)" = 73749f55d17a0643f1ddd072114172d29eecc2ae
test "$(git -C "$d/web" rev-parse HEAD)" = b77e49a0a2d288c9dc3a1e93191857377a9406ae
test "$(git -C "$d/web" rev-parse 'HEAD^{tree}')" = aa2595ff6bcec286d3f75623812ced7b82ee1359
w=$(mktemp -d "$root/.remote206-replay.XXXXXX"); trap 'rm -rf "$w"' EXIT
mkdir -p "$w/build"
for x in firmware host tests tools experiments;do cp -a "$root/fw/$x" "$w/";done
ln -s "$root/fw/assets" "$w/assets"
cp -a "$root/fw/build/gen" "$w/build/"
cd "$w"
git apply --include='firmware/**' --include='host/**' --include='tools/**' --include='tests/**' "$q"
CC='cc -pipe' X0X_REMOTE_MUTANTS=0 sh tests/host/remote_dnr3_test.sh
cp "$d/"{native-cable,dual-cable}.c tests/host/
sed 's/^int main(void)/int existing_dnr3_test(void)/' tests/host/remote_dnr3_test.c >tests/host/native-test-body.inc
link() {
   . tests/host/original_build.sh
   cc -pipe -O1 -std=gnu99 -w -DX0X_HOST -DBOARD_SMK37=1 -Ifirmware/src -Ifirmware/src/dsp -Ibuild/gen $ORIGINAL_FLAGS "$@" "tests/host/$kind.c" $ORIGINAL_SOURCES -lm -o "$w/$kind"
}
(kind=native-cable; link)
(kind=dual-cable; export X0X_S1C=1 X0X_SUPERJ6_FACTORY=1 X0X_SYNTHONE_PATCH=1; link -DX0X_SYNTHONE_PATCH=1 -DX0X_S1C=1 -DX0X_SUPERJ6_BUILTIN_INIT=1)
ln -s "$d/web" "$w/web"
cp "$d/native-transport.mjs" "$w/"
node "$w/native-transport.mjs"
node "$w/native-transport.mjs" --dual
node --test "$d/web/tests/product-remote/remote-controls.test.mjs"
