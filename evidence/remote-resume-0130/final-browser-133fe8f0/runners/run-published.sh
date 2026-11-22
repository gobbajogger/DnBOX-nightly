#!/usr/bin/env bash
set -euo pipefail
umask 077
repo=${1:?repository containing published lane ref}
commit=${2:?published candidate SHA}
tree=${3:?published candidate tree}
base=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
run="$base/run-${commit:0:12}"
checkout="$(dirname "$base")/rt-${commit:0:8}"
branch=refs/remotes/origin/lane/remote-resume-0130
test "$(git -C "$repo" rev-parse "${commit}^{tree}")" = "$tree"
if git -C "$repo" show-ref --verify --quiet "$branch" && git -C "$repo" merge-base --is-ancestor "$commit" "$branch"; then
 publication_check='local remote-tracking branch contains this commit'
elif [[ $(git -C "$repo" rev-parse --verify FETCH_HEAD 2>/dev/null || :) == "$commit" ]]; then
 publication_check='exact fetched commit provided as published by lane owner'
else
 publication_check='exact local commit and tree; publication confirmed by lane owner'
fi
mkdir -m 700 "$run" "$run/logs"
git -C "$repo" worktree add --detach --no-checkout "$checkout" "$commit"
git -C "$checkout" sparse-checkout set --no-cone --stdin <<'EOF'
/web/product-site/
/scripts/
/package-version-assignments.json
/tests/product-remote/
/tests/visual/*.py
/tests/firmware-reference/native-rgb.tsv
/docs/design/OWNER-BASELINE-1836.pdf
/evidence/remote-owner-pages-20261121/owner-control-crosswalk/capture.py
/evidence/remote-owner-pages-20261121/1f6d7602-review/capture.py
EOF
git -C "$checkout" reset --hard "$commit"
test -z "$(git -C "$checkout" status --porcelain --untracked-files=no)"
site="$checkout/.output/site"
mkdir -p "$checkout/.cache"
export TMPDIR="$(mktemp -d "$checkout/.cache/p-XXXX")"
export PYTHONDONTWRITEBYTECODE=1
runtime=/workspace/scratch/857bb2409f82/bass-recovered/runtime-inputs
export DNBOX_EMULATOR_RUNTIME="$runtime/emu"
export DNBOX_FWUI_RUNTIME="$runtime/reference/screens"
export DNBOX_MIAMI_FIRMWARE="$runtime/miami-firmware"
{
 printf 'source\t%s\ntree\t%s\nbranch\t%s\ncheckout\t%s\nbuild\t%s\nrun\t%s\n' "$commit" "$tree" "$branch" "$checkout" "$site" "$run"
 printf 'publicationCheck\t%s\n' "$publication_check"
 printf 'TMPDIR\t%s\nstartUTC\t%s\n' "$TMPDIR" "$(date -u +%FT%TZ)"
 sha256sum "$base"/{capture.py,capture-owner.py,run-published.sh}
} > "$run/source.txt"
(
 cd "$runtime"
 find emu reference/screens -type f -print0 | sort -z | xargs -0 sha256sum
) > "$run/runtime-files.sha256"
printf 'phase\texit\tstartUTC\tfinishUTC\n' > "$run/results.tsv"
failed=0
phase() {
 local label=$1
 local start exit_code
 shift
 start=$(date -u +%FT%TZ)
 printf 'START %s %s\n' "$label" "$start"
 if "$@" > "$run/logs/$label.log" 2>&1; then
  exit_code=0
 else
  exit_code=$?
  failed=1
 fi
 printf '%s\t%s\t%s\t%s\n' "$label" "$exit_code" "$start" "$(date -u +%FT%TZ)" >> "$run/results.tsv"
 printf 'EXIT %s %s\n' "$label" "$exit_code"
 tail -12 "$run/logs/$label.log"
 return "$exit_code"
}
if phase build node "$checkout/scripts/build-product-site.mjs" --output "$site"; then
 phase registered python3 "$base/capture.py" "$checkout" "$site" "$run/registered" --commit "$commit" --tree "$tree" --phase registered || :
 phase owner python3 "$base/capture-owner.py" "$checkout" "$site" "$run/owner" --commit "$commit" --tree "$tree" || :
 phase sound python3 "$base/capture.py" "$checkout" "$site" "$run/sound" --commit "$commit" --tree "$tree" --phase sound || :
 phase behavior python3 "$base/capture.py" "$checkout" "$site" "$run/behavior" --commit "$commit" --tree "$tree" --phase behavior || :
fi
{
 git -C "$checkout" rev-parse HEAD HEAD^{tree}
 git -C "$checkout" status --porcelain --untracked-files=no
} > "$run/source-after.txt"
test "$(git -C "$checkout" rev-parse HEAD)" = "$commit"
test "$(git -C "$checkout" rev-parse HEAD^{tree})" = "$tree"
test -z "$(git -C "$checkout" status --porcelain --untracked-files=no)"
printf '%s\n' "$failed" > "$run/aggregate.exit"
exit "$failed"
