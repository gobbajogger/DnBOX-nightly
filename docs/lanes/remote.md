# Lane: remote   (copy to docs/lanes/remote.md; update in every push)
Owner: Classic Remote (sole lane writer; Dot Remote frozen). Branch: `lane/remote`. PR: #167. Intake head: `fd6bcf8fee2841466de3291ea46a78952c440ee7`; consolidated base: `cd2926dc7892a73a9d1ea4719ab36f88f221d384`.

## Current work
- Fix #167 feedback layout regression: reserve a stable compact status row so Undo does not shrink the piano roll or hide a resize edge; keep real errors visible and keyboard reachable.
- Independent baseline browser negatives reproduce the geometry loss and end-edge hit failure. Candidate all14 FunkyBeats cases and seven recovery cases pass, with Undo/resize at 1440x900, 390x844 and 844x390. Evidence: `evidence/remote-feedback-20261118/`.
- Exact-head full gate, authenticated status and consolidation are separate delivery steps. No device or gh-pages publication is part of this slice.
- Next: bind the prepared real Chicago 4758 consumer in both 20-control native voices, preserving native formatter/revision, opaque Undo, no-write busy retry and separate Draft bytes/history. Current production runtime stays 257 until that whole scope is qualified.

## Whole-lane acceptance remains open
| ID | Status | Evidence or remaining work |
|---|---|---|
| C1 | FAIL | Current successor full gate has not run yet; source/test scope above is qualified separately. |
| C2 | PASS | Intake fd6 contains exact consolidated cd2926; no files deleted. Recheck live before delivery. |
| C3 | FAIL | Independent footer review is scoped; all-page owner-baseline 10/10 acceptance remains open. |
| C4 | FAIL | Current successor limits step must run in the full gate. |
| C5 | FAIL | R1/R5/R6 and universal live/native coverage remain open. |
| C6 | FAIL | #167 remains draft until exact-head gate and independent acceptance. |
| R1 | FAIL | Historical gate renders 109 screens but compares only 5 baselines; 104 have no baseline. Owner-PDF/page acceptance is not established by gate success alone. |
| R2 | PASS | Scoped browser/source port coverage for roll, step sequencer, mixer, launcher and synth editor; MIT notice retained. Native binding completeness is tracked in R6. |
| R3 | PASS | Candidate 14 actual gesture cases pass, including create/move/Undo/resize/delete/zoom/pan and no tool row. Explicit physical-touch timing and slow controls preserved. |
| R4 | PASS | Existing thin per-step velocity/chance/pitch/pan lanes and no selected-note panel retained; actual step lane cases pass. |
| R5 | FAIL | Current touched footer passes all three sizes; whole-page polish/keyboard inventory is still open. |
| R6 | FAIL | Mix 29 and available real envelope observer subset qualified; Chicago app binding, all native controls and actual TouchOSC/host integration remain incomplete. |
| R7 | FAIL | Structural browser fixture must run in the exact successor full gate. |

## Preserved requirements and scope
R22 and owner page geometry; flat shared styling; live glyphs represent real parameter action; full-row available envelope stages; circular TAPE reels; pan L50..C..R50; no tool row or selected-note panel; controls/values only on Remote screens. No invented FILTER/live transport/native state. Follow handoff consumer lifecycle and Draft separation. No main writes, force-push, device access, Codex or Actions. Source transfer/push uses GitHub API; no network Git.

## Deletes
None.

## Conflicts noted
Current owner handoff supersedes older Dot/Codex execution guidance and preserves the existing lane/PR. Current user prohibitions remain binding. Runtime and browser credentials are reused in place; none are copied into source or evidence.

## Prior delivered slices

- 2026-11-17: Item 1 FunkyBeats R22 port merged via #153 (squash 5840d8aa2dbe60d5d2aaa5dc2be6742d9d49eb21); DNBOX-GATE: PASS 01fc2421780b0336e9d942bcc45c5688ca3ebd3f.

- 2026-11-17: Shipped Remote module closure corrected in #157 (squash 234f38958fdfa1c6ace0c6c8ebf5ad42ff8b2a7d); DNBOX-GATE: PASS 6a4918230389638dad5f08e8b73e15797627465d.
- 2026-11-17: #158 modeless gestures squash-merged as 45d98696646fb50e08de12858edd2e13eaae1a32; external PASS status on f2986b316aed8ffe8636fa466496e4f72e9f0c22, local full PASS only on earlier fc08e3bd; exact consolidated post-merge gate failed visual networkidle timeout (browser chain passed), diagnosis ongoing.

- 2026-11-18: Merged consolidated 495d212282434fad6be5256dca7aa4d0962d404b into the per-step parameter candidate for PR #159. This keeps the starting-breaks preview changes in the same checkout as the Remote. Next gate covers both on this merge.
- 2026-11-18: Replaced the Remote's square TAPE tabs with the firmware's digital-delay threshold, two round reels, phase-dependent spokes and wear bar. FX encoder glyphs now follow the edited parameter in the Mix view. Added reel geometry, wear range and actual browser-pixel regression coverage. The catalog entry for Wear lacks a bound control in the current Mix view. End-to-end tape playback and the full page comparison remain open.

- 2026-11-18: The local Remote comparison repair supplies a BREAK sequence draft with two loop assignments, 16 slice overrides and the five pinned auditions. Connect distinguishes missing catalog and missing MIDI ports. The Mix view edits the stored 0–127 FX Wear parameter, shows its percentage and updates both the reel glyph and the saved draft. These edits remain local to the draft. The full lane acceptance and connected-instrument qualification remain open.
- Independent browser review found the legacy BREAK note editor was unreachable and a naturally ended preview retained its Stop button. The Slices/Notes switch now keeps historical note edits accessible, and preview controls follow the media state. With an active simulator lease, editing Loop A, step 5 and Tape Wear emitted zero DNR2 frames and kept Apply disabled.
- Chicago and compact JUNO now share a full-width envelope row with four editable percentage controls in both local bass slots. Chicago's compiled VCA values match the firmware oracle at all 512 stage/settings. JUNO uses its own linear attack and decay and geometric release. Miami has no ADSR row. Drafts carry targets only. The source firmware rotates Tape's circular spokes on measured input/wet activity; the Remote protocol exposes stored Wear and delay type but no activity reading, so offline transport cannot assert a spinning tape.

- 2026-11-18: #159 squash-merged as dfdca35dc6aec44c74552c74e2d27e3a3ec8cd0c; DNBOX-GATE: PASS 7671156a44576c2ec05a893767ca1d74c3c1707b. Native observation runtime deployment remains separately qualified.
- 2026-11-18: #163 Mix family squash d372ce1b3d12; exact d602ce5a full remote gate PASS, alias-safe edits/Undo and three-size browser checks; host binding and deployment remain separate.

- 2026-11-18: #164 native Mix/Master/FX squash ff164b72cb10; exact 9976c75b full remote gate PASS, 29 controls with adopted readback/Undo and three-size gesture/lifecycle tests; deployment remains separate.
- 2026-11-18: #165 accessibility squash d1812209e61d; exact bceeebf0 full remote gate PASS, current encoder values and stable slider names; first visual timeout retained as unresolved external-load diagnosis.

- 2026-11-18: #166 glyph-domain correction squash cd2926dc7892; exact f8892ae7 full remote gate PASS with raw0/1/2/127 browser checks at all three sizes; initial ENOSPC failure retained.
