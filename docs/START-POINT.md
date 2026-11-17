# DnBOX starting point (17 November 2026)

This is the **nightly** repository (`gobbajogger/DnBOX-nightly`): website, browser Remote, and untested firmware packages.

| Pin | Value |
|---|---|
| Branch | `integration/dnbox-consolidated` |
| M0 start tag | `start-nt-2026-11-17` → `bc3ed20d69159a01e82e079fa7e1cbbf66cab2ce` |
| Start-point prerelease | `dnbox-start-2026-11-17` → `548e56799e1a1f0fc3c273cd6f9702cdf8efad4d` (merge of #139, repo hygiene and rename links) |
| Sister repo | [gobbajogger/DnBOX](https://github.com/gobbajogger/DnBOX), tag `start-fw-2026-11-17` → `ea4d1d37edca8dd39469573107a49309d0ea68d7` |
| Installer | https://gobbajogger.github.io/DnBOX-nightly/install/ |
| Published installer | https://gobbajogger.github.io/DnBOX/install/ |

Local checks: `scripts/gate.sh <lane>` wraps `scripts/dnbox-gate.sh` and prints `DNBOX-GATE: PASS <sha>` or `DNBOX-GATE: FAIL <sha> <failed checks>`. GitHub Actions are off.

The lists below are copied from [DELIVERY-PLAN.md](DELIVERY-PLAN.md) (locked DONE list and LEFT list with done checks). DONE items are not redone. A LEFT item counts only when every check passes at one SHA.

## 1. DONE: locked

### 1a. Merged or shipped
| ID | Done | Evidence |
|---|---|---|
| D01 | Firmware 0.0.25 on `main`; public README, credits, conduct | fw #864 → main `9590d6de`; #879 → main `035026fe` |
| D02 | Firmware installer pinned to DnBOX 0.0.25.1 | fw #880 → gh-pages `cd345c94` |
| D03 | Nightly importer/installer fixes on main (sample naming, MIDI discovery, 0.0.26 naming guard, failed MIDI candidates) | nightly #119 #121 #126 #127 #130 → main `8af48f83` |
| D04 | Nightly gh-pages installer fixes (OTA finish, MIDI bound, strict model match, withdrawn 0.0.26 downloads) | nightly #114-#125 → gh-pages `24119613` |
| D05 | Firmware consolidated branch contains #869's combined lane (`94197fc8`), the Chicago/Miami optimisation (`ef14325f`) and hold-GLOBE pad clear (`87cab6d2`) | fw `integration/dnbox-consolidated` `e742be7b`; GitHub compare: all three are ancestors |
| D06 | Nightly consolidated branch contains Remote #132 (`3f22e000`), website preview #131 (`22ac9033`) and nightly main | nightly `integration/dnbox-consolidated` `9165adb9`; compare: all ancestors |
| D07 | Rules v2, checklists, lane templates, design references, gate scripts | `repo-prep/` (= `dnbox-repo-prep.zip`); lands on consolidated in M0 |

### 1b. Verified on lane branches, not merged yet (frozen inputs)
The move that contains each one copies it in unchanged. No new evidence, provenance or re-verification work on it.
| ID | Frozen result | Evidence | Used in |
|---|---|---|---|
| V01 | Pan formatter L50/C/R50 on all 5 mixer voices + 22 drum voice pans × 128 values, 10,975 checks PASS | `lane/fwui-r22`, `docs/evidence/fwui/pan-exhaustive/`; `lead/pan-clip-50-20261116` `d80423f3` | M2 |
| V02 | Battery/header 5,306 host checks; explanatory-text and startup-footer regressions PASS | fw #955 comment at `646ac662` | M2 |
| V03 | Elite + Pro link today: XIP free 3,156 B (gate floor 1,024), RAM headroom 1,096 B, pool 836 B above the 8,192 B reserve (gate floor 512) | fw #955 comment at `7e398180` | M1, M2, M6 budget baseline |
| V04 | Live Decay/Noise tail restored, 113,424 host checks PASS | `lane/fwui-r22` `af56c8a4` | M2 |
| V05 | Synth One renderer rebuilt from `56079bbd`: 12 scenes / 576,000 frames bit-identical to the source oracle, no heap calls; 694 programs render finite | `lane/sound-v2` `3e41e4b3`, `docs/sound/v2-pre-fx-evidence.md` | M1 |
| V06 | AudioKit corpus identity: 640 presets / 12 banks decoded from the original bundle | `lane/sound-v2` `d0bdfa8b`, `c76b3f0e` | M1 |
| V07 | Remote structural browser fixtures 9/9 PASS (sandbox on) | box log `/workspace/dnbox-review/pr132-browser-test-3f22e000.log` | M3 floor |
| V08 | Website: 19 routes, 211 assets and 5 WAV previews served; preview-player bug fixed; keyboard edit/Undo works | nightly #135 comments at `b97d1bbb`, `d3154518`, `8ce16ce1` | M4 |
| V09 | Gate environment repairs (Lua, packages, Chromium sandbox flags, TMPDIR outside repo) | `backup/integ-before-start-split-20261116` `246ea371`; nightly `lane/integ-start-files` history | M0 |

Nothing else is done. At 10:05 VLAT **0 of the 41 CHECKLISTS items are PASS** in any lane status file.

---------------------------------------------------------------------------------------------------
## 2. LEFT: every remaining finished feature

### Checks that apply to every move (G1-G4)
- **G1 Gate PASS** at the PR head: `tools/dnbox-gate.sh <lane>` (firmware) or `scripts/dnbox-gate.sh <lane>` (nightly) exits 0, last line `DNBOX-GATE RESULT PASS sha=<head>`, log posted as a PR comment naming the SHA. Floors from the script: XIP free ≥ 1024 B, pool margin ≥ 512 B; never lowered.
- **G2 No regression:** no test that passes on the consolidated branch fails after the merge.
- **G3 Review 10/10** (UI moves): independent test-and-merge Review at 1440x900, 390x844, 844x390 (+240x240 firmware); each defect found becomes an automated test in the same PR. Viewports or browser runs Dot's computer can't do go to the Orchestrator box (RULES 9a).
- **G4 Merged** by integ; merge SHA written into `CONSOLIDATED-STATE.md`; the lane's CHECKLISTS lines all PASS in `docs/lanes/<lane>.md`.

### sound (firmware repo): move M1
| ID | Finished feature | Counts as done when (all, one SHA) | Req |
|---|---|---|---|
| L01 | Synth One is a playable firmware engine in Drone's place, with its common FX | host test renders every factory program (694) through the full engine incl. FX and prints `programs=694 nonfinite=0 xruns=0` (deadline = firmware audio block period); Elite+Pro builds with Synth One selectable; a project saved with the old Drone engine loads (decision N02) | S1, R016, R018 |
| L02 | Synth One A/B bench vs the original passes | `docs/sound/synthone-ab.md` with thresholds written in its header before the run (PROPOSED N03); every program within them; one rerunnable bench command | S2, R019 |
| L03 | SuperJ6 is a complete firmware engine | host test: each of the 64 controls changes output (64/64); each FX changes output and bypass is bit-exact dry; every preset field applies; control list equals the original's list (no silent drops); Elite+Pro builds with SuperJ6 selectable | S3, R015 |
| L04 | SuperJ6 A/B bench vs the original passes | as L02, using the 14/56 comparison set (decision N01) | S4, R019 |
| L05 | All 640 AudioKit presets / 12 banks load with verified mapping | test prints `presets=640 unmapped=0`, including the 2 legacy keys | S5, R017 |
| L06 | Every engine fits stock memory together | Elite and Pro with all engines: gate `budget` PASS (pool ≥ 512 B, XIP ≥ 1024 B); `docs/lanes/sound-memory.md` lists measured RAM/flash per engine from the link map; no PSRAM (gate `limits`) | S6, R012 |
| L07 | Drone is gone from the firmware repo | `git grep -niwI drone -- firmware web tests ':!*CHANGELOG*' ':!docs/history/*' \| wc -l` = 0 | S7, rule 31 |

### fwui (firmware repo): move M2
| ID | Finished feature | Counts as done when | Req |
|---|---|---|---|
| L08 | Every firmware screen is R22 (909/808 components, shared glyph library, label + glyph + value-with-unit) | inventory in `docs/lanes/fwui.md` equals every screen the host UI walker reaches; one committed 240x240 render per screen; a test fails on any non-R22 component or glyph outside the shared library; G3 10/10 per screen | F1, R021, R022 |
| L09 | 0 geometry findings on every screen | geometry detector (#951 / `lead/ui-canonical-gate-20261116`, thresholds unchanged 70 % / 12 %) over every L08 render reports 0 | F2, R030 |
| L10 | UI code fits with all engines | Elite and Pro link maps committed; XIP free ≥ 1024 B with M1's engines in | F3 |
| L11 | Pan L50..C..R50 everywhere; R22 battery icon in every top bar | V01 + test over every screen's pan readouts; test that every top bar draws the 4-level icon at all 4 levels (percentage after calibration, N06) | F4, R023, R024 |
| L12 | Pads/LEDs drive the sequencer on 909/808/BREAK parameter pages; hold-GLOBE + pad clears/copies only the current instrument | both host scenario tests pass in the full host suite (device check is the User's) | F5, R025, R026 |
| L13 | Firmware slider lane: thin per-step velocity/chance/pitch/pan sliders, switched by tapping the lane label | host scenario test + committed 240x240 render; G3 | F6, R027 |
| L14 | SuperJ6 and Synth One pages; no explanatory text on any screen | pages reachable in the walker with label + glyph + value-with-unit; text-scan test over all renders finds 0 explanatory strings | F7, R033 |

### remote (nightly repo): move M3
| ID | Finished feature | Counts as done when | Req |
|---|---|---|---|
| L23 | Every Remote page matches `docs/design/OWNER-BASELINE-1836.pdf` with the 8 listed gaps fixed | visual test per baseline page (PROPOSED ≤ 2 % pixel diff after R22 restyle, N04); one test per gap 1-8 in `OWNER-BASELINE-1836-NOTES.md` | R1 |
| L24 | FunkyBeats roll, step sequencer, mixer, clip launcher and synth editor ported, restyled R22 | all 5 live in the app, one browser test each; MIT notice in `LICENSES/` and file headers | R2 |
| L25 | No tool modes; every roll edit is a gesture | DOM test: no Select/Draw/Erase row; browser gesture tests for create, move, resize, delete, zoom, pan | R3, rule 33 |
| L26 | Thin per-step slider lane under roll and drums | label tap switches velocity/chance/pitch/pan; edits change the step; no selected-note panel (tests) | R4 |
| L27 | Every page usable in phone landscape | 844x390 test per page, scrollWidth = clientWidth | R5, R034 |
| L28 | Browser Remote and TouchOSC drive the real firmware protocol | protocol test vs the host simulator: every control sends its message and changes simulator state; 0 unbound | R6, R035 |
| (R7) | Structural fixtures | `python3 tests/visual/fixtures/web-structural/browser_fixtures.py` exit 0 at the head (part of G1) | R7 |

### web (nightly repo): move M4
| ID | Finished feature | Counts as done when | Req |
|---|---|---|---|
| L29 | Drone gone from the nightly repo | `git grep -niwI drone -- ':!*CHANGELOG*' ':!docs/history/*' ':!docs/scheduler-handoffs/*' \| wc -l` = 0 | rule 31 |
| L30 | Website, 19 routes + redirects | `npm run build` and `npm test` exit 0, incl. the 2 firmware-link tests | W1, R031 |
| L31 | Installer, emulator, project/sample/preset import/export work | `npm run test:browser` exit 0 incl. installer, emulator and import/export tests; preset chooser delivers a real file | W2 |
| L32 | 1:1 HTML firmware UI | for every L08 screen, HTML vs firmware 240x240 render at the same SHA, PROPOSED ≤ 1 % pixel diff (N04) | W3, R032 |
| L33 | Musician-facing pages, usable in landscape | content test finds 0 technical-explainer phrases; 844x390 test per route, 0 overflow; G3 | W4, R033 |

### integ (both repos): moves M0, M5, M6
| ID | Finished feature | Counts as done when | Req | Move |
|---|---|---|---|---|
| L15 | Start files on both consolidated branches | M0 checks | I1 | M0 |
| L16 | Green gate on both consolidated branches | both gates exit 0 at the consolidated SHA (firmware `drone` step excepted until L07, N05); nightly `npm run test:visual` exit 0 with the 43 baselines committed and reviewed; `npm run test:browser` exit 0 incl. "no catalog sends no handshake" | I0 | M0 |
| L19 | compact-programs leak-free | LeakSanitizer run outside a tracer exits 0, 0 leaks | I4 | M5 |
| L20 | The User's 5 BREAK samples ship as defaults with listen-before-choose | test lists the 5 embedded samples; browser test plays a preview before choosing and lets the user pick all/any; each `/private-audio/` preview URL on Pages returns 200 | I5, R020, R046 | M5 |
| L21 | Truthful roadmap files; #120 voting works | Complete/Working/Pending files (names per #887) generated by one script from `CONSOLIDATED-STATE.md`, nothing marked complete that isn't merged; #120 runtime test (N08) PASS | I6, R038, R045 | M5 |
| L17 | Combined Elite/Pro firmware | M1, M2, M5 merged; `host/build_host.sh && tests/run_tests.sh` 0 FAIL / 0 NOT_RUN (today 426 ok / 28 FAIL on #869); `MODEL=elite ./build.sh` and `MODEL=pro ./build.sh` exit 0; `tools/gate_flashmap.py` PASS; `CONSOLIDATED-STATE.md` lists every merged PR/SHA | I1, I2, R012 | M6 |
| L18 | Zero dropouts under heavy playback | host heavy-playback test (all engines + drums + FX, max polyphony, ≥ 10 min simulated) prints `dropouts=0` with the Chicago coefficient cache and Miami options active | I3, R013, R014 | M6 |
| L34 | Nightly page published | after the final gate: gh-pages fast-forwarded (no force); live bytes hash = built bytes for every file | W5, R036 | M6 |
| L22 | Cleanup and rename | stale branches tagged `archive/<branch>` then deleted, stale PRs closed with a link, protected list untouched (RULES 10); before/after counts and reachability proof committed; repos renamed `DnBOX` / `DnBOX-nightly`; links, Pages, README, remotes updated; old URLs redirect. Tags, deletes and renames run as one script from the Orchestrator box after the User's OK (Dot's GitHub tool can't do them) | I7, R039, R040 | M6 |
| L35 | Release candidate | all of the above merged; both gates PASS at one SHA per repo with no exceptions; final independent Review 10/10 of firmware, Remote and website; integ opens (never merges) `integration/dnbox-consolidated → main` PRs in both repos for the User | all | M6 |

---------------------------------------------------------------------------------------------------
