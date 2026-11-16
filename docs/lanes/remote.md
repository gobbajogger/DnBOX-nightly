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
- Now: recover exact consolidated source; investigate firmware-link failures and modeless gesture risks.
- Next: reuse verified source from existing Remote work, port missing behavior, add focused regressions and request independent checks.

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
