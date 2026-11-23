# Emulator LCD reference frames · firmware 8f97fe7d

The eleven PNGs come from the C host in firmware `8f97fe7d2bbf4f878cd0061c657c13c6f4322ea6`
(DnBOX `integration/dnbox-consolidated`, 2026-11-23), replaying the unchanged
[`capture.scenario`](../emulator-lcd-06bd40/capture.scenario). They are native
captures, independent of the browser WASM they check.

```sh
set -eu
test "$(git -C "$FIRMWARE" rev-parse HEAD)" = 8f97fe7d2bbf4f878cd0061c657c13c6f4322ea6
(cd "$FIRMWARE" && python3 tools/check_original_inputs.py --scope active && sh host/build_host.sh)
frames=$(mktemp -d)
X0X_HOST_LOAD=0 "$FIRMWARE/build/host/x0x_host" \
    "$WEB/tests/fixtures/emulator-lcd-06bd40/capture.scenario" "$frames"
```

Against the previous `61827a71` frames, boot, kick-808, mix, mix-level and
seq-808 are unchanged; fx, save, home, kick-909, global and midi-clock differ
(124 to 17,510 pixels). `frames.json` pins the RGB565 hash of each frame and the
runtime built by `scripts/firmware-emulator/build.sh` at the same firmware.

The runtime pin moved to kernel tree `8f03c63d` (Remote MIDI/SysEx hooks, wasm `17f7c116…`). The firmware and these
native frames are unchanged; the browser test checks the new WASM still draws them.
