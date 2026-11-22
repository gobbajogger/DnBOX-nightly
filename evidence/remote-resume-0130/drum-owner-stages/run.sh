#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-only
set -eu
fw_source=${1:?usage: run.sh path-to-clean-f178-source}
oracle_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
[ "$(git -C "$fw_source" rev-parse HEAD)" = f1786ebec2616477163b62b029c7e77405a9c3de ]
git -C "$fw_source" diff --exit-code HEAD -- firmware/src/dsp/drum808.c firmware/src/dsp/drum808.h firmware/src/dsp/x0x_param.c firmware/src/dsp/x0x_param.h firmware/src/dsp/fastmath.h firmware/src/dsp/envelope_snapshot.h firmware/src/x0x_cold.h
cc -std=c99 -O2 -Wall -Wextra -Werror -ffp-contract=off -I "$fw_source/firmware/src/dsp" "$oracle_dir/oracle.c" "$fw_source/firmware/src/dsp/x0x_param.c" -lm -o "$oracle_dir/oracle"
"$oracle_dir/oracle" > "$oracle_dir/trace.json"
