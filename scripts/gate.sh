#!/usr/bin/env bash
# Single local gate entry for DnBOX.
# Wraps the existing repo gate script and prints one final line:
#   DNBOX-GATE: PASS <sha>
#   DNBOX-GATE: FAIL <sha> <failed checks>
#   DNBOX-GATE: INCOMPLETE <sha> <reason>
#
# Usage:
#   scripts/gate.sh [<lane>]
#   scripts/gate.sh [<lane>] --post
#   scripts/gate.sh [<lane>] --online
#   scripts/gate.sh --self-test
#
# Lane is sound, fwui, integ, remote, or web (default: integ).
#
# Offline is the default: the run uses only the local checkout and does
# not git fetch, clone or ls-remote. Network Git (and npm ci) run only
# when DNBOX_GATE_ONLINE=1 or --online is passed; a skipped network step
# prints SKIP clearly.
#
# --post: after the local run, post a GitHub commit status on this SHA
# with context `dnbox-gate`. The description is the DNBOX-GATE line.
# Merges into integration/dnbox-consolidated require this status to be
# success (see CONTRIBUTING.md). GitHub Actions are not used.
#
# The result is fail-closed. PASS is printed only if every required inner
# step ran and reported success. Otherwise the line is FAIL or INCOMPLETE.
#
# Environment (see the box handoff box-env.sh when running on the Orchestrator box):
#   JIELI_TOOLCHAIN, AC79_SDK, CHROMIUM_EXECUTABLE, TMPDIR, DNBOX_GATE_ONLINE
set -u

FW_REQUIRED="clean-tree setup no-loss limits host-tests build-elite-pro flashmap budget ui-defects drone"
NT_REQUIRED="clean-tree setup no-loss limits build unit-tests browser-tests"
SKIPPABLE="fetch-base"

usage() {
  echo "Usage: scripts/gate.sh [<lane>] [--post] [--online]" >&2
  echo "       scripts/gate.sh --self-test" >&2
  echo "Lane: sound, fwui, integ, remote, or web (default: integ)." >&2
  echo "Offline is the default (no git fetch/clone/ls-remote)." >&2
  echo "--online: allow network Git and npm ci (sets DNBOX_GATE_ONLINE=1)." >&2
  echo "--post: upload a dnbox-gate commit status for this SHA via gh api." >&2
  echo "--self-test: prove the fail-closed parser; does not run the product gate." >&2
}

# decide_from_log FILE RC SHA
# Sets LINE, GATE_STATE (success|failure|error), GATE_RC (0|1|3).
# PASS only when RC=0, the inner result is PASS, and every required step
# has a [PASS] line. SKIP is accepted only for skippable network steps.
decide_from_log() {
  local src=$1 rc=$2 sha=$3
  local result="" fail_names="" void_names="" skip_names=""
  local started="" seen_pass="" seen_fail="" seen_void="" seen_skip=""
  local repo="" line checks reason req missing started_unfinished

  if [ -n "$src" ] && [ -f "$src" ]; then
    result=$(sed -n 's/^DNBOX-GATE RESULT \([A-Z]*\).*/\1/p' "$src" | tail -1)
    repo=$(sed -n 's/^DNBOX-GATE repo=\([^ ]*\).*/\1/p' "$src" | tail -1)
    fail_names=$(sed -n 's/^\[FAIL\] //p' "$src" | tr '\n' ' ')
    void_names=$(sed -n 's/^\[VOID\] //p' "$src" | tr '\n' ' ')
    skip_names=$(sed -n 's/^\[SKIP\] //p' "$src" | tr '\n' ' ')
    started=$(sed -n 's/^== //p' "$src" | tr '\n' ' ')
    seen_pass=$(sed -n 's/^\[PASS\] //p' "$src" | tr '\n' ' ')
    seen_fail=$fail_names
    seen_void=$void_names
    seen_skip=$skip_names
  fi

  has_word() {
    local needle=$1 hay=$2 w
    for w in $hay; do
      [ "$w" = "$needle" ] && return 0
    done
    return 1
  }

  comma() {
    echo "$1" | awk '{$1=$1}1' | tr ' ' ',' | sed 's/,$//'
  }

  if [ -z "$repo" ]; then
    if has_word "build-elite-pro" "$started$seen_pass"; then
      repo=firmware
    elif has_word "unit-tests" "$started$seen_pass" || has_word "browser-tests" "$started$seen_pass"; then
      repo=nightly
    fi
  fi

  local required=""
  case "$repo" in
    firmware) required=$FW_REQUIRED ;;
    nightly) required=$NT_REQUIRED ;;
    *) required="" ;;
  esac

  missing=""
  if [ -n "$required" ]; then
    local s
    for s in $required; do
      if has_word "$s" "$seen_pass"; then
        continue
      fi
      if has_word "$s" "$SKIPPABLE" && has_word "$s" "$seen_skip"; then
        continue
      fi
      missing="$missing $s"
    done
    missing=${missing# }
  fi

  started_unfinished=""
  local s
  for s in $started; do
    if has_word "$s" "$seen_pass" || has_word "$s" "$seen_fail" || has_word "$s" "$seen_void" || has_word "$s" "$seen_skip"; then
      continue
    fi
    started_unfinished="$started_unfinished $s"
  done
  started_unfinished=${started_unfinished# }

  # Evidence of failure always wins.
  if [ "$result" = "FAIL" ] || [ -n "$fail_names" ]; then
    checks=$(comma "$fail_names")
    if [ -n "$void_names" ]; then
      if [ -n "$checks" ]; then
        checks="${checks},void:$(comma "$void_names")"
      else
        checks="void:$(comma "$void_names")"
      fi
    fi
    if [ -z "$checks" ]; then
      checks="exit-${rc}"
    fi
    LINE="DNBOX-GATE: FAIL ${sha} ${checks}"
    GATE_STATE=failure
    GATE_RC=1
    return 0
  fi

  if [ "$result" = "VOID" ] || [ -n "$void_names" ]; then
    checks="void:$(comma "$void_names")"
    [ -n "$void_names" ] || checks="void"
    LINE="DNBOX-GATE: FAIL ${sha} ${checks}"
    GATE_STATE=failure
    GATE_RC=1
    return 0
  fi

  if [ "$result" = "PASS" ] && [ "$rc" -eq 0 ] && [ -z "$missing" ] && [ -z "$started_unfinished" ] && [ -n "$required" ]; then
    LINE="DNBOX-GATE: PASS ${sha}"
    GATE_STATE=success
    GATE_RC=0
    return 0
  fi

  # Anything else is incomplete — including RC=0 with no inner RESULT,
  # which the previous parser treated as PASS.
  reason=""
  if [ -z "$src" ] || [ ! -f "$src" ]; then
    reason="missing-log"
  elif [ -z "$result" ]; then
    reason="missing-inner-result"
  elif [ "$result" != "PASS" ]; then
    reason="inner-result-${result}"
  elif [ "$rc" -ne 0 ]; then
    reason="exit-${rc}-with-pass-line"
  elif [ -z "$required" ]; then
    reason="unknown-required-steps"
  elif [ -n "$missing" ]; then
    reason="missing-steps:$(comma "$missing")"
  elif [ -n "$started_unfinished" ]; then
    reason="unfinished-steps:$(comma "$started_unfinished")"
  else
    reason="incomplete"
  fi
  LINE="DNBOX-GATE: INCOMPLETE ${sha} ${reason}"
  GATE_STATE=error
  GATE_RC=3
  return 0
}

run_self_test() {
  local tmp fail=0
  tmp=$(mktemp -d)
  trap 'rm -rf "$tmp"' RETURN

  write_fw_pass() {
    local dest=$1 missing=${2:-}
    cat > "$dest" <<'LOG'
DNBOX-GATE repo=firmware lane=integ sha=0123456789abcdef0123456789abcdef01234567 started=20261117-1200 (UTC+10)
== fetch-base
[SKIP] fetch-base
== clean-tree
[PASS] clean-tree
== setup
[PASS] setup
== no-loss
[PASS] no-loss
== limits
[PASS] limits
== host-tests
[PASS] host-tests
== build-elite-pro
[PASS] build-elite-pro
== flashmap
[PASS] flashmap
== budget
[PASS] budget
== ui-defects
[PASS] ui-defects
== drone
[PASS] drone
DNBOX-GATE RESULT PASS sha=0123456789abcdef0123456789abcdef01234567 lane=integ log=build/dnbox-gate/01234567-test.log
LOG
    if [ -n "$missing" ]; then
      # Drop one required step's PASS (and its == header) to simulate a skipped product check.
      local tmpf
      tmpf=$(mktemp)
      awk -v drop="$missing" '
        $0 == "== " drop {skip=1; next}
        $0 == "[PASS] " drop {skip=0; next}
        {print}
      ' "$dest" > "$tmpf"
      mv "$tmpf" "$dest"
    fi
  }

  expect() {
    local name=$1 file=$2 rc=$3 want=$4
    LINE=""; GATE_STATE=""; GATE_RC=""
    decide_from_log "$file" "$rc" "0123456789abcdef0123456789abcdef01234567"
    case "$LINE" in
      $want*) ;;
      *)
        echo "SELFTEST FAIL $name" >&2
        echo "  wanted: $want..." >&2
        echo "  got:    $LINE" >&2
        fail=1
        return
        ;;
    esac
    echo "SELFTEST PASS $name"
  }

  # (c1) The old bug: RC=0 and no inner RESULT must not be PASS.
  : > "$tmp/empty.log"
  expect empty-log-not-pass "$tmp/empty.log" 0 "DNBOX-GATE: INCOMPLETE"

  printf '== clean-tree\n[PASS] clean-tree\n' > "$tmp/no-result.log"
  expect rc0-missing-result-not-pass "$tmp/no-result.log" 0 "DNBOX-GATE: INCOMPLETE"

  # (c2) RESULT PASS but a required product step never ran.
  write_fw_pass "$tmp/missing-budget.log" budget
  # The RESULT line is still PASS (lying inner). Wrapper must not trust it.
  expect missing-required-step "$tmp/missing-budget.log" 0 "DNBOX-GATE: INCOMPLETE"

  # (c3) Honest full PASS, with fetch-base skipped (offline default).
  write_fw_pass "$tmp/full-pass.log"
  expect full-pass "$tmp/full-pass.log" 0 "DNBOX-GATE: PASS"

  # (c4) Inner FAIL is FAIL, not PASS or INCOMPLETE.
  write_fw_pass "$tmp/fail.log"
  printf '%s\n' "== budget" "[FAIL] budget" "DNBOX-GATE RESULT FAIL sha=0123456789abcdef0123456789abcdef01234567 lane=integ log=x" >> "$tmp/fail.log"
  # The file now has both a PASS result line and a later FAIL — use a clean fail fixture.
  cat > "$tmp/fail.log" <<'LOG'
DNBOX-GATE repo=firmware lane=integ sha=0123456789abcdef0123456789abcdef01234567 started=20261117-1200 (UTC+10)
== clean-tree
[PASS] clean-tree
== setup
[PASS] setup
== no-loss
[PASS] no-loss
== limits
[PASS] limits
== host-tests
[PASS] host-tests
== build-elite-pro
[PASS] build-elite-pro
== flashmap
[PASS] flashmap
== budget
[FAIL] budget
== ui-defects
[PASS] ui-defects
== drone
[PASS] drone
DNBOX-GATE RESULT FAIL sha=0123456789abcdef0123456789abcdef01234567 lane=integ log=x
LOG
  expect inner-fail "$tmp/fail.log" 1 "DNBOX-GATE: FAIL"

  # (c5) A step started and never finished is INCOMPLETE even if RESULT is PASS.
  write_fw_pass "$tmp/unfinished.log"
  printf '%s\n' "== budget" "DNBOX-GATE RESULT PASS sha=0123456789abcdef0123456789abcdef01234567 lane=integ log=x" > "$tmp/unfinished-tail.log"
  cat "$tmp/full-pass.log" | sed '/^== budget$/d;/^\[PASS\] budget$/d;/^DNBOX-GATE RESULT/d' > "$tmp/unfinished.log"
  printf '%s\n' "== budget" "DNBOX-GATE RESULT PASS sha=0123456789abcdef0123456789abcdef01234567 lane=integ log=x" >> "$tmp/unfinished.log"
  expect unfinished-step "$tmp/unfinished.log" 0 "DNBOX-GATE: INCOMPLETE"

  # (c6) Nightly complete PASS.
  cat > "$tmp/nt-pass.log" <<'LOG'
DNBOX-GATE repo=nightly lane=web sha=0123456789abcdef0123456789abcdef01234567 started=20261117-1200 (UTC+10)
== fetch-base
[SKIP] fetch-base
== clean-tree
[PASS] clean-tree
== setup
[PASS] setup
== no-loss
[PASS] no-loss
== limits
[PASS] limits
== build
[PASS] build
== unit-tests
[PASS] unit-tests
== browser-tests
[PASS] browser-tests
DNBOX-GATE RESULT PASS sha=0123456789abcdef0123456789abcdef01234567 lane=web log=x
LOG
  expect nightly-pass "$tmp/nt-pass.log" 0 "DNBOX-GATE: PASS"

  if [ "$fail" -ne 0 ]; then
    echo "DNBOX-GATE SELFTEST: FAIL"
    return 1
  fi
  echo "DNBOX-GATE SELFTEST: PASS"
  return 0
}

POST=0
ONLINE=0
SELFTEST=0
PARSELOG=""
PARSE_RC=0
LANE="integ"

# Allow this file to be invoked from any cwd for --self-test.
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

for arg in "$@"; do
  case "$arg" in
    --post) POST=1 ;;
    --online) ONLINE=1 ;;
    --self-test) SELFTEST=1 ;;
    --parse-log)
      echo "scripts/gate.sh: --parse-log requires a path as a separate invocation flag --parse-log=<file>" >&2
      usage
      exit 2
      ;;
    --parse-log=*) PARSELOG=${arg#--parse-log=} ;;
    --exit-code=*) PARSE_RC=${arg#--exit-code=} ;;
    -h|--help) usage; exit 0 ;;
    sound|fwui|integ|remote|web) LANE="$arg" ;;
    *)
      echo "scripts/gate.sh: unknown argument: $arg" >&2
      usage
      exit 2
      ;;
  esac
done

if [ "$SELFTEST" -eq 1 ]; then
  run_self_test
  exit $?
fi

if [ -n "$PARSELOG" ]; then
  SHA="unknown"
  if [ -f "$PARSELOG" ]; then
    SHA=$(sed -n 's/.*sha=\([0-9a-f]\{40\}\).*/\1/p' "$PARSELOG" | tail -1)
    [ -n "$SHA" ] || SHA=unknown
  fi
  decide_from_log "$PARSELOG" "$PARSE_RC" "$SHA"
  echo "$LINE"
  exit "$GATE_RC"
fi

ROOT=$(git rev-parse --show-toplevel) || exit 2
cd "$ROOT" || exit 2
SHA=$(git rev-parse HEAD)

if [ "$ONLINE" -eq 1 ]; then
  export DNBOX_GATE_ONLINE=1
fi
# Offline is the default. Inner scripts honour DNBOX_GATE_ONLINE and
# skip network Git when it is unset or not 1.

if [ -x "$ROOT/tools/dnbox-gate.sh" ]; then
  INNER="$ROOT/tools/dnbox-gate.sh"
elif [ -x "$ROOT/scripts/dnbox-gate.sh" ]; then
  INNER="$ROOT/scripts/dnbox-gate.sh"
else
  echo "DNBOX-GATE: INCOMPLETE ${SHA} missing-inner-gate"
  exit 3
fi

CAP=""
CAP=$(mktemp)
trap 'rm -f "$CAP"' EXIT

set +e
"$INNER" "$LANE" | tee "$CAP"
RC=${PIPESTATUS[0]}
set -e

LOGF=""
if [ -d "$ROOT/build/dnbox-gate" ]; then
  LOGF=$(ls -1t "$ROOT/build/dnbox-gate/${SHA:0:8}-"*.log 2>/dev/null | head -1 || true)
fi
if [ -z "$LOGF" ] || [ ! -f "$LOGF" ]; then
  LOGF=$CAP
fi

decide_from_log "$LOGF" "$RC" "$SHA"
echo "$LINE"

post_status() {
  local state=$1 line=$2
  if ! command -v gh >/dev/null 2>&1; then
    echo "scripts/gate.sh --post: gh is not installed" >&2
    return 2
  fi
  local repo
  repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null) || repo=""
  if [ -z "$repo" ]; then
    echo "scripts/gate.sh --post: could not resolve GitHub repo from this checkout" >&2
    return 2
  fi
  local desc="$line"
  if [ "${#desc}" -gt 140 ]; then
    desc="${desc:0:137}..."
  fi
  gh api --method POST "repos/${repo}/statuses/${SHA}" \
    -f state="$state" \
    -f context="dnbox-gate" \
    -f description="$desc" \
    -f target_url="https://github.com/${repo}/commit/${SHA}" \
    --jq '"posted dnbox-gate " + .state + " on " + .sha' || {
      echo "scripts/gate.sh --post: failed to post dnbox-gate status for ${SHA}" >&2
      return 2
    }
}

if [ "$POST" -eq 1 ]; then
  if post_status "$GATE_STATE" "$LINE"; then
    :
  else
    POST_RC=$?
    if [ "$GATE_RC" -ne 0 ]; then
      exit "$GATE_RC"
    fi
    exit "$POST_RC"
  fi
fi

exit "$GATE_RC"
