# Shipping 0.0.26 and R22 comparison

Measured against Web product head `d68eceb84d9650ac7cefd8c7cfcfb33852940c50` (tree `e91faa5c8ea1ed5e9f095a7b299213249f5acb9c`). This evidence-only change keeps that product tree's executable inputs. The shipping PNGs come from stopped native-source execution of `94197fc839b00aff47b98ca02f3c6396e4a6eabf` as retained by Edition 2 v2. They do not carry a physical Elite capture receipt. Web uses `61827a714ca7b240c01a55ed347b5fd7b847c7c2`. The comparison counts every 240×240 pixel whose decoded RGB differs and sets the 1% threshold at 576 pixels.

## Sequencer

The reused shipping and original R22 stills, plus the Web canvas captured in sandboxed Chromium at device scale one, show the same visible P1, 125 BPM, selected bass drum, empty grid, LENGTH 16 and RATE 1/16. Shipping, R22 and Web appear left to right in each PNG. The R22 anchors are source-frame-066 and source-frame-068. Hidden state and transport phase were not independently matched.

| Screen | Shipping vs R22 | Shipping vs Web | R22 vs Web |
|---|---:|---:|---:|
| [909 SEQ](909-seq.png) | 13,267 (23.03%) | 11,166 (19.39%) | 19,770 (34.32%) |
| [808 SEQ](808-seq.png) | 13,249 (23.00%) | 11,159 (19.37%) | 19,752 (34.29%) |

Both Web canvases match their native Web firmware oracle exactly. The different layouts and baselines do not justify changing Web to match either reference. [Fixture and output hashes](seq-receipt.json).

## 909 kick sound

The [shipping still](shipping-909-kick.png) and [Remote Draft view](remote-909-kick.png) show Tune 34, Attack 10%, Decay 1.0 s, P.Dpth 0%, Pitch 45 and Accent 127. The Remote Sound → 909 → BD route used 1440×900 and rendered responsive DOM and SVG with no canvas and no page errors. The built Remote and reference directories at the browser worker's `583f6229` and this Web candidate compare byte-for-byte. The shared stylesheet change is scoped to the Starting Breaks picker.

The [Web LCD](web-909-kick.png) also matches its own native oracle exactly. Its shipping role comparison differs at 36,533 of 57,600 pixels (63.43%). The displayed tuning, pitch and accent representations and layout differ, so this is not an exact control-state measurement. The recovered 909 kick R22 GIF is a later reconstruction and cannot supply the missing approved original. Remote supplies semantic corroboration for this stopped view, but no native 240×240 comparison surface.

## Independent disposition

The independent reviewer withheld parity approval. The accepted native Web fixture sweep is reusable for its pinned firmware. The archived SVG comparisons, same-role native comparisons, and Remote geometry checks do not establish the required matched cross-surface threshold, shared live phase, or identical envelopes and glyph motion. The owner confirmed software-only qualification. The source-pinned 0.0.26 render is the shipping comparator and no physical capture is required. Full comparison still needs the equivalent Remote state/control surface and the matching R22 fixture treatment. The firmware grid and LENGTH/RATE placement are drawn by `firmware/src/app/ui.c` in `draw_drum`, `draw_knobs` and the shared control glyph path. Web's RGB565 canvas already matches its producer, so the shared layout repair needs a scoped FWUI change and refreshed native RGB and WASM pins.

The existing `d68eceb84` route-evidence ZIP was saved to LoopyX0X37 Project Sources and verified after reload by the coordinator. Its recorded SHA-256 is `74bba4c104e471f16345f83f1aa1b6237cf6861df4fa73a5aca7f5a57fd7e9db`.

## Web reference correction

The two SEQ selections expose Current native firmware, Shipping 0.0.26 and R22 directly in the existing LCD. Shipping and R22 draw their pinned software captures at native 240×240 resolution. Current still uses the shared WASM renderer and its native oracle. The source selector appears only for the two qualified views, and the native comparison is suppressed for archived sources. The new comparison view retains the measured layout differences above.

The runtime-backed build produced 269 files. The focused test passed both states and all three sources at 1440×900, 390×844 and 844×390, including exact RGB and return to Current. All 14 product-content checks passed. The independent landscape browser also verified request ordering, reset to native on a non-SEQ state and the restored native comparison button. [Independent log](seq-source-independent.txt).

```sh
python3 tests/firmware-reference-browser.py --site .output/product-site --seq-sources-only
```

## Shared state matrix

[The matrix](seq-state-matrix.json) is used directly by the focused Web browser test. It keeps the FWUI ledger pin, exact Web RGB expectations and the closest mounted Remote controls together. The prior verified Web triples are reused. Only the missing Remote states were captured. In [909 Remote](remote-seq-empty-909.png) and [808 Remote](remote-seq-empty-808.png), the stopped Draft shows P01, BD, 16 steps and an empty 176-cell grid. The header shows 120 BPM, and this surface exposes no explicit 1/16 control. These images qualify grid-role equivalence, with exact timing and rate remaining open. [Remote browser log](seq-remote-independent.txt).

The [FWUI ledger](https://github.com/gobbajogger/DnBOX/blob/22a34d6ecef7b31e62ea6655fddc4920ab30f8e1/docs/lanes/fwui/current/reference-026/qualification/README.md) covers native routes and scoped F6 behavior. The recovered detached SEQ voice-rail candidate only changes the row glyphs and has no full-state parity or stock-space qualification receipt. Independent review decoded the existing triptychs and reproduced all six pixel counts. All exceed 576 differing pixels.

The reviewer also identified a delayed native worker failure that erased a selected archive. The injected late abort reproduced the issue. The fix scopes error display to Current, and the browser test proves Shipping remains visible and the native worker can recover when selected again. The corrected build produced 269 files. Both focused tests passed, and independent review approved the guard and its regression. No layout or fixture pixels changed.
