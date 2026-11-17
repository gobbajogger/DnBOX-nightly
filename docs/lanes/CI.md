# CI

GitHub Actions runs the Local gate automatically:

- on every pull request into `integration/dnbox-consolidated`
- on every push to `integration/dnbox-consolidated`
- manually via `workflow_dispatch` (the Actions tab lists this only after the workflow exists on `main`)

The workflow is `.github/workflows/gates.yml`. It uses GitHub-hosted `ubuntu-latest` runners with `permissions: contents: read`. There are no secrets, no deploy steps, and no jobs that touch `main` or `gh-pages`.

The job installs Node 22, Python 3.12, numpy, Pillow and Playwright's Chromium, runs `npm ci` when a lockfile exists, then runs `scripts/dnbox-gate.sh integ` (build, unit tests including origin and visual, and browser tests).

A red X is a real Local-gate failure unless the log shows a CI setup problem.

Allowed 2026-11-17 by the User. Cursor cloud agents stay unused.
