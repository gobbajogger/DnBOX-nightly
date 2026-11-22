# Working

Generated from `CONSOLIDATED-STATE.md` by `tools/generate_roadmap.py`. Do not edit.

| Item | Move | Status | Owner | Merge | Dependencies | Next action |
|---|---|---|---|---|---|---|
| M0: Start files and green gates | M0 | working | integ |  |  | Use the pinned Local gate receipts at firmware f1786ebe and Nightly 583f6229 to reconcile failures and verify authenticated status reporting. |
| M1: Sound engines | M1 | working | sound |  | M0 | Complete exact-head checks and integrate; no move completion asserted |
| M2: Firmware UI | M2 | working | fwui |  | M0 | FWUI #975, #988 and #987 are recorded in firmware consolidated. Final combined screen and runtime evidence remains required. |
| M3: Remote | M3 | working | remote |  | M0 | Resolve the independent Remote owner-baseline findings, then qualify the changed screens and runtime on the combined Nightly source. |
| M4: Website | M4 | working | web |  | M0 | Resolve the Build History current-versus-archive copy conflict; qualify the changed references and final firmware display parity. |
| M5: BREAK samples, LSan and roadmap | M5 | working | integ |  | M0 | Co-deliver the five original BREAK samples with the stock model packages and verify standard import and readback. Verify compact-program LeakSanitizer and live owner vote persistence. |
