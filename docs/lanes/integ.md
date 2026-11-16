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
