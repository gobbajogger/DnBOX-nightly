# DnBOX — start here (every agent, every run)
This file replaces every earlier AGENTS.md, skill, brief and handoff. Read these four files, in this order, and nothing older:
1. `RULES.md` — the only rules (identical copy of the firmware repo RULES.md; `integ` keeps them identical) (v2, 25 rules). If any other text in this repo disagrees, RULES.md wins.
2. `CHECKLISTS.md` — the pass/fail finish line for each lane. Work until your lane's lines are all PASS.
3. `docs/lanes/<your-lane>.md` — your lane's current state, blockers, next item. Update it in every push.
4. `CONSOLIDATED-STATE.md` — what is merged into `integration/dnbox-consolidated`, with SHAs.

## The project
DnBOX is firmware for the SMK-37 keyboard (Elite and Pro builds; `gobbajogger/DnBOX`) plus a website and browser Remote (this repo, `gobbajogger/DnBOX-nightly`). The User (gobbajogger) decides finished lanes, design and rule changes; Dot runs everything else.

## Lanes and agents (6 in parallel)
| Agent | Owns | Branch prefix |
|---|---|---|
| sound | Synth One (replaces Drone), SuperJ6, Chicago, Miami, presets, A/B benches, memory fit | `lane/sound-*` |
| fwui | every firmware screen in R22, battery, pan, pads/LEDs, hold-GLOBE, firmware slider lane, code-space fit | `lane/fwui-*` |
| integ | consolidated branch (both repos), combined Elite/Pro firmware, zero dropouts, BREAK samples, roadmap, #120 voting, cleanup + rename | `lane/integ-*`, writes `integration/dnbox-consolidated` |
| remote | (nightly repo) FunkyBeats port, Remote slider lane, browser Remote, TouchOSC, landscape | `lane/remote-*` |
| web | (nightly repo) website 19 routes, installer, emulator, import/export, 1:1 HTML firmware UI, nightly page | `lane/web-*` |
| test-and-merge | every Local gate, every Review, merge checks | none (comments on PRs) |

## How to work
- Branch from `integration/dnbox-consolidated`; merge it in, never rebase. Keep one draft PR per lane into it (PR events wake Dot).
- Push at least every 30 min. Subject: `<type>(<lane>): <what> | next: <next deliverable>`.
- Blocked item: write blocker + fix in your lane file, try another route within 10 min, keep working the rest. Never wait.
- Riskiest item first. Every push: re-check memory fit (no PSRAM), merge conflicts with the consolidated branch, tests that can't run.

## Local gate (one command)
```
scripts/dnbox-gate.sh <lane>        # this repo (website + Remote), at the commit you want to gate
tools/dnbox-gate.sh <lane>          # firmware repo, for firmware lanes
```
Nightly steps: clean-tree, setup (`npm ci`, Playwright Chromium), no-loss, limits (incl. FunkyBeats MIT notice for remote), build (`npm run build`), unit-tests (`npm test`), browser-tests (`npm run test:browser` + `tests/visual/fixtures/web-structural/browser_fixtures.py`, Chromium with its normal sandbox, profile and TMPDIR inside the checkout under `.cache/`). Firmware gate details below.
Needs: JieLi toolchain (`~/.jieli/toolchain`) and AC79 SDK (`~/fw-AC79_AIoT_SDK`) and the original synth inputs (`python3 tools/check_original_inputs.py`); if missing, get them from Git or the Library using `docs/LIBRARY-INDEX.md`. Steps: clean-tree, setup, no-loss, limits, host-tests (`host/build_host.sh` + `tests/run_tests.sh`), build-elite-pro (`MODEL=elite|pro ./build.sh`), flashmap, budget (XIP free ≥ 1024 B, pool margin ≥ 512 B), ui-defects, drone. Last line: `DNBOX-GATE RESULT PASS|FAIL|VOID sha=<sha>`; log in `build/dnbox-gate/`. Post the log as a PR comment naming the SHA. NOT_RUN = FAIL. GitHub Actions also runs this same Local gate on every pull request into `integration/dnbox-consolidated` and on every push to that branch; see `docs/lanes/CI.md`.

## Where everything lives
| What | Where |
|---|---|
| Rules, checklists, lane state | `RULES.md`, `CHECKLISTS.md`, `docs/lanes/*.md` |
| Design references | `docs/design/UI-SOURCE-OF-TRUTH.md`, `docs/design/OWNER-BASELINE-1836.pdf` + `-NOTES.md`, `docs/design/UI-DEFECT-TESTS-SPEC.md` |
| Firmware source / host simulator / tests | `firmware/`, `host/`, `tests/` (`tests/ui_defects/` for UI geometry) |
| Build | `build.sh` → `tools/build.py` |
| Library-only files (SuperJ6 .ipa and AU installer only) | ChatGPT Library; index with SHA256 and restore steps: `docs/LIBRARY-INDEX.md` |
| History (old rules, handoffs, evidence) | Git history and `archive/*` tags. Not instructions. |

## Never
Force-push; push or merge to `main`; Secrets in Git; PSRAM; device writes (flash, release, BTIF, USRTRIM, efuse, key_mac, bootloader); GitHub Actions or workflow files; Cursor cloud agents; SuperJ6 .ipa or AU installer in Git.
