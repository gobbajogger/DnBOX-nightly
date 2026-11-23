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

## Evidence-only files removed from Git (cleanup, 2026-11-23 14:49 UTC+10)
Rule: no evidence-only files in Git. These receipts, evidence JSON, logs and proof images are not read by any test, script, build or gate; they remain in Git history (pinned-SHA links in versions.json, build-status.json and builds/index.html still resolve). `.gitignore` now keeps `evidence/` and `docs/*evidence*` out.

- `docs/bundled-nightly-evidence-20261025/README.md` — evidence-only; retained in Git history.
- `docs/bundled-nightly-evidence-20261025/independent-review.json` — evidence-only; retained in Git history.
- `docs/bundled-nightly-evidence-20261025/validation.json` — evidence-only; retained in Git history.
- `docs/compact-ux-evidence-20261025/README.md` — evidence-only; retained in Git history.
- `docs/compact-ux-evidence-20261025/caption-delta-review.json` — evidence-only; retained in Git history.
- `docs/compact-ux-evidence-20261025/caption-density.log` — evidence-only; retained in Git history.
- `docs/compact-ux-evidence-20261025/caption-presentation.log` — evidence-only; retained in Git history.
- `docs/compact-ux-evidence-20261025/design-review.md` — evidence-only; retained in Git history.
- `docs/compact-ux-evidence-20261025/final-pixel-verification.md` — evidence-only; retained in Git history.
- `docs/compact-ux-evidence-20261025/independent-admission.log` — evidence-only; retained in Git history.
- `docs/compact-ux-evidence-20261025/independent-bundled.log` — evidence-only; retained in Git history.
- `docs/compact-ux-evidence-20261025/independent-density.log` — evidence-only; retained in Git history.
- `docs/compact-ux-evidence-20261025/independent-functional-review.json` — evidence-only; retained in Git history.
- `docs/compact-ux-evidence-20261025/independent-native.log` — evidence-only; retained in Git history.
- `docs/compact-ux-evidence-20261025/independent-presentation.log` — evidence-only; retained in Git history.
- `docs/compact-ux-evidence-20261025/independent-projects.log` — evidence-only; retained in Git history.
- `docs/compact-ux-evidence-20261025/independent-workspace.log` — evidence-only; retained in Git history.
- `docs/compact-ux-evidence-20261025/native-caption-final.log` — evidence-only; retained in Git history.
- `docs/compact-ux-evidence-20261025/validation.json` — evidence-only; retained in Git history.
- `docs/final-source-evidence-20261025/README.md` — evidence-only; retained in Git history.
- `docs/final-source-evidence-20261025/build.log` — evidence-only; retained in Git history.
- `docs/final-source-evidence-20261025/current-catalog-browser-review.json` — evidence-only; retained in Git history.
- `docs/final-source-evidence-20261025/current-catalog.log` — evidence-only; retained in Git history.
- `docs/final-source-evidence-20261025/independent-review.json` — evidence-only; retained in Git history.
- `docs/final-source-evidence-20261025/npm-test.log` — evidence-only; retained in Git history.
- `docs/final-source-evidence-20261025/presentation.log` — evidence-only; retained in Git history.
- `docs/final-source-evidence-20261025/receipt.json` — evidence-only; retained in Git history.
- `docs/final-source-evidence-20261025/smc-65a0588-trace.log` — evidence-only; retained in Git history.
- `docs/final-source-evidence-20261025/workspace.log` — evidence-only; retained in Git history.
- `docs/installer-density-evidence-20261025/README.md` — evidence-only; retained in Git history.
- `docs/installer-density-evidence-20261025/independent-ux-review.json` — evidence-only; retained in Git history.
- `docs/installer-density-evidence-20261025/receipt.json` — evidence-only; retained in Git history.
- `docs/installer-owner-ux-evidence-20261025/README.md` — evidence-only; retained in Git history.
- `docs/installer-owner-ux-evidence-20261025/catalog-provenance.json` — evidence-only; retained in Git history.
- `docs/installer-owner-ux-evidence-20261025/density-final.log` — evidence-only; retained in Git history.
- `docs/installer-owner-ux-evidence-20261025/independent-b-review.json` — evidence-only; retained in Git history.
- `docs/installer-owner-ux-evidence-20261025/independent-design-review.md` — evidence-only; retained in Git history.
- `docs/installer-owner-ux-evidence-20261025/library-delivery.json` — evidence-only; retained in Git history.
- `docs/installer-owner-ux-evidence-20261025/library-html-final.json` — evidence-only; retained in Git history.
- `docs/installer-owner-ux-evidence-20261025/presentation-final.log` — evidence-only; retained in Git history.
- `docs/installer-owner-ux-evidence-20261025/projects-final.log` — evidence-only; retained in Git history.
- `docs/installer-owner-ux-evidence-20261025/receipt.json` — evidence-only; retained in Git history.
- `docs/installer-owner-ux-evidence-20261025/test-final.log` — evidence-only; retained in Git history.
- `docs/installer-owner-ux-evidence-20261025/workspace-final.log` — evidence-only; retained in Git history.
- `docs/qualified-nightly-repair-evidence.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/catalog-approval-denials-20261025/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/catalog-approval-denials-20261025/approval-after.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/catalog-approval-denials-20261025/approval-before.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/catalog-approval-denials-20261025/independent-review.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/catalog-approval-denials-20261025/manifest.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/catalog-approval-denials-20261025/npm-test-browser.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/catalog-approval-denials-20261025/npm-test.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/chromium-before.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/chromium-race-before.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/chromium.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/combined-reliability-20261026/SHA256.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/combined-reliability-20261026/site-integration-evidence/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/combined-reliability-20261026/site-integration-evidence/combined-npm.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/combined-reliability-20261026/site-integration-evidence/full-diff.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/combined-reliability-20261026/site-integration-evidence/input-retention.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/combined-reliability-20261026/site-integration-evidence/receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/combined-reliability-20261026/site-integration-review/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/combined-reliability-20261026/site-integration-review/combined-full-diff.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/combined-reliability-20261026/site-integration-review/commands.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/combined-reliability-20261026/site-integration-review/diff-checks.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/combined-reliability-20261026/site-integration-review/merge-closure-verification.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/combined-reliability-20261026/site-integration-review/merge-from-project.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/combined-reliability-20261026/site-integration-review/ota-and-read.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/combined-reliability-20261026/site-integration-review/project-page.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/combined-reliability-20261026/site-integration-review/projects.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/combined-reliability-20261026/site-integration-review/receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/combined-reliability-20261026/site-integration-review/restore.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec004-007/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec004-007/baseline-edge.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec004-007/browser-admission-before-fixture-repair.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec004-007/browser-admission.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec004-007/browser-fixture-receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec004-007/browser-fixture-triage.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec004-007/bundled-browser-before-fixture-repair.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec004-007/bundled-browser.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec004-007/history-response.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec004-007/independent-README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec004-007/independent-edge.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec004-007/independent-generated.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec004-007/independent-python-archive.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec004-007/independent-receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec004-007/npm-test.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec004-007/presentation-browser.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec004-007/project-workspace-browser.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec004-007/python-archive-compat.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec004-007/python-archive-compat.mjs` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec004-007/receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec004-007/workspace-browser.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec019-application-return/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec020-smp-info-extension/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec021-slot-image-capacity/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec022-smp-info-used-agreement/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec023-project-connect/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec024-project-pairing/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/ec025-project-link-lifecycle/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/local-file-bounds/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/local-file-bounds/browser-green.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/local-file-bounds/browser-red.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/local-file-bounds/focused-commands.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/local-file-bounds/npm-build.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/local-file-bounds/npm-test.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/local-file-bounds/provenance-final.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/local-file-bounds/receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/midi-port-pairing/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/npm-build.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/npm-test.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/numeric-package-admission/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/SHA256.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/oldschool-review/REVIEW.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/oldschool-review/cleanup-boundaries.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/oldschool-review/cleanup-boundaries.test.mjs` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/oldschool-review/focused.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/oldschool-review/host/banks.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/oldschool-review/host/export-banks.mjs` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/oldschool-review/host/imported-playback.c` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/oldschool-review/host/independent-receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/oldschool-review/host/render-1.5.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/oldschool-review/host/render-1.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/oldschool-review/host/render-2.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/oldschool-review/host/render-3.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/oldschool-review/host/render-4.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/oldschool-review/preview-provenance.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/oldschool-review/receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/oldschool-review/source-evidence-check.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/sample-oldschool-evidence/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/sample-oldschool-evidence/full-npm.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/sample-oldschool-evidence/host/banks.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/sample-oldschool-evidence/host/export-banks.mjs` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/sample-oldschool-evidence/host/imported-playback.c` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/sample-oldschool-evidence/host/receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/sample-oldschool-evidence/host/render-1.5.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/sample-oldschool-evidence/host/render-1.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/sample-oldschool-evidence/host/render-2.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/sample-oldschool-evidence/host/render-3.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/sample-oldschool-evidence/host/render-4.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/sample-oldschool-evidence/manifest.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/oldschool-import/sample-oldschool-evidence/receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/ota-request-ec010-independent/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/ota-request-ec010-independent/SHA256.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/ota-request-ec010-independent/author-log-verification.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/ota-request-ec010-independent/closure-verification.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/ota-request-ec010-independent/commands.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/ota-request-ec010-independent/cross-request.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/ota-request-ec010-independent/cross-request.mjs` — evidence-only; retained in Git history.
- `docs/repair-evidence/ota-request-ec010-independent/cross-request.py` — evidence-only; retained in Git history.
- `docs/repair-evidence/ota-request-ec010-independent/firmware-focused.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/ota-request-ec010-independent/ota-request-firmware-full-diff.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/ota-request-ec010-independent/ota-request-site-full-diff.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/ota-request-ec010-independent/pins-diff-provenance.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/ota-request-ec010-independent/python-focused.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/ota-request-ec010-independent/receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/ota-request-ec010-independent/site-focused.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/pr14-hardware-facts-20261025/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/pr14-hardware-facts-20261025/independent-review.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/pr14-hardware-facts-20261025/manifest.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/pr14-hardware-facts-20261025/validation.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/pr34-current-composition/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/before-after.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/combined-site-npm.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/current-producer-final.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/direct-checks.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/documentation-review-manifest.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/endpoint-producer-final.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/firmware-projects-page.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/firmware-projects-web.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/generator/project_export_fixture.c` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/generator/project_export_fixture.sh` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/independent-review/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/independent-review/commands.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/independent-review/firmware-page.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/independent-review/firmware-projects.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/independent-review/producer-verification.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/independent-review/receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/independent-review/site-page.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/independent-review/site-projects.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/producer-rebind.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/site-npm.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/site-projects-web.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/stack-before-after.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/stack-checks.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/stack-firmware-projects-page.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/project-export-compat/stack-firmware-projects-web.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/qualification-before.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r2/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/r2/backup-boundary-after.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r2/chromium.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r2/expanded-after.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r2/expanded-before.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r2/focused-after.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r2/focused-before.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r2/focused_after.py` — evidence-only; retained in Git history.
- `docs/repair-evidence/r2/npm-build.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r2/npm-test-after-build.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r2/npm-test-before-build.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r2/receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/r3/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/r3/chromium.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r3/history-before.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r3/independent-history-after.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r3/npm-build.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r3/npm-test-after-build.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r3/npm-test-before-build.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r3/receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/backup-boundary-compatible.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/consolidated-commands.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/consolidated.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/default-browser.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/dependency-after.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/dependency-before.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/f7-focused-after.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/f7-focused-before.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/f7-native-after.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/f7-native-before.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/independent-expanded.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/independent-focused.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/independent-history-extension.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/independent-history.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/npm-build.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/npm-test.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/output-path-before.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/release-capability.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/release-route-helper-receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/write-binding-after.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/write-binding-before.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/write-boundary-after.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r4/write-boundary-before.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r5/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/r5/consolidated-commands.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/r5/default-browser.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r5/final-matrix-extension-results.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/r5/final-matrix-green.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r5/final-matrix-red.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r5/final_matrix_extension.py` — evidence-only; retained in Git history.
- `docs/repair-evidence/r5/npm-build.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r5/npm-test.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r5/receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/r5/run-consolidated.py` — evidence-only; retained in Git history.
- `docs/repair-evidence/r5/status-red.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r6/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/r6/consolidated-commands.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/r6/default-browser.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r6/npm-build.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r6/npm-test.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r6/qualified-green.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r6/qualified-red.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/r6/receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/r6/run-consolidated.py` — evidence-only; retained in Git history.
- `docs/repair-evidence/receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/baseline-python.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/fw-reviewer-race-after.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/fw-snapshot-followup.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/fw-web-install-followup.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/fw-web-install.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/independent-README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/independent-before-site-snapshot-race.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/independent-corrected-execution.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/independent-proof-log-verification.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/independent-receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/node-fw.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/node-site.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/python-backup-snapshot.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/python-install.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/python-matching.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/python-menu.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/registered-selectors.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/repaired-python.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/restore-integrity-baseline-node.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/restore-site-baseline-node.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/site-build-followup.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/site-build.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/site-npm-followup.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/site-npm.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/site-reviewer-race-after.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/restore-logical-indices/site-snapshot-followup.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/retained-map-compatibility-20261029/package-review.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/retained-map-compatibility-20261029/receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/MANIFEST.sha256.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/README.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/browser-receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/build-r2.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/candidate-r2.patch` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/delivery-intake.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/delivery-plan.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/discovery-matrix-r2.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/first-handshake-negative-original.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/first-handshake-negative-r1.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/handshake-intake-receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/handshake-matrix.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/handshake-only.patch` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/integrated-browser-receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/integrated-browser.py` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/parity-receipt-r2.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/prior-stage/review/independent-edge-result.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/prior-stage/review/review-receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/prior-stage/review/review.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/review/independent-boundary-result.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/review/review-receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/review/review.md` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/schema-provenance.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/sample-discovery-r2/source-closure-receipt.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/site-completion-20261029/npm-full-integrated.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/site-completion-20261029/open01-affected.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/site-completion-20261029/open01-regression-green.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/site-completion-20261029/open01-regression-red.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/site-completion-20261029/source-integration.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/site-regression-20261029/baseline-npm-test.log` — evidence-only; retained in Git history.
- `docs/repair-evidence/site-regression-20261029/candidate-manifest.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/site-regression-20261029/current-source-review.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/site-regression-20261029/handoff.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/site-regression-20261029/stale-pages-negative.json` — evidence-only; retained in Git history.
- `docs/repair-evidence/site-regression-20261029/verifier-review.json` — evidence-only; retained in Git history.
- `docs/song-workflow-evidence-20261025/README.md` — evidence-only; retained in Git history.
- `docs/song-workflow-evidence-20261025/browser-regressions.log` — evidence-only; retained in Git history.
- `docs/song-workflow-evidence-20261025/firmware/README.md` — evidence-only; retained in Git history.
- `docs/song-workflow-evidence-20261025/firmware/arrangement_byte_invariants.c` — evidence-only; retained in Git history.
- `docs/song-workflow-evidence-20261025/firmware/arrangement_byte_invariants.log` — evidence-only; retained in Git history.
- `docs/song-workflow-evidence-20261025/firmware/protocol.log` — evidence-only; retained in Git history.
- `docs/song-workflow-evidence-20261025/firmware/reset_lifecycle_invariants.c` — evidence-only; retained in Git history.
- `docs/song-workflow-evidence-20261025/firmware/reset_lifecycle_invariants.log` — evidence-only; retained in Git history.
- `docs/song-workflow-evidence-20261025/firmware/runtime-darwin.log` — evidence-only; retained in Git history.
- `docs/song-workflow-evidence-20261025/firmware/runtime.log` — evidence-only; retained in Git history.
- `docs/song-workflow-evidence-20261025/firmware/save-preflight-host.log` — evidence-only; retained in Git history.
- `docs/song-workflow-evidence-20261025/firmware/save-preflight.log` — evidence-only; retained in Git history.
- `docs/song-workflow-evidence-20261025/firmware/song-darwin.log` — evidence-only; retained in Git history.
- `docs/song-workflow-evidence-20261025/firmware/song.log` — evidence-only; retained in Git history.
- `docs/song-workflow-evidence-20261025/firmware/stage.log` — evidence-only; retained in Git history.
- `docs/song-workflow-evidence-20261025/independent-safety-review.json` — evidence-only; retained in Git history.
- `docs/song-workflow-evidence-20261025/independent-ux-review.json` — evidence-only; retained in Git history.
- `docs/song-workflow-evidence-20261025/npm-test.log` — evidence-only; retained in Git history.
- `docs/song-workflow-evidence-20261025/presentation-browser.log` — evidence-only; retained in Git history.
- `docs/song-workflow-evidence-20261025/project-workspace-browser.log` — evidence-only; retained in Git history.
- `docs/song-workflow-evidence-20261025/receipt.json` — evidence-only; retained in Git history.
- `docs/ui-fidelity-evidence-20261025/HANDOFF.md` — evidence-only; retained in Git history.
- `docs/ui-fidelity-evidence-20261025/README.md` — evidence-only; retained in Git history.
- `docs/ui-fidelity-evidence-20261025/historical-smc-draw-trace.log` — evidence-only; retained in Git history.
- `docs/ui-fidelity-evidence-20261025/historical-smc-main.c` — evidence-only; retained in Git history.
- `docs/ui-fidelity-evidence-20261025/independent-review.json` — evidence-only; retained in Git history.
- `docs/ui-fidelity-evidence-20261025/npm-test.log` — evidence-only; retained in Git history.
- `docs/ui-fidelity-evidence-20261025/populated-browser-review.json` — evidence-only; retained in Git history.
- `docs/ui-fidelity-evidence-20261025/populated-browser.log` — evidence-only; retained in Git history.
- `docs/ui-fidelity-evidence-20261025/presentation.log` — evidence-only; retained in Git history.
- `docs/ui-fidelity-evidence-20261025/public-draw-trace.log` — evidence-only; retained in Git history.
- `docs/ui-fidelity-evidence-20261025/receipt.json` — evidence-only; retained in Git history.
- `docs/ui-fidelity-evidence-20261025/trace-renderer.py` — evidence-only; retained in Git history.
- `docs/ui-fidelity-evidence-20261025/vectorize.py` — evidence-only; retained in Git history.
- `docs/ui-fidelity-evidence-20261025/workspace-browser.log` — evidence-only; retained in Git history.
- `docs/user-workflow-evidence-20261025/FEATURE-INVENTORY.md` — evidence-only; retained in Git history.
- `docs/user-workflow-evidence-20261025/README.md` — evidence-only; retained in Git history.
- `docs/user-workflow-evidence-20261025/current-catalog-browser-review.json` — evidence-only; retained in Git history.
- `docs/user-workflow-evidence-20261025/current-catalog-browser.log` — evidence-only; retained in Git history.
- `docs/user-workflow-evidence-20261025/feature-source-pins.json` — evidence-only; retained in Git history.
- `docs/user-workflow-evidence-20261025/final-independent-review.json` — evidence-only; retained in Git history.
- `docs/user-workflow-evidence-20261025/receipt.json` — evidence-only; retained in Git history.
- `docs/user-workflow-evidence-20261025/smc-b879-trace.log` — evidence-only; retained in Git history.
- `docs/user-workflow-evidence-20261025/task-first-npm-test.log` — evidence-only; retained in Git history.
- `docs/user-workflow-evidence-20261025/task-first-presentation.log` — evidence-only; retained in Git history.
- `docs/user-workflow-evidence-20261025/task-first-workspace.log` — evidence-only; retained in Git history.
- `docs/visual-refresh-evidence-20261025/HANDOFF.md` — evidence-only; retained in Git history.
- `docs/visual-refresh-evidence-20261025/browser-regression.log` — evidence-only; retained in Git history.
- `docs/visual-refresh-evidence-20261025/npm-test.log` — evidence-only; retained in Git history.
- `docs/visual-refresh-evidence-20261025/populated-browser-review.json` — evidence-only; retained in Git history.
- `docs/visual-refresh-evidence-20261025/presentation-browser.log` — evidence-only; retained in Git history.
- `docs/visual-refresh-evidence-20261025/receipt.json` — evidence-only; retained in Git history.
- `docs/workspace-evidence-20261025/HANDOFF.md` — evidence-only; retained in Git history.
- `docs/workspace-evidence-20261025/browser-tests.log` — evidence-only; retained in Git history.
- `docs/workspace-evidence-20261025/catalog_capture.c` — evidence-only; retained in Git history.
- `docs/workspace-evidence-20261025/catalog_capture.sh` — evidence-only; retained in Git history.
- `docs/workspace-evidence-20261025/final-renderer-review.json` — evidence-only; retained in Git history.
- `docs/workspace-evidence-20261025/final-visual-review.json` — evidence-only; retained in Git history.
- `docs/workspace-evidence-20261025/node-tests.log` — evidence-only; retained in Git history.
- `docs/workspace-evidence-20261025/renderer-capture.log` — evidence-only; retained in Git history.
- `docs/workspace-evidence-20261025/renderer.json` — evidence-only; retained in Git history.
- `docs/workspace-evidence-20261025/renderer.md` — evidence-only; retained in Git history.
- `docs/workspace-evidence-20261025/renderer_capture.c` — evidence-only; retained in Git history.
- `docs/workspace-evidence-20261025/renderer_capture.sh` — evidence-only; retained in Git history.
- `docs/workspace-evidence-20261025/validation.json` — evidence-only; retained in Git history.
- `docs/workspace-evidence-20261025/workspace-review.json` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/README.md` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/after-site-scoped.log` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/before-pr31.log` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/README.md` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/cross-parser.exit` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/cross-parser.log` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/cross-parser.mjs` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/cross-parser.py` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/f02-loader.exit` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/f02-loader.log` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/firmware-focused.exit` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/firmware-focused.log` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/ota-identity-firmware-full-diff.exit` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/ota-identity-firmware-source-diff.exit` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/ota-identity-site-full-diff.exit` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/ota-identity-site-full-diff.log` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/ota-identity-site-source-diff.exit` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/python-focused.exit` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/python-focused.log` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/python-install.exit` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/python-install.log` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/receipt.json` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/site-focused.exit` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/site-focused.log` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/site-generated.exit` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/site-provenance.exit` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/independent-review/site-write-boundaries.exit` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/receipt.json` — evidence-only; retained in Git history.
- `evidence/ota-identity-ec009/site-npm-test.log` — evidence-only; retained in Git history.
- `evidence/ota-request-ec010/README.md` — evidence-only; retained in Git history.
- `evidence/ota-request-ec010/receipt.json` — evidence-only; retained in Git history.
- `evidence/ota-request-ec010/site-after.log` — evidence-only; retained in Git history.
- `evidence/ota-request-ec010/site-before.log` — evidence-only; retained in Git history.
- `evidence/ota-request-ec010/site-focused.log` — evidence-only; retained in Git history.
- `evidence/ota-request-ec010/site-full.log` — evidence-only; retained in Git history.
- `evidence/remote-feedback-20261118/README.md` — evidence-only; retained in Git history.
- `evidence/remote-feedback-20261118/all14-process-receipt.log` — evidence-only; retained in Git history.
- `evidence/remote-feedback-20261118/baseline-gesture.log` — evidence-only; retained in Git history.
- `evidence/remote-feedback-20261118/baseline-recovery.log` — evidence-only; retained in Git history.
- `evidence/remote-feedback-20261118/candidate-recovery.log` — evidence-only; retained in Git history.
- `evidence/remote-feedback-20261118/geometry.json` — evidence-only; retained in Git history.
- `evidence/remote-feedback-20261118/independent-review.json` — evidence-only; retained in Git history.
- `evidence/web-routes/admin-review.json` — evidence-only; retained in Git history.
- `evidence/web-routes/browser-results.json` — evidence-only; retained in Git history.
- `evidence/web-routes/builds-full-page-capture.json` — evidence-only; retained in Git history.
- `evidence/web-routes/check-web-routes.py` — evidence-only; retained in Git history.
- `evidence/web-routes/firmware-comparator-review.json` — evidence-only; retained in Git history.
- `evidence/web-routes/firmware-panel-replay.json` — evidence-only; retained in Git history.
- `evidence/web-routes/firmware-screen-review.json` — evidence-only; retained in Git history.
- `evidence/web-routes/fwui-renderer-coverage.md` — evidence-only; retained in Git history.
- `evidence/web-routes/fwui-stock.json` — evidence-only; retained in Git history.
- `evidence/web-routes/reference-results.json` — evidence-only; retained in Git history.
- `evidence/web-routes/visual-viewport-isolation.json` — evidence-only; retained in Git history.
- `evidence/web-routes/web-route-review.md` — evidence-only; retained in Git history.
