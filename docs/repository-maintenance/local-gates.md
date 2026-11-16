# Qualification correction and superseding addendum (2026-11-16)

This addendum corrects the earlier record retained below. Do not read the historical wording as an unqualified claim that every earlier run used a frozen final tree.

## What the earlier evidence did and did not prove

- Earlier executable checks were pinned to preparation parents `ca0af7fa307cd44353996f6563e96ceb57fdd100` and `addc3e518c4374895f23448b484462afc9100a4a`, not literal executions of the later pushed roots. API comparisons confirm the following commits changed only docs, templates and the two inherited workflow removals. That supports explicitly scoped reuse of unchanged executable inputs, not a whole-root execution claim.
- The standalone negative-suite retry overlapped normalization of extra EOF newlines introduced during initial source extraction. Assertions and the 15-second child timeout were not weakened, but input bytes were not immutably frozen throughout that retry. Therefore the historical phrase “unchanged rerun” below must be read as unchanged assertions/timeouts, **not** exact-byte or exact-final-tree qualification.
- The earlier full npm run actually failed: 487 of 490 edge tests passed and three failed because the reconstructed test input lacked two required historical Git objects. Those failures remain failures in the preserved receipt. Retrieving and verifying the two exact public blobs repaired an undeclared fixture dependency; it did not change test expectations or firmware/browser behavior.
- The original child-spawn timeout remains an unexplained timing failure. It is not declared fixed. A separate diagnostic repeated that same historical R39 boolean mutation 40 times with the original assertions and 15-second timeout: 40 passed, but durations ranged from 116 ms to 13,665 ms. This measured timing variance is a reliability concern; passing repetitions do not establish its cause or eliminate recurrence.

## Fresh clean first-run proof, separately pinned

Fresh working directories, HOME, temporary directories and local Git object databases were prepared on the same execution container/runtime, not a new VM. Every tracked blob and mode was checked against the authenticated API tree, and local `git write-tree` reproduced each exact root:

| Repository | Executed source pin | Reconstructed tree | Verified blobs |
| --- | --- | --- | --- |
| Firmware | `a894ac61e08d781c87d0b5572bba787813413f49` | `735f4bcee5c2b2a676dc4e2473d74aa7a932e150` | 5,328 |
| Nightly browser source | `955a6d4dcf04f46c307a208c3d2eb154bba79a9a` | `752e90c1faa4f4dd0d5fed7d66cf76ecf5fc10e0` | 644 |

The historical fixture blobs `15d43a0a8398a69c70e73aa7b6a6dc6bbe5bace0` and `24a8b208aa01d539b5ef4e23af73d9c4aa2ac3d8` were declared, hash-verified and present **before** the first nightly test. No network Git, source commit, test edit or timeout relaxation was used to prepare that database.

All five commands passed their first invocation, with no retry and no tracked-source or mode drift before/after any command:

| Command | First-run result |
| --- | --- |
| `python3 tests/host/remaining_feature_proof_test.py` | exit 0, 58.026 s |
| `python3 tests/host/test_dnbox_git_author.py` | exit 0, 10 tests, 2.518 s |
| `python3 tests/host/test_publish_nightly.py` | exit 0, 11.011 s |
| `npm run build` | exit 0, 1.309 s |
| `npm test` | exit 0, 231.606 s; Node summaries 37/37, 23/23, 493/493 and 12/12, all zero fail and zero skipped |

The clean full npm log SHA-256 is `52ab8e5979a6cc14d95f24f36e0cf08715230241b30e8122d9ff8fc961b34079`. Original failures, intervening attempts, clean receipts, resource samples and source manifests are retained privately with provenance; none has been retroactively relabeled.

## Scope after this documentation correction

The clean receipts above qualify their named roots. This addendum changes documentation after those roots and does not retroactively turn that proof into an execution of a later commit. Validate the changed documentation and compare the exact executable-input closure before reusing evidence; record any further exact-root execution separately. No native firmware, visual, live cutover or hardware result follows from these CLI/browser-source checks.

The repository steward owns continued timing investigation. Preserve the 15-second gate and a first failure if it recurs; use the external resource trace and the exact failed fixture to investigate rather than silently retrying or enlarging the timeout. Full-screen review, owner name/Pages decisions, R045 approval and all publication/device boundaries remain open.

---

## Earlier record (retained verbatim as historical evidence, corrected above)

# Local preparation gate log

Scope: R039 old/proposed-name compatibility guards, repository maintenance docs and issue/PR templates. Python 3.12.14, Node v24.22.1, Git 2.52.0. All checks run locally; no Actions, network Git, device write or deployment.

Exact API inputs: firmware ca0af7fa307cd44353996f6563e96ceb57fdd100, nightly addc3e518c4374895f23448b484462afc9100a4a. Files for the executed scopes are Git-blob-verified against those remote trees. This is reconstructed source/test input closure, not recovery of an original checkout or independent native/device proof.

| Check | Command | Result |
| --- | --- | --- |
| Firmware receipt positive/negative identity tests | `python3 tests/host/remaining_feature_proof_test.py` | PASS, exit 0 |
| Default author, local-only Git and network refusal | `python3 tests/host/test_dnbox_git_author.py` | PASS, 10 tests, exit 0 |
| Synthetic nightly publication/identity guards | `python3 tests/host/test_publish_nightly.py` | PASS, exit 0; local temporary fixtures only |
| Nightly source build | `npm run build` | PASS, exit 0 |
| Nightly catalog identity/integrity | `node scripts/verify-build-status.mjs` | PASS, exit 0 |
| Nightly catalog positives/negatives | `node tests/build-status-negatives.test.mjs` | PASS, 403 named cases (404 PASS output lines), exit 0 on rerun |
| Installer evidence/history navigation | `node tests/installer-evidence-links.test.mjs` | PASS, 8 cases, exit 0 |
| Historical-blob dependent cases after fixture repair | `node --test tests/edge-ios-inpage-confirm-continuity.test.mjs tests/edge-live-installer-full-diff.test.mjs` | PASS, 6 tests, exit 0 |
| Breaks page downstream check | `node web/test_breaks_page.mjs` | PASS, exit 0 |
| Full nightly npm chain | `npm test` | PASS, exit 0 on full unchanged rerun; edge section 493 tests, 493 pass, 0 fail, 0 skipped; final breaks section 12/12 pass |

## Earlier attempts and corrective evidence

The first standalone negative-suite run timed out in an old history case; an unchanged rerun passed all 403 named cases (404 PASS output lines) without relaxing expectations or its timeout. The first full npm run reached 490 edge tests with 487 pass and 3 fail because the reconstructed input directory lacked two pinned historical Git blobs. The blobs were retrieved through the authenticated GitHub API, verified as 15d43a0a8398a69c70e73aa7b6a6dc6bbe5bace0 and 24a8b208aa01d539b5ef4e23af73d9c4aa2ac3d8, then placed in an isolated local object database. No network Git or project commit was used. The six affected tests passed after repair; the unchanged full npm rerun then passed with exit 0. The earlier failed receipts are preserved, not relabeled.

Additional changed-scope validation: PASS for both exact README deltas, valid issue-template YAML/unique IDs, exhaustive inventory counts/unique names/SHAs/KEEP dispositions, 26 new local links, no internal paths in public files, and no workflow files in the proposed final trees.

## Immutable local log digests

Logs are retained with the project handoff. Digests identify actual terminal receipts, not released artifacts; this document bundles a sanitized summary rather than private execution paths.

- `fw-receipt-proof-final.log` SHA-256 `f744c82145ce31b4efb899b22264eab0bb02d2cdb11f4324be573b25497abfd0`
- `fw-author-final.log` SHA-256 `bccaf3c0af5fa55b40e98acb1e70f983c229e381127798639d142bee6f15765e`
- `fw-publish-final.log` SHA-256 `f79278869dcb417e5231a6e693113e3d2fe235595c8da3470775908c4d7bee4d`
- `web-build.log` SHA-256 `a0ba2670330186b148f408331c794c7462d4a94fc00e7175a8488440f117e0b0`
- `web-catalog.log` SHA-256 `6c58d8828b5ee25a9e647d8c01adac950bbb186cf2a44966a22cfb6aa05301e8`
- `web-negative-rerun.log` SHA-256 `97dfbda5588898202f830e8c96b3eca7aefc9b0b2b4a6d53ab23c7412733500a`
- `web-links.log` SHA-256 `d47cb71f7f81c511322018eec896295061b9b8a732d9e004257342978af82969`
- `web-fixture-repair-tests.log` SHA-256 `476677c2bad03feede491b5c86c26ea1d002e33a833231344f823f4e4b4360fe`
- `web-breaks.log` SHA-256 `921d42a4ded4f7dcef4d93eae2f16a3b453387d6d2f9b389fdfae5cd9f1de83c`

- `web-npm-test-final.log` SHA-256 `c509addd5c8f687c538f7be2750e03b0801513038c447bccd8aa611a515504fe`
- Earlier `web-npm-test.log` (failed missing-object fixture attempt) SHA-256 `36bead9d01caac54b37009ae624e1747e1de00c42a3c55fa5feed0d05b371f14`

## Limits

Full firmware host suite, native Elite/Pro builds, browser visual acceptance, live HTTP cutover and device checks: NOT_RUN by this preparation. They are not substituted with alias/unit results and remain separate applicable gates for downstream integration, publication and hardware outcomes. Repository/Pages rename, deployment, merge and branch deletion: NOT PERFORMED. R045 implementation: pending missing design/approval.

Independent scope review found no remaining blocking defects in the aggregate guards, docs, templates and two workflow deletions. Final acceptance is recorded separately by the project lead against the exact frozen manifest, not inferred from this summary. Broader full-screen firmware/Remote/site assessment is a separate reporting gate, not claimed here.
