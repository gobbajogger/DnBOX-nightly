Move: M0 (clean start and green gate)   PR: pending   Head: this commit
LEFT items PASS: 1/2 (L15); failing: L16
Gate at head: NOT_RUN (restored gate prerequisites; full combined run next)
ETA merge: 2026-11-17 22:00 VLAT

## Work
Both start PRs merged; exact START-FW/START-NT are in CONSOLIDATED-STATE.md. Restore the existing gate prerequisite repairs from the pre-split donor, retaining model-attributable budget checks, normal browser sandbox, default sanitizers and fail-closed checks. No product lane work, battery calibration, device access or publication.

## Next
Run the exact combined gate against the current consolidated source using connector-pinned base; repair environment/test setup here. Assign feature failures to their owning moves rather than silently claiming PASS. Missing visual baselines and browser checks remain open.
