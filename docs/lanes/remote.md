Move: M3 (remote whole Remote)   PR: not opened   Head: this source checkpoint
LEFT items PASS: 0/6; failing: L23 L24 L25 L26 L27 L28
Gate at head: NOT_RUN (browser, full move gate and independent Review pending)
ETA merge: unconfirmed; plan target 2026-11-19 12:00 VLAT

Owner: Dot remote step-port worker. Branch: lane/remote-step-port. Base: START-NT bc3ed20d69159a01e82e079fa7e1cbbf66cab2ce.

## Delivered piece
FunkyBeats step-sequencer source port integrated into the Remote drums view for 909/808: 176 typed cells per kit, click-to-toggle through the existing undoable model, R22 styling and MIT notice. Structural test and product build pass. This is the user-requested source checkpoint, not full M3 completion or native protocol admission.

## Next
Run the browser-capable Orchestrator stage on this exact source, then consume this piece in the sole M3 move branch. Preserve the older dirty M3 tree; this isolated branch does not overwrite it. Remaining roll, mixer, launcher, synth, slider-lane, visual and actual-protocol checks remain open.

## Checks
- `node --test tests/product-remote/funkybeats-drums.test.mjs`: PASS.
- `node scripts/build-product-site.mjs`: PASS; manifest includes static application closure.
- Browser / landscape / full Local gate / Review: NOT_RUN. Prior sandbox EPERM is not retried or bypassed.

## Near-grid hit correction
The step adapter previously displayed an existing hit within one sample of the grid but bound the click to the rounded grid start, adding a duplicate instead of toggling the displayed hit. The adapter now binds that cell to the actual displayed event start. The regression verifies both kits and Undo. Exact original source remains preserved.

Checks on corrected source: 3/3 targeted tests and 43/43 complete Remote Node tests PASS; product build PASS (179 files). Browser and full Local gate remain NOT_RUN; no green PR or M3 completion claim. The Local gate still contains network Git and cannot run unchanged under the project rule; the prior denied browser route was not retried. Independent source review: PASS; reviewer separately reran all 43 Remote tests and verified every one of 179 manifest entries. No blocking finding in the changed scope. Next: source checkpoint, then qualified browser/full-gate stage.

## Browser fixture syntax correction
The browser test replaced every BUNDLE substring, including the __DNBOX_FIRMWARE_BUNDLE property name, producing invalid JavaScript before MIDI setup. Reused the fixture with a unique payload marker; regression parses and evaluates the injected source without a browser. RED reproduced Unexpected token '{'; corrected Remote Node suite PASS44/44. This explains a concrete injected-script failure, not proof the complete handshake/browser flow passes. Browser/full Local remains FAIL (NOT_RUN); prior EPERM not retried. Existing no-sandbox test launch is not executed and must consume the reviewed normal-sandbox correction from integ before browser qualification. Independent source review PASS on exact fixture/test hashes; reviewer reran41/41 top-level Remote tests (full incl.platform run44/44). Next: combined browser qualification in an authorized capable environment.
