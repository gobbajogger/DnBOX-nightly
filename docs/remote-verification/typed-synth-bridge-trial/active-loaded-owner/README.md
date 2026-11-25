# 100 µs headroom: real selected-owner heavy diagnostic

New performance ceiling: 10,809 µs (100 µs below 10,909), zero dropouts
on both boards and active synth/arp established. Aim comfortably below,
not tuned to test jitter. This is not a final gate pass.

The cumulative short-note-all-wins.patch applies to the unoptimized
historical DNR3 engine files (if earlier fold/sparser patches were
applied, rebuild from the original engine files before applying it).
It includes bit-exact 16-word wrapping, fixed-point smoother, center
autopan and stable crush-clock paths. The guarded Remote plus these
changes links at 4,376/4,388 B XIP free (Elite/Pro) and retains 512 B
pool margin. The longer played-note cutoff smoke verifies active note,
queued edit and applied readback. Worst 10,919/10,890 µs, no late/xruns.
The SuperJ6-facing cutoff also worked on the legacy-provider native smoke;
this does not qualify the actual full compact SuperJ6 build.

Earlier loaded runs silently switched part A to Miami and were discarded as
Synth One evidence. A source-only disposable fixture now boots part A
as compact Synth One with arp on, range two, and Chicago remains on B.
The original 922 hardware/MIDI input events are unchanged; five extra
read-only USB observations confirmed bank 2, settled, with readable
Synth One cutoff throughout the loaded run. Final saved-state diagnostics
confirmed two-octave arp enabled. Both used strict native emulation and
the original fixture SHA256
d08718b1521119b252b5cca0c5e1db6981ea25a5a0b31b6ead60dceccb3f6271.

| Model | Worst half | Raw late / XRUN |
|---|---:|---:|
| Elite | 14,817 µs | 15 / 15 |
| Pro | 14,817 µs | 16 / 16 |

The loaded path needs roughly 4 ms more savings, not a micro-adjustment
to the short smoke. Nothing installed, physically flashed, or published.

For the loaded test only apply load-fixture-only.patch to the guarded donor;
use the same typed build flags and authorized Chicago tables. Set DNR3_WEB,
use node owner-scan.mjs commands for FM1_USB_SEND, and FM1_BENCH_KEYS=@heavy.keys.
Use the pinned harness in strict --usb --shot 8000 with new disposable
flash, FM1_USB_TRACE=1, FM1_DNBOX_PCM and FM1_DUMPRAM. Parse with
owner-scan.mjs receipt LOG, read-telemetry.py ELF OUT_DIR, and
owner-arp-read.py ELF RAM_PATH. Do not put generated audio or firmware in git.
