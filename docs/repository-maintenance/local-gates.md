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
