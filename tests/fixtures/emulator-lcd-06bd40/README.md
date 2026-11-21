# Emulator LCD reference frames

The eleven PNGs come from the C host in firmware `06bd40c57cefcdf6c751b318b1cbaea0914fa8bb`. From a clean boot the fixture captures the stopped 909 sequencer, FX, the SAVED message and HOME. It then opens MIX, turns K1 to move the selected 909 part from −5 to −4.8 dB, opens the 909 and 808 kick pages, enters the 808 sequencer and navigates from GLOBAL to MIDI + CLOCK. Each reference is the complete 240×240 framebuffer from the native host’s `shot` command, compressed losslessly.

To reproduce the references, set `FIRMWARE` to a checkout of that firmware commit with the original synth inputs, and `WEB` to the nightly checkout. The native host verifies the ten active input hashes against manifest SHA-256 `9c7ac9b0a71e775fb7009e2d4035fce827b2c56c4e8e692a7a8910c9c6c881bc`.

```sh
set -eu
test "$(git -C "$FIRMWARE" rev-parse HEAD)" = 06bd40c57cefcdf6c751b318b1cbaea0914fa8bb
(cd "$FIRMWARE" && python3 tools/check_original_inputs.py --scope active && sh host/build_host.sh)
frames=$(mktemp -d)
X0X_HOST_LOAD=0 "$FIRMWARE/build/host/x0x_host" \
    "$WEB/tests/fixtures/emulator-lcd-06bd40/capture.scenario" "$frames"
```

Run `python3 tests/emulator-lcd-browser.py` from the nightly checkout with `DNBOX_EMULATOR_RUNTIME` pointing to the qualified ten-file kernel artifact. It builds the product, starts the real audio session and reads the mounted HTML canvas after each panel state. The test checks kernel and firmware identities, dimensions, opacity, representable channel levels and every panel pixel. The fixture hashes in `frames.json` use big-endian RGB565 words in row-major order.

The native PNG expands RGB565 channels to eight bits by integer division. The HTML canvas rounds the same fractions. Across the original four reference pairs, the PNG and canvas RGB888 values differed at 38,383, 42,756, 42,639 and 37,888 positions respectively, by at most one channel level. Mapping each exact set of representable channel levels back to RGB565 gave zero differences at all 230,400 positions. Sending LFO in place of FX made the comparison fail at 23,521 of 57,600 positions on the second frame.

Changing the MIX turn in `capture.scenario` from `spin K1 1` to `spin K1 -1` changes 168 of the 57,600 pixels in `mix-level.png`. For the seven additional states the comparison waits 1,700 simulated milliseconds, past the firmware’s 1,300 ms status banner.

For a cross-revision control, the same scenario was also replayed on the C host from [FWUI PR #975 at `4c05722d`](https://github.com/gobbajogger/DnBOX/commit/4c05722d5144b652acddf587ea41050fcbbacd2b), with the verified original synth inputs and `X0X_HOST_LOAD=0`. Only the stopped 808 kick page matched at all 57,600 pixels. The whole-frame differences against `06bd40` were 7,142 at boot, 1,791 on FX and SAVE, 252 on HOME, 1,015 on each MIX frame, 1,566 on the 909 kick page, 7,142 on the 808 sequencer, 2,877 on GLOBAL and 3,033 on MIDI + CLOCK.

This fixture covers the emulator LCD. Independent Remote HTML/CSS layouts and the complete FWUI screen inventory require their own state-matched references.
