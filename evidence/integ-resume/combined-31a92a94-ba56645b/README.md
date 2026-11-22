# Combined Nightly software qualification

The tested pair is Nightly `31a92a944c9303940d5409cd213dedba1d47c793` and firmware `ba56645b2142b134be3aeee2236406e1c95b2bde`. Nightly contains consolidated `583f622961fc9975fac746592ce6c483073c4170` with zero deleted consolidated paths.

## Local gate and focused evidence

The unchanged Nightly gate ended **FAIL**, exit 1. Clean tree, setup, no-loss, limits and build passed. The 575 edge tests also passed. Two failures stopped the later stages.

- Web installer `web/product-site/install/index.html:643–655` mounts two copies of `sample-picker`, `samples-status`, `download-breaks` and `download-status`. The module initializes the picker in the closed disclosure and leaves the visible picker inert. The Web owner needs both views reconciled into one operable control set.
- Remote browser test `tests/product-remote/funkybeats-browser.py:713` requests `BREAK P2, not loaded`. The production accessible label is `BREAK P02, not loaded`. The single-journey [P02 probe](break-p02-probe.json) passed after correcting only the disposable locator. The canonical failure remains recorded.

All [19 browser routes](routes.json) returned HTTP 200 with zero page errors in the focused suite. Four viewport sizes passed [project and preset file exchange](projects-file-exchange.json), and [12 sample exchange tests](sample-file-exchange.log) passed. [Emulator LCD and historical views](emulator-lcd.log) passed. The [direct canvas check](firmware-canvas-subset.json) compared 13 exact RGB565 images across seven modules. The 1,838-state oracle was enumerated for source closure. The screenshot-producing full firmware-reference invocation was [denied by automatic review](firmware-reference-full-denial.json) and remains unexecuted.

The [cookie-free demo](cookie-free-demo.json) completed Ready, Hold C3 and reset. The rebuilt [0.0.26 catalog](published-026-parity.json) preserves the matching released Elite and Pro sizes, hashes, canonical package URLs and separately scoped owner startup and restart receipts. The released assets retain their historical qualification.

The [Chromium](remote-chromium.json) and [packed TouchOSC](remote-touchosc.json) tests exercised the exact production interface and firmware host. They verify the reviewed one-control opt-in, guarded Apply and Undo, fresh readback, heartbeat and lease close, alongside capability, identity and stale-write refusal. The shipping catalog continues to refuse unapproved pairings. The paired replay is software evidence and the candidate remains unqualified for distribution.

## Registered renders and independent disposition

- [Remote](remote-proposals.json) produced exactly 32 proposals, eight states at four sizes, with zero reported page or header failures. Four grid checks and one 1024 × 640 header comparison passed. Independent approval is on hold. Patterns does not show the owner-selected P01 or the landscape detail actions. In the 844 × 390 Chicago view the Wave value falls below the initial fold while the glyph and slider are visible. Projects shows all three action groups, with reachability of the bottom control unverified in the scrollable landscape view. The proposal set omits the matching populated Song, Motion, Connect, additional synth, Master and FX states.
- [Build History](history-phones.json) rendered at both phone orientations with no page or header errors. The 390 px image changed from 104,451 to 104,608 pixels high and the 844 px image changed from 73,342 to 73,545. Both registered comparisons failed. Independent review confirmed all eight navigation links and the corrected archive copy. The source preserves all 198 record payloads and their order. These rendered proposals remain separate from the approved references.
- [Original and Legacy Manual](manual-phones.json) matched their four existing phone baselines at ratio 0.0 with zero page or header errors. Independent review matched the first viewport exactly on all four. Original landscape has 1,670 single-channel-level differences far below the fold, within the existing comparison tolerance. Existing approved files were retained.

The [receipt](receipt.json) pins the full logs and retained local archive. Both exact GitHub status reads returned zero entries through the authenticated owner connection. Posting a status and a live opening-post vote remain unverified. No candidate assets were transferred to Web for distribution.
