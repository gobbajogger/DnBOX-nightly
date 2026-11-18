# Lane: remote   (copy to docs/lanes/remote.md; update in every push)
Owner agent: <name>   Branch: lane/remote-<topic>   Draft PR: #<n>   Head: <sha8>   Updated: <YYYY-MM-DD HH:MM VLAT>

## Checklist (from CHECKLISTS.md)
| ID | Check | Status (PASS/FAIL) | Evidence (SHA + log path or PR comment link) |
|---|---|---|---|
| C1 | Local gate at head | FAIL | |
| <S1…> | | FAIL | |

## Now / next
- Now: <item, riskiest first>
- Next: <item>

## Blockers (each with its fix and the route being tried; never "waiting")
- <blocker> → <fix> (since HH:MM)

## Top 3 risks for the next hour
1.
2.
3.

## Deletes (files this lane removes on purpose, with reason; the gate's no-loss step reads this)
- <path> — <reason>

## Conflicts noted (RULES 23)
- <conflict> → reading used: <…>

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
