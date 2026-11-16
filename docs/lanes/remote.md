# Lane: remote
Owner agent: Remote v2. Branch: lane/remote-r22. Draft PR: #134. Base: 9165adb92fcdaab756c4e59e3d4a8ee22437ca5a. Updated: 2026-11-17 00:27 VLAT.

## Checklist
| ID | Check | Status | Evidence |
|---|---|---|---|
| C1 | Exact-head Local gate | FAIL | Not run; prep gate corrections in progress. |
| C2 | Contains consolidated; explained deletions | PASS | Initial branch parent 9165adb92fcdaab756c4e59e3d4a8ee22437ca5a; no deletions. |
| C3 | Independent before/after Review | FAIL | Not run. |
| C4 | Hard-limit scan | FAIL | Full gate not run. |
| C5 | Complete evidence and empty remainder | FAIL | R1–R7 remain. |
| C6 | Ready and integrated after three checks | FAIL | Draft only; no merge. |
| R1 | Every page matches approved baseline and eight gaps fixed | FAIL | Current implementation requires full equivalent-state visual assessment. |
| R2 | Five FunkyBeats components ported and licensed | FAIL | Existing local donor contains upstream-derived sequencer; not all five qualified on current tree. |
| R3 | Modeless roll gestures | FAIL | Exact-target gesture tests pending. |
| R4 | Thin switched slider lane, no selected-note panel | FAIL | Exact-target interaction/render proof pending. |
| R5 | Every page phone landscape | FAIL | 844x390 checks pending. |
| R6 | Browser and TouchOSC real protocol | FAIL | Simulator protocol proof pending. |
| R7 | Structural Chromium fixtures | FAIL | Exact-head run pending. |

## Now / next
- Now: finish modeless touch and per-step lanes; consume source-derived engine descriptors only after live engine admission.
- Next: independent exact-source review of 9d16027; fix findings, finish remaining FunkyBeats components and normal permitted browser qualification.

## Blockers and routes
- No shell GitHub authentication: use GitHub connector, each write under 700 KB.
- Shared exact nightly checkout is materializing: inspect blob identities and donor diffs now; use separate local Remote tree when ready.
- Prep gate is being repaired by integ; do not claim the wider gate passed from focused tests.

## Top risks
1. Local donor is not current consolidated: preserve both and compare exact blobs.
2. UI event gestures may disagree with tested model behavior.
3. Protocol bindings may not represent all controls; no hardware claims.

## Deletes
None.

## Conflicts noted
README prep sequencing depends on independent reviewer; lane starts independent work while prep gate is unresolved, without merging or changing rules.

## Focused evidence (not full Local gate)
- Exact base 9165adb92fcdaab756c4e59e3d4a8ee22437ca5a Remote blobs SHA-1 verified before test. `node --test tests/product-remote/*.test.mjs`: 37/37 PASS (Node v24.22.1, GCC 14.2.0, Linux); `firmware-link.test.mjs`: 3/3 PASS against freshly compiled C host fixture. Historical two-failure hypothesis not reproduced; no hardware claim.
- Restore unchanged Chicago wave-display module from preserved website source; its absence breaks website import closure. New focused formatter tests 2/2 PASS. No design change or fabricated SuperJ6 mapping.
- Modeless body drag regression reproduced on base: omitted edge defaulted to end handle, so drag resized rather than moved. Changed default to null; explicit start/end handles preserved. New regression fails before and passes after; 44/44 focused Remote+platform tests PASS. R3 remains FAIL pending full browser create/delete/zoom/pan coverage.
- Recovered source-bound Chicago affected-oscillator projection and hash-pinned native fixture from preserved source. Wired only Chicago WAVE to projection; other glyph geometry untouched. Native fixture Float32 checks plus 128-value renderer coverage 3/3 PASS. This is affected-layer visualization, not measured audio or full-program proof; fresh native fixture regeneration remains pending.
- Browser fixture correction: replace nonexistent Chrome default and forbidden --no-sandbox with configurable system Chromium and chromium_sandbox=True. Browser remains FAIL: local launch fails socket() EPERM; retried workspace HOME/TMPDIR, shorter /tmp HOME, and escalated test launch, same result. Mac environment offline, cloud connected; next route is managed cloud browser/native test runner, not disabling sandbox. Independent common harness fixes owned by integ. Workspace regression suite 84/84 PASS on current source composition.
- R2 partial: recovered real FunkyBeats SequencerState (verbatim verified against upstream app Git blob f31a9a5b4fa10bfcf4ee634360f1d9320ef3a4d7), DOM sequencer builder, duration/velocity primitives and full MIT notice. Remote drum page now consumes that builder with typed 909/808 events and modeless step toggles; 176 cells per kit, escaping and source state undo tests PASS. R2 remains FAIL: roll/mixer/launcher/synth complete port and visual validation pending. Focused Remote50/50, workspace84/84 and actual-app regression PASS; no browser PASS.
- R3 partial: removed legacy mode buttons and force modeless pointer routing even after importing old draft context. Recovered bounded viewport wheel/pinch pan+zoom with sample anchoring, second-pointer edit cancellation, and keyboard Delete/Undo. Remote55/55 focused tests plus actual-app Delete/Undo regression PASS. Normal-sandbox browser remains unavailable due host socket denial; no alternative security bypass attempted. Touch delete and full rendered gesture review remain unchecked.

- Repeated browser EPERM occurred independently in Remote and Web; both schedules now carry prevention. Shared record: [browser-environment.md](browser-environment.md). No further denied-boundary retries.
- R6 wiring gap: baseline app never mounted its tested firmware-link module. Entry now mounts fail-closed with only explicit testOnly simulator admission; absent/non-test bundles cannot request MIDI. Actual-page source-event Connect test PASS; browser/device admission remains FAIL.
