# Local visual gate

GitHub Actions is not used. Run all build, source, browser and visual gates locally against the final candidate. Keep command, exit code, exact source identity, Chromium version and logs together. No merge or deployment is admitted by this document.

```
PYTHONDONTWRITEBYTECODE=1 python3 tests/visual/test_visual_gate.py
CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:visual
```

The normal run fails for missing baselines, unreviewed or altered baseline bytes, render differences, header violations, page errors and empty coverage. `VISUAL_ONLY` narrows diagnostics only; it is not full-site qualification.

## Baseline proposals and independent acceptance

`npm run test:visual:update` captures proposals and resets every changed entry to `PENDING-INDEPENDENT-REVIEW`. It exits nonzero: capturing images does not approve them. Compare the actual renders with approved references and prior states in an independent review before recording acceptance. This is the project's internal independent review stage, not an extra aesthetic-response wait.

After that review, `tests/visual/approvals.json` records each accepted image by name:

```
{
  "remote-sequence-1440x900": {
    "status": "APPROVED",
    "sha256": "<SHA-256 of the reviewed PNG>",
    "reviewer": "<actual independent reviewer>",
    "evidence": "<durable review receipt for those bytes>"
  }
}
```

Do not copy this example as a real receipt. The renderer does not create approvals. A changed baseline invalidates its old review. Run the normal full gate three times on the frozen candidate to establish stability, then run intentional render mutations and restore the candidate to prove failures are detected. The unit suite proves these mechanics using synthetic pixels; it is not real-page review or stability evidence.

No committed baseline or full-site passing receipt exists yet for the adopted `9809abc0` source. `--update`, a filtered run, synthetic contract tests, or a source push is not a publication gate pass.
