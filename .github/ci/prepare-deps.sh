#!/bin/bash
# Install Python deps and Playwright Chromium for the nightly Local gate.
set -u
ok() { echo "prepare-deps: $*"; }
need() { echo "needs $*" >&2; }

python3 -m pip install --upgrade pip
if python3 -m pip install numpy pillow playwright; then
  if python3 -m playwright install --with-deps chromium; then
    ok "numpy, Pillow, Playwright Chromium installed"
  else
    need "Playwright Chromium (playwright install --with-deps chromium failed)"
    exit 1
  fi
else
  need "Python packages numpy/pillow/playwright (pip install failed)"
  exit 1
fi
CHROMIUM=$(python3 -c 'from playwright.sync_api import sync_playwright as s; p=s().start(); print(p.chromium.executable_path); p.stop()' 2>/dev/null || true)
if [ -z "${CHROMIUM:-}" ]; then
  need "Playwright Chromium executable (python could not resolve it)"
  exit 1
fi
if [ -n "${GITHUB_ENV:-}" ]; then
  echo "CHROMIUM_EXECUTABLE=$CHROMIUM" >> "$GITHUB_ENV"
fi
export CHROMIUM_EXECUTABLE="$CHROMIUM"
ok "CHROMIUM_EXECUTABLE=$CHROMIUM"
# package-lock.json is optional; the gate runs npm ci only when it exists.
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
  ok "npm ci completed"
else
  ok "no package-lock.json; skipping npm ci (package.json has no npm dependencies)"
fi
exit 0
