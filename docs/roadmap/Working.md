# Working

Generated from `CONSOLIDATED-STATE.md` by `tools/generate_roadmap.py`. Do not edit.

| Item | Move | Status | Owner | Merge | Dependencies | Next action |
|---|---|---|---|---|---|---|
| M0: Start files and green gates | M0 | working | integ |  |  | Resolve the exact candidate Local gate failures and verify an available authenticated status-write path. |
| M1: Sound engines | M1 | working | sound |  | M0 | Retain the measured stock-WIDE timing recovery, and complete the remaining Synth One and SuperJ6 parity. |
| M2: Firmware UI | M2 | working | fwui |  | M0 | Retain merged FWUI #990 and #991. Preserve #992's separate gate and host failures pending its exact passing gate. |
| M3: Remote | M3 | working | remote |  | M0 | Keep the stock Remote transport and reviewed branch capabilities. Resolve BREAK browser selection and complete the independent screen review. |
| M4: Website | M4 | working | web |  | M0 | Retain the verified phone History fixes. Resolve the mounted installer picker duplication and complete the combined browser and visual checks. |
| M5: BREAK samples, LSan and roadmap | M5 | working | integ |  | M0 | Retain the offline five-sample BREAK readback and untraced compact-program LeakSanitizer proof. Verify owner-authenticated vote persistence and inbox refresh. |
| M6: Combined qualification and delivery | M6 | working | integ |  | M1, M2, M3, M4, M5 | Close both exact Local gates and all-engine strict playback. Hand the coordinator release prerequisites and protected stale-ref reachability after the merges. |
