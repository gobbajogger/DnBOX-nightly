# Lane: web
Owner agent: web   Branch: lane/web-v2 (local continuation of feature/website-r22)   Draft PR: #135; #133 preserved unchanged   Last verified head: db009d9a5181f2588bcde12b18689aa85b4c96c9   Base: 7262bb689abd198a38c49086837941cb4b75d801

Rules: RULES.md v2 from dnbox-repo-prep.zip. Earlier briefs, scores, deadlines and approvals are historical only.

## Checklist
| ID | Check | Status | Evidence or missing requirement |
|---|---|---|---|
| C1 | Local gate at head | FAIL | Exact d315 has bounded actual-browser checks; full scripted Local remains NOT_RUN and latest integ preflight must be retained. |
| C2 | Contains consolidated; no unexplained deletions | FAIL | Last independent PASS at exact485f2a666a427e56807ec4f2b03252eb968dce4d against fresh connector9165; current head recheck required. Two prep deletions remain explained below. |
| C3 | Independent screen Review 10/10 | FAIL | New exact-head independent review required at all prescribed viewports. |
| C4 | Hard-limit scan | FAIL | Independent full C4 supplemental scan PASS at485; current head recheck required. No limits-only overcredit. |
| C5 | Every line PASS; nothing left | FAIL | W1–W5 remain open. |
| C6 | Ready and integrated | FAIL | Draft #135 active; #133 retained unchanged, not delivery. |
| W1 | 19 routes, redirects and npm test | FAIL | Restored token dependency and exact Remote a2cd71a wave-display module; Remote4c443839 projection reused unchanged; focused suite25/25 PASS. npm run build PASS (187 files); strengthened test:product45/45 Node plus11/11 Python PASS. Full npm reached workspace and failed stale archive-wrapper selector; corrected without changing token assertions, workspace PASS; Remote40/40 PASS. Visual/browser gate still blocked; no W1 PASS claim. |
| W2 | Installer/emulator/import-export and browser | FAIL | Browser runners now honor Local gate CHROMIUM_EXECUTABLE or bundled Playwright Chromium, retaining sandbox; regression test 4/4 passes. Product browser not yet qualified. |
| W3 | HTML/firmware same-SHA match | FAIL | Requires fwui exact render inputs and pixel/structure comparison. |
| W4 | Musician-facing pages and landscape | FAIL | Exact composition browser checks still required. |
| W5 | Gated gh-pages and live hash | FAIL | No publication attempted. |

## Now / next
- Now: immutable c250 runtime serving locally through existing Chromium at observed844x390; later commits change only provenance tests/docs. Browser-discovered inspector readout failure is owned by Remote. Earlier scripted browser boundaries remain denied, not retried.
- Next: consume independently checked inspector correction, verify actual click/readout/Undo in the browser; continue prescribed viewport review and remaining W2 workflows. Retain latest integ preflight; complete native inventory remains required for W3.

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
C1/C3/C5/C6 and W1–W5 remain open. C2/C4 evidence is pinned to485 and must be checked at changed heads. No lane completion or design approval claimed.

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

- Composed Remote12440ea3955ba85370c7ee529e7fb522c7786e62 with web9b3e via normal merge at common ancestorcac407. Exact65 Remote source files verified against GitHub tree5999aa18; no Remote edits by web. Combined manifest211 paths, unqualified status retained. Build211, product64 Node+29 Python (incl HTTP211 bytes), workspace84+app scenarios, Remote66 and Lua-to-C-host protocol PASS; logs web-mixer-*. No full Local/browser or device claims.
- Frozen nonbrowser replay of bd8 initially used a Git archive; repository-dependent test correctly failed missing .git. Recovered immediately with an exact detached worktree, no assertions weakened; replay still running separately. No full npm test claimed because visual command is intentionally excluded from this diagnostic chain.

- Exact detached bd8b776 diagnostic nonbrowser chain completed exit0 with tracked files unchanged (external dependency symlink only). All npm test commands except final visual stage:493 edge cases, installer/catalog/history/project tests,product63+29,workspace84+apps,Remote63,presets19,origins4. Receipt/log web-bd8-nonbrowser-*; not full npm/Local or later e7 composition qualification.
- Independent9b3e review verified one project paragraph only, preserving controls/scripts/markup; targeted8 Node+2 Python PASS. Browser/visual design approval still missing.
- Historical compatibility audit: version-pinned0.0.26 manuals and retired .dnpr filename parser retain old Drone names; no active new engine claim. Sound owner notified for S7 coordination; no blind renaming of saved-format identifiers or historical claims.

- Independent Remote review found live mixer alias text stale until commit; consumed exact ffe227c202318d9262f3985eec74ac2ad28d44e8 unchanged via normal merge. Actual app preview/cancel now synchronize alias without extra Undo; supplied regression retained. Combined build211/product64+29/workspace84+apps/Remote66 PASS, logs web-alias-*. Integ previous efe7 source superseded for this fix; no browser/full gate PASS.

- Corrective lesson: owner stopped after an interim handoff twice despite remaining W items. Interim source/review handoff is not completion; continue the next riskiest independent workflow item while browser/integration dependencies remain blocked.
- W2 real preview regression reproduced: natural media ended/error left Stop and aria-pressed=true; switching clips retained the old pressed button while verification ran. Three red actual panel/picker/audition tests reproduced this using exact admitted WAVs and mocked DOM/media interfaces. Repaint now follows every audition state, preserving selection, bytes, format checks and layout; four green tests include pending-preview cancellation and terminal destroy. Browser playback remains NOT_RUN.
- Preview fix checks: product68 Node+29 Python PASS, ten retained focused regression tests PASS (including unavailable-preview labels and historical-source mutation fixture). Red/green logs web-preview-*. Full browser/Local remains FAIL.

- W2 persistence regression reproduced: stale/duplicate saved break IDs prevented the verified picker from mounting on every reload. Restore now retains only existing unique IDs, never adds a choice; empty/unknown arrays remain empty. Actual pinned picker stays strict for direct API callers. Red failing mount scenario and13 focused green lifecycle/provider tests; no device writes or format validation weakening.
- Evidence wording corrected: the ten retained focused tests are not a RULES9 visual Review score. Independent visual Review10/10 has never been obtained.
- Saved-selection fix product70 Node+29 Python PASS; logs web-saved-before/after/product. Browser and full gate remain FAIL/NOT_RUN.

- All-in composition: webd7fbc5 plus Remote35fbebad59a06d71c06e5d3fa8d9d4d7367dfa92 normal ancestry. Includes preview transport repaint, safe persisted selection recovery, and simulator-only Lua session source (no browser/device binding). Whole-site212 manifest verified. Build212/product70 Node+29 Python/workspace84+apps/Remote66/Lua session+codec to pinned C host PASS; logs web-session-*. Independent saved-preference review13 focused tests PASS; strict picker unchanged. No TouchOSC runtime, browser or full gate claim.

- W2 cancellation follow-through: previous generation guards prevented stale media creation but did not cancel pending preview fetches on Stop/None/navigation or replacement. Four tests now exercise actual audition/provider cancellation contract; three red failures before. AbortController signal propagates through the unchanged strict picker callback into public fetch (credentials omitted). Old completion cannot clear the new controller. DOM/media/network are mocked; browser integration remains NOT_RUN.
- Cancellation fix product74 Node+29 Python and ten retained focused regression tests PASS; logs web-cancel-*. These are not a visual Review score, browser or full Local gate.

- W4 actual shared navigation controller now has6 event-double tests for mobile toggle/Escape focus, outside/focusout close, unsuppressed link/anchor navigation, responsive resets, desktop More focus and legacy header fallback. Source controller unchanged; no viewport or browser acceptance inferred.
- Coherent Remote3615f2e20952ee1690fdbf4a8f01cc968ed1a806 composition retains68 exact Remote blobs with normal ancestry. New simulator-only callbacks and unbound long-press helper do not activate a touch menu or change design; that choice remains reserved to the owner. Whole214-file source/manifest verified; build214/product80 Node+29 Python/workspace84+apps/Remote70 and Lua callbacks/session/codec-to-C-host PASS. Logs web-hold-*. Full gates remain open.

- C4 evidence correction: prior lane table overcredited limits() stage as the entire checklist line; independent review identified absent PSRAM/large-file coverage. Full C4 remains FAIL until supplemental exact-head audit, with no safety threshold weakened.

- Remote review identified simulator callback deadline bug; consumed corrected1fcd1950dd85387b240f4867911fb527ba82b5fa unchanged with normal ancestry. Callback now rejects1000/1001ms and clock rollback before update; default-no-send XML source fixture included. Product80 Node+29 Python plus corrected Lua/XML-to-C-host checks PASS (web-deadline-*). App JS unchanged from prior composition; earlier workspace84/Remote70 evidence retained only for unchanged inputs, not a rerun claim. No actual TouchOSC/browser/full gate acceptance.

- Independent exact485f2a666a427e56807ec4f2b03252eb968dce4d clean/no_loss/limits PASS against9165 plus supplemental all-tracked-blob scan (no≥50MB) and PSRAM activation0 now supports C2/C4 at that exact SHA. Log independent-review/web485-safe-checks.log. Earlier limits-only C4 overcredit remains corrected; recheck changed heads.
- W2 project inspection controller coverage adds5 source-event cases: unavailable renderer never enables export, oversized file rejected before read/parser, old read cannot replace new selection, dispose prevents late parsing, malformed parser output fails closed. Actual panel/adapter runs with file/parser doubles and provider=null. No new renderer/device/browser capability.

- Distinct permitted browser route recovered: ordinary Python static server in the existing desktop environment, bound only127.0.0.1:37847, serves exact485 product bytes through already-running Chromium. No browser launch, security/permission changes or sandbox flags. At1331x894, actual starting-breaks UI None leaves0 selected; BR1 1 creates media duration1.578231/errornull with paused=false initially; later Play/aria-pressed=false and0 selected. Audible output not verified. This is bounded real-browser functional evidence, not full automated Local, prescribed viewport Review or delivery. Reviewer owns subsequent desktop review; prior EPERM/SUID boundaries remain untouched.
- Project-inspection extension product suite PASS85 Node+29 Python; actual source with event/file/parser doubles, not browser import/export acceptance.

- Independent existing-browser review at485 found native audio controls left attached after natural end: src removal/load showed an empty disabled player announcing Unable to play media. Three source lifecycle assertions reproduced missing detachment. Cleanup now removes DOM-backed audio after pausing and before clearing its resource; optional remove preserves injected non-DOM media interfaces. End/error/replacement/destroy and cancellation checks14/14 PASS, including one additional stale-parser inspection case. Corrected browser rerun remains required; old served output kept stable during reviewer ownership. No audible-output claim.

- Corrected preview product suite86 Node+29 Python PASS; browser runner now asserts natural-end DOM audio removal and transport reset (scripted runner not executed). Existing-browser independent after check requested.

- Independent actual-browser after check at d315 fixes the preview-control defect:0selected during play, correct1.578231 duration/errornull; natural end removes all audio nodes and resets Play/unpressed without false media error. All214 served files match exact source manifest. Receipt web-d315-browser-preview.json; prescribed viewport Review/full W2/Local still open. Reviewer continues ordinary routes.

- Exact detached d315 full nonbrowser diagnostic completed exit0, tracked files unchanged: every npm test command except final visual stage, including493 edge cases, product86 Node+29 Python, workspace84+app scenarios, Remote70, presets and origin tests. Log/receipt web-d315-nonbrowser-*; not full npm test or Local. Independent browser observations are separate bounded evidence, not a substitute for omitted visual stage.

- Next coherent source composition consumes exact Remote5bd58acf49d38a8d2607d99f6fbcbf58a76e53c4 with normal ancestry at1fcd, preserving all68 Remote blobs and214 whole-site manifest rows. Includes source-reviewed approved baseline mixer order/roles and broker deadline/ownership correction (independent broker verdict pending). No speculative layout edits. Alternate isolated output build214,86 Node product,21 Python admission/content checks, workspace84+app scenarios, Remote72 and Lua-source-to-C host PASS. Existing browser remains on d315 output until reviewer yields; no combined browser/Local qualification.

- Review isolation correction: Node product content test invokes buildProductSite() at its default output, so it unexpectedly advanced the live preview Remote bytes from d315 to abfe during preset review. Detected by hash audit; all214 served files verified abfe, reviewer/root informed immediately. Non-Remote preset/installer bytes were unchanged. Future browser reviews must serve a separate exact-head snapshot outside mutable build output; prepared hash-verified abfe copy. Do not claim output is frozen from intention alone.

- Consumed Remote d3d3a54fefa609824b295d1ea6209d49f8edf0d7 drums resize correction through normal ancestry, without changing frozen review snapshot. Isolated candidate worktree product86 Node+29 Python and workspace84+app scenarios PASS; first candidate test correctly rejected stale publication-manifest hash, which was refreshed before green rerun (no assertion weakening). Broker/resize independent verdict still pending; do not qualify combined runtime.

- Immutable c250 browser snapshot now served by ordinary loopback-only native terminal, not mutable build output. Existing browser reloaded successfully; ordinary border resizing achieved observed844x390 exactly (no DevTools, settings or new browser process). Independent reviewer owns landscape checks. Hung preset filechooser was aborted by reviewer after2036s; import remains NOT_RUN, no successful upload claim and no repeated chooser attempt.
- W3 CLI provenance strengthened: exact firmware Git commit and harness path must resolve to the declared regular blob before capture paths are opened. Historical runtime/harness split is rejected. Red missing-helper case then12 synthetic/temp-Git/CLI tests PASS, including wrong blob/missing path/symlink/later harness and pre-image fail-closed admission. This verifies identity, not derivation/completeness; all actual incomplete captures remain FAIL.

- Provenance update full product suite86 Node+31 Python PASS; source runtime and immutable c250 browser snapshot unchanged. Current incomplete172-state inventory fails provenance admission before absent capture files are opened; that failure is not a full native coverage assessment.

- Provenance self-review found Git replacement refs could redirect a pinned commit to another harness. A temp-repository forged-harness case failed before correction. Read-only Git now uses --no-replace-objects and checks optional declared harness path;13 tests PASS, including genuine original acceptance despite a replacement ref. No actual native capture had been admitted by the earlier helper. Independent final review requested.

- Own bounded c250 landscape checks at actual844x390: home, installer, manual, historical manual, tools and project guide have document scrollWidth=clientWidth=829 (vertical scrollbar), shared menu fits and links navigate. Not a 19-route/full visual Review. Actual Remote drum Tune click enables value34 but leaves readout blank: emitted inspector lacks span that showParameter dereferences; Remote owns source+regression fix. Missing drum captions independently reproduced; initial footer overlap is scroll-recoverable, not permanent inaccessibility. Receipt web-c250-landscape.json.

- Coherent normal composition consumes Remote8a3e637ce7c3684a4f54fb4e2626adead24ad78a inspector correction through a333/d3d3 ancestry. Independent exact938-blob source review and actual-app click34/edit35/Undo34 regression PASS. Combined product86 Node+32 Python and workspace84+app scenarios PASS (web-inspector-* logs). Browser stays immutable c250 before-state until exact composed snapshot is served; actual after check and missing native captions remain open.

- W2 inspection tests now exercise the exact shipped vendor parser/container producer with hash-verified synthetic v6 bytes through the actual panel/adapter: valid bundle is checked but export stays unavailable; CRC corruption fails closed. Targeted8/8 and full product88 Node+32 Python PASS. Earlier parser-double tests remain useful for races but are not represented as real parsing. No hardware, real-user file, browser chooser or MIDI renderer claim; runtime served to reviewer remains immutable8eb31.
