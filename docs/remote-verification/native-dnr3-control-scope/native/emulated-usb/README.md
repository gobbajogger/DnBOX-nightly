# Linked Elite/Pro native USB smoke (strict emulation)

Both isolated adf3eee DNR3 packages were executed by the existing
fm1-live-ba83317a harness (SHA256 fdd1504d8801a69a95c24226357f4b202bbaa345565c80a1bbf861f69a287017),
FM1_STRICT=1 with emulated USB. The exact #206 JS DNR3 codec builds the
requests and decodes actual USB responses. Both compiled images answered
HELLO, OPEN and WATCH, accepted BPM 104.5, then independently reported it
in STATE. A real USB note got the expected voice 36 / velocity 107. USB
Start/Stop drove positions 0–4 and the stopped all-127 sentinel. Both
produced non-zero audio (end-window peak 7651 in this particular pattern).

Reproduce with DNR3_WEB set to the exact #206 dnr3.mjs path, an absolute
path to the verified harness and the two fresh packages from the prior
native recipe. In a new writable directory for each run, create work/
and pass a NEW disposable file to --flash, never a physical device or
existing user's dump.

1. Open calibration: set FM1_USB_SEND to the output of node frames.mjs
   open. Run the harness --fwsc PACKAGE --mhz 360 --usb --shot 1670
   --flash NEW_DISPOSABLE, with FM1_STRICT=1 FM1_USB_TRACE=1. Capture log.
2. Fresh identical boot: set FM1_USB_SEND to the output of node frames.mjs
   commands CALIBRATION_LOG. It uses the observed lease epoch from the
   first run. Run with the same arguments but --shot 3450 and a new
   directory and new disposable flash. Capture log.
3. Run node frames.mjs receipt RUN_LOG BOARD_ID, with 1 for Elite or 2
   for Pro. It asserts the tempo readback, pad, playhead and stop results.

Package digests (diagnostic, not shipped):
Elite a902786a18aeaff79bcc4299ee880ac7100c47bff9a9fd23c8b9f5f440ff62c9
Pro   6670f9337b31278c1eac56b994cd4de667312dcd4621e71eb15695c48f02843b

This does not qualify browser DOM/permissions, physical USB, the full
set of typed synth controls, or the release dropout gate. No physical
flash was written. Captures, packages and disposable images are not in git.
