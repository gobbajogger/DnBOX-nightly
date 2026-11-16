# Cleanup without losing work

The [snapshot](inventory-20261116.json) includes every branch and open PR returned across all branch pages on 2026-11-16: **131 branches, 9 open PRs** in this repository. The paired repository snapshot covers the other repository; combined intake is 487 branches and 81 open PRs before the R039 preparation PRs are created. This inventory does not claim every old lane was integrated, equivalent or inactive.

Independent [actual-target/head assessment](pr-review-20261116.md): **KEEP all 81 open PRs; zero immediate proven closure candidates.** None is integrated into its actual target at these pins. This does not establish that none could eventually be superseded; unique-content and owner/dependency dispositions remain necessary.

## Dispositions

- Preserve every branch at its recorded exact tip. No branch deletion or archive-tag batch is approved here. No tags are created by this preparation.
- Preserve unique work, live PR heads/bases and automation dependencies. Stacked PR ancestry alone does not prove supersession. An archive-prefixed branch and a closed PR are not recovery evidence by themselves.
- Close a PR only after exact-head content/replacement verification, current ownership/dependency checks and a comment linking its precise retained/replacement destination. If anything unique or uncertain remains, KEEP it with the unresolved next action.
- Do not rewrite, squash, rebase or force-push existing history merely to tidy it. R039 is one coherent preparation change per existing lane, with its guards, links, templates and readiness record together.

## Required branch deletion batch, not authorized or executed

1. Re-read exact tips and verify each required file/commit is retained in a durable named destination. Record content/ancestry evidence, not just titles.
2. Confirm no active writer, PR base/head, release, build, schedule or automation depends on each branch. Unknown means preserve.
3. Create and read back an **archive/&lt;name&gt; tag** at every exact proposed deletion tip, with a collision-safe explicit name map and provenance/recovery instructions. A branch with an archive prefix is not that tag.
4. Show the owner the specific branch/tag/SHA batch and wait for approval of that batch. This preparation grants none.
5. Delete only the approved verified batch using a supported authorized operation, then verify retained tags and recovery. Never delete unrelated or newly moved branches.

Owner of unresolved cleanup: repository steward. Next action: finish exact replacement/content checks on older PRs, record only verified closures, and preserve everything else. Re-run the snapshot before any later destructive batch. No completion claim should imply all project work was delivered.

