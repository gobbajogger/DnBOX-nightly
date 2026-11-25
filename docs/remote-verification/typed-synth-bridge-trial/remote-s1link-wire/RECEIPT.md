# Synth One single LINK via typed Remote
This source-only trial starts with the narrow DNR3 + Synth One LINK path
documented in firmware commit bbd512d6 and Nightly typed bridge source.
It exposes the existing local LINK through the queued, revision-checked
Synth One patch receiver. The reserved panel identity 255 (kind 113,
coordinate 127) is not a factory parameter. Only 0 and 1 are legal. It
does not alter the two sets of four envelope values or link direction.
No new stored state. This is one addition, not full editor parity.

Actual compiled firmware host + exact JS trial wire scan covered all 256
addresses. Bass A selected Synth One: 13 original patch IDs and LINK.
LINK 0→1→0 with actual readback, rejected 2, and repeat/same-preset
reload guards remained good. Existing SuperJ6 cutoff still tested.
Independent web grouping layer on the same real C host also toggled and
restored LINK via the app adapter, one SET/action, no change to the 13
original IDs; its larger catalog does not create unavailable controls.

Stock flags with opt-in Synth One patch + typed Remote, no full native
SuperJ6 provider: actual Elite/Pro PI32v2 APP headroom 3,316 / 3,324 B,
pool margin 512 B each, ordinary build guards on. Confirmed via real
native emulator USB with a held note, guard OPEN + select actual bank 2,
DESCRIBE LINK, read 0, PARAM_SET 1 returned QUEUED, fresh read returned 1.
ELITE board 1, PRO board 2. Zero skipped cycles and zero late/XRUN in
the narrow played-note stream; 10,918 / 10,895 us, not the 10,809 us
heavy-gate pass. No files published to production, no device used.

Reproduce host with the typed bridge dual-cable source; apply
native-link.patch to the donor, wire-link-test.patch to its wire.mjs,
and run its host build and node wire.mjs --dual. Native rerun needs the
authorized local toolchain, SDK, Chicago reference tables already used
by the lane, and modern harness fm1-live-ba83317a. Point DNR3_WEB to the
exact #206 protocol module and FM1_EMU to that harness; invoke
replay-link.sh with a fresh output directory, matching .fwsc and the
physical board ID number above. No binaries, audio, or private assets
are in this receipt.
