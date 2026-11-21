# DnBOX — start here (every agent, every run)
This is `main` of `gobbajogger/DnBOX-nightly`: the released website and browser Remote source. No work happens on `main`. This file replaces every earlier AGENTS.md, skill, brief and handoff on this branch.

The rules and the working state live on the `integration/dnbox-consolidated` branch. Read these four files there, in this order, and nothing older:
1. [RULES.md](https://github.com/gobbajogger/DnBOX-nightly/blob/integration/dnbox-consolidated/RULES.md): the only rules (v2, rules 0–25; identical in this repo and `gobbajogger/DnBOX`). If any other text disagrees, RULES.md wins.
2. [CHECKLISTS.md](https://github.com/gobbajogger/DnBOX-nightly/blob/integration/dnbox-consolidated/CHECKLISTS.md): the pass/fail finish line for each lane.
3. [docs/lanes/](https://github.com/gobbajogger/DnBOX-nightly/tree/integration/dnbox-consolidated/docs/lanes): each lane's current state, blockers and next item.
4. [CONSOLIDATED-STATE.md](https://github.com/gobbajogger/DnBOX-nightly/blob/integration/dnbox-consolidated/CONSOLIDATED-STATE.md): what is merged into `integration/dnbox-consolidated`, with SHAs.

## The project
DnBOX is firmware for the SMK-37 keyboard (Elite and Pro builds; `gobbajogger/DnBOX`) plus a website and browser Remote (this repo, `gobbajogger/DnBOX-nightly`). The User (gobbajogger) decides finished lanes, design, rule changes and merges to `main`; Dot runs everything else.

## How work reaches main and the sites
- Lanes work on `lane/<lane>-<topic>` branches cut from `integration/dnbox-consolidated` and merge there (RULES 5 and 9). Never branch from `main` for lane work.
- Code reaches `main` only as a PR the User merges (RULES 1 and 11), after the full Local gate passes at the exact SHA (RULES 9).
- `gh-pages` (the nightly site and installer) is fast-forwarded only after the full Local gate passes (RULES 9 and 16). The installer flashes keyboards: device writes stay the User's only (RULES 15).
- A docs-only PR into `main` (`.md` files only) needs content, link and policy checks and an independent QA review.

## Local gate (one command)
The gate script [scripts/dnbox-gate.sh](https://github.com/gobbajogger/DnBOX-nightly/blob/integration/dnbox-consolidated/scripts/dnbox-gate.sh) is on `integration/dnbox-consolidated`, not on `main`. When it is required, what it runs, and what counts as PASS are in the integration [AGENTS.md](https://github.com/gobbajogger/DnBOX-nightly/blob/integration/dnbox-consolidated/AGENTS.md) and RULES 9.

## Where everything lives
| What | Where |
|---|---|
| Rules, checklists, lane state | [RULES.md](https://github.com/gobbajogger/DnBOX-nightly/blob/integration/dnbox-consolidated/RULES.md), [CHECKLISTS.md](https://github.com/gobbajogger/DnBOX-nightly/blob/integration/dnbox-consolidated/CHECKLISTS.md), [docs/lanes/](https://github.com/gobbajogger/DnBOX-nightly/tree/integration/dnbox-consolidated/docs/lanes) (integration branch) |
| Design references | [docs/design/](https://github.com/gobbajogger/DnBOX-nightly/tree/integration/dnbox-consolidated/docs/design) (integration branch) |
| Website and Remote source / tests | [web/](web), [tests/](tests) |
| Firmware source and build | [gobbajogger/DnBOX](https://github.com/gobbajogger/DnBOX) |
| Library-only files (SuperJ6 .ipa and AU installer only) | ChatGPT Library; index: [docs/LIBRARY-INDEX.md](https://github.com/gobbajogger/DnBOX-nightly/blob/integration/dnbox-consolidated/docs/LIBRARY-INDEX.md) (integration branch) |
| Licence | [LICENSE](LICENSE) |
| History (old rules, handoffs, evidence) | Git history and `archive/*` tags. Not instructions. |

Historical note: the older x0x37 nightly instructions (the previous AGENTS.md, `coordination/` and its merge-queue contract) are history and have no force.

## Never
Force-push; push or merge to `main` without the User; Secrets in Git; PSRAM; device writes (flash, release, BTIF, USRTRIM, efuse, key_mac, bootloader); GitHub Actions or workflow files; Cursor cloud agents; SuperJ6 .ipa or AU installer in Git.
