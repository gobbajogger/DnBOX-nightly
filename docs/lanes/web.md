# Lane: web
Owner agent: web   Branch: lane/web-v2 (local continuation of feature/website-r22)   Draft PR: #135; #133 preserved unchanged   Last verified head: 7cce9b485ef619f59227ceb1b5abef4700d87dd9   Base: 7262bb689abd198a38c49086837941cb4b75d801

Rules: RULES.md v2 from dnbox-repo-prep.zip. Earlier briefs, scores, deadlines and approvals are historical only.

## Checklist
| ID | Check | Status | Evidence or missing requirement |
|---|---|---|---|
| C1 | Local gate at head | FAIL | Combined head not yet available; no gate qualification claimed. |
| C2 | Contains consolidated; no unexplained deletions | PASS | At7cce9b485ef619f59227ceb1b5abef4700d87dd9, fresh connector target9165adb92fcdaab756c4e59e3d4a8ee22437ca5a is ancestor (exit0); diff --diff-filter=D empty. Recheck if consolidated moves. |
| C3 | Independent screen Review 10/10 | FAIL | New exact-head independent review required at all prescribed viewports. |
| C4 | Hard-limit scan | FAIL | Exact-head gate required. |
| C5 | Every line PASS; nothing left | FAIL | W1–W5 remain open. |
| C6 | Ready and integrated | FAIL | Draft #135 active; #133 retained unchanged, not delivery. |
| W1 | 19 routes, redirects and npm test | FAIL | Restored token dependency and exact Remote a2cd71a wave-display module; Remote4c443839 projection reused unchanged; focused suite25/25 PASS. npm run build PASS (187 files); strengthened test:product45/45 Node plus11/11 Python PASS. Full npm reached workspace and failed stale archive-wrapper selector; corrected without changing token assertions, workspace PASS; Remote40/40 PASS. Visual/browser gate still blocked; no W1 PASS claim. |
| W2 | Installer/emulator/import-export and browser | FAIL | Browser runners now honor Local gate CHROMIUM_EXECUTABLE or bundled Playwright Chromium, retaining sandbox; regression test 4/4 passes. Product browser not yet qualified. |
| W3 | HTML/firmware same-SHA match | FAIL | Requires fwui exact render inputs and pixel/structure comparison. |
| W4 | Musician-facing pages and landscape | FAIL | Exact composition browser checks still required. |
| W5 | Gated gh-pages and live hash | FAIL | No publication attempted. |

## Now / next
- Now: finish full npm test and recover browser execution on an eligible host.
- Next: merge prep update and Remote ancestry; run full Local gate, fix failing interactions and independent browser review.

## Blockers and recovery
- Existing draft lacks shared runtime imports. Restore preserved token CSS unchanged (SHA256 d1cb8893ddd01faf139269d0b316b41cf82e1f3e6d1c8b47004d409961734d10; preservation manifest captured 2026-11-16T09:26:34Z). Remote owns wave-display restoration. Closure now PASS after unchanged Remote4c443839 projection wiring.
- Browser tests hard-coded /usr/bin/chromium despite gate selecting Playwright executable. Fixed both website runners; new regression failed before change and passes after. Normal sandbox stays enabled.
- CHECKLISTS W1 mentions two firmware-link failures. Remote reproduced the exact consolidated compiled fixture tests as 3/3 PASS; retain full-suite requirement rather than invent a repair.

- Browser execution at published tree174f8c76: bundled Chromium absent at Playwright expected path; alternate CHROMIUM_EXECUTABLE=/usr/bin/chromium attempted immediately, failed normal-sandbox launch with socket() Operation not permitted and read-only Chromium Crash Reports. No sandbox weakening. Environment inventory: cloud connected, Mac-mini offline; continuing source/unit/build work, requires runnable alternate normal-sandbox browser environment for W2/W4. Logs: docs/lanes/evidence/web-v2-browser-bundled.log and web-v2-browser-system.log.

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

## Verified focused work
- Stale SOURCE-MANIFEST had mismatched breaks/index.html and omitted runtime files. Refreshed all187 product-source entries without changing historical provenance; current snapshot explicitly UNREVIEWED and publicationQualified:false. Build now PASS, drift safety retained.
- test:product now includes existing R22 and runtime-closure regressions plus the browser launch contract. Result45 Node +11 Python tests PASS; no browser qualification implied.

- Full npm exposed tests/product-workspace/glyphs.test.mjs reading inline styles from the responsive wrapper rather than the preserved r22-source.html archive. Fix first verifies exact iframe src then runs every unchanged token and pan assertion on the archive. Focused2/2 and full test:workspace PASS. Independent test-and-merge review requested.
- Existing visual_gate.py contains --no-sandbox; not executed after observed sandbox refusal. Gate owner notified for safe correction and alternate runtime.

- Added W1 route contract: all19 routes present in source manifest and byte-identical build; browser runner covers identical route list; both legacy redirects keep immediate local destination and accessible fallback; six redirect mutants rejected.4/4 PASS; strengthened product tests45 Node +15 Python PASS. This is source/build coverage, not HTTP/browser acceptance.
- Shared mistake: web and Remote independently retried the same normal-sandbox socket EPERM boundary; sanctioned workspace-HOME escalation still failed, with sandbox enabled. Do not retry this boundary. Remote owns common docs/lanes/browser-environment.md; pursue a genuinely distinct supported environment only.
- Fresh-container discovery found saved X0X37-for-Loopy-Pro configuration for both repos; sent root for one shared alternate-runtime task, no duplicate task created by web.
