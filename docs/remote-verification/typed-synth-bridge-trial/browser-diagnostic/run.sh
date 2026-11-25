#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p tmp/{home,run,data,config,cache}
chmod 700 tmp/run
node fixture.mjs >fixture.log 2>&1 & a=$!
if [[ -n "${CHROMIUM_BIN:-}" ]]; then
  "$CHROMIUM_BIN" --headless --disable-gpu --no-first-run --no-default-browser-check --remote-debugging-address=127.0.0.1 --remote-debugging-port=9223 --user-data-dir="$PWD/tmp/modern" about:blank >chromium.log 2>&1 & b=$!
else
  env XDG_DATA_HOME="$PWD/tmp/data" XDG_CONFIG_HOME="$PWD/tmp/config" XDG_CACHE_HOME="$PWD/tmp/cache" XDG_RUNTIME_DIR="$PWD/tmp/run" QT_QPA_PLATFORM=offscreen QT_QPA_PLATFORM_PLUGIN_PATH=/usr/lib/x86_64-linux-gnu/qt5/plugins/platforms QTWEBENGINE_REMOTE_DEBUGGING=9223 QTWEBENGINE_CHROMIUM_FLAGS='--no-sandbox --disable-gpu --disable-dev-shm-usage --disable-gpu-compositing "--js-flags=--harmony-top-level-await"' /opt/slicer/5.12.4/Slicer --no-splash --no-main-window --disable-cli-modules --python-script "$PWD/qt-launch.py" >qt.log 2>&1 & b=$!
fi
trap 'kill "$a" "$b" 2>/dev/null || :' EXIT
for x in {1..100}; do curl -sf http://127.0.0.1:9223/json/list | grep -q about:blank && break; sleep .2; done
curl -v -sS http://127.0.0.1:9224/remote/index.html -o tmp/http.html; wc -c tmp/http.html
timeout 85 node dom.mjs
