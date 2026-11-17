# Contributing

Thanks for your interest in DnBOX. By taking part in this repository you agree to follow the project's code of conduct in the firmware repository, [gobbajogger/DnBOX](https://github.com/gobbajogger/DnBOX/blob/integration/dnbox-consolidated/CODE_OF_CONDUCT.md).

## Using the site and test packages

- Published installer: [https://gobbajogger.github.io/DnBOX/install/](https://gobbajogger.github.io/DnBOX/install/)
- Nightly / hardware-test installer: [https://gobbajogger.github.io/DnBOX-nightly/install/](https://gobbajogger.github.io/DnBOX-nightly/install/)

Pick the Elite or Pro package that matches your keyboard, back up sample slots first, and do not unplug USB while writing. See the [README](README.md).

## Reporting a problem or idea

Please use the issue forms. Do not attach private backups, credentials, or raw captures that you do not want public.

## Code and documentation changes

1. Branch from `integration/dnbox-consolidated` and open a pull request into that branch (not `main`). `main` is reserved for the owner's final sign-off. Follow the pull request template.
2. Keep changes focused. Do not commit secrets, firmware images, logs, dumps, or installer zip archives.
3. Follow the licence in [LICENSE](LICENSE).
4. Run the local gate and paste its final line in the pull request:

   `scripts/gate.sh <lane>`

   It wraps `scripts/dnbox-gate.sh` and prints `DNBOX-GATE: PASS <sha>` or `DNBOX-GATE: FAIL <sha> <failed checks>`. Name the lane (`remote`, `web`, or `integ`) and list the done checks the PR covers.
5. Do not change GitHub workflow files under `.github/workflows/` unless a maintainer asks you to. GitHub Actions are off on this repository; checks run locally.

## Releases

Integration-branch tags for finished delivery-plan moves are described in [docs/RELEASES.md](docs/RELEASES.md).

## Security

See [SECURITY.md](SECURITY.md). Do not file a public issue for a vulnerability.
