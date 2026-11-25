#!/bin/bash
set -euo pipefail
d=$(cd "$(dirname "$0")" && pwd)
out=$(realpath "$1"); app=$(realpath "$2"); board="$3"
he=$(realpath "$FM1_EMU")
: "${DNR3_WEB:?point to the patched dnr3.mjs}"
export DNR3_WEB
run() {
 local name="$1" ms="$2" req="$3"
 mkdir -p "$out/$name/work"
 (cd "$out/$name";test ! -f disposable.bin
  FM1_STRICT="" FM1_USB_TRACE=1 FM1_USB_SEND="$req" "$he" --fwsc "$app" --mhz 360 --usb --shot "$ms" --flash "$PWD/disposable.bin" >run.log 2>&1)
}
run open 1670 "$(node "$d/typed-usb.mjs" open)"
run adopt 2620 "$(node "$d/typed-usb.mjs" adopt "$out/open/run.log")"
run edit 3000 "$(node "$d/typed-usb.mjs" edit "$out/open/run.log" "$out/adopt/run.log")"
node "$d/typed-usb.mjs" receipt "$out/edit/run.log" "$board"
