# Remote landscape owner and native software witnesses

The continuation starts at `45e3d56b1de1d8c088e16dad79d7b837af156f18`. The before site serves its exact product bytes. The after site serves the composed candidate. The captured viewport is 844×390, scale 1, with Chromium 151 and its normal sandbox. The [locked owner PDF](../../../docs/design/OWNER-BASELINE-1836.pdf) has SHA-256 `db826c9cbeb84971f2d030c847043a21749ad4172e30739773494df0c9acca17`. Comparisons cover known component roles and actual local state.

| Reference | Correction and software result |
| --- | --- |
| 14, Chicago P01 Sequence | On reselecting Chicago or returning from a different part, A3 was outside the Roll at y87–103. It now lands at y151–167. All three duration notes are visible and hittable at the same time-axis positions and widths. A3 changes from MIDI 57 to 58 with ArrowUp, retains focus and returns to 57 with Undo. Real wheel pan advances 27 px and survives a same-part return with the rail synchronized. Larger bands and empty tracks keep their prior entry fallback. |
| 14 and 15, Velocity | Step 16 displayed a phantom value from trace-end pulses at sample 88200. The half-open step window now excludes those onsets. The two original pulses stay in the serialized Draft at velocities 88 and 93. A real Bass drum last-step pulse at sample 82688 edits 100→101→100. A second Undo restores the original notes. |
| 16, Levels | The existing source and mode groups share one row. All seven controls keep their 44 px height and keyboard order. All five fader values, bindings and dimensions match. The four Master macro cards fit fully, with Pump and Filter ending 48 px higher at y374. The active Pan remains centered. The ten Sends and FX aliases keep their original IDs, values and displays and now share the part colors. |
| 18, Bass drum Sound | The compact title includes Bass drum and follows voice selection to Snare. Review uses the shared primary treatment. The six source role/value bindings, twelve adjustment targets and 44 px Review target keep their exact geometry. Review opens and returns. |
| 19, local Bass A P01 | The same pads use the existing 15 px value size. All 32 boxes and hit tests are equal, including the previous amber P01 selection. |
| 20, one-row Projects Draft | Return dismisses the settled failed Connect attempt and restores the idle header. The dialog retains its diagnostic, Apply stays disabled, Connect regains focus and MIDI calls remain at zero. The Projects actions and entire saved Draft match. A separate real C test covers normal and unconfirmed CLOSE. |

The [Roll receipt](roll-receipt.json) and [Mix, Sound, Patterns and Projects receipt](mix-connect-receipt.json) contain the precise states, boxes and image hashes. The [initial failure](roll-red.log), [Roll replay](roll-browser.log), [component replay](mix-connect-browser.log), [308-file build](build.log) and [52 focused host tests plus the Workspace Draft runner](focused-host.log) are retained. Independent review checked the source hashes, renderer paths and guarded disconnect result. Current screenshot files are retained locally as one branch- and commit-named focused witness archive with their exact prior frames.

Owner whole-page 2% acceptance remains open. Page 17 still has no explicit lock address or raw value. Pages with superseded tools, selected-note inspectors or absent instrument producers need matching references for acceptance. The prior 26 owner diagnostics, 32 registered views and verified delivery ZIP retain their original identities. The wider lanes and current registered baseline status keep the scope recorded in the [previous delivery](../final-browser-133fe8f0/README.md).

## Software protocol proof

The browser uses the actual candidate Remote page and the byte-pinned Integration C editor/project/engine host. The adapter bridges Chromium's MIDI callbacks to host stdio. It injects one explicit test-only source descriptor. The shipping reviewed bundle is null. The initial READ is 75 for 909 MIX Level ID 1. Keyboard staging sends no frame. Apply queues 76, a fresh READ confirms 76, guarded Undo checks revision and value, and the inverse queues 75 followed by fresh READ 75 and CLOSE. This exact scope contains one declared, confirmed and editable control with zero unbound controls.

A second browser session runs the same software producer and withholds only the real CLOSE acknowledgements at the adapter. Dismissing the result preserves the unconfirmed-release warning and sends zero extra frames. The normal confirmed CLOSE case returns to the idle label. [Exact browser source hashes and wire trace](native-browser-receipt.json).

The earlier independent [DOM fixture replay](native/built-candidate-wire.json) ran against the intermediate idle-label candidate and the same producer. Its [identity receipt](native/built-candidate-inputs.json) fingerprints the compiled producer and its matching firmware sources and separately records the reused Elite and Pro package receipts. The final guarded browser run above has its own served hashes. Integration retains the reviewed stock runtime and final combined gate.

The exact shipped-default TouchOSC layout emits zero frames. The exact archived layout expects 326 controls with CRC `eec38bc1`. Its one HELLO receives the genuine native `ecca5979` one-control reply, and the packed Lua refuses it before OPEN, READ or SET. The tested package hashes remain unchanged. [Packed Lua boundary and wire](native/touchosc-native-boundary.json). The [archived packed Lua/C read/edit/Undo](../touchosc-parameters/README.md) retains its original matching archived inputs. A reviewed native catalog and matching TouchOSC parameter package remain required for full coverage. All qualification is software-only.

## SuperJ6 and branch identity

The existing continuation SuperJ6 strings match the [original build-9 formatter](../original-engine/README.md). An independent replay regenerated the 537-sample oracle byte for byte, SHA-256 `8e6abc6fa903fe83b84097014373db210432cc85f3a54a07fdd362301e364e84`, and matched all 1,074 owner/rate comparisons. The known values include `2 Bars`, `1/4 D` and `8 Bars`. This patch reuses those bindings. Sound's [engine-entry evidence](https://github.com/gobbajogger/DnBOX/blob/36601a5855fd64fe9262bf9eb2db1b68643a5d17/experiments/sound-hardware-v1/sj6-factory/original/engine-entry-rebuild/README.md) identifies the same executable. Original installer bytes remain private.

GitHub reports draft PR #169's head as `lane/remote` at `913120550b2634abae684390a05057cc9d9b3ee8`. The assigned continuation contains that exact commit and consolidated `583f622961fc9975fac746592ce6c483073c4170`. The old PR head still shows reconstructed beat counts. The checkpoint applies to the assigned continuation only.

## Reproduce the focused checks

Run from the candidate checkout. Point `RETAINED_SITE` to the previously built 45e3d56 product and `NATIVE_PRODUCER` to the exact Integration host binary recorded in the identity receipt. Export `DNBOX_EMULATOR_RUNTIME` and `DNBOX_FWUI_RUNTIME` using the [existing runtime inventory](../final-browser-133fe8f0/visual-delivery.json). The local replay uses Playwright and Chromium. The packed layout replay uses texlua.

```bash
site=.output/landscape-owner-next-qualified
out=.output/landscape-owner-witness
dir=evidence/remote-resume-0130/landscape-owner-45e3d56
mkdir -p "$out"
node scripts/build-product-site.mjs --output "$site"
node --test tests/product-remote/step-lane.test.mjs tests/product-remote/firmware-link.test.mjs tests/product-remote/mix-aliases.test.mjs
node tests/product-workspace/app-draft-regression.mjs
python3 "$dir/roll-witness.py" . "$RETAINED_SITE" "$out" --after "$site"
python3 "$dir/mix-connect-witness.py" . "$RETAINED_SITE" "$site" "$out"
python3 "$dir/native-browser-witness.py" . "$site" "$NATIVE_PRODUCER" "$out/native-browser-receipt.json"
python3 "$dir/native/touchosc-native-boundary.py" . "$NATIVE_PRODUCER" "$out/touchosc-native-boundary.json"
```
