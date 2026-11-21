# Remote feedback correction

Base: fd6bcf8fee2841466de3291ea46a78952c440ee7. This is a successor on existing lane/remote and PR167.

The previous dynamic footer created an implicit grid row and shrank the editor on Undo. Reserve one compact 32 px plus safe-area feedback row; visible errors wrap and scroll inside it. Keep the existing physical-touch timing fixture unchanged.

## Actual evidence

- `baseline-recovery.log`: original fd6 production source plus strengthened fixture fails; main 753 ->723.109375px.
- `baseline-gesture.log`: original production source fails; landscape roll 219 ->189.109375px, selected note/end remains y310, end hit true ->false.
- `candidate-recovery.log`: seven actual startup/reload/invalid-draft/no-loss cases pass at 1440x900, 390x844, 844x390, child exit 0.
- `all14-process-receipt.log`: actual FunkyBeats browser suite 14/14, exit0; Undo/resize at all three sizes and controlled physical-touch timing retained.
- `geometry.json`: roll 631/555/187px invariant across Undo in desktop/portrait/landscape; main and thin lane geometry unchanged.
- `independent-review.json`: scoped ce-code-review completed with no actionable findings. Reviewer also hit-tested bottom lane, toggled feedback, and used a labelled synthetic long-message diagnostic to verify Tab focus and Ctrl+End scrolling at all three sizes. This is not an all-page 10/10 or owner-PDF acceptance.

## Execution and limits

Normal-sandbox bundled Chromium via primary runtime Python 3.12, qualified DnBOX cloud hostname ab35235f2a25. Runtime 257 full ten-file pin verified, WASM SHA256 f289da826f6c2cf270a257c19e506cc0701cb00c27b7215e7f428475de27eb11. Source/test hashes in review match exact built candidate. Isolated baseline and candidate used existing fixtures; no fake provider or device.

Focused commands: primary Python tests/product-workspace/recovery-browser.py; existing tests/product-remote/funkybeats-browser.py cases through isolated imported runner and scoped output. `chromium_sandbox=True`, qualified PLAYWRIGHT_BROWSERS_PATH, DNBOX_EMULATOR_RUNTIME set. The real full `scripts/gate.sh remote --post` is a separate exact-head delivery gate; its result and hash must be read from the PR receipt, never inferred from these focused passes. No main, force, device, Codex, Actions or gh-pages actions.
