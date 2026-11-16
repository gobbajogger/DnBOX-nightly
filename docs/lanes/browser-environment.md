# Shared browser environment boundary

Owners: Remote records the common diagnostic; Web and integ link this record. Last verified 2026-11-16.

## Result
FAIL / NOT RUN for rendered browser checks. No browser was successfully launched by these attempts. Source-event doubles and Node tests are separate evidence, not browser proof.

## Observed causes and remedies
- Baseline harnesses referenced an unavailable bundled Chromium or nonexistent `/usr/local/bin/google-chrome`.
- Some baseline harnesses disabled Chromium sandbox; those arguments are being removed. Remote uses configurable `/usr/bin/chromium` with `chromium_sandbox=True`; integ owns the common harnesses.
- System Chromium with its normal sandbox aborts at `process_singleton_posix.cc` with `socket() failed: Operation not permitted (1)`.
- Remote tested writable HOME/TMPDIR and shorter temporary paths. A sanctioned execution escalation was accepted but the runtime boundary still returned the same EPERM.
- Web independently tested a workspace-owned HOME under sanctioned escalation and hit the same boundary. These concurrent repeated attempts added no new qualification evidence.
- Environment inventory showed cloud connected and Mac offline. No alternate environment is approved as a way around this security denial.

## Recovery rule
Do not repeat launch probes at this denied boundary or disable Chromium sandbox. Coordinate any independently permitted runner with integ/test-and-merge and document its permission and normal-sandbox capability before execution. Keep browser-dependent checklist lines FAIL until actual checks pass on the final exact source.

## Repeat-prevention record
The same browser socket EPERM was retried concurrently by Remote and Web. Both schedule prompts were updated by the coordinator; future runs share this record instead of repeating those probes. Continue source, protocol-host and nonbrowser tests meanwhile.

## Separately admitted check
The coordinator subsequently admitted one distinct managed Codex cloud normal-sandbox check, read-only, with explicit prohibition on weakening security or bypassing a denial. The coordinator owns dispatch/results. Other lanes must not duplicate it. This admission is not a PASS and does not change the denied local boundary.

## Separately admitted check result
Coordinator-reported managed Codex check: Chromium launch FAIL before assertions; assertions NOT_RUN. Exact inputs: Web PR135 `b7bf2c5e`, Remote PR134 `9d16027c`. Chromium rejected its SUID sandbox helper because owner was `nobody:nogroup`, mode `4755`, a misconfigured sandbox helper. No permissions, security settings, or launch flags were changed. The coordinator retains the authoritative task evidence link. Do not retry by changing permissions or weakening sandboxing.
