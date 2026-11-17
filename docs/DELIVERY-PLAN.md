# DnBOX delivery plan: DONE, LEFT, and 7 big moves to the final build
Written 2026-11-17 10:20 VLAT (UTC+10) by the Orchestrator from a read-only check of both repos (nothing pushed).
Repo copy: integ commits this file as `docs/DELIVERY-PLAN.md` on `integration/dnbox-consolidated` in both repos, inside move M0.
Rules: `RULES.md` v2 + `CHECKLISTS.md`. Where this plan is stricter, this plan wins (User 2026-11-17 09:50-10:11: plan the whole process; done = finished feature only; no incremental work; fewest, biggest steps).

## The plan in 5 lines
1. **DONE** (section 1) is locked: nobody redoes, re-verifies or re-documents it; touched only if a gate test fails on it.
2. **LEFT** (section 2) is every remaining finished feature, each with objective "counts as done when" checks. Partial, WIP, mock, evidence-only, "bounded" or "scoped" results count as nothing and are never reported.
3. The work is **7 moves** (section 3): M0 clean start (the one unavoidable blocker), then 5 lane moves in parallel, each delivering a whole finished lane, then M6, the final combined build ready for the User's sign-off.
4. A move is done only when every LEFT item in it passes at one SHA and its PR is merged into `integration/dnbox-consolidated`. Dot reports to the User only then.
5. Estimate: final build ready **Fri 20 Nov 2026 ~18:00 VLAT** if the assumptions in section 5 hold.

---------------------------------------------------------------------------------------------------
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
## 3. The 7 moves

```
M0 clean start + green gate (integ) ──┬─► M1 sound: both engines complete ───┐
   [only blocker]                      ├─► M2 fwui: whole firmware UI ────────┼─► M6 final: combined build,
                                       ├─► M3 remote: whole Remote ───────────┤      zero dropouts, publish,
                                       ├─► M4 web: whole website ─────────────┤      cleanup/rename,
                                       └─► M5 integ: BREAK, LSan, roadmap ────┘      main PRs for sign-off
```
**Critical path:** M0 → M2 (whole firmware UI) together with M1 (engines), both inside one memory budget → M6. Memory is the deciding risk: 3,156 B XIP and 836 B pool are free today (V03) **before** full Synth One/SuperJ6 FX and the new screens. M1 and M2 share one budget table (below) and both build against it from hour one.
Cross-lane inputs (data, not waiting for merges): M3 gap 1 uses M1's final SuperJ6 control list; M4's L32 uses M2's renders as M2 produces them and is checked at the same SHA before M4 merges.

### M0: Clean start and green gate (integ + test-and-merge). Now → today ~22:00 VLAT
The only setup move, kept because nothing can merge without it.
**Delivers:** L15 + L16 + the clean starting point (DONE list, LEFT list, START SHAs).
1. Fw #955 (`lane/integ-start-files`, `82825e0e`): its diff against `integration/dnbox-consolidated` lists only the 14 `repo-prep/firmware/` paths (AGENTS.md, START-HERE.md, RULES.md, CHECKLISTS.md, CONSOLIDATED-STATE.md, docs/LIBRARY-INDEX.md, docs/lanes/{TEMPLATE,sound,fwui,integ}.md, docs/design/×5, tools/dnbox-gate.sh) + `docs/DELIVERY-PLAN.md` + deletions listed in `repo-prep/firmware-remove.txt` (keeping AGENTS.md replaced, cloud-handoff/pipeline.json, docs/NEW.md). Check: `git diff --name-status origin/integration/dnbox-consolidated...origin/lane/integ-start-files`. Gate steps clean-tree, no-loss, limits PASS; no test that passed on `e742be7b` fails. Merge → **START-FW**.
2. Nightly #136 (`50b68d29`): same, with the `repo-prep/nightly/` paths and `nightly-remove.txt` (keep `docs/scheduler-handoffs/**`). Merge → **START-NT**. Target: both merged by 12:15 VLAT.
3. Same move, no stop: green gates. Firmware: `tools/build.py` prints `XIP free:` and `pool margin:` per model so the `budget` step runs; the `246ea371` prerequisite repairs (V09); every remaining host FAIL fixed, or assigned in `CONSOLIDATED-STATE.md` to the move whose feature it tests; #951's detector wired into `ui-defects` (#951 itself stays open, rule 20). Nightly: 43 visual baselines generated (`npm run test:visual:update`), reviewed, committed; browser stage fixed (Playwright Chromium, sandbox on, "no catalog sends no handshake", connection resets); browser runs on the Orchestrator box if Dot's Chromium can't start sandboxed (known `socket() EPERM`).
4. Every owner merges START-FW/START-NT into its branch and writes the status header (section 4). The old big lane PRs (#953 #954 #134 #135, #133) become **donors**: each lane move takes what it needs from them; they are never merged whole and are closed in M6.
**M0 done when:** START-FW and START-NT exist; `tools/dnbox-gate.sh integ` and `scripts/dnbox-gate.sh integ` exit 0 at the consolidated heads (firmware `drone` step excepted until M1, N05); logs posted.

### M1: sound, both new engines complete. Start ~12:15 today, merge target Thu 19 Nov ~18:00
**Delivers:** L01-L07 in one PR `lane/sound-engines` → consolidated.
In: Synth One as the Drone replacement with FX and the legacy-project mapping; SuperJ6 with all 64 controls, FX and presets; 640 AudioKit presets; both A/B benches; per-engine memory report; Drone removed.
How (not reported steps): first hour, write the shared memory budget table in `docs/lanes/sound-memory.md` (bytes of XIP/RAM/pool per engine and for fwui's UI, summing within the gate floors from V03), co-signed by fwui in the same commit; the owner's subagents build Synth One and SuperJ6 in parallel against it; benches run when both engines render.
**Done when:** L01-L07 checks + G1-G4.

### M2: fwui, the whole firmware UI. Start ~12:15 today, merge target Thu 19 Nov ~22:00
**Delivers:** L08-L14 in one PR `lane/fwui-ui` → consolidated.
In: every screen on R22 components and shared glyphs, 0 geometry findings, code-space fit, pan/battery everywhere, pads/LEDs and hold-GLOBE, firmware slider lane, SuperJ6 and Synth One pages, no explanatory text.
How: the host UI walker inventory first, then the owner's subagents port screen domains in parallel within the shared budget; the SuperJ6/Synth One pages use M1's control lists as data.
**Done when:** L08-L14 checks + G1-G4, with M1 merged or merged in the same hour so L10 is measured with every engine in.

### M3: remote, the whole Remote. Start ~12:15 today, merge target Thu 19 Nov ~12:00
**Delivers:** L23-L28 (+R7) in one PR `lane/remote-final` → consolidated (nightly).
In: FunkyBeats roll, step sequencer, mixer, clip launcher and synth editor restyled R22 with the MIT notice; gesture-only roll; thin slider lane; all baseline pages and the 8 gaps; phone landscape; browser Remote and TouchOSC on the real protocol.
**Done when:** L23-L28 checks + R7 + G1-G4.

### M4: web, the whole website. Start ~12:15 today, merge target Thu 19 Nov ~22:00 (L32 needs M2's final renders)
**Delivers:** L29-L33 in one PR `lane/web-final` → consolidated (nightly).
In: Drone removed, 19 routes, installer, emulator, import/export, 1:1 HTML firmware UI, musician copy, landscape.
**Done when:** L29-L33 checks + G1-G4.

### M5: integ product pieces. Start after M0, merge target Wed 18 Nov ~18:00
**Delivers:** L19-L21 in one PR `lane/integ-product` (firmware, plus nightly for the Pages audio fix).
In: LeakSanitizer-clean compact-programs; the 5 BREAK samples with listen-before-choose and the `/private-audio/` 404 fix; roadmap files generated from `CONSOLIDATED-STATE.md`; #120 voting working.
integ also runs the merge queue throughout: a PR marked ready gets its gate and merge decision within 1 h.
**Done when:** L19-L21 checks + G1-G4.

### M6: final build and sign-off package. Start when M1-M5 are merged, target Fri 20 Nov ~18:00
**Delivers:** L17, L18, L34, L35, then L22.
In: combined Elite/Pro firmware from the consolidated branch with host suite 0 FAIL / 0 NOT_RUN; zero-dropout heavy-playback run; both gates PASS at one SHA per repo; final independent Review 10/10; nightly page published with hash match; consolidated → main PRs opened for the User; cleanup/rename script run from the Orchestrator box after the User's OK.
**Done when:** L17, L18, L34, L35 checks (L22 may follow the User's sign-off). Then Dot tells the User: "Final build ready for sign-off", with the two main PR links and the two SHAs. Flashing and device acceptance are the User's (rule 18).

---------------------------------------------------------------------------------------------------
## 4. How Dot works (binding)
1. Each owner has one move. It works only on that move until it merges. Subagents work in parallel inside the move.
2. WIP push every 30 minutes to the move's branch (RULES 6). Commit subject `<type>(<lane>): <change> | next: <LEFT item>`.
3. **Progress = merged moves only.** These are not progress, not reported, and should not be produced: evidence, provenance, hash, "binding", "receipt" or ledger work; bounded or scoped checks; reviews of partial work; comments restating status. A PR holds its feature code, its tests and one gate log, nothing else.
4. Environment and test-setup fixes go only to integ (M0). Lane PRs never contain them.
5. A LEFT item over its share of the move's time: the owner writes the blocker and its fix in the status file within 10 minutes and continues on the move's other items; no stopping, no waiting.
6. Status header, the first 4 lines of `docs/lanes/<lane>.md`, updated every push:
   ```
   Move: M2 (fwui whole firmware UI)   PR: #nnn   Head: <sha8>
   LEFT items PASS: 3/7 (L11, L12, L13); failing: L08 L09 L10 L14
   Gate at head: FAIL (budget, ui-defects)
   ETA merge: 2026-11-19 22:00 VLAT
   ```
7. DONE items are locked. Never redo or re-verify them.
8. If a decision in section 6 blocks an item, build it with the PROPOSED value and continue.
9. Dot messages the User only when a move merges, plus the RULES 24 exceptions.

---------------------------------------------------------------------------------------------------
## 5. Timeline, assumptions, risks
| Move | Start | Merge target (VLAT) |
|---|---|---|
| M0 | now | start files 12:15 today; gates green ~22:00 today |
| M5 | after M0 | Wed 18 Nov 18:00 |
| M3 | 12:15 today | Thu 19 Nov 12:00 |
| M1 | 12:15 today | Thu 19 Nov 18:00 |
| M2, M4 | 12:15 today | Thu 19 Nov 22:00 |
| M6 | M1-M5 merged | **Fri 20 Nov 18:00: final build ready for sign-off** |
Assumptions: Dot runs 24/7 with all 6 agents and their subagents in parallel; the merge queue answers within 1 h; decisions N01-N08 are answered by Wed 18 Nov or the PROPOSED values stand; memory fits with at most one day of size cuts.
Honesty note: in the 10 h after kickoff, 0 of 41 checklist items reached PASS while the lanes made roughly 200 evidence/provenance commits. These dates hold only if rule 3 of section 4 is enforced.

| # | Risk | Mitigation |
|---|---|---|
| 1 | Memory: engines + new screens exceed the XIP/pool floors (3,156 B / 836 B free before them) | shared budget table in hour one; gate `budget` on every push of M1/M2; any feature cut goes to the User as a decision, never silent; no PSRAM |
| 2 | Evidence churn returns | section 4 rule 3; the Orchestrator's hourly check flags any PR adding evidence/provenance files and any lane with no feature code in its last 2 h |
| 3 | Dot's Chromium won't start with the sandbox on | browser stages and the 390x844 Review run on the Orchestrator box, log posted on the PR (RULES 9a) |
| 4 | Big moves end with a long fix tail at review | test-and-merge reviews the running build of each move daily against its LEFT checks (findings become tests, not reports); the merge-time Review is then a confirmation |
| 5 | Missing inputs (SuperJ6 14/56 ZIP, BREAK samples) | N01 and N07 asked now; the rest of each move proceeds |
| 6 | Donor PRs conflict with move PRs | moves copy what they need; donors are never merged whole |
| 7 | Tag/delete/rename not possible through Dot's GitHub tool | one box script for L22, run by the Orchestrator after the User's OK |

---------------------------------------------------------------------------------------------------
## 6. Needs a decision (not invented; PROPOSED values let work continue)
| ID | Question | Proposed | Blocks |
|---|---|---|---|
| N01 | The SuperJ6 "14/56 comparison ZIP" (CHECKLISTS S4) was not found; sound found only a Synth One 56-preset / 14-over-unity archive. Where is it, or what replaces it? | User attaches it from the Library; otherwise bench against the original app's renders of 14 presets | L04 |
| N02 | "Synth One replaces Drone everywhere" (rule 31) vs the consolidated note "legacy Drone save IDs must retain old meaning". What do old Drone projects load as? | the old Drone ID loads as Synth One's init patch | L01, L07 |
| N03 | No A/B bench thresholds are defined anywhere | per program: RMS level diff ≤ 1.0 dB, log-spectral distance ≤ 3.0 dB (20 Hz-16 kHz) | L02, L04 |
| N04 | No visual diff thresholds for Remote-vs-baseline and HTML-vs-firmware | Remote ≤ 2 % pixels after R22 restyle; HTML vs firmware ≤ 1 % at 240x240 | L23, L32 |
| N05 | The firmware gate's `drone` step fails for integ until M1 removes Drone. Accept it as the one known failure until then? | yes, listed in `docs/lanes/integ.md`; no threshold change | M0 |
| N06 | Battery percentage needs a calibrated device reading (User only) | ship the 4-level icon; percentage after the User calibrates | L11 |
| N07 | The User's 5 BREAK samples are not on the box. Are they in the Library or on Dot's computer? | Dot attaches them from the Library | L20 |
| N08 | "#120 voting real runtime acceptance" has no defined test | a vote submitted on the running site is stored and counted (browser test) | L21 |
| N09 | R030 "investigate other SMK custom firmwares" has no pass criterion | covered by L08 Review 10/10 and L09 0 findings; no separate item | — |
| N10 | RULES v2 rule 5 (one long-lived draft PR per lane) and the earlier 20-commit cap vs one PR per move | one PR per move; no commit cap; PRs hold only feature code, tests and one gate log | all |
| N11 | RULES 9(c) Review 10/10 for non-UI items (benches, memory, LSan) | code review for non-UI items; 10/10 screen Review for UI items | M1, M5 |
