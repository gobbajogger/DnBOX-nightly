# Owner hardware reports

The authoritative file is [hardware-tests.json on nightly Pages](https://gobbajogger.github.io/DnBOX-nightly/hardware-tests.json). One record covers one model, display version, firmware commit, package SHA-256 and bundled-controller SHA-256. The owner confirms both startup and restart. The evidence URL identifies the release, issue or pull request. An optional UTC `reported_at` records when the owner made the report. Public success and failure issues are separate from these confirmations.

The initial file contains two reports for 0.0.26 at `94197fc839b00aff47b98ca02f3c6396e4a6eabf`, one each for SMK-37 Elite and Pro. The official release records the owner’s two startup/restart tests. Version 0.0.25.1 retains its existing fallback approval independently. [Release evidence](https://github.com/gobbajogger/DnBOX/releases/tag/v0.0.26)

The nightly admin writes only the live ledger when the authenticated owner marks a model tested. Nightly and MAIN installers read that ledger on opening. The status pages read the ledger and match reports to the package catalog. Each installer carries a checked build-time snapshot for offline use. The JSON endpoints `versions.json` and `build-status.json` reflect the last reviewed website build; a later admin report appears in those endpoints after the next publication. MAIN additionally reads its own live `versions.json`. A nightly confirmation can describe a package before the owner promotes that package to MAIN.

## Preserve the live records during publication

For a reviewed publication, assemble the exact current nightly Pages tree locally, then run the build against it.

```sh
npm run build:product -- --pages-base "$nightly_pages" --output .output/publication
```

If that tree has a ledger, the build validates and copies its bytes verbatim and derives the published JSON and embedded installer from them. It uses the reviewed source seed only for first publication. An invalid published ledger stops the build. Compare the published tree's ledger blob with the included output and update the branch against the same observed tip. If the tip advanced, reacquire it and rebuild before publishing. This preserves new admin records and deliberate owner corrections. A regular local development build uses the source seed.

The shared browser API in `hardware-tests.mjs` exposes `validateHardwareTests`, `hardwareTestsFor`, `catalogWithHardwareTests` and `statusWithHardwareTests`. The last two produce publication snapshots without changing their inputs.

For historical catalog rows without an explicit display version, the shared resolver accepts an owner-assigned number from the published `package-version-assignments.json` only after matching the catalog ID, firmware commit and tree, both models’ product identities, sizes and digests, and the controller fields. Unreported historical records retain their original catalog shape. An owner report adds the resolved version to the reviewed status view for that package.
