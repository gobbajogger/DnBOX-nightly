# Mix and FX matched cues

Remote source audited at `afd61fdc142ff683f9a8350043504648013ed5b6` with tree `9d7dbf53751eb6e5e7713af39f1f676f4a9f126a`. Existing native frames retain their input provenance from [the registered matrix](../../evidence/remote-resume-0130/matched-native-states.json). The matrix records Remote capture source `995d5493386fad889ca8106758567c9fe80a47d5`. The later source audit covers the mounted renderer calls and uses the existing frames.

[The hash receipt](paired-frame-rehash.json) reopens nine existing 240×240 pairs and checks each PNG, decoded RGB, and dimensions against the matrix. The five Mix pages, both FX pages, picked fader, and delay knob match byte-for-byte after RGB decoding between the in-product website firmware WASM `61827a714ca7b240c01a55ed347b5fd7b847c7c2` and the paired firmware host `f1786ebec2616477163b62b029c7e77405a9c3de`. Source definitions below are from the latter. Shipping 0.0.26 has its own [capture ledger and image hashes](../../evidence/remote-resume-0130/mix-project-review/receipt.json). Master More lacks a paired state in this matrix.

## Same-input checks on the audited source

| Control | Shared input | Observed result |
| --- | ---: | --- |
| Reverb Decay | 73 | 62% on Remote and paired native surfaces. |
| Reverb Tone | 57 | 45% on Remote and paired native surfaces. |
| Reverb Low Cut | 62 | 149Hz on Remote and paired native surfaces. Firmware shares its Tone schematic, while Remote falls to Level. |
| Delay Time | 7 | 1/8. on Remote and paired native surfaces. Native time pips show the ordinal division. Remote time pips use fixed spacing. |
| Delay Feedback | 52 | 35% on Remote and paired native surfaces. Native taper also responds to delay type. Remote ECHO approximates taper from amount. |
| Delay Tone | 51 | 40% on Remote and paired native surfaces. |
| Reverb and Delay Return | 85 each | −1.9dB on Remote and paired native surfaces. Native uses distinct reverb and delay schematics. Remote uses Level for both. |
| BREAK Rev send | 25 | 19% on Remote and paired native surfaces. The native FX knob uses the reverb schematic. Remote Mix uses the sends fader. |
| 909 part Level and Pan | 75 and 64 | −5dB and C on Remote and paired native surfaces. |
| Master Filter | 64 | OFF in the captured factory state. The native dispatcher draws two subdued flat lines from actual applied Mode, Cutoff and Resonance. Audited Remote draws a generic filter response. |
| Master Drive | 41 | Paired native reads 32%. The audited Remote master formatter reads 41; the shared readout audit owns its formatting change. |

Remote readout source is `web/product-site/remote/mixer-format.mjs`. The independent Delay recheck uses native `04-delay-knob`. Native format/shape source is `firmware/src/app/ui.c` and `firmware/src/dsp/fxbus.c`. The native master default-resolved capture shows COMP OFF, PUMP 0.0dB and THRESH −12dB. Archived local Draft uses other compressor values. Those captures cannot prove identity at the same compressor state. Master COMP `6/0/12` and Glue `4/0/3` are different controls and retain their labels.

## Renderer corrections

[The isolated patch](reverb-low-cut-glyph.patch) maps the sourced Reverb Low Cut identity `1:4:0:6` to the existing Tone drawing. Paired firmware dispatches Reverb Tone, Delay Tone, and Reverb Low Cut together in `firmware/src/app/ui.c:8144`. The regression resolves that identity from the original component data and checks glyph equality against Tone at all 128 positions. [Regression before change](red.tap) shows the expected failure. [After change](green.tap) passes all eight domain and live registry tests. `git diff --check` and `git apply --check` pass. This establishes the shared rendering family and leaves native-pixel geometry for visual review.

[The additional encoder patch](fx-encoder-glyphs.patch) applies after the Low Cut patch. Its bindings are scoped to the original target, voice, and parameter identities.

| Remote and native identity | Approved R22 drawing | Pinned firmware geometry |
| --- | --- | --- |
| Reverb Return `1:4:0:7` / `FX_RV_LEVEL` | G059 `r22-primitive:REV RETURN` | Seven centered taps at raw85, heights 2, 3, 5, 6, 7, 9, 10. |
| Delay Time `1:4:0:8` / `FX_DL_TIME` | G052 `r22-primitive:TIME` | The 13 ordinal divisions select native spacings. Raw7 uses a six-unit gap and the first-gap bracket. |
| Delay Feedback `1:4:0:9` / `FX_DL_FDBK` | G053 `r22-primitive:FEEDBACK` | Raw52 DIGI heights 10, 3, 1 and TAPE heights 10, 5, 2, 1. Only the Draft path exposes the mode. Native mode remains unknown and the generic amount-only drawing stays available. |
| Delay Return `1:4:0:11` / `FX_DL_LEVEL` | G056 `r22-primitive:DLY` | Four descending taps at raw85, heights 11, 9, 7, 5. The registered send primitive supplies the zero baseline, and the same C branch adds the delay-return amount. |

Per-part send faders use `1:5:<voice>:1` and `1:5:<voice>:2`. They retain the Mix fader presentation and their source values. Both return controls use encoder cards. The C source probe recorded exact normalized centerline and baseline agreement for 525 cases across all 13 Time steps, all 128 Feedback positions per explicitly supplied mode and all 128 values for each return. [Source probe and hashes](fx-pinned-source-receipt.json). The shared R22 canvas draws those strokes using existing ink and antialiasing. [Focused tests](fx-glyph-green.tap) pass 18 of 18.

The registered Mix view opens at Levels. The Reverb and Delay encoder cards appear in FX and owner page 8. There is no fresh page 8 frame in this audit. The browser regression has assertions for Feedback mode and canvas updates through DIGI and Undo, and remains pending on the consolidated affected run.

## State and geometry

Remote TAPE G050 draws two round reels and an amount marker. The stored Wear64 reads 50% in the dedicated Remote Wear control. Native R_TAPE combines mode and Wear as raw71 and displays 49% from its integer combined-mode calculation. The values describe the same underlying wear. The patch applies native integer truncation to the reel-marker input only. Stored Wear64 now renders raw71 (16 units of marker) in the shared glyph instead of raw72 (17 units). The direct Wear label remains 50%. Native active spokes advance at 80ms using `engine_tape_active()` in `firmware/src/app/ui.c:7984`. [Shipping 0.0.26 evidence](../../evidence/remote-resume-0130/mix-project-review/README.md) records zero changed pixels idle and ten per adjacent live reel crop. Remote does not have phase or activity from the supported input provider. Its gesture updates amount and mode. That operation does not establish movement from the audio source.

Remote Mix uses flat panels, responsive dimensions, and an explicit selected/pressed state. The native 240×240 layout uses compact groups and audio indicators appropriate to its canvas. Remote stereo peak/Wave derives from PCM in Emulator mode. A matched live native gain reduction or per-part transport is unverified. The nine paired RGB states establish native website/host equivalence for those inputs. They do not establish Remote versus owner PDF 2% or live visual closure.

## Master Filter source dispatch

The native knob loop short-circuits through `perform_glyph` before `control_glyph`. The first branch dispatches `MST_DJF` to `filter_display` and the actual response geometry. The later centered bipolar branch therefore cannot determine this card's appearance. Firmware 0.0.26 has the same order. R22 G066 is the MIX bars primitive.

[The Master Filter patch](master-filter.patch) keeps the FILTER family and routes Draft `1:6:0:13` to the pinned performance curve. It reads the actual local Mode, Cutoff and Resonance through Master Draft, including independent changes and imported detail overrides. OFF draws the native flat guide and dim response. LP, BP and HP use the pinned cutoff pivot and resonance crown. [The compiled source comparison](master-filter-pinned-receipt.json) matches all 128 macro values at three resonance levels and 36 direct mode/detail samples. All 420 tests matched normalized geometry and source ink intent. [Focused tests](master-filter-green.tap) pass 21 of 21.

Native Mix has stored macro `6:0:13`, but its accepted source groups lack actual applied Mode, Cutoff and Resonance (`6:0:8`, `6:0:9`, `6:0:10`). Firmware allows independent direct or motion edits with the macro unchanged. The Draft patch does not infer that applied state from native macro position. Master mode labels retain existing readout behavior and require the actual applied detail state before native closure.
