#!/usr/bin/env bash
# DnBOX Local gate (nightly repo: website + Remote). One command:  scripts/dnbox-gate.sh [<lane>]
# Last line "DNBOX-GATE RESULT PASS|FAIL|VOID sha=<40>"; exit 0/1/2. NOT_RUN counts as FAIL.
# Browser tests use Playwright's bundled Chromium with its normal sandbox and a profile dir inside the workspace.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
LANE="${1:-unknown}"; SHA=$(git rev-parse HEAD); BASE=origin/integration/dnbox-consolidated
TS=$(TZ=Asia/Vladivostok date +%Y%m%d-%H%M); OUT=build/dnbox-gate; mkdir -p "$OUT"
LOG="$OUT/${SHA:0:8}-$TS.log"; exec > >(tee "$LOG") 2>&1
# Temp files and browser profile go OUTSIDE the checkout (some tests require output outside the repo) but in a folder we own.
export TMPDIR="${HOME}/.cache/dnbox-gate/tmp"; mkdir -p "$TMPDIR"
# One browser for every test: Playwright's bundled Chromium unless CHROMIUM_EXECUTABLE is already set.
# (Tests hard-code /usr/bin/chromium, /usr/local/bin/google-chrome or a macOS Chrome path otherwise.)
if [ -z "${CHROMIUM_EXECUTABLE:-}" ]; then
  CHROMIUM_EXECUTABLE=$(python3 -c 'from playwright.sync_api import sync_playwright as s; p=s().start(); print(p.chromium.executable_path); p.stop()' 2>/dev/null); export CHROMIUM_EXECUTABLE; fi
echo "browser: ${CHROMIUM_EXECUTABLE:-none}"
fail=0; void=0
step() { local n=$1; shift; echo "== $n"; if "$@"; then echo "[PASS] $n"; else rc=$?; [ $rc = 2 ] && { echo "[VOID] $n"; void=1; } || { echo "[FAIL] $n"; fail=1; }; fi; }
echo "DNBOX-GATE repo=nightly lane=$LANE sha=$SHA started=$TS (UTC+10)"
clean()   { git diff --quiet && git diff --cached --quiet; }
setup()   { command -v node >/dev/null && command -v python3 >/dev/null || return 2; if [ -f package-lock.json ]; then npm ci --no-audit --no-fund >/dev/null || return 2; fi
            python3 -c 'import playwright' 2>/dev/null || { echo "pip install playwright && python3 -m playwright install chromium"; return 2; }; }
no_loss() { if [ -n "${DNBOX_BASE_SHA:-}" ]; then
                 [[ "$DNBOX_BASE_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "invalid connector base SHA"; return 1; }
                 [ "$(git cat-file -t "$DNBOX_BASE_SHA" 2>/dev/null)" = commit ] || { echo "connector base commit unavailable"; return 1; }
                 BASE=$DNBOX_BASE_SHA; echo "connector-pinned consolidated base=$BASE (caller must retain fresh remote receipt)"
               else git fetch -q origin integration/dnbox-consolidated || return 1; fi
            git merge-base --is-ancestor "$BASE" HEAD || { echo "merge $BASE in (no rebase)"; return 1; }
            local miss=0; while read -r f; do [ -z "$f" ] && continue; grep -qF -- "$f" "docs/lanes/$LANE.md" 2>/dev/null || { echo "deleted without reason: $f"; miss=1; }; done <<< "$(git diff --name-only --diff-filter=D "$BASE" HEAD)"; return $miss; }
limits()  { local bad=0
            git diff --name-only "$BASE" HEAD | grep -E '^\.github/workflows/' && bad=1
            git grep -lIE '(ghp_|gho_|github_pat_)[A-Za-z0-9_]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}' -- . && bad=1
            git ls-files | grep -iE '\.ipa$|\.fwsc$|ctl\.img$' && bad=1
            [ "$LANE" != remote ] || grep -rqi 'funkybeats' LICENSES web 2>/dev/null || { echo "FunkyBeats MIT notice missing"; bad=1; }
            return $bad; }
build()   { npm run build; }
unit()    { npm test; }
browser() { npm run test:browser && python3 tests/visual/fixtures/web-structural/browser_fixtures.py; }
step clean-tree clean; step setup setup; step no-loss no_loss; step limits limits
browser_safe=1
browser_policy() { python3 tests/normal-sandbox-regression.py || { browser_safe=0; return 1; }; }
step browser-sandbox-policy browser_policy
if [ $void = 0 ]; then step build build; if [ $browser_safe = 1 ]; then step unit-tests unit; step browser-tests browser; else echo "[FAIL] unit/browser-tests NOT_RUN: browser policy unsafe or unavailable"; fail=1; fi; fi
R=PASS; [ $fail = 1 ] && R=FAIL; [ $void = 1 ] && R=VOID
echo "DNBOX-GATE RESULT $R sha=$SHA lane=$LANE log=$LOG"; [ $R = PASS ] && exit 0; [ $R = VOID ] && exit 2; exit 1
