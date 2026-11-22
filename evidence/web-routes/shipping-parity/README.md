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

The independent reviewer withheld parity approval. The accepted native Web fixture sweep is reusable for its pinned firmware. The archived SVG comparisons, same-role native comparisons, and Remote geometry checks do not establish the required matched cross-surface threshold, shared live phase, or identical envelopes and glyph motion. The next needed inputs are a source- and state-qualified Elite capture, an approved R22 reference for the same state, and a designated Remote comparison surface plus viewport and normalization contract. No product changes were made.

The existing `d68eceb84` route-evidence ZIP was saved to LoopyX0X37 Project Sources and verified after reload by the coordinator. Its recorded SHA-256 is `74bba4c104e471f16345f83f1aa1b6237cf6861df4fa73a5aca7f5a57fd7e9db`.
