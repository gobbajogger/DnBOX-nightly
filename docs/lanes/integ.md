# Integration baseline

Target `integration/dnbox-consolidated` at `583f622961fc9975fac746592ce6c483073c4170`, the merge of owner-approved rules #175. Work continues on `lane/integ`. GitHub rejected creation of `lane/integ-baseline` (HTTP 422). The active branch-name ruleset reserves `lane/integ` for this lane. No other open integration PR existed when the work started.

| Item | Evidence at this checkpoint |
|---|---|
| I0 | The full local gate passed at the preceding consolidated SHA `914d68e8`, exit 0, in 842.50 seconds. GitHub status 59271332355 and [#168 gate log receipt](https://github.com/gobbajogger/DnBOX-nightly/pull/168#issuecomment-6984429586). The updater generated 104 proposed images. Independent review has accepted 68 of 104 references, including Build History, the homepage, the mounted Installer and the downloadable Samples, Projects and installer pages. Of the original set, 36 remain open across eight Remote views and the Remote Device page. Independent review subsequently approved the 12 additional Manual slots, bringing that checkpoint to 80 approved references out of 116. Four independently reviewed default Device images bring this checkpoint to 84 of 116. The 32 unfilled slots cover eight Remote Workspace views at four widths. |
| I1 | `CONSOLIDATED-STATE.md` records 23 merges through `914d68e8`, Web #156 at `b3868da0`, rules #171 at `56918d9e`, rules #172 at `be65ec9c`, rules #174 at `e8c8e0c3` and rules #175 at `583f6229`, with source and merge SHAs. |
| I2–I3 | FWUI [#975](https://github.com/gobbajogger/DnBOX/pull/975) merged at `3e307cfa`. Sound [#973](https://github.com/gobbajogger/DnBOX/pull/973) remains open. Final combined firmware and dropout qualification follow the last lane merge. |
| I4–I5 | Firmware I4 passed on stock Linux at 76040daa. All five live BREAK previews and the corrected archive were verified. Firmware-default delivery exceeds both models’ flash headroom. |
| I6 | Firmware #976 reconciles the roadmap. The owner submitted live proposal #984 and the inbox refreshed its count at zero. The five-size browser fixture passed. A signed-in opening-post vote and refreshed increment remain open. |
| I7 | Canonical links are verified. The owner retired the old installer paths and retained GitHub’s automatic repository redirects. The [reachability audit](https://github.com/gobbajogger/DnBOX/pull/976#issuecomment-7058900972) accounted for all 488 historical tips in both repositories, including the eight protected PR heads. Cleanup follows the lane merges. |
| C1–C6 | The complete [1039b686 gate](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7059670134) passed against its original consolidated parent. Web [#156](https://github.com/gobbajogger/DnBOX-nightly/pull/156) subsequently merged at `b3868da0`. The [Web reconciliation](https://github.com/gobbajogger/DnBOX-nightly/commit/0eb984d2c3c472cc54c8a2c27bb8dee29244df73) retained both tips. Owner-approved [rules #172](https://github.com/gobbajogger/DnBOX-nightly/pull/172) require a passing focused-test result posted at the latest lane SHA and no loss against consolidated. PRs that change screens also require independent 10/10 before/after review. This PR changes screens. The 12 new Manual references have independent approval. All four default inactive Device references now have independent approval. The remaining 32 unfilled slots cover Remote Workspace. Seven routes have independently reviewed default renders at four sizes, including Device. Build History still needs a passing bounded 390 px capture and review of the updated 198-record page. |

## Build History package assignments in the visual fixture

The source server now serves the tracked package assignments at the same relative URL the product build uses. Build History previously received HTTP 404 there. The request now returns the canonical 35,952 bytes (SHA-256 `f58f8bf017558a408bb4249eff825b3e134da69103e6d76c0274f4f01c82a270`). Unmatched routes returned 404. The visual gate records failed requests and HTTP errors on all four History views. The 52 visual-runner unit tests passed, including the stale-output control. The product build and 568 edge cases also passed on the preceding, source-identical site. The 390 px capture deadline and outstanding screen reviews remain open. [HTTP results and test output](../../evidence/integ-current-base/history-source-http.tar.xz)

At `6ec5f5ba`, a clean checkout produced 240 site files and passed all 568 edge cases and all 52 visual-runner units. The 390 × 844 Build History page rendered all 198 articles. The initial 1 × 1 capture took 24.642 seconds and the first full-width band exhausted the remaining budget. The run ended at 30.646 seconds without a complete image. The mounted vote fixture refreshed from zero to one owner vote at all five widths. Fresh public GitHub reads returned HTTP 200, and issue #984 still had zero opening-post votes. The GitHub browser was signed out. The cloud executor disconnected after three registered Samples capture labels and three bundled-controller checks on Elite. Fresh terminal results for those browser commands and the Original Manual were unavailable. The earlier four passing Samples captures and desktop Manual timeout remain in their original receipt. [Qualification record](../../evidence/integ-current-base/qualification-6ec5f5ba.json)

## Full gate on b6c3ea4d

The unfiltered gate on `b6c3ea4d6bc3838469c67bba822b372ac0a07a0c` exited 1. Clean tree, setup, consolidated ancestry, limits and build passed. The visual unit stage exceeded its 30-second wait on the desktop mounted Samples page. The separate FunkyBeats browser stage exceeded its 30-second deadline switching from Drums to Sequence during the pitch check. The full gate log SHA-256 is `27d673eccc162bb2860799530948226e2b386c928112e6cdb39d574988b263b3`. [Terminal result and checks](../../evidence/integ-web-reference-review/cloud-gate-b6c3ea4d.json)

All 74 model links from the 37-version generated catalog returned the advertised size and SHA-256. Four entries have corresponding GitHub Releases assets. Each matched the actual release download by size, CRC32 and SHA-256. The 70 historical build entries matched their catalog digests. [Per-package comparisons](https://github.com/gobbajogger/DnBOX/blob/70d0cf6bffd8a2d9eacdd8756a2119a6cd58ac47/evidence/integ-cloud-3c6a5a04/nightly-release-asset-checks.json)

The four-width Remote review identified gray and amber Bass A notes, missing per-part Mix controls and missing selected-pattern actions in 24 of 32 Workspace views. At 1024 × 640, the actual Sound selector displayed JUNO. The Projects MIDI export provider remains unqualified. The cloud workspace became unavailable during the remaining interaction checks. The 32 Workspace reference slots remain open. The later `aba00927` change scoped the offline installer test's negative-case timeout. Its complete gate still needs a terminal result.

## Historical Web merge and current visual tests

The native visual unit suite passed 22/22 at Web merge `b3868da0df1237d86d442cb9259262ee90a13dcb` and 50/50 at lane head `aba00927e0504148a482d38bea998747f90e6828`. Restoring the pinned Installer HTML and shared PNG fixture resolved three missing-input errors from the first local runs. The candidate also passed all three feature-inbox tests. [Historical unit log](../../evidence/integ-web-qualification/b3868da0-visual-units.txt) · [Candidate unit log](../../evidence/integ-web-qualification/aba00927-visual-units.txt) · [Vote-reader log](../../evidence/integ-web-qualification/feature-inbox.txt)

Two native runs of the product builder and its output check passed. Web merge `b3868da0` produced 237 files from 226 verified manifest entries. Integration `44581ec1` produced 240 from 229. The three additions were Ideas files, 14 outputs changed and all old output paths remained. At both `503cc5aa` and `7935a5bf` the product build and output check again produced 240 files. All 51 visual unit cases, all three vote-reader cases and the registered Build History continuity test passed on each head. At `7935a5bf` the mounted Samples readiness test passed its positive and negative controls. A four-width run hit the screenshot deadline at 390 px after readiness had passed. An isolated phone rerun and a complete four-width rerun matched the approved images with zero page or header errors. The unchanged catalog test at `44581ec1` passed the download-byte verifier and all 333 synthetic rejection cases, including the history-installable case that had timed out previously.

Normally sandboxed Chrome 151.0.7922.34 completed the isolated historical 1,440 px homepage capture at `b3868da0` with zero page or header errors. The historical route had no reference. Its original FunkyBeats step-roll keyboard case passed in 40.358 seconds. On `b6c3ea4d` the Drums-to-Sequence pitch case passed for both kits in 19.186 seconds. At `44581ec1` the registered desktop Samples screenshot matched the approved PNG byte for byte and all five resources returned HTTP 200. A separate run of the original installer-admission suite at `b3868da0` completed 78 checks, then exceeded 30 seconds on the development acknowledgement checkbox. The two failed full Local runs remain the full-gate result.

At 390 px the historical 197-record Build History comparison covered 40,202,760 pixels in 18.065 seconds. The 198-record candidate reached the same registered 30-second budget on two attempts. A separate native phone image captured the entire settled 390 × 105,158 page in 54.734 seconds including validation. Independent inspection matched the final scanline, found 198 article borders, confirmed all 197 prior records in order and checked the release and fallback links and all six footer links. An independent lossless capture matched every one of its 41,011,620 RGB pixels and took 73.342 seconds including validation. The registered source and diagnostic served an optional assignments request with HTTP 404. The built site served it with HTTP 200. All three pages rendered the same 82,706 bytes of visible text and reported zero uncaught JavaScript errors. The phone timing requirement remains open. [Native builds, case output and phone comparison](../../evidence/integ-web-qualification/native-replay.tar.xz) · [Historical phone capture](../../evidence/web-routes/builds-full-page-capture.json)

The cloud browser showed a signed-out GitHub session on test proposal [#984](https://github.com/gobbajogger/DnBOX/issues/984). The closed opening post had zero reactions. The live signed-in increment remains open. The nightly lane at `aba00927` contained all 1,117 tracked paths from consolidated `583f6229`. All 28 source-ledger PRs matched GitHub's merged records and their merge commits are reachable from that consolidated tip.

## Mounted Samples capture

The unfiltered visual suite at `503cc5aa` timed out waiting for network idle on the mounted Samples page. An independent Chromium trace at 1,024 px recorded five completed HTTP 200 requests. Both request trackers were empty at timeout and the full-page screenshot matched its approved bytes. The route now waits for the actual file chooser, initialized workspace, disabled device writes, loaded stylesheets and fonts. HTTP failures and failed requests are recorded. A native test passed with an unrelated request still pending and rejected an unbound chooser, a missing stylesheet and a missing font. All four registered Samples images passed without a baseline update. [Browser output and four-width image hashes](../../evidence/integ-current-base/mounted-samples.json)

At `7935a5bf`, the 51 visual-unit tests and native Samples readiness regression passed. Each of the four registered Samples captures matched the approved pixels, with zero page or header errors. The filtered runner reports partial coverage by design. The unfiltered visual run passed all three native readiness tests and went beyond Samples. It exited 1 when the 1,440 px Original Manual exceeded the existing 30-second full-page screenshot budget. [Exact command output](../../evidence/integ-current-base/exact-7935a5bf.tar.xz)

At consolidated `583f6229`, clean-tree, setup, no-loss, limits and build passed. The terminology scan rejected the former engine name in the owner's rules document. The initial full command lost its browser stage when the runner disconnected. A separate unfiltered browser-stage replay exited 1 in the bundled Pro controller-metadata fixture when navigating to the synthetic installer exceeded 30 seconds. All 14 FunkyBeats scenarios, all three Mix viewports, 679 installer-admission checks and 34 history-response checks completed first. [Consolidated command output and browser replay](../../evidence/integ-current-base/base-583f6229.tar.xz)

## Build History and archived Manual qualification

The registered desktop Build History capture at 1,440 px includes the new v0.0.26 record and all 197 previous records in their original order. A separate reviewer checked both model names, release and fallback links, changed status labels, two corrected destinations and all six footer links. The reviewed image is 1,440 × 72,622. The remaining Build History captures at 390, 844 and 1,024 px exceeded the original 30-second budget. A separate phone capture finished in 26.82 seconds and omitted the final settled row, so the prior phone reference remains. [Four-width result](../../evidence/integ-current-base/build-history-review.json) · [Desktop comparison](../../evidence/integ-current-base/build-history-desktop.json)

At `aba00927` all 398 catalog status checks, the 50 visual unit tests, six scan-race scenarios, the three vote-reader tests and five browser voting viewports passed. The unchanged unfiltered visual command exited 1 after the 1,024 px Legacy Manual capture exceeded its budget. An isolated repeat failed at the same capture. The revised strip sizing matched the approved Legacy images at 844 and 1,024 px within that budget. It preserves the previous strip sizes at 390 and 1,440 px. Independent review checked the seam, footer, viewport and shared deadline. All 51 updated visual-unit cases passed, including an oversized-row negative. The complete visual gate and the 32 outstanding Remote workspace approvals remain open.

## Integration verification on the #175 base

The owner submitted [firmware proposal #984](https://github.com/gobbajogger/DnBOX/issues/984). The production inbox loaded the proposal and refreshed its count at zero using live GitHub responses. The proposal closed with zero opening-post reactions. Chromium subsequently refreshed the empty live inbox. The five-size browser fixture exercised the zero-to-one transition, including the owner vote at 240 px. The actual signed-in increment remains open. The inbox source and browser fixture were identical from `061e9521` through `b6c3ea4d`. [Vote readbacks](../../evidence/integ-current-base/feature-votes.txt) · [Five viewport results](../../evidence/integ-current-base/feature-layout.txt)

Independent design review compared 36 renders per revision against the owner PDF. The Sequence part colors, expression mark widths, Chicago controls, mixer strip controls, pattern selection and project actions have open findings in the 32 Workspace slots. All four independently captured default Device images matched the approved images introduced at `b6c3ea4d`. Connected Device functions require stock protocol evidence. [Remote review](../../evidence/integ-current-base/remote-review.md) · [Capture hashes](../../evidence/integ-current-base/remote-captures.json)

The [current combined firmware](https://github.com/gobbajogger/DnBOX/tree/959bf9489f949713997410d81dba798aaa73e6cf/artifacts/integ-candidates/c51d9d86) includes Sound #973's #985 engine changes and merged FWUI #975. Stock Elite and Pro builds passed package validation and matched fresh downloads. Two complete heavy host sweeps missed 13 and 15 render-thread deadlines. All 64 output traces matched across those two runs. The final fixed-work control missed 36 deadlines after all workspace builds and browsers ended. The five original BREAK samples need 109,394 B against usable budgets of 5,168 B Elite and 5,184 B Pro. The stock leak-sanitizer check passed. [Latest firmware ledger and evidence](https://github.com/gobbajogger/DnBOX/blob/541e3c96754de921ad7f27bb1a4b5d9490cff4ab/docs/lanes/integ.md)

At `425812c2`, clean-tree, setup, no-loss, limits and build passed. The catalog subprocess timed out on the history-installable negative case at 15 seconds. All 680 installer-admission checks passed in Chromium. The bundled Pro browser run timed out waiting for its test API. The full Local command exited 1. Its output has SHA-256 `8275e6cdf2279b34ef63cc1ff0f4c6baa655e43acd58dc75aea4ebf3e5d5b3e7`. At consolidated `583f6229`, clean-tree, setup, no-loss, limits and build passed. The terminology test rejected an occurrence in the owner's RULES.md. The focused terminology test passed on the lane.

On `b6c3ea4d`, all four What's New references reproduced byte-for-byte with the registered capture helper. An extra paint added a row at 1024 px and 390 px. Two separate runs of the offline-installer regression timed out during setup of the second mutation. The test now applies 700 ms only to the two expected readiness failures. Normal capture retains its deadline and the same readiness predicate. The native Chromium positive case, both mutations and all 50 visual-runner unit tests passed. [Four-size captures and test output](../../evidence/integ-current-base/readiness.txt)

## Review on the consolidated rules through #175

Independent Chrome renders and user-flow checks approved the four canonical sizes for Presets, the current Manual landing page, Tools, What’s New, the mounted Installer, the downloadable installer and the default inactive Device binding. Reviewers checked 240 px as an additional size. The mounted Installer admitted the actual Pro release package. The downloaded empty preview exposed the published-installer link and kept device-write actions disabled. Denying MIDI permission previously offered an unavailable retry action. Both installers now identify Connect USB in English and Japanese, with explicit retry and empty-port tests. [Review receipts and exact screenshot hashes](../../evidence/integ-web-reference-review/)

The original full gate at consolidated Web merge `b3868da0df1237d86d442cb9259262ee90a13dcb` passed clean-tree, setup, no-loss, limits and build. Unit tests stopped at the 1440 px homepage readiness timeout. Browser tests stopped at the FunkyBeats step-roll keyboard interaction. The full log has SHA-256 `00e5f2ed80ea12f2ca03857ddb8c117c7b6939a1c4b787ca7f70d58620261075`.

The unfiltered local gate at `061e95213f20126f39b51e7828eecf2c2f274289` exited 1. No-loss failed against the newer consolidated tip, and the visual sweep found changed screens and exceeded its 30-second Legacy portrait capture budget. All 680 installer-admission checks passed. The Project Workspace browser scenarios passed before the process tried to write its receipt to an unavailable hardcoded temporary path. The full gate log has SHA-256 `ea2074d8be4c7e49b1b9ec9bd36f94372c344a9343a4c0d1594399f7ed2e3255`. At `425812c2` the consolidated tip is an ancestor with zero deleted paths. The stored original registered captures matched all 28 newly reviewed images using the repository comparator. A fresh registered render of both installers matched all eight images at the four sizes with zero different pixels, page errors or header failures. The corrected Legacy capture matched all pixels of the approved 390 × 45592 image within the original budget. The 390 px Build History gate, remaining Workspace design approvals and a complete gate on the resulting head remain open.

## Downloaded installer and product terminology

The downloaded installer now opens its Release status link at the local `docs/new/index.html` file. The previous directory URL failed the local-file navigation test. The generated installer and its reviewed release fixture carry the same change. The retired-engine scan now treats the owner's root policy as documentation. A temporary retired label in the Presets source still failed that scan. The focused preview, release, full-file comparison and product terminology checks passed. The four approved homepage screenshots also matched at published commit `b62b3c1b`.

## Homepage capture readiness

Two complete Local runs at nightly consolidated `b3868da0df1237d86d442cb9259262ee90a13dcb` exited 1. Both timed out waiting for the desktop homepage to reach network idle. One also lost the installer browser after 424 checks. The other timed out on a FunkyBeats keyboard gesture.

On the candidate based on `3607b65c`, the homepage capture waits for the initial replay frame, its controls and both Barlow font weights. The registered browser test captures the frame while a background request is pending and rejects an uninitialized or altered replay. Four approved homepage images matched at 1440×900, 1024×640, 844×390 and 390×844. The run had zero page errors, header failures or reference writes. Other routes retain their existing readiness checks. [Four-viewport output](../../evidence/integ-homepage-readiness/four-viewports.txt)

## Standalone Samples home link

At `3bfdc980`, the native builder and output checks passed. All 47 visual-runner unit tests passed. The focused Node run passed 77 cases and exposed one outdated Samples test: it expected the home link to point to `../`, while both the standalone source and its generated copy correctly link to the local installer. The regression now checks `../install/index.html` in both files and runs in the ordinary sample-discovery test command. The product and previously reviewed images retain their bytes.

## Owner-approved rules #171

The 21 November rule change protects source history and review of changed screens at lane merge, and the public installer and firmware at publication. The combined branch runs the complete Local gate once after the final lane merge. That gate must pass at the exact SHA before a `gh-pages` fast-forward or any promotion into `main`. This nightly lane changes no firmware, so the firmware-build condition does not apply here. The owner’s `AGENTS.md`, `RULES.md`, `CHECKLISTS.md` and Web lane entry are retained from `56918d9e`.

On 21 November 2026 the owner reported disabling `gates.yml` in DnBOX and DnBOX-nightly for Rule 2 and C4. At 02:32 UTC GitHub’s public API still returned `active` for both workflow records. Repository-wide Actions permissions required administrative access. These are the observations at that time. The project runs its checks locally.

## Web #156 reconciliation

The [Web merge](https://github.com/gobbajogger/DnBOX-nightly/commit/b3868da0df1237d86d442cb9259262ee90a13dcb) advanced consolidated by 34 commits after the integration gate passed. The candidate retains all 68 accepted reference blobs and Web’s hardware reports, catalog and report behavior. The combined Build History includes the 197 original records and the new v0.0.26 release record. Its 198-record page and the mounted installer need new four-size comparisons. The mounted installer must select and admit an actual package. The empty standalone preview keeps its separate capture path. The viewport scheduling test checks the four package waits and four Samples navigation calls. The 32 workspace references and four Device references are the remaining 36 of the original 104. Web adds 12 reference slots for the legacy SMK-37 manual, the projects guide and the protocol manual at four widths each. The combined sweep therefore has 68 committed PNGs and 48 unfilled slots out of 116. Previously accepted PNGs still need comparison on the combined tree. The source-owned Device binding remains unadmitted. The signed-in opening-post vote also remains open. The focused browser tests and independent design review on the reconciled screens are pending.

This branch changes the product site, documentation and host tests. Firmware sources and packaged image payloads are identical to the consolidated base. No production deployment is included.

## Installer comparison scratch files

The five tests for the pinned installer left 11 temporary directories containing 17,056,639 bytes per run. The comparison now removes its own directory on success and failure. The six-test suite exercised an accepted render, a rejected change and a temporary path containing spaces, and left zero files. All 68 existing reference images are retained.

## Mounted Installer

The product header links to all eight destinations. The Firmware, Samples and Projects tabs remain accessible by touch and keyboard. The mounted page keeps one product header and one firmware heading. At five widths from 240 to 1,440 px, the page fits horizontally, changing models resets consent, and denying device permission leaves the install guarded.

The four full-page references show the released Pro bundle after the browser verifies it, before a keyboard is connected or consent is given. Independent and producer captures matched byte-for-byte at every size. The unavailable-package path has a separate browser check. Both public model bundles passed their published byte counts and SHA-256 checks. [Independent browser evidence, raw measurements and four 10/10 reviews](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7059076605).

## Homepage and Builds follow-up

The Chicago hero shows SAW at raw WAVE 0. The sound list names SuperJ6, and the archived Juno demo keeps its original frames. Independent full-page captures matched all four homepage references. At 240 px the eight physical knobs and nine header links fit. The Builds capture divided the 197-record page into checked bands and finished within the original 30-second budget at all four gate sizes. All four Build History screenshots now match a separate Chromium render pixel for pixel. Across 197 records, 247 generic links now name their 198 distinct destinations. Every URL, original record and link order was preserved. All nine header destinations work, filters and expanded records fit at the four gate sizes and 240 px, and the full page fits the 390 px viewport. [Independent label review and owner handoff](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7058820949).

## Reproduced results at nightly 914d68e8

- I0. The complete baseline log is 252,786 bytes, SHA-256 `712d229097dde133e1feb78f431e931b6b00ee81e570afd3746d80f4475e6ed1`. The catalog already writes to `os.tmpdir()`; 333 catalog rejection cases passed. The unmodified visual updater generated 104 proposed PNGs (26 states at four sizes). The five additional checks passed. The earlier count of 43 predates these states.
- I0 review. A separate Chromium measurement found horizontal overflow on 12 of 72 sampled site/standalone page–viewport combinations on this base. At 390 px the builds page measured 593 px wide and the device page 699 px. At 844 px the device page extended to 1,003 px. The existing Web [#156](https://github.com/gobbajogger/DnBOX-nightly/pull/156) resolves those issues: 0 overflowing pages in 84 checks on `9172ce84caefd9350357895f4d69c99c51e00ade`. Reconcile approved references after the relevant fixes land. A screenshot of an overflowing page cannot serve as its accepted target.
- I5. Both published `/private-audio/<id>` forms (bare and `.wav`) returned the expected bytes for all five samples. An unknown ID returned 404. The live exporter and assets reproduced the 110,844-byte archive, SHA-256 `3a7f19858d23309dac7375b88d0537cae7854ad65680edd1f95d4dbc0beed4c6`. The full bank occupies three zones in slot 1 and two in slot 2. The physical keyboard and firmware-default delivery are outside that result.
- I6. The Help page now links to the proposal inbox. Requests and opening-post votes are stored on GitHub. The page reads open feature issues and counts unique voters, identifies the project owner by numeric ID, and refreshes on return. Errors leave the vote count unknown. Three tests cover pagination, identity, counts and failed reads. Chromium verified the navigation, refresh and error views at four sizes with a simulated GitHub read response. The signed-in submit-and-return test on GitHub remains open.
- I7 owner decision. Public links use the [DnBOX repository](https://github.com/gobbajogger/DnBOX), [stable installer](https://gobbajogger.github.io/DnBOX/install/) and [nightly installer](https://gobbajogger.github.io/DnBOX-nightly/install/). GitHub’s automatic old-name repository redirects remain in service. The owner retired the two legacy Pages paths. The three integration-only redirect files from the earlier proposal were removed. No changes to the account site or repository names are needed. Branch cleanup follows the remaining lane merges.

### Published v0.0.26

The README, CHANGELOG, release guide, What’s New, installer and manual link to the [v0.0.26 release](https://github.com/gobbajogger/DnBOX/releases/tag/v0.0.26) at `94197fc8`. The owner verified startup and restart on a real Elite and Pro. Older catalog and history records retain their own package hashes. All 18 focused release and installer-hunk tests passed, including negative controls for a different tag and an unsupported hardware claim. The catalog rejected all 333 invalid cases. The four reviewed What’s New captures now show the published version.

An uncached read of the deployed installers and their embedded catalogs on 21 November 2026 UTC confirmed that the stable channel listed 0.0.25.1 (`79280e76`). Nightly listed `nightly-94197fc8-dev`. Both nightly model checksums matched the v0.0.26 release. Its older hardware-test label predates the owner’s startup and restart results. [Stable catalog](https://gobbajogger.github.io/DnBOX/versions.json) · [Nightly catalog](https://gobbajogger.github.io/DnBOX-nightly/versions.json) · [Release and checksums](https://github.com/gobbajogger/DnBOX/releases/tag/v0.0.26).

At `f3974721` all 529 Node edge checks passed. The subsequent Chromium inbox check exceeded the 30-second navigation limit opening Help. The unchanged test completed all four sizes in a separate run. Keep the full gate open until it passes at the final head.

The [complete `f3974721` gate log](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7056593599) also records a browser crash while Native Sound tried to save its failure screenshot. The browser test retained every 240×240 pixel buffer it observed. A deterministic replay of 2,048 real-size frames retained 235,929,600 bytes in both original observer modes. The narrowly scoped observer from [Remote #169](https://github.com/gobbajogger/DnBOX-nightly/pull/169) retained zero pixel-buffer bytes and kept the required frame readings and latest five complete envelopes. The page still receives every original frame. A separate diagnostic test confirmed that a failed screenshot now preserves the initial exception as well as the capture error. All 151 Remote Node cases and the browser sandbox contract passed. The failed gate could not identify the initial cause of its browser crash.

The [complete gate at `5658da37`](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7057025272) passed unit and visual checks. The browser stage failed at 390×844 while reading the minimum value of Chicago parameter 9. The assertion reached its five-second deadline and the renderer crashed during diagnostic capture. The [same portrait scenario](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7057119231) passed on a fresh Chromium launch.

The Native Sound test now launches one normally sandboxed Chromium process per viewport. An independent reviewer confirmed that the three original scenarios, interactions, timeouts and assertions are identical. In a [three-viewport run](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7057363710), desktop (1440×900), portrait (390×844) and landscape (844×390) each exercised all 40 controls and Undo depth 16, issued 159 native requests and made zero MIDI calls. All three browser processes exited cleanly. The 830-second run recorded no target crashes. The original crash cause remains open. The complete Local gate must pass on this commit before C1 can close.

The [complete gate at `bd0eda7b`](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7057564627) exited 1 after 959 seconds. Two operations reached their original 30-second deadlines.

| Gate stage | Last successful observation | Failure |
|---|---|---|
| Unit tests, visual capture | 16 images completed. The accepted desktop SMK-37 manual, Presets and Starting BREAK images matched. | Full-page capture of Build History at 1440×900 timed out after fonts loaded, before comparison. The earlier image of the same page was 1,440×72,069 pixels. [Capture details](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7057511931). |
| Browser tests, installer admission | Checks 1–462 passed, including the four 320-pixel empty-installer checks. | At 390×900, the first check of the empty installer timed out locating the Install button (`#go`). The gate recorded neither its HTTP response nor its disabled state on that attempt. |

The admission test, generated installer, visual test and Build History source have the same Git blobs as `5658da37`, which completed all 679 installer admission checks and captured Build History at four sizes. The host recorded memory exhaustion during the later run. Its counters did not identify the affected process. Separate checks on a quieter runner will record the page response, button state and full PNG dimensions. C1 remains open.

A local reconciliation of Web `56c99fb8`, Remote `37982b3f` and integration `cfef0c05` preserved all 28 accepted reference blobs, all 197 existing history records and the new public release record. Its product build produced 247 files and passed 113 focused tests. The independent visual and full gate requirements continue to apply to a future actual merge. [Exact inputs, replayable patches and verification log](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7056578290).

The deployed Starting BREAK page also passed real Chromium playback for all five samples with zero checkboxes selected, followed by selection and download. The resulting archive was 110,844 bytes and matched the independently verified digest. [Playback and export receipt](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7055766883).

### Independent visual and browser review

The [full proposal archive and recovery instructions](../LIBRARY-INDEX.md#integration-visual-proposals) cover 26 states at four viewport sizes from `914d68e8ed50698ea77c9d18c221c404629b9332`. At the previous checkpoint, the candidate included **28 independently approved default-state references**. What’s New, Help, Tools, Presets and Starting BREAK passed at 1440×900, 1024×640, 844×390 and 390×844. The disconnected Remote Identity view passed at the same four sizes, with the MIDI port selectors individually labelled and both device connection actions disabled. Four new references for the current SMK-37 manual passed independent review at `5a8fe38b`. The official capture tool reported zero page and header errors. The manual fit each viewport at its exact width, all 13 main links resolved, and the reviewer verified its v0.0.26 feature and physical-test wording. At that checkpoint 76 images remained open. The gate continues to report missing references explicitly.

The shared header overflowed 390 px and 240 px viewports. At 844 px only 0.39 px separated the wordmark from the first navigation link. This branch reuses the header wrapping from [Web #156](https://github.com/gobbajogger/DnBOX-nightly/pull/156) and gives these controls a horizontal gap. Two installer links on Starting BREAK also touched at all four tested sizes. Both defects now have native Chromium navigation-box tests. Inbox titles containing a 64-character hash expanded the document to 596 px on mobile. Long titles now wrap. The browser regression verifies the GitHub issue link, initial empty vote count, refreshed owner vote and navigation geometry at 1440×900, 390×844, 844×390 and 240×240. The first navigation link is visible at 390 and 240 px. A separate real-browser preset import exposed a Document mount error. The repaired page imports, renames, retains and downloads the edited preset. All 11 focused Node tests, the browser sandbox contract and the 222-file build passed. A live invocation of the production inbox reader received HTTP 200 for the repository and open issues and returned the expected empty list on 2026-11-21 at 02:03 UTC. A signed-in vote still needs a real proposal.

Independent reference review held all 32 Remote proposals. The owner's PDF and corrections require green Bass A notes and thin step lanes, per-part Mix controls, selected-pattern operations, and grouped Chicago controls. These requirements are tracked by the Remote lane. The current home hero still shows WAVE as a percentage. The installation view contains a compressed duplicate navigation header. The archived FM-1 manual also had an empty heading and joined section numbers in that review. [Review findings](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7055501295).

GitHub lists [v0.0.26](https://github.com/gobbajogger/DnBOX/releases/tag/v0.0.26) as Latest at `94197fc8`. The owner tested startup and restart on the SMK-37 Elite and Pro. Both published installer links already use the renamed paths. The preceding full integration gate passed at `edba17d03e6d2583b9bada91bcceb198ab49678a`. [Complete log](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7055802549).

C1 and C3–C6 remain open pending the final exact-candidate gate, outstanding design defects and independent acceptance. C2 was verified against the pinned base. No tracked project file was removed. The candidate hard-limit scan must pass again.

### Removed from this draft under the owner’s I7 update

- `deployment/account-pages/X0X37-for-Loopy-Pro/install/index.html` and `deployment/account-pages/x0x37-for-Loopy-Pro_nightly/install/index.html` were draft-only redirect pages.
- `tests/edge-legacy-installer-pages.test.mjs` tested only those pages. All three paths were absent from the consolidated base.

### Installer receipts and Local gates

The install-report issue form records the build ID, model, firmware SHA-256, port name, startup result, restart result, browser and notes. Each startup and restart field accepts success, failure or an untested result. The dated Rule 2/C4 note distinguishes the owner’s reported disablement of `gates.yml` from the state returned by the public GitHub API. Repository-wide settings were inaccessible to the public reader.

### Archived FM-1 manual and installer fixture

The archived manual now opens with its existing document title. Each of the 19 numbered headings matches its contents link, including “10 Recording”. All 15 original illustrations keep their artwork and captions. Their intrinsic dimensions reserve space, and images shrink to fit a phone. Before the fix a fully loaded 390 px page extended to 540 px. Independent Chromium review confirmed that the page fits at 1440, 1024, 844, 390 and 240 px, that all 95 section-link checks pass and that the title is visible on arrival even at 240×240. The four full-page PNGs were independently accepted. This brings the original 104 proposals to 32 accepted and 72 outstanding.

The browser-admission fixture previously returned the installer for workspace and image requests. A 320 px empty-catalog test loaded 39 frames, including more copies of the installer. The fixture now serves the actual committed workspace files, keeps its synthetic install route and checks both workspace APIs. The same three viewport controls passed all 13 assertions. This removes the recursive frames. Two longer attempts each passed 257 checks before navigation timed out on the next synthetic installer. Its 11 field assertions passed in isolation. The complete candidate gate is still open.

The later Web, Remote and integration inputs also built together locally at tree `c5fe8947f7f66aceddc85ab617ac206b35d96773`. The build produced 252 files, and independent review verified every digest in the 231-entry source manifest. The simulated-MIDI receipt test used the published Elite package. A real signed-in proposal vote and the four source-lane merges are still outstanding. [Three-lane checks](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7057593863) · [BREAK, voting and cleanup evidence](https://github.com/gobbajogger/DnBOX/pull/976#issuecomment-7057640442).

### Projects, earlier presets and the full Local gate

The [full Local gate on `cbe03f76`](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7057958399) passed all 680 installer-admission checks, including both embedded workspaces. The build, no-loss and limits stages passed. Two failures kept C1 open. Chromium crashed during a full-page site screenshot after the fonts loaded. The log did not name the route. At 1440×900, Native Sound waited 30 seconds for a Chicago voice 0 edit to return a successful packet. The exact parameter and the cause remain unknown.

The visual test now logs the screen and size before capturing it. For identical PNGs it verifies the PNG structure and decodes the pixels once. Differently encoded images follow the existing pixel comparison. A 1024×2048 crop of the archived manual used a median 41,944 KiB peak memory, down from 82,960 KiB. All 12 visual-test contracts passed, including damaged PNG and alternate encoding cases. Native Sound now writes the attempted voice, parameter, previous value and packet counts before trying to photograph a failure. The original time limits and assertions still apply.

Songs & projects now uses DnBOX in its title, navigation, connection instructions, initial project name and file-size error. The offline page matches its template and both shipped libraries. Existing project files keep their `.x0xproject` extension. Across five widths including 240 px, all ten before/after comparisons of the mounted and offline pages preserved control geometry and disabled states. The standalone page still has the previous outstanding design finding for its white, system-font presentation.

The earlier preset reader displays SuperJ6 in its target menu, preview and session. An existing engine 3 file imported and exported byte for byte as `Lead.juno.dnpr` at five widths. The historical `juno` token and the other engine labels are preserved. The 23 preset tests passed. The eight initial full-page references for the two screens matched independent captures pixel for pixel. A second review of the mounted Projects header found that its first link, Sounds, was hidden at 390 and 240 px. The original geometry check had examined only visible body controls. The shared mobile header rule now applies to the mounted Projects header. A browser test hit-tests all nine expected links at five sizes. The old page failed at the two narrow widths and the corrected page passed all five. Only the 390×844 reference changed. This checkpoint brought the reviewed total to 40 of the original 104 proposals.

A later integration rehearsal at tree `9c7ce1b435d14fa43fa7d2afd7f979f2d5f89dfe` combined Web `8e2e9fb6`, Remote `0753ff3f` and integration `cbe03f76`. It built and byte-checked 253 product files with the qualified emulator. Its 232 manifest entries, 69 Node tests and 13 visual-test contracts passed. These checks cover that local tree. Final component merges, the complete candidate gates, a signed-in proposal vote and final independent acceptance are still open.

### Passing nightly gate at `1afa3dad`

The [complete Local gate](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7058336748) exited 0 at `1afa3dade49e3d1079e61b4b3090b40e662e0c5f` with a clean tree before and after. It passed all 680 installer admission checks, Native Sound and R22 at three viewport sizes, and all required build, unit and browser stages. The visual run recorded 40 accepted PNG matches, five other passing checks, 64 missing references and zero image, header or page failures. The complete 204,497-byte log has SHA-256 `a742dbef10b3403643ad5268c2f8d46292c745d32e90a53587bb5466aeb44e36`.

### Mounted Samples page

The Samples workspace uses the shared product navigation and the R22 palette. Its home link appears once. On the previous page, Sounds disappeared at 240 and 390 px and Connect used the standalone tool's olive color. The visual check verifies all eight destinations, the current Samples link, the home link count, width and computed colors. The navigation regression also checks the expected links and their spacing at five widths, including 240 px.

Independent review scored the four disconnected views 10/10 at 1440×900, 1024×640, 844×390 and 390×844. All four full-page PNGs matched independent captures. Native viewport captures at 844 and 1024 px varied by up to eight pixels with a maximum channel difference of 1/255. The original comparator counted zero changed pixels. Browser checks at those widths and 240×240 verified keyboard navigation and skip-to-content. The installer’s Samples iframe and the standalone page retained their controls. This brings the accepted set to 44 of 104. [Reviewed reference images and raw browser results](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7058207004).

The [receipt form and installer reader](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7058014195) agreed on all eight form IDs for both released packages. Across 90 manual fixtures, only successful matching reports counted. All 270 mismatched-model, checksum and cached-port controls returned zero successful installs.

### Downloadable Samples and Projects

Samples and Projects now bundle the two Barlow faces and their license in each downloadable page. File-mode navigation opens the actual HTML documents, so the two tools can run locally with networking disabled. The hosted installer continues to load and coordinate the embedded workspaces. The qualifying catalog fingerprint includes the font assets and the shared rendering code.

Independent review scored all eight default views 10/10. Each full-page screenshot matched an independent file-mode render at 1440×900, 1024×640, 844×390 and 390×844. The 240 px checks also covered keyboard use and horizontal fit. Samples played the reference and encoded versions of a local WAV. Projects inspected a portable bundle and rejected its truncated counterpart. The device-write controls stayed disabled. The real hosted installer passed 680 admission checks. The embedded Samples and Projects controls and screenshots matched their earlier versions. [Independent reviews, exact file-mode replay and hosted installer checks](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7058642226).

The [complete gate at `fe293c51`](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7058547649) finished with one failure. Capturing Build History at 1440×900 exceeded its 30-second deadline. The browser suite passed, including Native Sound and R22. Four homepage views were also approved in the intervening checkpoint. At that checkpoint 48 proposals remained open. Remote and Web remain under review in [#169](https://github.com/gobbajogger/DnBOX-nightly/pull/169) and [#156](https://github.com/gobbajogger/DnBOX-nightly/pull/156).

### Downloadable installer

The [complete local gate on `b5806b98`](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7058833097) passed all seven stages, including the four full-height History captures inside their original deadline. At `0c5d42a1`, the full-file comparison with the pinned published installer rejected the new local workspace links and frame initialization. The test now checks the exact changed lines and the complete bundled stylesheet. Negative controls catch changes to a font byte, the workspace path, the manual destination and the permission call.

The standalone installer uses the R22 palette and includes both licensed Barlow faces. Its controls now fit at 240 px. Four independent comparisons of the compiled file reproduced all four proposed screenshots over both local HTTP and file URLs. The release notice, runtime script and model/confirmation controls retain their reviewed contents. A denied explicit connection leaves installation disabled. The retained-catalog renderer and downloadable preview include the same fonts and license. All 534 edge/preview tests and 680 installer admission cases passed on the prepared successor. [Independent review](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7058725549) · [Compilation, byte-comparison and browser results](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7058852586).

Forty-four proposals remain across eight Remote states and the product installer, Build History and Remote Device. The Build History proposals remain under review while the remaining generic evidence links receive specific labels. [History review](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7058820949).

## Earlier evidence

Merged #155 as fbb9c46b0f435b1ac09f912f49104a79de3b501b; five-sample source/export and aliases landed, live publication remains separately qualified.

# Current integ item1 — 2026-11-17 19:00 VLAT
Owner agent: dot/integ   Branch: lane/integ   PR: #155   Head: this commit
Gate at final head: NOT_RUN; no merge or deployment completion claimed.
Now: Five original BREAK previews and selection/export; /private-audio/ aliases tested locally. New corrected consolidated234f3895 merged; prior c3dc PASS predates this composition. Shipped sample export metadata included; final exact-head gate pending. Deployed five WAV URLs currently404, publication not complete.
Next: qualify final inputs, post the actual PASS line, merge only when allowed, then verify deployed aliases.

## Preserved lane history
Move: M0 (clean start and green gate)   PR: #136   Head: this commit
LEFT items PASS: 0/2; failing: L15 L16
Gate at head: NOT_RUN (M0 start checks next; full green gate remains follow-up)
ETA merge: start files after M0 checks; green gates 2026-11-17 22:00 VLAT

# Lane: integ   (copy to docs/lanes/integ.md; update in every push)
Owner agent: <name>   Branch: lane/integ-<topic>   Draft PR: #<n>   Head: <sha8>   Updated: <YYYY-MM-DD HH:MM VLAT>

## Checklist (from CHECKLISTS.md)
| ID | Check | Status (PASS/FAIL) | Evidence (SHA + log path or PR comment link) |
|---|---|---|---|
| C1 | Local gate at head | FAIL | |
| <S1…> | | FAIL | |

## Now / next
- Now: <item, riskiest first>
- Next: <item>

## Blockers (each with its fix and the route being tried; never "waiting")
- <blocker> → <fix> (since HH:MM)

## Top 3 risks for the next hour
1.
2.
3.

## Deletes (files this lane removes on purpose, with reason; the gate's no-loss step reads this)
- <path> — <reason>

## Conflicts noted (RULES 23)
- <conflict> → reading used: <…>

## Owner-directed start-only split
This PR now contains only the supplied prep manifest, source ledger and removal list. All unrelated product/test/environment changes are removed from its effective diff by a normal successor commit, never by force push. Complete broad work remains recoverable at backup/integ-before-start-split-20261116 (b39e99c4197544037896fd4ed463a338a5d423c3).

Latest owner direction permits these two start-only merges after meaningful touched-file Local checks; this is a specific sequencing exception, not a changed RULES.md v2 text or a claim that the full before/after application gate and viewport review passed. Independent QA records exact scoped results and known defects on the PR. All lane finish lines remain open.

The gate scripts are exact supplied ZIP bytes, not later corrected versions. Known follow-up defects include firmware fail-fast/budget attribution and gate environment/prerequisite handling; the touched-file gate must not execute unsafe browser routes or treat the original scripts' possible false PASS as qualification. Full Local remains unqualified.

Removal-list exceptions retained: AGENTS.md. AGENTS.md is replaced, not deleted; other retained paths are existing test dependencies.

## Exact removals
Each path below is an obsolete brief/rule/handoff explicitly listed in the supplied remove manifest; the original bytes remain in the inherited baseline and backup history.
- `coordination/edge-case-hunt/EC-20261026-011.json` — supplied removal list; historical instructions, retained in Git history.
- `docs/nightly-first-development-gate.md` — supplied removal list; historical instructions, retained in Git history.

## M5 BREAK source composition (2026-11-17)

Owner: integ. Dependency: reviewed narrow removal PR143 at937c519f81073515b381fab492f3fb2e017566a5, based on consolidated548e56799e1a1f0fc3c273cd6f9702cdf8efad4d. Reuses existing confirmed-five public WAV/ADPCM assets and pinned transport. Failed previews now remain errors instead of substituting a generated tone. Tests include a demonstrated failing-before/passing-after regression and real local HTTP hash admission of all five previews.
Local: final product build189files PASS including recovered audio NOTICE; final product-build/transport/HTTP/failure21tests PASS; asset integrity4tests PASS. Full product suite fails inherited hihat inverse-predecessor hash after repository rename. Normal-sandbox Chromium launch fails socket EPERM with short /tmp; browser acceptance NOT_RUN. No baseline regeneration, Actions, device operation, catalog mutation or deployment. M5 remains WORKING; full gate and actual deployed listen-before-choose still required.

## Hygiene review corrections
Isolated review-fix branch from the hygiene PR; original PR head is unchanged. Corrected gate-log wording. Full gate and independent final review remain NOT_RUN; consume through the existing integration owner before merge.

## Deletes (gate fixes, per DOT-BRIEF stale-test list)
- SOURCE_PROVENANCE.json: provenance hash pins; the check is removed as evidence-only.
- INPUT-MANIFEST.json: input hash manifest; no code reads it.
- tests/installer-evidence-links.test.mjs: evidence-link test, stale per DOT-BRIEF.
- tests/fixtures/build-product-site-missing-guard-mutant.mjs: mutant fixture pinned to the build script's hash (source-drift guard removed).
- tests/fixtures/build-product-site-missing-guard-mutant.json: metadata for that mutant fixture.

### Starting-break archive restore

The native sample protocol leaves bytes 480–511 erased when committing a 480-byte header. Earlier starting-break exports filled those bytes with zero, which failed exact readback after simulated restore. New exports use the erased value before computing archive checksums. The 31 nonempty sample selections pass the legacy-protocol readback regression, preserving every selected zone and its encoded audio. Native simulator verification, full gate and live deployment are tracked separately.

### Browser Restore header preservation

Merged #161 as bd449d7; the five live sample URLs and corrected exporter returned their exact bytes. Restore now selects the complete 512-byte header only when padding contains programmed bytes, retaining 480-byte compatibility for erased padding. The canonical writers, generated pages and project exchange copy share this behavior. The regression executes the actual writers against simulated erased flash and compares the entire image. It is not physical-device verification. Full exact-head gate and live corrected Restore deployment remain pending.

The exact eca8f00b full gate passed its browser chain but failed the archived installer-diff test on the intended header-padding selector. Its exact hunk is now recognized; four actual-render negatives still reject short-only, full-only, inverted-padding and unrelated model-guard changes. Production bytes are unchanged by this test correction. Fresh full gate remains required.

### Legacy SMK Manual capture

The [native focused receipt at 81f837d8](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7061416989) records 86 passing Node tests, 47 passing visual Python tests and five passing Feature Inbox browser viewports. The unrestricted capture then timed out on the 1440px legacy SMK Manual after reporting existing reference differences on Installer, Presets and Manual.

In a fresh Chromium process at each viewport, the SMK archive grew by 86–116 CSS pixels on its first full-document compositor paint. The capture helper retains the entire settled SMK document in overlapping bands under the existing 30-second total limit. Its regression test checks the final pixel row and every intervening row. Independent 10/10 review and the outstanding reference decisions remain open.

### Owner-approved rules #172

The new consolidated parent changed only AGENTS.md, CHECKLISTS.md and RULES.md. All three match the owner-approved files verbatim. The website, generated previews, visual runner and committed references retain their exact trees from the preceding capture repair. [Four-width independent-review inputs](https://github.com/gobbajogger/DnBOX-nightly/blob/d297d1db496ee07065345a7be9ca0474e4eb2894/receipt.json) hold the base and PR full-page pixels for the three newly covered Manual routes. Untested checks remain NOT_RUN until the corresponding evidence exists.

### Complete Guide and Protocol captures

Independent inspection found the final “Source and credits” link cut off in both 390px Protocol screenshots. Chromium initially reported 3,763 CSS pixels. Its first full-document paint settled at 3,817 pixels, with the final link ending at 3,771.98. The Guide and Protocol captures now verify that the decoded PNG matches the complete settled document and that the viewport and document stay fixed during capture. The regression rejects short images and late layout changes on both routes. [Corrected phone screenshots and native measurements](https://github.com/gobbajogger/DnBOX-nightly/tree/06150c905a8ecfd9bb259e0bf1a39adc13e2cb9f/surfaces).

At c90b08e3 the unrestricted sweep completed the two desktop sizes and the SMK Manual at 844px. It recorded 17 size mismatches against inherited references before the 844px Build History screenshot exhausted the 30-second capture budget. The five-viewport Feature Inbox browser and focused native suite passed on 7fe02e9c. The unrestricted visual gate and outstanding independent review remain open.

### Twelve independently reviewed Manual references

The [independent four-width review](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7061661820) approved all 12 new SMK Manual, Projects Guide and Protocol references. The PNGs are the exact reviewed post-change files, including the restored Protocol footer. The accepted [settled Guide and Protocol source](https://github.com/gobbajogger/DnBOX-nightly/tree/6d5f099989c39ccb3d22b36171964e6c5b83779d/stable-after) and [Legacy source](https://github.com/gobbajogger/DnBOX-nightly/tree/d297d1db496ee07065345a7be9ca0474e4eb2894/pixels-after) cover 1440×900, 1024×640, 844×390 and 390×844. Thirty-two Remote Workspace and four Device references remain open. Previously committed reference differences retain their separate review requirements.
