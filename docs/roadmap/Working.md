# Working

Generated from `CONSOLIDATED-STATE.md` by `tools/generate_roadmap.py`. Do not edit.

| Item | Move | Status | Owner | Merge | Dependencies | Next action |
|---|---|---|---|---|---|---|
| M0: Start files and green gates | M0 | working | integ |  |  | Both focused harness repairs passed. Run the Local gates on the final combined sources and verify authenticated status posting. |
| M1: Sound engines | M1 | working | sound |  | M0 | Complete exact-head checks and integrate; no move completion asserted |
| M2: Firmware UI | M2 | working | fwui |  | M0 | FWUI #975, #988 and #987 are recorded in firmware consolidated. Final combined screen and runtime evidence remains required. |
| M3: Remote | M3 | working | remote |  | M0 | Fit the guarded Remote producer on the composed stock firmware, then verify addressed Apply and Undo, TouchOSC bindings, and changed screens. |
| M4: Website | M4 | working | web |  | M0 | Resolve the Build History current-versus-archive copy conflict; qualify the changed references and final firmware display parity. |
| M5: BREAK samples, LSan and roadmap | M5 | working | integ |  | M0 | Reuse offline proof for the five bundled BREAK samples and the matching compact-program LeakSanitizer inputs. Verify owner-authenticated vote persistence and inbox refresh. |
