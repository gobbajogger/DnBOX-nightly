# Web lane · PR #156

## Qualification at the current PR head

Branch `lane/web` targets `integration/dnbox-consolidated`. The [qualification record](https://github.com/gobbajogger/DnBOX-nightly/pull/156#issuecomment-7055380794) identifies the exact GitHub commit, Local gate log and latest public hash check. The starting head was `9172ce84caefd9350357895f4d69c99c51e00ade`. Reading the branch ref found consolidated at `914d68e8ed50698ea77c9d18c221c404629b9332`, seven commits beyond the base SHA in the PR metadata.

The recovered Web candidate has 1,022 paths and tree `15849e511a449b92e3504af8c3730cf21cdaea6e`. Its four local commits were restored in order through GitHub. The resulting merge `504167ed669be68428d4e177b5e4bc5d268c726c` has the identical tree and contains both public branches. GitHub assigned new commit metadata. Each commit records its original SHA.

| Item | Evidence and status |
|---|---|
| W1 · routes and redirects | The product content suite builds all 19 routes and checks both legacy redirects. The [head gate](https://github.com/gobbajogger/DnBOX-nightly/pull/156#issuecomment-7055380794) records the full unit result, including both firmware-link checks. |
| W2 · installer, emulator and file exchange | The browser suite exercises the installer deadline and model changes, presets and recovery. The real emulator uses the consolidated ten-file runtime pin. The Projects page now runs the deployed sample-header writer. Source and built-page tests cover both erased and programmed bytes 480–511. The [head receipt](https://github.com/gobbajogger/DnBOX-nightly/pull/156#issuecomment-7055380794) records emulator export and restore. |
| W3 · firmware UI | **FAIL, partial coverage.** Four stopped emulator states match independent native host frames at every RGB565 pixel. The standard browser suite runs [the LCD comparison](../../tests/emulator-lcd-browser.py) against [the native fixtures and input sequence](../../tests/fixtures/emulator-lcd-06bd40/README.md). The emulator targets firmware `06bd40c57cefcdf6c751b318b1cbaea0914fa8bb` and kernel `4758a9573e0a2a95e73cb054a74e0aad39d5741e`. The HTML presentation inventory also references an older firmware tree. Full parity needs the FWUI owner's per-screen source, input sequence and 240×240 frame for a common version. The earlier inventory identified 107 current keys missing a matched receipt. |
| W4 · musician content and landscape | The Loopy feature now says “return to normal DnBOX operation with KNOB BANK” in preview and product. The Projects guide links directly to the tool and names its port controls. The guide retains the file-format and protocol appendices under a disclosure. The [independent browser review](../../evidence/web-routes/web-route-review.md) passed all 57 route/viewport checks with zero horizontal overflow or page errors. All 391 internal links resolve, including the two Projects links handled by the installer. |
| W5 · nightly publication | The [publication record](https://github.com/gobbajogger/DnBOX-nightly/pull/156#issuecomment-7055380794) names the gated source, Pages commit and live HTTP byte checks. The output must overlay the existing Pages tree to keep the deployed packages, catalog and backup compatibility probe. |
| C1 · exact-head gate | [Raw log and result for the pushed head](https://github.com/gobbajogger/DnBOX-nightly/pull/156#issuecomment-7055380794). An earlier green run at local `6326d8a` covered the recovered source before the changes here. |
| C2 · ancestry and deletions | Both public heads are ancestors of the recovered merge. This lane deletes zero paths relative to consolidated. Exact-head no-loss is in the gate receipt. |
| C3 · independent review | **FAIL for full coverage.** Desktop, portrait and landscape browser evidence is scoped to the site. The 240×240 all-screen firmware/HTML comparison and independent 10/10 disposition remain open. |
| C4 · hard limits | Web changes affect browser assets, tests and documentation. The consolidated runtime pin and stock firmware memory use are unchanged. Preflight found no workflow, app installer, firmware package or 50 MB blob added. The exact-head gate supplies the tracked-secret scan. |
| C5 · complete lane ledger | **FAIL** while W3 and C3 remain open. |
| C6 · readiness and integration | **FAIL** while the remaining acceptance evidence is open. PR #156 is draft. Integ owns the final merge after RULES 9. |

## What's left

- FWUI supplies matched 240×240 native states at the common firmware revision. Web compares each matching HTML state. Test-and-merge records independent before/after acceptance. Historical design assets and unrelated firmware captures cannot establish this comparison.
- The [qualification record](https://github.com/gobbajogger/DnBOX-nightly/pull/156#issuecomment-7055380794) tracks the gate, any outstanding website findings and served-byte verification without changing the commit being tested.

The owner's 20 November kickoff authorizes pushes and comments on this existing PR and a gated nightly publication. Earlier reservations below describe the preceding run.

<details>
<summary>Previous implementation and verification records</summary>


## Integration reconciliation on 18 November 2026

The sole Web writer continues locally on `lane/web`, merging exact consolidated `914d68e8ed50698ea77c9d18c221c404629b9332` into preserved `097586f12e958296c0858b34c923999d33f09fdf`. Authenticated live reads immediately before this merge still show remote Web and #156 at `9172ce84caefd9350357895f4d69c99c51e00ade`, open and unmerged. **Every #156 mutation remains USER-RESERVED.** There is no push, status, comment, review, merge, alternate PR or publication.

Consumed the complete saved investigation before writes: archive SHA256 `a2447c31526e814dbdb662e828c8db1c6f993fc4464bbfd940f0f4ca7fabf3e2`, 14,567,161 bytes. All earlier receipts remain immutable, including the original 0e99 PASS, both initial 097 full failures, the diagnostic full PASS and the DEBUG-free 097 full PASS ending 19:23:50.984048 UTC. That last complete log is SHA256 `20f13d2ba56bb72d3ebb15c5b2e6bd8902ebc07a69bf3d16f181b519be67fdb0`; it qualifies the older dd3/Mix257 composition only.

The later original 1440-wide visual diagnostic reproduced an OOM-associated Builds capture failure at 19:42:37 UTC: the observed GPU and renderer changed from live to SIGKILL terminal states while the OOM counter rose 72 to 74 in 109.181 ms. The browser's SIGSEGV followed graceful-close initiation. This evidence does not identify the hidden resource budget, prove kernel victim selection or explain the older Remote timeouts. Source inspection and process evidence exclude a large active Python comparator or overlapping owned page as the cause of this capture. No tiled capture, browser mode, timeout, threshold, baseline, content or sandbox change is adopted; measured capacity correction and serialized execution remain required.

The merge retains all installer deadline, presets, manual print/navigation and Remote touch/footer/recovery regressions. The single browser-command conflict is resolved as the full Web sequence followed by incoming native Sound and R22 panel checks. No tracked path is deleted. The source manifest retains all 210 entries. Native producer4758 replaces257 exactly as pinned by consolidated914; its ten-file artifact still derives from firmware06bd40 and does not establish current76040 firmware parity. The prior independent 65-test source proposal is scoped evidence, not the resulting commit's full gate.

Heavy work is coordinated with existing Integ: its reserved firmware04b5 chain and the following Sound window remain acknowledged. Exact-source preparation and independent source checks continue while a Web slot and adequate capacity are established. Qualification requires the unchanged `bash scripts/gate.sh web` on the final clean composition with the verified4758 runtime, approved RDC Python/browser, normal sandbox, process-only tmpfs HOME and loopback proxy exclusions. The final numeric receipt belongs in the durable checkpoint. Current firmware UI parity, owner visual acceptance and authorized publication remain separate acceptance conditions; all requirements below and the current UI-source Page remain preserved.

## RDC verification and print repair on 18 November 2026

Classic Pro `/root` remains the sole canonical Web writer; Dot Web is frozen. The user's latest request authorizes only the named DnBOX cloud RDC computer, with the retained official browser bundle, Playwright 1.62 and Python 3.12.14. **Every mutation of #156 is USER-RESERVED**, including remote head/branch updates, metadata, comments, reviews, status and merge. The remote lane stays at `9172ce84caefd9350357895f4d69c99c51e00ade`; this continuation stays local on `lane/web`. No main, force-push, physical devices, Codex, Actions or publication.

The original required checkpoint archive was consumed with SHA256 `c2a0ee82af53debbe2827f323a775880e1173c5d833574ed057773a03cf39906`. The later exact 0e99 archive was also verified: SHA256 `50ce38d5215800fa08b80cf44408a323141a7c3b94dc0bec337589fe2e21c7fa`. Restored isolated commit `0e99d3303318a2a66995c4c1f2ade53e78a4261a`, tree `e075b80e82af6aa60a43c0fd846cf2090e2d812c`, with all 1,015 tracked blobs and modes verified. The retained 9172 checkout was unchanged. The official 287-file cache matches its original ZIP; actual Chrome for Testing 151.0.7922.34 launches used normal sandboxing with Playwright 1.62 and the required absolute Python path. Native Mix257 remains pinned; no alternate executable, download, escalation or sandbox change was used.

The unchanged `bash scripts/gate.sh web` completed **PASS at exact 0e99** on 2026-11-18 at 16:53:12.760192 UTC (11:53:12 EST), exit 0. All seven required steps passed. Log SHA256: `1f6d87df18e08b10e9a70d4b8fb97c5ab32cfb5928256929f0742907e3040e91`. Source, tree and semantic index entries remained unchanged. Earlier failed attempts remain in the external checkpoint: shared-home ENOSPC, then a local HTTP fixture routed through inherited Node proxy settings. The successful process uses the dedicated tmpfs HOME documented in original HANDOFF line 54 and process-only `NO_PROXY` / `no_proxy` entries for `127.0.0.1,localhost`, preserving all external proxy settings. Gate source, tests and thresholds were unchanged; neither `--post` nor `--online` was used.

The visual gate recorded 121 results: five PASS, 116 NOBASE, zero FAIL, no header failures and no page errors. Header SSIM was 0.9059 against the existing 0.90 threshold. NOBASE is the inherited policy and does not establish approved pixel parity. Independent unchanged installer, presets and manual scripts all exited 0 on exact 0e99. Their 42 current screenshots had no observed clipping or overlap, but actual JS/no-JS PDFs exposed pale text and indistinguishable beat hits.

This separate successor repairs those print defects only: white-paper colors, dark readable text including the small brand label, and a sufficiently specific monochrome border for steps 1/5/9/13. The existing real browser scenario now checks print contrast and hit-border differentiation in both JS modes. Both initial defects and the brand-label follow-up were reproduced RED before their respective changes. Final focused browser checks and 29 source tests pass; actual seven-page PDFs show primary-text contrast 18.883061:1, brand contrast 9.739769:1, and hit strokes 1.5 pt versus 0.75 pt for rests. All three screen PNGs remain byte-identical to old CSS. The source manifest retains all 208 entries and updates only this CSS identity. Existing manual content, recovery instructions, navigation, installer backup warn-and-continue policy, preset byte fidelity, browser chains and firmware UI contracts are preserved.

The successor must receive its own exact-commit full gate and independent final review; the completed receipt is saved with the durable Space/Library checkpoint, rather than attributed to the earlier 0e99 PASS. No whole-lane or deployment completion is claimed. Latest authenticated nightly consolidated is `914d68e8ed50698ea77c9d18c221c404629b9332` from #168; requested 0e99 incorporates `dd3e2cfb7a0cde404415029e6d1bca3aefb7960a`. The incoming native Chicago4758 pin and two additional browser tests are a distinct reconciliation/qualification scope and were not substituted under Mix257. Current firmware 240x240 parity, complete owner before/after acceptance, current-base reconciliation and authorized publication remain open. The full current UI source Page snapshot and all earlier requirements accompany the checkpoint.

## Historical checkpoint before RDC verification

The following retained section describes the earlier local environment and its earlier qualification state. Its missing-browser blocker is superseded by the verified RDC execution above; its implementation, requirements and historical failures remain preserved.

Owner: Classic Pro `/root`; Dot Web has relinquished writing. Branch: `lane/web`; existing PR: #156. Continuation parent: `9172ce84caefd9350357895f4d69c99c51e00ade`. Updated: 2026-11-18 10:30 EST. This section records the prepared continuation; its exact commit and terminal gate receipt belong in the durable delivery checkpoint.

## Consumed checkpoint and delivery authority

Consumed Library `libfile_fde3_f-f5acb6be472081918dd6016fbbf97354_2021479872048191acbfdca1f870a539` before writes; archive SHA256 verified as `c2a0ee82af53debbe2827f323a775880e1173c5d833574ed057773a03cf39906`. The 9172 source tree was independently reconstructed and verified as `c2d22440525b931cf6fa781ba60774c1c35154ca`. Authenticated live check at 2026-11-18 10:10:08 EST: #156 open/unmerged at 9172; consolidated base `cd2926dc7892a73a9d1ea4719ab36f88f221d384`.

The historical full local gate PASS applies only to 9172. Its log SHA256 is `00117896ab7e1cf44758c7508272d368347e6390844fc471c469e408738b3e3f`. It does not qualify this successor. **Status posting and merge of #156 are USER-RESERVED.** Keep that PR intact for the user's disposition; preserve this continuation locally on its existing lane. Recheck live refs before any later successor action, reconcile consolidated by merge, and rerun qualification at the resulting head. Integ owns deployment.

No main writes, force-push, devices, Codex jobs, Actions, gh-pages writes, PR comments/reviews/status mutations or third-party emulator execution. Native subagents perform isolated implementation, review and browser testing; root synthesizes one delivery.

## Implemented continuation

- Reconciled installer `1629e703afe539a06cec6dc5acca526b7f06aa64` on 9172: one 20-second deadline spans headers, body and digest, with late-promise fencing and selection cancellation. Preserved the user's deliberate **warn-and-continue on backup failure** policy.
- Reconciled Tools/presets `7080817e7540fb3d2b9bb772651759f222d8febb`: truthful separate-browser-instrument entry through More actions / Start emulator and Mix / Emulator; draft remains intact. Presets bind from a Document root, clear stale editor state, preserve original bytes and exact rename edits, and retain legacy DNPR/ZIP discovery.
- Reconciled the six qualified manual files from e269 on 9172: 28 paragraphs, four recovery items, nine unique IDs and eight chapters preserved; keyboard, print and legacy-bookmark behavior retained.
- Added installer deadline, presets journey and manual browser tests without removing any existing browser-chain entry. All 36 deadline unit cases, including the original 15 and 21 bundled-controller cases, now run in ordinary `npm test`.
- Independent review found that a document-local MIDI counter could forget a handled request after navigation. The presets test now records MIDI and `/emu` attempts in Python-held context observers installed before page creation, aborts runtime loads, and includes three navigation-surviving negative controls. Screenshots distinguish single/bank, expanded help, empty and error states.
- Two old tests asserted the now-false blanket “no playback” copy. Their expectations now verify the separate instrument, no connected-device control, unchanged draft and unavailable fallback. The disclosure test was reproduced failing before repair; the product suite passed afterward.
- Independent eight-lens code review and a separate findings validator retained two P2 follow-ups. The manual now reopens a closed chapter when its already-current topic link is activated, preserving native navigation and modified clicks; its source regression failed before the fix and passed afterward, and the keyboard browser scenario is retained. The deadline fixture now covers pending bundled-controller completion/rejection through expiry and replacement selections, with the actual install-admission and cancellation helpers. Current production controller fencing was already correct; the additional cases protect that branch against regression.

## Qualification state before the post-merge exact gate

The first continuation commit `261b4913a0bbc4c0722a40d4a92ce3f7161ff6fc` completed its actual full gate at 2026-11-18 10:18:00 EST with FAIL: `unit-tests,browser-tests`. Clean-tree, setup, no-loss, limits and build passed; the npm chain reached `test:visual`, then Chromium launch failed because the required bundle is absent. Independent installer, presets and manual browser commands failed at the same launch boundary before journeys or screenshots. Log SHA256: `30d463892a555f873592f47dfb43f40abc52b7a3df797fe69625b823871d5f8a`. This is terminal evidence for 261b, not for its successor.

Live recheck found #167 merged at 2026-11-18 10:19:19 EST, advancing nightly consolidated to `dd3e2cfb7a0cde404415029e6d1bca3aefb7960a` (tree `442f025c0929e494db7b951bc42d6ccb11fa5d09`). All five incoming commits and their reachable objects were authenticated and restored, preserving the Web worktree. This local merge retains Remote startup/recovery handling, its footer geometry repair, the mix-cancel fixture and the complete physical-touch timing regression. The browser chain and source manifest retain both branches’ additions. #156 remains untouched at 9172; the user retains status and merge authority. The resulting exact clean head must run its own full gate, with terminal evidence recorded in the external checkpoint.

NOT_RUN remains FAIL for checklist completion. Historical or source-only evidence cannot satisfy current browser or firmware acceptance.

| ID | Status | Evidence and remaining condition |
|---|---|---|
| C1 | FAIL | Historical 9172 PASS and terminal 261b FAIL retained; exact post-merge gate required. Never use `--post`. |
| C2 | PASS | Authentic dd3 consolidated graph restored and merged locally with 261b; no Web or Remote source/test deletion. |
| C3 | FAIL | Independent source review and historical Tools screenshots reviewed. Independent 261b browser commands built 227 files but failed at missing supported Chromium before their journeys; fresh post-merge visual acceptance remains open. |
| C4 | FAIL | 261b hard-limit gate PASS; exact post-merge hard-limit gate is still required. No intended restricted-path or binary additions. |
| C5 | FAIL | Remaining work is recorded below. |
| C6 | FAIL | #156 status/merge reserved to the user; no delivery mutation performed. |
| W1 | FAIL | 261b build and all npm commands before `test:visual` passed. Full npm/browser steps failed at Chromium launch; repeat on the merged head. |
| W2 | FAIL | Deadline 36/36 and manual 6/6 focused source tests PASS after integration; four isolated guard mutations produced the expected failures. Fresh installer/emulator/preset browser qualification still required. |
| W3 | FAIL | Current firmware UI parity lacks matching current-source renders/state proof; older native runtime and reference screenshots are insufficient. |
| W4 | FAIL | Content and manual preservation checks PASS; current complete phone-landscape/browser acceptance still required. |
| W5 | FAIL | Deployment belongs to Integ after qualification and user disposition; no gh-pages write made. |

## Blockers and remaining work

1. Supported Playwright Chromium 151.0.7922.34 revision 1234 is absent. The normal installer received an HTML “Site unavailable” response with `x-openai-site-blocked: true`. A shared local-preview server escalation was rejected by the environment's granular permission policy. Do not substitute system Chromium, disable sandboxing, alter launch checks or route around the denial. Obtain the supported bundle through an allowed environment configuration, then run the unchanged exact gate and independent browser journeys.
2. The active native 257 runtime remains pinned to firmware `06bd40c57cefcdf6c751b318b1cbaea0914fa8bb`, kernel `25753eb4e7546d023b458ee58b2e9e5de36cd28a`, WASM SHA256 `f289da826f6c2cf270a257c19e506cc0701cb00c27b7215e7f428475de27eb11`. Current firmware consolidated was `76040daa5b52d686a8b7b544296ba5d79610a95d` at recovery. Keep the ten-file runtime pin intact; obtain FWUI's corresponding inventory, source identity, states and 240x240 renders before W3 acceptance.
3. Remote #167's earlier roll/footer geometry failure is historical: its repaired head `9fab9d092887ebab9faf75d9eadf2fec1fd1a5ee` was merged into dd3 after the Remote owner's exact gate and independent three-size footer review. This local Web composition still needs its own gate. Chicago 4758 consumer binding and broader owner-baseline acceptance remain Remote-owned follow-ups, with production pinned to 257. Preserve standalone ec887 Save/Open/End/cancel work in its native producer repository; `web/emu` is absent here, so that source patch is not applicable to this checkout.
4. Preserve firmware parity requirements: shared live glyphs and real parameter values/engine graphs; R22 glyphs and Synth One/SuperJ6 piano rolls; later-approved R23 layout; pan L50..C..R50; small circular TAPE reels in normal FX layout; real BREAK samples/features. Reference edition 2's 518 target rows/368 parameters are targets, not current engine-backed acceptance. Do not replace animation with static icons or substitute fake values.
5. Preserve the complete UI-source Page snapshot updated 2026-11-18 10:07:36 EST (307 blocks), including the latest continuation archive `libfile_fde3_f-05cb5044e3488191b2e4e33e0038b17d_2021479872048191acbfdca1f870a539`. Its R17 drum vectors, R16 reconstructions, R8 SONG, HOME/FX differences, PHASER proposal, 808 motion and SuperJ6 sources remain evidence with their stated classes; they are not native/browser/all-page acceptance. Keep the three explicit historical exclusions and the missing original-file gaps.
6. Run the exact merged clean-head gate now with `DNBOX_GATE_ONLINE=0 DNBOX_EMULATOR_RUNTIME=<qualified-257-runtime> bash scripts/gate.sh web`, without `--post` or `--online`; preserve any terminal failure. Recheck live refs before delivery. After the user's disposition of #156 and after browser/parity prerequisites are met, qualify and deliver only the proven scope. Save source/tests on this lane and final receipts/checkpoint in the existing Space/Library.

## Deletes

None in this continuation.

## Instruction precedence in the previous run

The user's ownership and delivery constraints override older repository defaults that mention Codex, automatic status/comments, timed pushes or lane-owned publication. The historical text below is retained as history. In particular, the current builder intentionally consumes editable source (with stale-output checking); its older manifest-hash narrative is not a current instruction to reject ordinary source edits. Frozen runtime and starting-break assets retain their existing strict identity checks.

## Existing slot-2 removal extraction checkpoint
Owner: remote/integ integration worker. Base: consolidated 548e56799e1a1f0fc3c273cd6f9702cdf8efad4d. Donor commit: 9024d1ec0fb4a4589f405387a57b39eb3184afd3.
Reuses donor codecs and compatibility fixture/test, active preset selector and policy labels. No renderer implementation, R22 redesign, visual baseline regeneration, or native lab copies. Preserves current repository URLs and all untouched tree entries. Original donor retained; #135 overlaps and must be reconciled before later integration.
Checks: 17/17 preset tests PASS. Independent source review pending. Local gate status: FAIL (required steps NOT_RUN). Full Local gate/browser/combined manifest qualification NOT_RUN; draft only, not delivered or merge-qualified. Historical manual substitutions excluded because they incorrectly describe Synth One as present in source94197fc8 and assign former-engine STRING/BRIGHTNESS controls. Review and resolve documentation separately without falsifying history.
Next: source review, exact combined browser/full-gate qualification, then normal integration.

Independent review caught inherited donor omission: canonical synthone filenames lost their explicit Elite/Pro hint. Added the token to both identical codec regexes and regression for both models. Reproduced RED2/2 before fix; preset suite PASS17/17 after fix. Final independent source recheck PASS: reviewer reran17/17 tests and verified3 changed manifest entries; Local gate remains FAIL, required combined checks NOT_RUN.

Review also corrected README: Synth One is a development slot/init migration with playable renderer pending M1, not a released playable/chord-recording engine. Historical Juno0.0.26 qualification retained.

- 2026-11-17: item 1 merged in #152 as `7a2ed1842e7773e249f0e46ac3da156945964626` after the exact-head `dnbox-gate` success; current-source retired-name scan is clear.

- 2026-11-18: Merge consolidated #160 and retain its starting-breaks navigation assertion alongside Web item 2 route, redirect and historical label assertions.

### 2026-11-18 phone layout and route coverage

Chromium reproduced horizontal page overflow on 13 of 19 routes at 390×844 and on Remote connection at 844×390 at 7681fabe. Wrap the narrow site navigation and build identifiers and stack the narrow installer header. The scoped rerun loaded all 19 routes at 390×844, 844×390 and 1440×900 with HTTP 200 and zero page overflow. The visual gate now checks page width and includes all three previously omitted manual pages. Product checks passed locally. Independent full gate, comparative review, firmware screen parity and Pages qualification remain open.

Independent review found stale manual source hashes. Nine entries (three manuals and six Remote files) differed from their checked-in sources. Refreshed their exact identities and made the product build reject size or SHA256 drift before creating output. The product suite passed with a same-size substitution regression.

The build history page now links 0.0.24 and 0.0.24.1 to the immutable commits preserved by the corresponding archive tags. Both former branch destinations returned HTTP 404 and both replacements returned HTTP 200. The 0.0.24.1 evidence directory is at c20943a7. The underlying historical records retain their original provenance. The new per-record destination regression failed before this repair.

A publication rehearsal found stale repository addresses in the generated catalog. The product builder now rewrites only exact historical URL roots in the published catalog’s repo, pages, evidence_url and model pkg fields. The sealed input stays byte-identical. The regenerated 37-version catalog matches the current public Pages file exactly (SHA256 527bf68e895ef8f6adaa66e35b368a4492ef5422cde4a43d9b9b461672833e88), including all 74 model entries and package hashes. The transport-field regression failed before the fix and passes with a lookalike URL and historical free text preserved.

Recovered the four published SMK release-status sections from Pages 42d4027, including the 600b3b45 withdrawal and 94197fc8 evidence. The manual retains the direct backup, project, support and historical documentation destinations. Build history retains its raw inventory link and five published fragment targets. The seven repeated release-note IDs now have distinct anchors; the original first bookmark remains usable. The scoped publication-continuity regression failed before these changes and passed afterward.

</details>
