# DnBOX RULES v2
2026-11-16. These are the only DnBOX rules. Every older rule text (RULES.md v1, AGENTS.md before v2, skills, briefs, memory notes, chat messages, handoffs) is history and has no force. Only the User changes this file; each change gets a dated line at the bottom.

## Who decides
1. The User (GitHub gobbajogger) decides only: finished lanes, design, rule changes, merges to `main`. Dot decides everything about how the work gets done.
2. Dot does all DnBOX work with its background agents, their subagents, its cloud computer and Codex cloud tasks. Not used: Cursor cloud agents, Grok worker bots, GitHub Actions (no workflow files, no runs).
3. Six agents run in parallel: one owner per lane (`sound`, `fwui`, `integ`, `remote`, `web`; scopes in CHECKLISTS.md) plus `test-and-merge`, which runs every Local gate and Review. No lane reviews its own work.
4. A lane is finished only when every item of its CHECKLISTS.md section is PASS with logs at one SHA. Then, and only then, Dot tells the User.

## How work moves
5. Work goes on `lane/<lane>-<topic>` branches cut from `integration/dnbox-consolidated` in each repo; merge (never rebase) the consolidated branch in. Each lane keeps one draft PR into `integration/dnbox-consolidated`.
6. Push at least every 30 minutes while working. Commit subject: `<type>(<lane>): <what changed> | next: <next deliverable>`. Update `docs/lanes/<lane>.md` in the same push.
7. When one item is blocked: write the blocker and its fix in `docs/lanes/<lane>.md`, try another route within 10 minutes, and keep working the lane's other items. Never stop a lane to wait for an answer.
8. Finish from existing branches, PRs and mocks; rebuild only where that is faster. The Synth One renderer is rebuilt from commit 56079bbd.

## Three checks before any merge or deletion
9. Nothing merges into `integration/dnbox-consolidated`, and no branch or PR is deleted or closed, until all three pass: (a) nothing is lost: the branch contains the consolidated branch and deletes no file without a reason in its lane file; for a deletion, the tip is reachable from its `archive/<branch>` tag; (b) the Local gate (`tools/dnbox-gate.sh` / `scripts/dnbox-gate.sh`) passes before and after at exact SHAs, with the log posted as a PR comment naming the SHA; a test that passed before and fails after is a regression and blocks; (c) an independent before/after Review by an agent that did not build it, at 1440x900, 390x844, 844x390 and the 240x240 firmware screen, scores 10/10, and each defect it finds becomes an automated test.
10. Deleting a branch: tag `archive/<branch>` at its tip first. Never delete or close: firmware PRs #951 #869 #944 #947 #948 #887, nightly PRs #132 #131, their branches, any `archive/` `backup/` `handoff/` ref, `main`, `gh-pages`, protected branches.

## Hard limits
11. Never force-push. Never push or merge to `main` (that is the User's final sign-off). Repo settings, protection and access stay as they are, except the renames to `DnBOX` and `DnBOX-nightly`.
12. No Secrets in Git: passwords, API keys, tokens, private keys, session cookies, or files containing them.
13. Everything the work uses or produces goes into Git: code, ported engine source, SuperJ6 coefficients and fitted tables, the User's audio captures, mocks, logs, MIT-licensed SDK libraries and FunkyBeats code with their MIT notices; Git LFS for files of 50 MB or more. Library only, never Git: the SuperJ6 app installers (`.ipa`, AU zip). Every Library file gets name, size, SHA256 and recovery steps in `docs/LIBRARY-INDEX.md`.
14. No PSRAM: every engine fits stock SMK-37 memory.
15. No device writes: flashing, firmware releases, BTIF, USRTRIM, efuse, key_mac and bootloader are the User's only.
16. `web` and `remote` fast-forward the nightly repo's `gh-pages` only after the Local gate passes.

## Design
17. Firmware, Remote and website use the R22 design system (909/808 pages plus the approved 17:00-batch glyphs, locked in `docs/design/UI-SOURCE-OF-TRUTH.md`); no R23 glyphs.
18. Every control is one unit: short readable label (no cryptic abbreviations like P.DPTH) + live animated glyph + value with unit, from one shared glyph library for every engine, SuperJ6 and Synth One included.
19. Pan reads L50 .. C .. R50 everywhere. Battery is the R22 level icon in every top bar, 4 levels, plus a percentage once calibrated. Synth One replaces the retired engine everywhere; any retired-engine reference left is a defect.
20. Remote: each page follows its page in `docs/design/OWNER-BASELINE-1836.pdf` (drift is a regression); the FunkyBeats code (github.com/pepperonas/funkybeats, MIT, notice kept) is ported for roll, step sequencer, mixer, clip launcher and synth editor and restyled to R22; top bar from the User's preferred-design page 1; no tool modes (no Select/Draw/Erase row; every edit, zoom and pan is a gesture); under the roll and drums one lane of thin per-step sliders for velocity, chance, pitch and pan, switched by tapping the lane label; no selected-note panel.
21. Firmware and Remote screens show controls and values only, no explanatory text; website pages explain what musicians can do; every Remote and website page works in phone landscape.

## Acting and talking
22. Anything these rules allow, Dot does without asking. The User's standing GitHub permission is in the kickoff message; Dot copies it word for word into every task and agent it creates.
23. If two instructions conflict, note it once in the lane file, continue on the reading that changes the least, and keep everything else moving.
24. Dot messages the User only for: a finished lane, a broken rule, a regression, or an action no rule allows (one yes/no line, while other work continues).
25. Agents use GPT-6.1 Sol or Astra, never fast mode. If Dot can't choose models, it says so once and continues.

## Change log
- 2026-11-16: v2 created from RULES.md v1 (19:50–20:10) and the User's decisions; process rules dropped.
