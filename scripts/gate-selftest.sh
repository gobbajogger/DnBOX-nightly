#!/usr/bin/env bash
# Proves the fail-closed parser in scripts/gate.sh (bug c):
# PASS is printed only when every required inner step ran and reported success.
# RC=0 without an inner RESULT, or a PASS line with a missing required step,
# must be INCOMPLETE, not PASS.
set -euo pipefail
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
exec "$ROOT/scripts/gate.sh" --self-test
