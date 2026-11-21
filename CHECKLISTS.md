# DnBOX finish-line checklists
Rules: `RULES.md` (v2). A lane is finished when every line of its section is PASS at one SHA, with the log path or PR comment link written next to it in `docs/lanes/<lane>.md`. A check that did not run is not PASS; write NOT_RUN and the reason. For the full gate before a `gh-pages` fast-forward or `main`, and for the site-only gate (RULES 16), NOT_RUN = FAIL. Never weaken a threshold to make a check pass; if a check is wrong, the fix and its reason go in the lane file and `test-and-merge` reviews it.

Common to every lane (C1–C6)
- C1 The lane's focused tests PASS at the lane PR head SHA (plus Elite and Pro builds when firmware changed); result posted as a PR comment naming the SHA. The full Local gate runs on the combined branch after the final lane merge (RULES 9), not per lane PR.
- C2 Lane branch contains `integration/dnbox-consolidated` (merge, not rebase); no unexplained file deletions (gate step `no-loss`).
- C3 Independent Review per RULES 9(c), only when the lane changes screens.
- C4 Hard-limit scan clean: no Secrets, no `.github/workflows`, no SuperJ6 installer, no PSRAM, no file ≥ 50 MB outside LFS (gate step `limits`).
- C5 `docs/lanes/<lane>.md` lists every item below with PASS + evidence; "What's left" is empty.
- C6 Draft PR marked ready, merged into `integration/dnbox-consolidated` by `integ` after the three checks (RULES 9).

## sound — Synth One, SuperJ6, Chicago, Miami, presets, A/B
- S1 Synth One renderer rebuilt from 56079bbd; host renders all factory programs with 0 NaN/Inf and 0 xruns in the host test.
- S2 Synth One A/B bench vs the original: per-program spectral/level difference report committed; every program within the bench thresholds written in the report header before the run.
- S3 SuperJ6: all 64 controls bound, FX routing and preset binding done; host test proves each control changes the output.
- S4 SuperJ6 A/B bench vs the originals (uses the 14/56 comparison ZIP); report committed, within its pre-declared thresholds.
- S5 AudioKit-faithful presets: all 640 presets / 12 banks mapped with verified parameter mapping (test checks every preset loads and maps every parameter).
- S6 Memory: Elite and Pro link with every engine in, stock memory, no PSRAM; pool margin ≥ 512 B above the 8192 B floor; measured per-engine RAM/flash report committed (`docs/lanes/sound-memory.md`).
- S7 third-slot engine removed: the L07/L29 whole-word scan over firmware/web/tests returns 0 lines outside history/changelog.

## fwui — every firmware screen in R22
- F1 Every firmware screen uses R22 components (909/808 pattern) and the shared glyph library; screen inventory in `docs/lanes/fwui.md` with a 240x240 render per screen committed.
- F2 Geometry detector: 0 findings on every screen domain (today 107 on the drum slice) at one SHA.
- F3 Code space: Elite and Pro link with ≥ 1 KiB XIP free (today ~4.5 KiB over); link map committed.
- F4 Pan L50..C..R50 on every pan readout (test); battery R22 4-level icon in every top bar (test).
- F5 Pads/LEDs drive the sequencer on 909/808/BREAK param pages (host test); hold-GLOBE clear/copy passes the full host suite.
- F6 Firmware slider lane: thin per-step velocity/chance/pitch/pan sliders, switched by tapping the lane label (host scenario test + render).
- F7 SuperJ6 and Synth One pages exist with label + glyph + value-with-unit controls; no explanatory text on any screen (text scan test).

## integ — consolidation, combined firmware, cleanup
- I0 First job: both consolidated branches pass their own Local gate (green baseline). Until then, list every failing test at the consolidated SHA in `docs/lanes/integ.md`; merges are judged by RULES 9 (no test that passes on consolidated may fail after). Nightly today: 43 visual-gate screens have no baseline (generate with `npm run test:visual:update` at the consolidated SHA, then Review them) and `tests/qualified-catalog.test.mjs` needs its output dir outside the repo.
- I1 `integration/dnbox-consolidated` + `CONSOLIDATED-STATE.md` in both repos, listing every merged branch/PR with SHAs.
- I2 Combined Elite/Pro firmware (PR #869 work) builds from the consolidated branch with all lanes merged; full host suite 0 FAIL / 0 NOT_RUN (today 426 ok / 28 FAIL).
- I3 Zero dropouts: heavy-playback host measurement with all engines, 0 dropouts, Chicago coefficient cache and Miami options kept (R013/R014).
- I4 compact-programs run clean under LeakSanitizer (run outside a tracer), log at SHA.
- I5 BREAK: the User's 5 samples embedded, preview before choosing works, `/private-audio/` 404 on Pages fixed.
- I6 Roadmap files (Complete/Working/Pending, PR #887) match the consolidated SHA; #120 voting works at runtime (test).
- I7 Cleanup batch (after all lanes merge): every stale branch tagged `archive/<branch>` then deleted, stale PRs closed with a link, protected list untouched (RULES 10), before/after counts and reachability proof committed; repos renamed `DnBOX` / `DnBOX-nightly`, links/Pages/README/remotes updated, old URLs redirect.

## remote — FunkyBeats port, browser Remote, TouchOSC
- R1 Every Remote page matches its page in `docs/design/OWNER-BASELINE-1836.pdf` and fixes the 8 gaps in `OWNER-BASELINE-1836-NOTES.md` (visual test per page).
- R2 FunkyBeats ported (roll, step sequencer, mixer, clip launcher, synth editor), restyled R22, MIT notice in `LICENSES/` and file headers.
- R3 No tool modes: no Select/Draw/Erase row; gesture tests for create, move, resize, delete, zoom, pan on the roll.
- R4 Thin per-step slider lane (velocity, chance, pitch, pan) under roll and drums, switched by tapping the lane label; no selected-note panel (tests).
- R5 Phone landscape usable on every page (844x390 visual test, no overflow).
- R6 Browser control + TouchOSC bound to the real firmware protocol (protocol test against the host simulator).
- R7 Structural browser fixtures (`tests/visual/fixtures/web-structural/browser_fixtures.py`) PASS with Chromium at the PR head.

## web — website, installer, emulator, nightly page
- W1 All 19 routes + redirects build and pass `npm test`; the 2 firmware-link test failures fixed.
- W2 Installer, emulator, import/export work (existing tests + browser tests PASS).
- W3 1:1 HTML firmware UI matches fwui's 240x240 renders at the same SHA (pixel/structure diff test).
- W4 Pages explain what musicians can do, no technical explainers (content test); every page usable in phone landscape.
- W5 Nightly page published: `gh-pages` fast-forwarded only after its gate (RULES 16; the site-only gate for site-only changes, else the full Local gate), live URL returns the built bytes (hash check).
