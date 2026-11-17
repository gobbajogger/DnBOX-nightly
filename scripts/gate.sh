#!/usr/bin/env bash
# Single local gate entry for DnBOX.
# Wraps the existing repo gate script and prints one final line:
#   DNBOX-GATE: PASS <sha>
#   DNBOX-GATE: FAIL <sha> <failed checks>
#
# Usage: scripts/gate.sh [<lane>]
# Lane is sound, fwui, integ, remote, or web (default: integ).
#
# Environment (see the box handoff box-env.sh when running on the Orchestrator box):
#   JIELI_TOOLCHAIN, AC79_SDK, CHROMIUM_EXECUTABLE, TMPDIR
set -u
ROOT=$(git rev-parse --show-toplevel) || exit 2
cd "$ROOT" || exit 2
LANE="${1:-integ}"
SHA=$(git rev-parse HEAD)

if [ -x "$ROOT/tools/dnbox-gate.sh" ]; then
  INNER="$ROOT/tools/dnbox-gate.sh"
elif [ -x "$ROOT/scripts/dnbox-gate.sh" ]; then
  INNER="$ROOT/scripts/dnbox-gate.sh"
else
  echo "DNBOX-GATE: FAIL ${SHA} missing-inner-gate"
  exit 1
fi

set +e
"$INNER" "$LANE"
RC=$?
set -e

LOGF=""
if [ -d "$ROOT/build/dnbox-gate" ]; then
  LOGF=$(ls -1t "$ROOT/build/dnbox-gate/${SHA:0:8}-"*.log 2>/dev/null | head -1 || true)
fi

parse() {
  local src=$1
  [ -n "$src" ] && [ -f "$src" ] || return 1
  FAIL_NAMES=$(sed -n 's/^\[FAIL\] //p' "$src" | tr '\n' ',' | sed 's/,$//')
  VOID_NAMES=$(sed -n 's/^\[VOID\] //p' "$src" | tr '\n' ',' | sed 's/,$//')
  RESULT=$(sed -n 's/^DNBOX-GATE RESULT \([A-Z]*\).*/\1/p' "$src" | tail -1)
  return 0
}

FAIL_NAMES=""; VOID_NAMES=""; RESULT=""
if ! parse "$LOGF"; then
  # Inner may have printed only to stdout if logging failed.
  RESULT=""
fi

if [ "$RC" -eq 0 ] && { [ -z "$RESULT" ] || [ "$RESULT" = "PASS" ]; }; then
  echo "DNBOX-GATE: PASS ${SHA}"
  exit 0
fi

checks="${FAIL_NAMES}"
if [ -n "$VOID_NAMES" ]; then
  if [ -n "$checks" ]; then
    checks="${checks},void:${VOID_NAMES}"
  else
    checks="void:${VOID_NAMES}"
  fi
fi
if [ -z "$checks" ]; then
  if [ "$RESULT" = "VOID" ]; then
    checks="void"
  else
    checks="exit-${RC}"
  fi
fi
echo "DNBOX-GATE: FAIL ${SHA} ${checks}"
exit 1
