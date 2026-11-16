# Lane: integ

Owner: repo prep integration agent. Branch: lane/integ-start-files. Updated: 2026-11-17 00:30 VLAT.
Baseline: `9165adb92fcdaab756c4e59e3d4a8ee22437ca5a`.

## Checklist
- C1 FAIL: exact baseline/head Local gates in progress; not claimed passing.
- C2 PASS: branch descends from pinned consolidated input; deletions below preserve recoverability in Git history.
- C3 FAIL: independent test-and-merge review in progress.
- C4 FAIL: full gate pending.
- C5 FAIL: broader integration outcome not complete.
- C6 FAIL: prep PR remains unmerged until required evidence.

## Now / next
Apply supplied v2 prep, remove obsolete briefs with reasons, correct proven gate false-PASS defect, then qualify exact before/after inputs.

## Blockers and routes
- Shell gh is not logged in; explicit push dry-run cannot read GitHub username. Use connected GitHub API writes below 700 KB.
- Baseline has no new gate script; execute the supplied script externally on the exact baseline and record this bootstrap fact.
- Independent reviewer reproduced Elite-failure/Pro-success false PASS; firmware gate corrected to fail immediately and require Elite copy. Budget attribution remains unresolved, never PASS from stale logs.

## Conflicts noted
- CHECKLISTS I0 describes no-new-regressions while RULES 9 requires passing before and after. No merge is authorized by a failed/VOID gate alone; independent review required.
- User kickoff forbids repo settings changes; no rename/settings action performed.

## Deletes
- `coordination/edge-case-hunt/EC-20261026-011.json` — obsolete brief/rule/handoff listed in supplied removal manifest; recoverable from parent Git commit.
- `docs/nightly-first-development-gate.md` — obsolete brief/rule/handoff listed in supplied removal manifest; recoverable from parent Git commit.

## Gate corrections from independent review
- Optional DNBOX_BASE_SHA is a fresh connector-resolved 40-hex commit pin; validate object and retain ancestry/deletion checks, avoiding unauthenticated fetch only.
- Nightly TMPDIR description corrected to match the actual outside-checkout path.

## Verified review and current blockers
- Independent regression: firmware fail-fast/exact-model budget fixtures PASS 6/6; connector-base validation, ancestry and documented deletion fixtures PASS 12/12 across both gates. These are focused tests, not a full Local PASS.
- Firmware baseline host sanitizer tests fail because LeakSanitizer cannot operate under ptrace; current cloud and elevated tiny probe reproduce. Mac mini is offline; cloud is the only connected environment. Keep FAIL and rerun in a compatible environment, never disable sanitizer to claim PASS.
- Firmware build gate now fails immediately for either model and budget reads only exact-SHA, per-model logs/receipts in a fresh run directory. Missing actual metrics remain FAIL.

## Follow-up gate corrections
- Baseline build PASS, browser harness correction requires chromium_sandbox=True and removes explicit no-sandbox in common admission/visual launchers. AST regression PASS for both launchers and syntax checks PASS. Actual normal sandbox fails cloud socket permissions; Mac offline, no browser PASS claimed.

Repeated mistake: browser-sandbox fixes missed launchers in the full gate call graph. Inspect every invoked launcher, require explicit chromium_sandbox=True throughout, and never count a two-file policy check as full runtime coverage.
- Expanded source audit now inspects all Python Chromium launchers, not only two common files. Remote's own harness remains its owner's correction; full regression correctly fails until that change is composed. Static policy PASS is never runtime PASS.
- Independent review identified Markdown exclusion in secret scanning. Removed it; scan now emits filename only, never matched values. Dummy Markdown key/token regression3/3 PASS; actual Local must rerun at new head.

## Integration checklist
- I0 FAIL: full baseline/current Local not passing; normal sandbox environment unavailable. Safe subsets do not replace full gate.
- I1 FAIL: consolidated state now recorded in both repositories; prep and lane PRs not yet merged.
- I2 FAIL: combined firmware with all lanes not qualified.
- I3 FAIL: all-engine dropout measurement outstanding.
- I4 FAIL: actual LeakSanitizer blocked by tracer; no disabled-sanitizer result counts.
- I5 FAIL: five BREAK samples, preview and published404 correction require runtime/Pages verification.
- I6 FAIL: consolidated roadmap and voting runtime audit outstanding.
- I7 FAIL: cleanup waits all lanes/rule9, and renames conflict with explicit no-settings instruction.

## I5 authentic asset admission
- Recovered all five original backup encoded zones and exact contract-pinned preview WAVs. Verified extraction against original slots-before-install.x0xslots SHA256239bd1d1ec5ae79ab634cbefe4817c058f357531a33774f0a5f6ecc80322df9e; contract SHA256df61cfe067e56579ace27fc58341f722f4a7a0d9a476ad7d8e798a38413b504f. Verification/mutation tests4/4 PASS. Pre-backup lossless WAV originals remain unknown; no synthetic replacement.
- Files admitted under web/product-site/assets/starting-breaks/. Web owns narrow contract-hash/size builder allowlist and actual preview provider wiring. Existing builder rejects all WAV/ADPCM until that reviewed correction is composed. No live404 fix, deployment or browser playback PASS yet.
- Firmware baseline includes zero built-in loops by default; old opt-in stock bank is three unrelated loops, not this five-zone set. Exact five encoded bytes109274 exceed current13,464/13,472 code headroom; embedded-bank fit remains open, no protected flash map changes.

Repeated mistake: browser launch policy checks missed a launcher invoked indirectly by the firmware host suite. Audit cross-repository and transitive test call graphs before running any suite, not just named browser scripts; never launch with default-off sandbox.
- Browser source policy now scans repository Python and JavaScript launchers and runs before npm unit/browser suites. Unsafe or missing policy skips those suites with FAIL/NOT_RUN, never launches them with disabled sandbox. Static policy is not runtime coverage.

## Combined nightly candidate
- Normal two-parent composition of web68f4b7b718a45291c86d4548b996c5095e8353a4 (including authentic five assets and real preview/provider allowlist) with integ b0a66ec5bd1f38234e0540d3267ea68a854a58fc (fail-closed browser policy). No consolidated/gh-pages/main merge or publication.
- Web source evidence build203files, product57Node+15Python and asset/provider21 checks PASS applies to web68f input; combined exact-head gate and independent review remain required. Runtime browser unavailable here, no live404 resolution claimed.

Repeated mistake: commands mixed workspace-root-relative paths with a repository workdir. Resolve input/output paths against the explicit working directory before running; fail closed on missing inputs.

## Remote plus web composition
- Updated normal two-parent composition consumes exact3edfb16374c99c9ccb99e27d45e3d1af25360185 (web plus Remote cac407) while retaining integ fail-closed policy. Source manifest209 files belongs to web and is retained unchanged. Producer product57Node+25Python/workspace84/Remote63/protocol evidence belongs to3ed input, not an automatic full combined PASS.
- Native/TouchOSC device acceptance, live Pages byte validation and full normal-browser gate remain unqualified; no consolidated or gh-pages merge.
