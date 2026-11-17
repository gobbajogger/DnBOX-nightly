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

## Done checks covered

<!-- LEFT / checklist IDs this PR claims, for example L15, L16, or "docs/meta only". -->

-

## Summary

<!-- What changed, and why. -->

## How it was tested

<!-- Host tests, builds, or a short reason this is docs-only. -->

## Checklist

- [ ] I did not commit secrets, firmware images (`.fwsc`, `.bin`, `.elf`, `.img`), logs, dumps, or installer zip archives.
- [ ] I did not change files under `.github/workflows/` unless a maintainer asked for that.
- [ ] Licence and credits in `LICENSE` (and `LICENSING.md` / `CREDITS.md` when present) still apply to any third-party code I touched.
