# R039 readiness

## Preparation outcome

**PREPARATION IMPLEMENTED AND LOCALLY VERIFIED, not ready for owner rename/cutover.**

- Existing rename-compatibility guards retained; old/proposed-name positive and wrong-owner/cross-channel negative cases are locally checked.
- Conditional Settings instructions, live-vs-source head separation, Pages cutover checklist and surgical README links are prepared.
- Canonical firmware bug/feature forms preserve vulnerability routing and collect reproducible source/behavior details. Nightly contact links retain the existing canonical project inbox. PR templates require actual local evidence and exact ownership/targets.
- All 487 branches and 81 pre-preparation open PRs are inventoried across the paired repositories. Independent actual-target/head assessment found zero immediate verified closure candidates, so all are retained. No deletion, archive tag or history rewrite occurred.
- Firmware's two inherited Actions workflow files are removed in the proposed tree. No workflow is created, edited or run; nightly source already has none.

## Preparation gate

See [local gate log](local-gates.md). The full nightly npm chain passed after exact historical-input repair. Independent scope review found no remaining blocking defect; final exact-manifest acceptance is recorded separately by the project lead. Do not treat preparation as merged, deployed or device tested.

## Open owner-only decisions

1. Final repository names remain proposed: DnBOX and DnBOX-nightly. Recover or obtain the actual name decision.
2. Agree the old/new GitHub Pages URL continuity and recovery plan before any rename. GitHub repository redirects do not cover project Pages addresses. No new redirect host or custom domain is approved.
3. Owner performs the conditional [Settings rename steps](r039-rename-prep.md) only after cutover readiness. No settings/protection/access changes are performed here.
4. Branch deletion requires a separately approved exact batch, each exact tip retained by an archive/&lt;name&gt; tag plus verified durable content and no active dependencies. No batch is proposed or approved here.
5. R045's original pending proposal/approval is missing. [Design recovery and safe preparation](r045-feature-voting.md) is open; no voting system is enabled.

## Accountable next actions

Repository steward: complete final independent result/manifest readback, then authorized exact remote branch readback; draft PR publication remains held by the owner's broader full-screen review/reporting gate. Website owner: validate the agreed paths and recovery before a future cutover. Project lead: recover unresolved name/R045 decisions and maintain the sole canonical roadmap. Existing firmware, sound, website integration and Pages publication owners retain their scopes.

Production merge, firmware builds, publication and device acceptance are outside this preparation outcome. Required future evidence remains required; no NOT_RUN label passes a release gate.
