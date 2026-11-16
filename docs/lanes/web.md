# Lane: web
Owner agent: web   Branch: lane/web-v2 (local continuation of feature/website-r22)   Draft PR: continuation of #133 (preserved unchanged)   Base: 7262bb689abd198a38c49086837941cb4b75d801

Rules: RULES.md v2 from dnbox-repo-prep.zip. Earlier briefs, scores, deadlines and approvals are historical only.

## Checklist
| ID | Check | Status | Evidence or missing requirement |
|---|---|---|---|
| C1 | Local gate at head | FAIL | Combined head not yet available; no gate qualification claimed. |
| C2 | Contains consolidated; no unexplained deletions | FAIL | Exact 9165adb92fcdaab756c4e59e3d4a8ee22437ca5a materialization underway by integ; merged locally at 2129e76 with donor ancestry. No lane deletions. |
| C3 | Independent screen Review 10/10 | FAIL | New exact-head independent review required at all prescribed viewports. |
| C4 | Hard-limit scan | FAIL | Exact-head gate required. |
| C5 | Every line PASS; nothing left | FAIL | W1–W5 remain open. |
| C6 | Ready and integrated | FAIL | Existing draft #133 retained, not delivery. |
| W1 | 19 routes, redirects and npm test | FAIL | Restored token dependency and exact Remote a2cd71a wave-display module; focused suite24/25 PASS, remaining closure assertion expects Chicago projection module reachable. |
| W2 | Installer/emulator/import-export and browser | FAIL | Browser runners now honor Local gate CHROMIUM_EXECUTABLE or bundled Playwright Chromium, retaining sandbox; regression test 4/4 passes. Product browser not yet qualified. |
| W3 | HTML/firmware same-SHA match | FAIL | Requires fwui exact render inputs and pixel/structure comparison. |
| W4 | Musician-facing pages and landscape | FAIL | Exact composition browser checks still required. |
| W5 | Gated gh-pages and live hash | FAIL | No publication attempted. |

## Now / next
- Now: close missing runtime dependencies before building all routes.
- Next: merge verified consolidated source, run full Local gate, fix failing interactions and independent browser review.

## Blockers and recovery
- Existing draft lacks shared runtime imports. Restore preserved token CSS unchanged (SHA256 d1cb8893ddd01faf139269d0b316b41cf82e1f3e6d1c8b47004d409961734d10; preservation manifest captured 2026-11-16T09:26:34Z). Remote owns wave-display restoration. Closure now has no missing imports; expected Chicago projection reachability still fails and is coordinated with Remote.
- Browser tests hard-coded /usr/bin/chromium despite gate selecting Playwright executable. Fixed both website runners; new regression failed before change and passes after. Normal sandbox stays enabled.
- CHECKLISTS W1 mentions two firmware-link failures. Remote reproduced the exact consolidated compiled fixture tests as 3/3 PASS; retain full-suite requirement rather than invent a repair.

## Top 3 risks
1. Combined source may expose further cross-lane runtime imports.
2. Same-SHA native firmware renders remain unavailable until fwui work completes.
3. Browser environment may not support normal sandbox; must run elsewhere rather than weaken it.

## Deletes
None.

## Conflicts noted (RULES 23)
- Existing draft #133 uses feature/website-r22 while v2 asks lane/web-*; preserve the existing review/history and avoid duplicate PR, root directs authorized lane/web-v2 continuation PR, preserving #133 untouched.

## What's left
C1–C6 and W1–W5 above. No lane completion or design approval claimed.
