# Lane: web
Owner agent: web   Branch: lane/web-v2 (local continuation of feature/website-r22)   Draft PR: #135; #133 preserved unchanged   Last verified head: 3edfb16374c99c9ccb99e27d45e3d1af25360185   Base: 7262bb689abd198a38c49086837941cb4b75d801

Rules: RULES.md v2 from dnbox-repo-prep.zip. Earlier briefs, scores, deadlines and approvals are historical only.

## Checklist
| ID | Check | Status | Evidence or missing requirement |
|---|---|---|---|
| C1 | Local gate at head | FAIL | Combined 3ed source available; browser assertions NOT_RUN and latest integ preflight must be retained. No full gate qualification. |
| C2 | Contains consolidated; no unexplained deletions | PASS | Independent exact3edfb16374c99c9ccb99e27d45e3d1af25360185 clean/no_loss exit0 against fresh connector9165; two prep deletions explained below. Recheck if consolidated moves. |
| C3 | Independent screen Review 10/10 | FAIL | New exact-head independent review required at all prescribed viewports. |
| C4 | Hard-limit scan | PASS | Independent exact3ed limits() stage exit0; evidence independent-review/web3ed-safe-checks.log. Full Local remains FAIL. |
| C5 | Every line PASS; nothing left | FAIL | W1–W5 remain open. |
| C6 | Ready and integrated | FAIL | Draft #135 active; #133 retained unchanged, not delivery. |
| W1 | 19 routes, redirects and npm test | FAIL | Restored token dependency and exact Remote a2cd71a wave-display module; Remote4c443839 projection reused unchanged; focused suite25/25 PASS. npm run build PASS (187 files); strengthened test:product45/45 Node plus11/11 Python PASS. Full npm reached workspace and failed stale archive-wrapper selector; corrected without changing token assertions, workspace PASS; Remote40/40 PASS. Visual/browser gate still blocked; no W1 PASS claim. |
| W2 | Installer/emulator/import-export and browser | FAIL | Browser runners now honor Local gate CHROMIUM_EXECUTABLE or bundled Playwright Chromium, retaining sandbox; regression test 4/4 passes. Product browser not yet qualified. |
| W3 | HTML/firmware same-SHA match | FAIL | Requires fwui exact render inputs and pixel/structure comparison. |
| W4 | Musician-facing pages and landscape | FAIL | Exact composition browser checks still required. |
| W5 | Gated gh-pages and live hash | FAIL | No publication attempted. |

## Now / next
- Now: source/transport coverage at combined 3ed; normal-sandbox browser blocked in both tested environments, no retry of denied boundaries.
- Next: compose next stable Remote snapshot and integ preflight; extend nonbrowser W2 coverage while awaiting a permitted browser environment and complete native inventory.

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
- coordination/edge-case-hunt/EC-20261026-011.json — inherited authorized prep removal of superseded brief; retained in parent history.
- docs/nightly-first-development-gate.md — inherited authorized prep removal of superseded gate instructions; retained in parent history.

## Conflicts noted (RULES 23)
- Existing draft #133 uses feature/website-r22 while v2 asks lane/web-*; preserve the existing review/history and avoid duplicate PR, root directs authorized lane/web-v2 continuation PR, preserving #133 untouched.

## What's left
C1/C3/C5/C6 and W1–W5 remain open. C2/C4 evidence is pinned to 3ed and must be checked at changed heads. No lane completion or design approval claimed.

## Verified focused work
- Stale SOURCE-MANIFEST had mismatched breaks/index.html and omitted runtime files. Refreshed all187 product-source entries without changing historical provenance; current snapshot explicitly UNREVIEWED and publicationQualified:false. Build now PASS, drift safety retained.
- test:product now includes existing R22 and runtime-closure regressions plus the browser launch contract. Result45 Node +11 Python tests PASS; no browser qualification implied.

- Full npm exposed tests/product-workspace/glyphs.test.mjs reading inline styles from the responsive wrapper rather than the preserved r22-source.html archive. Fix first verifies exact iframe src then runs every unchanged token and pan assertion on the archive. Focused2/2 and full test:workspace PASS. Independent test-and-merge review requested.
- Existing visual_gate.py contains --no-sandbox; not executed after observed sandbox refusal. Gate owner notified for safe correction and alternate runtime.

- Added W1 route contract: all19 routes present in source manifest and byte-identical build; browser runner covers identical route list; both legacy redirects keep immediate local destination and accessible fallback; six redirect mutants rejected.4/4 PASS; strengthened product tests45 Node +15 Python PASS. This is source/build coverage, not HTTP/browser acceptance.
- Shared mistake: web and Remote independently retried the same normal-sandbox socket EPERM boundary; sanctioned workspace-HOME escalation still failed, with sandbox enabled. Do not retry this boundary. Remote owns common docs/lanes/browser-environment.md; pursue a genuinely distinct supported environment only.
- Fresh-container discovery found saved X0X37-for-Loopy-Pro configuration for both repos; sent root for one shared alternate-runtime task, no duplicate task created by web.

- W4 prose-only preset correction: replaced internal UID/wrapper/validation jargon with musician actions. Preserved every control, scripts, filename prefixes, format extensions, original-byte retention and name-only edit limits. Reversible SITE-R22-CHANGES provenance retains exact earlier text. New regression failed before and passes after; build PASS187 files and product46 Node+15 Python PASS. No visual design change or browser acceptance.
- Root-owned distinct managed Codex browser attempt also stopped before assertions: SUID sandbox helper incorrectly configured (nobody:nogroup,4755). No flags/permissions/security settings changed. Shared browser record: https://github.com/gobbajogger/x0x37-for-Loopy-Pro_nightly/blob/587a6198fa5310a575cdb755686ece13da1a90c0/docs/lanes/browser-environment.md. Do not repeat either environment boundary.

- W5 read-only Pages inventory at gh-pages241196130538b5e6da7738f0c2ebbbdc57fce02e: product catalog and build-status Git blobs exactly match existing Pages;37 releases and18 same-origin package paths with expected tree sizes retained. Candidate overlay adds172 paths/changes7/keeps8 identical product paths, deletes none, and retains all non-product paths. No package bytes downloaded/requalified or branch changed. docs/lanes/web-publication-state.json explicitly BLOCKED_NOT_PUBLISHED.3/3 preservation guards reject the empty preview catalog and changed release claims; product49 Node+15 Python PASS.
- Independent test-and-merge review of651b127 confirms precisely two prose substitutions and no control/attribute/script changes; R22 focused24/24 and route contract4/4 independently PASS, not screen approval.
- Remote-only manifest185-row composition validated with0 byte/hash findings and handed back to Remote. Delegated future exact remote/** row repins to Remote owner, preserving all non-Remote rows and unqualified status; web retains whole-site combined manifest ownership.

- Composed exact prep/assets6a9607e886aab06ce0b1813321629b67239057b5 with normal ancestry; resolved only web-lane template conflict by retaining current web record. New AGENTS/RULES/CHECKLISTS and normal-sandbox launchers retained. Local fetch initially encountered absent historical trees in materialized repo; depth-one exact tree plus hash-verified ancestor commit objects restored real merge-base9165adb9, no synthetic ancestry.
- I5/Web preview wiring now uses admitted exact five WAV assets through module-relative public URLs, no private-audio request. Streaming is bounded to each contract size, credentials omitted, picker independently checks WAV/PCM hashes and rate before media creation. Preview works with empty selection in source tests; choices remain browser-only with no device writes. Browser media assertions added but NOT_RUN.
- Builder audio boundary now admits only exact five contract IDs .wav/.adpcm when pinned contractdf61cfe0, size and SHA256 match; all other binaries remain rejected. Tests reject forged manifest bytes/IDs, changed/symlink/FIFO contracts, truncated/oversized streams, HTTP failures, and bit-flipped actual samples. All ten real assets build byte-identically.
- Combined source build PASS203 files, focused asset/provider21/21 PASS, product57 Node+15 Python PASS. Whole Local/browser/independent visual review still FAIL. Exact assets are recovered encoded zones and deterministic previews, not recovered original pre-backup WAVs.

- W3 checker implemented in scripts/compare-firmware-html.py: exact firmware+website pins, complete matching inventories, genuine browser-capture metadata, bounded hash-verified240x240 PNGs and zero pixel tolerance.8 synthetic/unit tests PASS. Actual native4bacd2e7135-screen baseline remains incomplete; missing HTML receipt causes FAIL before any image comparison. Usage/evidence boundary in docs/lanes/web-firmware-html-comparison.md. No W3 or Review PASS claimed.

- Independent W3 review found two checker gaps before integration: path reopen after hash and equally truncated self-declared inventories. Fixed decode to use the already-hashed BytesIO; now require separately pinned source-derived inventory bytes/SHA256, source Git blob and complete expected IDs. Path-replacement and matching-truncated-capture regressions added;10/10 synthetic/unit PASS. Final authoritative inventory remains missing, so W3 remains FAIL.

- Combined stable Remote cac407222ab23b72e801293afcf32ed44c10d36b with webf73 and prep/assets6a using exact Git objects/normal ancestry. All Remote source retained; remote lane conflict kept owner record; only whole-site manifest regenerated209 files. Focused composition PASS: build209, product57 Node+25 Python, workspace84+app scenarios, Remote63, actual Lua5.4→pinned C host protocol. Logs/receipt in docs/lanes/evidence/web-remote-cac407-*. Browser/full Local remains FAIL/NOT_RUN.
- W3 corrected checker independently replayed10/10 PASS. The separate inventory Git-blob pin is syntactically validated; authoritative provenance must still be verified externally against firmware Git, not self-authenticated by JSON.

- W1/I5 real loopback HTTP checks PASS4/4: all19 routes return exact built HTML, all209 manifested assets return matching length/SHA256, all5 public WAV URLs return pinned bytes, both legacy redirect documents exist; private-audio paths remain404 and are never used by provider. This is transport/source proof only, not browser playback or live Pages delivery.
- Reviewer independently verified exact3ed clean/no_loss/limits functions exit0, clearing C2/C4 at that SHA; no full gate/browser run. Final integ composition must retain newer b0a66/c93 fail-closed browser preflight before any full gate, do not run stale3ed full gate.

- Independent reviewer replayed exact77c66ba1 HTTP4/4 PASS; transport scope accurately limited, no browser/live Pages claim.
- W2 installer orchestration now has6 actual-source lifecycle checks: cancel before metadata/body/mount completion, BFCache selection restoration, stale callback isolation, overlapping restore candidate disposal and network failure disclosure. DOM/network/media admission are mocked; these do not claim browser or device execution. No production behavior changed.
- Product suite with lifecycle coverage PASS63 Node+29 Python; log docs/lanes/evidence/web-installer-lifecycle-product.log. W2 remains FAIL until real browser execution.

- W4 project-entry prose removes implementation-only provider jargon, retaining unavailable MIDI export, separate original backup/restore tools, non-native local drafts and every format/size limit. One paragraph only; no controls, attributes, scripts, layout or glyph changes. New content regression red before/green after. Existing mounted/Python disclosure checks now assert the replacement caution while retaining disabled-export/provider-null/reversible-source checks. Plan manifest hash repinned; nothing published. Product64 Node+29 Python PASS.
