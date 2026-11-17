Move: M0 (clean start and green gate)   PR: #137   Head: this commit
LEFT items PASS: 1/2 (L15); failing: L16
Gate at head: NOT_RUN (baseline references accepted; full combined gate remains open)
ETA merge: after gate correction and complete exact-head gates

## Work
Both start PRs merged; exact START-FW/START-NT are in CONSOLIDATED-STATE.md. Preserve the existing gate prerequisite repairs and adopt the 104 unchanged baseline images and FunkyBeats MIT notice from lane/integ-baselines f75670b8e94657ff6c845004262c51904ff14d01. Independent review accepted those exact image bytes as current-state regression references only; tests/visual/approvals.json records each image hash and review scope. No images were regenerated. This is not G3/design or feature acceptance.

## Next
Consume the owner's lane/integ-gate-fix correction when ready, preserving the default sanitizers and normal browser sandbox. Run the exact combined gate against current consolidated source using connector-pinned base. Remote header, offline JavaScript errors, handshake and existing page overflow remain LEFT; accepted references do not waive those checks. Chromium's previously denied EPERM route is not retried or bypassed; the Orchestrator owns the working-browser stage. No product-lane changes, device work, battery calibration or publication here. M0 L16 remains open.
