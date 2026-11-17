# Release tags on the integration branch

Public, user-facing firmware packages stay on the `v*` tags (currently v0.0.25.1) and are published from `main` / `gh-pages` only after the owner's sign-off.

Work toward the final build is tagged on `integration/dnbox-consolidated` as prereleases:

| Tag | Meaning |
|---|---|
| `dnbox-start-2026-11-17` | Clean starting point on 17 November 2026 (Asia/Vladivostok, UTC+10). Also see `start-fw-2026-11-17` / `start-nt-2026-11-17` for the M0 start merges. |
| `dnbox-M<n>-<yyyy-mm-dd>` | A finished delivery-plan move, `n` from 0 to 6, dated on the day it merged. |

Whoever merges a finished move M0–M6 into `integration/dnbox-consolidated` creates the tag at that merge SHA and publishes a GitHub **prerelease** with the same name. Do not force-move a tag. Do not mark these as the latest public release.

The move list and the done checks are in [DELIVERY-PLAN.md](DELIVERY-PLAN.md) and [START-POINT.md](START-POINT.md).
