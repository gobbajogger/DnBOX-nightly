# Remote parameter-path and original-engine audit

Production parameter code tested from Nightly source head `cd54ee5d27be20d706ebf68d1a3c959319c35a57` on `lane/remote-resume-0130`, with SHA-256 file identities in [source-identity.json](source-identity.json). The test-only actual-host receipt harness was then augmented to emit/assert the six addressed replies and explicit simulator provenance, and passed again. Exact published candidate`5ee28037ebc55bad744f0c7d1f69eab22bb49f6a` (tree`721461c82f1d0580878fc117940563dbe2a36374`, equal to local candidatea160e7d) passed a fresh32-test run and the augmented controller against the pinned actual engine; see`5ee2803-focused-source.tap` and`5ee2803-real-host-remote-read-edit-undo.json`. The first candidate visible-browser rerun crashed its renderer clicking FX during parallel heavy browser load; its failed log`a160e7d-firmware-browser.log` is retained. The serialized retry at committed source`183207ed2b7dd7b346ca5871408b292df4fb0ae2` plus parent-owned pending CSS (inactive on Sound at the tested dimensions) passed; see`183207e-firmware-browser-serial.log`. These are focused checks, not a complete lane gate.

## Supported parameter path — simulator proof

The unchanged actual firmware host was rebuilt from clean tracked source `246ea3718c6c72ba80bbd1aafcd5356f871c78c8`. Its catalog remains test-only, unadmitted and nativeAdmitted=false. The test bridge injects that catalog only in the isolated test context; no production admission or default catalog changed.

| Check | Result | Evidence |
|---|---|---|
| Pinned real-app host build/wire suite | PASS: 326 controls; 978 edits; 72 inactive reads rejected; 7,242 actual-app/core checks; eight codec/wire exchanges | [Build log](real-host-build.log) |
| Current Remote mounted parameter controller against pinned real engine | PASS: 294 active controls, both Chicago Cutoff controls 257/277 restored, 1,958 fresh catalog reads and five writes | [Full receipt](real-host-remote-read-edit-undo.json) |
| Every active stored control and stale inverse guard | PASS: 294 restored controls and 32 unsupported bank controls; stale write rejected without overwriting external value24 | [Full wire receipt](real-host-wire-roundtrip.json) |
| Focused C-path guards and SuperJ6 fixture/bank tests | PASS: 32 tests, zero failed/skipped | [TAP](focused-source.tap) |
| Visible ordinary Remote page in normally sandboxed pinned Chromium151 | PASS: C fixture plus real-engine queued Apply/Undo and coupled macro guard | [Browser log](firmware-browser.log) |

The actual-page Chicago Cutoff witness is READ32@revision1 → SET QUEUED33@revision2 → fresh READ33@revision2 → guarded Undo READ33@revision2 → inverse SET QUEUED32@revision3 → fresh READ32@revision3. The current controller additionally snapshots all326 descriptors after each edit and inverse. Scalar Undo is offered only when the stored target and revision match and no other stored controls changed.

The real COMP macro95→96→95 changed Threshold64→60→61 and Makeup85→85→84. The visible page reported those other changes and withheld scalar Undo. The second Apply was an independent deliberate command on the disposable host. Unit cases also exercise same-value/later-revision denial, a revision change between Undo READ and SET, expired lease, unverifiable acknowledgement, absent catalog and unavailable control.

**Current acceptance scope is software-only.** The owner subsequently removed physical keyboard, USB/BLE, native TouchOSC application and device-write requirements. None was attempted and none is an acceptance blocker. The actual-engine stdio/MIDI bridge establishes stored parameter read/edit/guarded Undo/fresh-read software behavior; the copied C fixture supplements its negative guards. The separate real packed-stock firmware TouchOSC host receipt exercises32note pairs and two feedback transitions, linked at`../touchosc/README.md`. Stock firmware f1786ebe returns INFO25bytes and DNR2 HELLO0bytes; this remains an unsupported stock production endpoint software finding, not a physical-proof dependency. Stored-state proof alone does not assert audio-applied parameter state.

## Original SuperJ6 literal LFO names — OPEN

Current rates88/96/100 and mode flags195/196/197 are explicitly bound to the original engine identities. The source reconstruction at firmware `74b50bdfe2e1d9ac7f22445cdf5ab3726bb85272`, `experiments/superj6-conductor-source-20261115/lfo_laws.cpp`, supplies the18 rate factors and the binary32 selection law. Its `PROVENANCE.md` identifies the inspected version0.999.8/build9 AU SHA-256 `a5243e50bda6bd44f463c6e63ea3137802142f55f3c1ea25a5a6e046acba81a1` and explicitly states this is newly authored reconstruction, not original application code.

That source contains frequency/duration laws, not the original UI formatter or tempo names. Current `tempoPeriods` labels are measured musical-duration descriptions; the32 passing tests validate those mappings and bank semantics, not literal original UI strings. No labels were renamed speculatively. Recover the authenticated original AU/installer or a source-identified literal formatter/three-LFO sweep to close this requirement. Library search returned Unknown tool on this worker, and no matching original executable was present in the mounted source trees.

## Firmware build inputs

The mounted SDK309,800,121-byte ZIP exists at `sdk-existing-verification/LoopyX0X37/Project Sources/fw-AC79_AIoT_SDK-AC79NN_SDK_V1.2.14_2026-10-13.zip`; the tiny `DnBOX-SDK-build-inputs-integration-f1786ebe.zip` supplies only uboot/cfg data and notices. A separate recovery worker subsequently identified `dnbox-fwui-jieli/jieli-linux-toolchains-20260730.1`; toolchain/build verification is owned by that recovery, not this protocol receipt. No old `.fwsc` is republished as current. A newly built package requires a declared paired firmware SHA and its Elite/Pro limits evidence; Nightly itself has no firmware source tree.

## Reproduce

```sh
# In firmware checkout pinned to246ea371, clean tracked tree:
sh tests/host/remote_actual_core_test.sh
# In the current Nightly checkout:
node --test tests/product-remote/firmware-link.test.mjs tests/product-workspace/superj6.test.mjs tests/product-workspace/superj6-banks.test.mjs
node tests/product-remote/firmware-link-actual-host.mjs /path/to/pinned/build/host/remote-actual-core/test
node evidence/remote-protocol/pilot-246ea371/wire-roundtrip.mjs /path/to/pinned
TMPDIR="$PWD/.cache/protocol-tmp" DNBOX_REMOTE_HOST_CHECKOUT=/path/to/pinned python3 tests/product-remote/firmware-browser.py
```

Pinned Playwright Chromium and its normal sandbox are required for the browser replay. No production/device admission follows from a passing test-only bundle.
