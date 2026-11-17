# Local visual gate

Runs locally inside `scripts/gate.sh` (`npm test`); GitHub Actions is not used.

```
PYTHONDONTWRITEBYTECODE=1 python3 tests/visual/test_visual_gate.py
npm run test:visual
```

Every Remote, site and offline page is rendered at 1440x900, 1024x640, 844x390 and 390x844. The run fails on page errors, header violations (anchored to `fixtures/page-01.png`), horizontal overflow, render differences against a committed baseline, size changes and empty or filtered (`VISUAL_ONLY`) coverage.

Baselines live in `tests/visual/__snapshots__/<name>.png`. A screen without a committed baseline is still rendered and checked; only its pixel comparison is skipped and counted as `no_baseline`. `npm run test:visual:update` writes baselines and exits nonzero; committing them through a merged lane PR is the approval.
