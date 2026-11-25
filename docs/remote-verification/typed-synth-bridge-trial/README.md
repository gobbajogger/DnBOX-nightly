# Typed synth Remote follow-up (development only)

Start from the DNR3 receiver on 73749f55 + the pinned adf3eee source patch
from native-dnr3-control-scope. Apply typed-firmware-adf3eee.patch there.
Apply typed-synth-206.patch to frontend PR #206 head b77e49a0 (the subsequent
#206 commits eb1daa39 and 12408b3c only add verification docs).
Nothing in this directory changes an installer or publishes firmware.

## Wire and owner rules

HELLO advertises cap 0x1000 only with the explicit opt-in. Kind 112 is
original IDs 0–127; kind 113 is 128–255. The address identifies engine bank
(2 Synth One, 3 SuperJ6), slot (0/1), and low seven ID bits. DESCRIBE
explicitly reports typed (unit bit 5) and writable (bit 6). A control absent
from the native descriptor table is never editable. Normalized raw ranges
are shown without inventing Hertz or seconds. Button/gesture-only functions
and unsupported engine controls remain out of the prototype.

Writes require a fresh single-address native GET under the active lease,
matching applied owner generation plus bank and old value. Same-bank,
same-preset reload with the same displayed value invalidates the old
write. S1 uses the actual panel queue; QUEUED is not applied until the
audio boundary, and the page confirms via independent GET, not another
write. The regular guard and timeout behavior remain for older firmware.
Selector and panel labels go beyond legacy aliases only where original ID
evidence exists. Port/device switching is still separate browser QA.

## Targeted evidence and blockers

- The actual Remote JS adapter talked to the actual two-provider C host
  using raw protocol bytes. All thirteen exposed Synth One descriptors
  and SuperJ6 original cutoff ID 7 were discovered, written, read back
  and restored. Stale values, invalid ranges, wrong owners, and a same
  preset re-adoption were rejected. The exact duplicate write stayed
  idempotent. Existing BPM, voice and playhead tests still pass.
- Host replay: in the patched firmware copy install dual-cable.c in
  tests/host, replacing the previous cable fixture; create
  native-test-body.inc from remote_dnr3_test.c by renaming its main to
  existing_dnr3_test. Place build-typed.sh and wire.mjs at firmware
  checkout root and symlink web-typed/remote to the patched product
  Remote directory. Run bash build-typed.sh, then node wire.mjs --dual.
  Use the same generated assets as the baseline repro.
- Initial target port overflowed by 556/544 B; applying the verified
  Chicago exact coefficient representation enables standard target builds:
  4,552/4,564 B XIP free and 512 B pool margin per board. To reproduce,
  run the earlier filter_words.py with the original packed-header input,
  --fast32 --emit-test <private-dir>, and set DNBOX_PRIVATE_FAST32_TABLES
  to that directory. The generator checks all 32,770 words for equality.
  Set X0X_REMOTE_DNR3=1, X0X_REMOTE_TYPED_SYNTH=1, and a writable
  X0X_GEN_CACHE. The expanded historical full-provider profile (without
  latest owner marker) instead overflows by 2,048/2,040 B. Merely removing
  a forced developer export still leaves 1,776/1,768 B overflow; don't
  mistake the standard provider link for the full combination.
- Strict emulation accepted native selection of Synth One on both linked
  standard models and confirmed bank 2 and settled status. The subsequent
  typed GET/DESCRIBE did not finish during the smoke window, with 94% of
  instructions in ISRs at the end on both and zero audio peak. This is a
  failed native live run, not a target pass. An A/B against the pinned no-typed
  donor reproduced the same 94% ISR and silence, so this is not new with typed DNR3. No editor screens,
  device writes, published site, or full controls/A/B claim.
