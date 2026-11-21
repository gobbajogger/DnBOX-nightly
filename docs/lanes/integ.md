# Integration baseline

Target `integration/dnbox-consolidated` at `56918d9e601c2eb6c6e9dd53b02ad06897bf2e3c`, the merge of owner-approved rules #171. Work continues on `lane/integ`. GitHub rejected creation of `lane/integ-baseline` (HTTP 422). The active branch-name ruleset reserves `lane/integ` for this lane. No other open integration PR existed when the work started.

| Item | Evidence at this checkpoint |
|---|---|
| I0 | The full local gate passed at the preceding consolidated SHA `914d68e8`, exit 0, in 842.50 seconds. GitHub status 59271332355 and [#168 gate log receipt](https://github.com/gobbajogger/DnBOX-nightly/pull/168#issuecomment-6984429586). The updater generated 104 proposed images. Independent review has accepted 68 of 104 references, including Build History, the homepage, the mounted Installer and the downloadable Samples, Projects and installer pages. Of the original set, 36 remain open across eight Remote views and the Remote Device page. The combined sweep adds 12 Manual reference slots. |
| I1 | `CONSOLIDATED-STATE.md` records 23 merges through `914d68e8`, Web #156 at `b3868da0` and rules #171 at `56918d9e`, with source and merge SHAs. |
| I2–I3 | Final combined firmware and all-engine dropout qualification depend on the open Sound and FWUI PRs. |
| I4–I5 | Firmware I4 passed on stock Linux at 76040daa. All five live BREAK previews and the corrected archive were verified. Firmware-default delivery exceeds both models’ flash headroom. |
| I6 | Firmware #976 reconciles the roadmap. The inbox and four-size vote refresh regression pass. A signed-in GitHub write/readback remains open. |
| I7 | Canonical links are verified. The owner retired the old installer paths and retained GitHub’s automatic repository redirects. The [reachability audit](https://github.com/gobbajogger/DnBOX/pull/976#issuecomment-7058900972) accounted for all 488 historical tips in both repositories, including the eight protected PR heads. Cleanup follows the lane merges. |
| C1–C6 | The complete [1039b686 gate](https://github.com/gobbajogger/DnBOX-nightly/pull/170#issuecomment-7059670134) passed against its original consolidated parent. Web [#156](https://github.com/gobbajogger/DnBOX-nightly/pull/156) subsequently merged at `b3868da0`. The [Web reconciliation](https://github.com/gobbajogger/DnBOX-nightly/commit/0eb984d2c3c472cc54c8a2c27bb8dee29244df73) retained both tips. Owner-approved [rules #171](https://github.com/gobbajogger/DnBOX-nightly/pull/171) require a passing focused-test result posted at the latest lane SHA, no loss against consolidated and independent 10/10 before/after review. The combined sweep has 48 unfilled reference slots. Independent review of any changed existing screens is also pending. |

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
