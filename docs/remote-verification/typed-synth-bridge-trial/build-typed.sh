#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
export X0X_S1C=1 X0X_SUPERJ6_FACTORY=1 X0X_SYNTHONE_PATCH=1
. tests/host/original_build.sh
cc -pipe -O1 -std=gnu99 -w -DX0X_HOST -DBOARD_SMK37=1 -Ifirmware/src -Ifirmware/src/dsp -Ibuild/gen $ORIGINAL_FLAGS -DX0X_SYNTHONE_PATCH=1 -DX0X_S1C=1 -DX0X_SUPERJ6_BUILTIN_INIT=1 -DX0X_REMOTE_TYPED_SYNTH=1 tests/host/dual-cable.c $ORIGINAL_SOURCES -lm -o ./dual-cable
