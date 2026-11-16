# W3 exact-source comparison

`scripts/compare-firmware-html.py` compares decoded RGBA pixels and the complete screen inventory. It is read-only. It neither creates screenshots nor grants independent visual approval, firmware qualification or publication.

## Inputs

- Separate authoritative inventory: schema `dnbox-firmware-screen-inventory/1`, `productionSourceCommit`, `sourceInventoryGitBlob`, `coverageComplete: true`, `notRun: []`, and complete unique `screenIds`. The exact file SHA256 must be supplied independently from its source/review record. Matching two truncated capture inventories is not sufficient. The source-inventory Git-blob field is syntax-checked here; the caller/reviewer must independently resolve it against the pinned firmware repository and verify derivation/completeness. A self-authored JSON claim is not provenance.
- Native manifest: `productionSourceCommit`, `coverageComplete: true`, `notRun: []`, and nonempty `screens` records with unique `id`, relative PNG `path`, `width: 240`, `height: 240`, file `sha256`.
- HTML manifest: the same fields and exact native screen IDs, plus `websiteSourceCommit` and `browserCapture: true`. These fields must describe an actual browser capture, never a copied native image or an inferred result.
- Both exact commit pins must be supplied explicitly. Each PNG must match its recorded file digest; decoding uses those same in-memory hashed bytes, not a second path open. Paths may not escape the manifest directory or use symlinks; each image is bounded to 2 MiB and must decode to 240×240.

```
python3 scripts/compare-firmware-html.py \
  --native /path/to/native/manifest.json \
  --html /path/to/browser/manifest.json \
  --inventory /path/to/source-derived/screen-inventory.json \
  --inventory-sha256 <independently-pinned-64-character-inventory-SHA256> \
  --firmware-sha <exact-40-character-firmware-SHA> \
  --website-sha <exact-40-character-website-SHA>
```

The threshold is fixed at zero differing pixels. The report includes per-screen differing-pixel counts and decoded-RGBA hashes. Missing inputs, different pins, incomplete coverage, NOT_RUN, different inventories, malformed dimensions or a single changed pixel result in FAIL. No captures are opened when metadata admission fails.

## Current boundary

Firmware baseline `4bacd2e7d1bca1bf4de026befc0572e0b2489b8f` has 135 ordinary-state captures, but its manifest explicitly says coverage is incomplete (alternate engine and transient states missing). No final complete authoritative inventory or matching real HTML capture is available. Running admission against that baseline and missing HTML returns FAIL before any pixel comparison. This is not W3 completion.

Synthetic unit tests exercise the comparator, including a changed pixel, malformed/source-mismatched manifests, file-hash mismatch, dimensions and symlinks. Their PASS says only that the checker behaves as tested, not that any actual firmware/HTML pair matches.
