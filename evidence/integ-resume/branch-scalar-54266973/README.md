# Reviewed branch-only 909 MIX Level

The combined Nightly source brings exact Remote `c7b026cf` and Web `c36ac458` together on the Integration branch. The product manifest has 273 approved-for-source inputs. All three parent inputs retain every tracked path. The published matching firmware source is [DnBOX 54266973](https://github.com/gobbajogger/DnBOX/commit/54266973cf5f6893bbddae84920bea1db55e8f4a).

The independent [runtime review](runtime-review.json) approves explicit software selection of one production candidate control on that package pair. Both exact model packages passed native emulated USB Apply and Undo. The unchanged reviewed runtime paths passed the combined sandboxed Chromium replay on firmware host SHA-256 `5dccda64220867a87a770ba1a669b251fff140d719b35d32de42b3084cb05793`. Workspace verified HELLO, heartbeat, Apply, fresh read, guarded Undo and CLOSE. Invalid or missing endpoints refused without a write. Actual host lease revocation disabled Apply on the subsequent heartbeat. Device required both selections when ambiguous and stayed read-only. The exact packed TouchOSC layout passed the corresponding software replay. Shipping source and layout defaults are closed.

From this repository, select exact reviewed bytes instead of replacing a tracked catalog.

```sh
python3 tools/touchosc-parameters/select_branch_runtime.py verified-909-mix
node scripts/build-product-site.mjs --output "$PWD/.output/verified-909-mix/product"
cp .output/verified-909-mix/candidate-catalog.mjs \
   .output/verified-909-mix/product/remote/device/catalog.mjs
```

The output includes the exact catalog module, the reviewed TouchOSC document, and the review linking both to the two stock package hashes. The selector refuses changed reviewed inputs, path escape, and existing output. Approved product cleanup and review remain independent of this software-only opt-in.

## Focused combined checks

- 76/76 product and Remote tests passed, including all 19 musician routes and both legacy redirects.
- 15/15 source parity and installer comparison tests passed. The file-open browser journey passed through both Samples and Projects and back to the canonical Firmware tab with local fonts.
- Build History passed all 37 browser checks, including 390×844 and 844×390, all 198 raw archive records, corrected 0.0.26 text and visible Sounds link. The merged source retains Integration's descriptive archival links.
- The reviewed browser and TouchOSC source payloads match the previous exact staged hashes. Full visual review and the emulator-enabled aggregate Local gate remain pending. This scoped product build produced 284 target files without the optional emulator runtime present.

This direct branch work includes the exact reviewed software artifacts. No Pages action, device action, firmware release or production voting was performed. The retained private archive and prior visual proposals remain unchanged.
