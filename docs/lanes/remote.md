# Lane: remote
Owner agent: Remote v2. Branch: lane/remote-r22. Draft PR: #134. Base: 9165adb92fcdaab756c4e59e3d4a8ee22437ca5a. Updated: 2026-11-17 00:49 VLAT.

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
- Independent review found production viewport binding omitted vertical row callbacks although helper tests passed. Added bounded 8–80 px row binding and actual-app capture-phase pinch regression: fails before, passes after; time width unchanged. Source-event regression is not browser evidence.
- For helper/API changes, verify the shipped app imports/binds the behavior and add an app-entry regression; helper-only PASS does not qualify integration.
- Single distinct managed cloud normal-sandbox browser check admitted and dispatched by coordinator. Do not duplicate; wait for actual results while continuing source work.
- Distinct admitted cloud check also failed before assertions on Remote9d16027c: Chromium SUID sandbox helper owner nobody:nogroup, mode4755 misconfigured. Assertions NOT_RUN; no security settings/permissions/flags changed. See shared record; coordinator owns task evidence.
- R4 partial: per-step lane now renders thin value bars instead of mixer-style caps; all four label choices cycle, and no selected-note inspector is mounted in actual HTML. Structural source contracts2/2 PASS only; drum-page lane integration and rendered review remain FAIL.
- R6 partial: new no-I/O Lua5.1-compatible DNR2 codec uses the same51-byte wire layout. Actual system Lua5.4 -> freshly compiled pinned C host passes HELLO/OPEN/READ/SET/stale CONFLICT/CLOSE plus integer bounds; not a TouchOSC app/runtime or hardware test. R6 remains FAIL for document/session/runtime integration and native engine admission.
- Web-owned Remote-only manifest refresh validates185 source files, preserving unrelated baseline rows and publicationQualified:false. `npm run build` now PASS on this source composition; no publication, firmware writes or catalog mutation. Current Remote+platform57/57 PASS. Full Local gate and both browser environments remain unqualified.
- Independent review found viewport0.125–8/continuous zoom conflicted with draft codec1–4 quarter-step restriction and restore used fixed1400px. Codec now accepts bounded finite viewport zoom; actual-app save/reopen tests at0.125,8,1.333 and320px viewport fail before/pass after. Restore uses live viewport basis. Also froze3+pointer navigation with regression to avoid time-zoom jumps/stale anchors.
- Web delegated exact owned Remote-row manifest repins only; all185 manifest rows validated, other rows/metadata preserved. Build PASS; combined Remote/platform/workspace142/142 PASS. These are source/build milestones, not Local/Review gate completion.
