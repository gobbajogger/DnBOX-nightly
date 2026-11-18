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
