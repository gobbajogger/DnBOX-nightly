# Review #206 compatibility status, isolated

Connector verified fa01a9c8bf1f713656cdacb5d8be803c64152819 changes only two receipt files and a test. The actual product is parent 34127553a59dc91e3ce9c97581a434883349220a, tree ac1360ca42736623f35d90ba48a1ced73f73f8d7. All 788 tracked blobs independently matched the object-tree event and only those exact bytes seeded the private site build. Build uses its checked-in 8f97 public emulator, immutable release packages, and historical pinned screen assets. Before/after built inventory: only app.mjs and dnr3-link.mjs differ, all other 296 outputs identical. No publication or branch changes.

## Problem and fix

Actual older 8f97 WASM accepts independent native MIDI Start/Stop, advertises raw cap 1, receives precisely the two DNR3 HELLO attempts, returns no answer and receives no editing bytes. Review baseline kept Disconnected correctly, but its only advice was to check USB; after dismissal the editor reverted to its ordinary USB-connect invitation, hiding the diagnostic context. The same Draft content remained legitimately editable.

After the small source patch, matching opened MIDI ports with a timeout before any accepted HELLO get a reason distinct from permission/browser/pairing errors. The dialog explains MIDI is visible, Remote did not get an answer, edits stay in Draft, and checking USB or supported firmware is the next step. After dismissal the visible editor scope retains the short reason. It does not diagnose obsolete firmware from silence alone, offer a fake read-only/live session, or send any additional request. Any new connection result clears/replaces that failed-attempt state. Existing button, focus behavior and confirmed Connected semantics are unchanged.

Actual sandboxed Chromium at 390×844 touch and 1440×900 desktop: baseline issue observed and corrected in both. Draft Drum step changes locally with Undo, no firmware edits. Retry on real adf3eee development WASM yields native HELLO/OPEN/STATE acknowledgements, actual live drum/tempo controls and no warning. Disconnect restores generic Draft. Local Node controls suite: 11 pass, 1 existing opt-in exact-firmware regeneration check not run (no checkout given). No physical hardware, final native build, deployment or full release gate qualified.

## Reproduction

Use the exact review product (or the exact known parent tree). Build two private output folders under .output with the existing build script and its pinned DNBOX_RELEASE_PACKAGES, DNBOX_FWUI_RUNTIME and DNBOX_EMULATOR_RUNTIME. Apply no-remote-reply-status.patch to the second source only; share neither tree. Set PLAYWRIGHT_BROWSERS_PATH to installed standard browser, with isolated XDG_CACHE_HOME and TMPDIR. Run:

    python compat.py EXACT_SOURCE BUILT_SITE EXACT_8F97_RUNTIME EXACT_ADF3EEE_RUNTIME wasm-web-midi-dual-runtime.mjs CAPTURE_DIRECTORY baseline

Use fixed mode for the patched build. Capture directory must exist. The private shim is test-only, buffers real WASM MIDI/SysEx and refuses wrong binary digests or wrong capabilities. No test shim appears in built product or binds physical MIDI.
