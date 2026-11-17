## Lane

<!-- sound, fwui, integ, remote, or web -->

Lane:

## Local gate

Run `scripts/gate.sh <lane>` at the PR head and paste the final line here:

```
DNBOX-GATE: PASS <sha>
```

or

```
DNBOX-GATE: FAIL <sha> <failed checks>
```

A docs- or meta-only change may say why the full product gate was not required, but still name the SHA.

The local gate is fail-closed and offline by default (`scripts/gate.sh --self-test` proves the parser). It prints `DNBOX-GATE: PASS <sha>` only if every required inner step ran and reported success; otherwise `FAIL` or `INCOMPLETE`. It does not use network Git unless you pass `--online`. A skipped network step prints `SKIP`.

After a local PASS, post the status so the pull request can merge into `integration/dnbox-consolidated`:

```
scripts/gate.sh <lane> --post
```

That publishes a `dnbox-gate` commit status on the tested SHA. The consolidated branch requires this status to be success, and it requires a pull request. GitHub Actions are not used.

## Done checks covered

<!-- LEFT / checklist IDs this PR claims, for example L15, L16, or "docs/meta only". -->

-

## Summary

<!-- What changed, and why. -->

## How it was tested

<!-- Host tests, builds, or a short reason this is docs-only. -->

## Checklist

- [ ] I did not commit secrets, firmware images (`.fwsc`, `.bin`, `.elf`, `.img`), SuperJ6 `.ipa` or AU installers, logs, dumps, or installer zip archives.
- [ ] I did not change files under `.github/workflows/` unless a maintainer asked for that.
- [ ] Licence and credits in `LICENSE` (and `LICENSING.md` / `CREDITS.md` when present) still apply to any third-party code I touched.
