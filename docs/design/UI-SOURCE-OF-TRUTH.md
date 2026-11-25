> Current R22 design contract for firmware, Remote and web. Repository policy and release qualification remain in [RULES.md](../../RULES.md). See the [UI defect test specification](UI-DEFECT-TESTS-SPEC.md) for how to verify this contract.

# DnBOX UI source of truth

## Design system

- **Informative without crowding or wasted space.** Show what the musician needs for the current action, once, with room to read it. Use available space for real controls, graphs or musical context. Purposeful whitespace is correct for a prompt, an empty state, or an unassigned physical knob. Never fill space with a duplicate readout, fake control or decorative graph.
- Use the 909/808 R22 component system, the approved 17:00-batch glyphs, and one shared panel radius, type scale, marker and spacing system. Group related controls inside one bounded, flat panel. Prefer one four-column panel for four related physical knobs. Keep each column bound to its real knob, with aligned baselines and consistent gutters. A full-width engine envelope is a distinct layout role, not a row of four miniature controls.
- Keep a consistent header: page NAME, pattern or relevant held-step/song context, transport, BPM and the four-level R22 battery icon (percentage once calibrated). Keep height, font and UNSAVED treatment consistent. An overlay may temporarily use the relevant context slot; dismissal restores the prior context. Keep any step strip required for the current sequence or edit visible. Pages with no footer function need no footer.
- Each editable unit is one short readable LABEL, one shared live glyph and one VALUE with its musical unit where applicable, kept together and bound to the same parameter, scope and owner. Show the editable readout once per page. A clearly read-only header BPM or selection cue is not a second editable control. Use musical units (st, ms, Hz, dB, %), no raw 0–127 unless it is genuinely MIDI velocity, and no made-up unit for enums, musical divisions or on/off. Pan reads L50…C…R50. At 240×240, label type is at least 8 px and value type at least 11 px; check actual readability as well as nominal size.
- Use consistent, non-color-only indications for selection, hold, pending and applied states. Check actual text and indicator contrast against adjacent backgrounds at native size in both themes, including selected/dimmed states where the information is needed. Do not trade away legibility for density; do not use explanatory filler on working firmware or Remote surfaces.

### Shared style values

Reuse the firmware [panel radius](https://github.com/gobbajogger/DnBOX/blob/1d727e2ba118f0c85b20f3ed241ec133e4882d7e/firmware/src/app/ui.c#L5511) (8 px), [light/dark material tokens](https://github.com/gobbajogger/DnBOX/blob/1d727e2ba118f0c85b20f3ed241ec133e4882d7e/firmware/src/ui_theme.h#L6-L25), [drum control slot geometry](https://github.com/gobbajogger/DnBOX/blob/1d727e2ba118f0c85b20f3ed241ec133e4882d7e/firmware/src/app/ui_drum_voice.inc#L725-L729), and [rounded curve stroke](https://github.com/gobbajogger/DnBOX/blob/1d727e2ba118f0c85b20f3ed241ec133e4882d7e/firmware/src/app/ui_glyph_renderer.h#L7-L32) (2 px where that shared stroke is used). These are source-pinned examples of the existing R22 implementation, not new universal dimensions for unlike roles. For Remote use the [shared sequencer stylesheet](https://github.com/gobbajogger/DnBOX-nightly/blob/583f622961fc9975fac746592ce6c483073c4170/web/product-site/remote/style.css), not a page-local copy.

## Glyphs: meaning, style and behavior

- **Meaning:** show the actual engine response for a curve, or a clearly semantic symbol for a discrete or binary state. Full envelopes use actual engine data and preserve partial stages and their timing; do not add cosmetic topology or fake waveform states. SuperJ6 WAVE, SUB and LFO RATE must clearly show the current setting; time-based Attack must show a rising edge and 808 TONE must not read as DECAY.
- **Style:** compare like roles on the same page and across related pages and engines. Use compatible visual weight, stroke thickness, alignment, color hierarchy and native antialiasing on curved or diagonal edges. A native, pixel-aligned rail need not be softened. Mini curves, full-width envelopes and status markers may have intentionally different weights and sizes.
- **Behavior:** with real inputs, show the actual response to knob movement, discrete detents, holds, locks, hits or playback where these apply. Continuous controls follow the parameter's real response; cyclic controls wrap; detents change to their real discrete states. A changed knob value does not prove hit feedback at a fixed value. Preserve 0.0.26 behavior where the feature existed unless the owner explicitly approved a change. Do not infer renderer cadence from a GIF's export rate.

### Worked component: 808/909 TUNE

**Use when** the control edits tuning or a documented pitch-sweep parameter. Do not use the TUNE glyph to represent TONE, DECAY or another parameter. Keep the voice's actual meaning and unit: for example, 808 Snare uses semitones, 909 Low Tom uses Hz, and the approved 909 Kick sweep uses ms. Do not copy the kick shape to other voices.

**Anatomy:** `TUNE` identifies the control; the shared mini-glyph shows the actual setting; `67 Hz` is an example of the value and unit for 909 Low Tom. Keep all three in one control cell. Compare finish with the adjacent mini-curves and the approved kick artwork, not with a full-width envelope.

| State and input | Pass | Fail |
| --- | --- | --- |
| Idle, no note sounding | The current setting and unit remain clear. | A decorative animation implies a value change, or the label and value refer to different parameters. |
| Turn the bound tuning control | The readout and the glyph's value-driven feature follow the same real edit and settle. | A static glyph, a fake pitch sweep, or a duplicate readout. |
| Hit the voice without touching TUNE | Where shipping 0.0.26 showed a response, the hit is visible and returns to idle. The tuning readout stays unchanged. | The cue never reacts, or the hit appears to change the saved tuning. |

The [fixed-value Snare and Low Tom repro](https://github.com/gobbajogger/DnBOX/pull/987#issuecomment-7076530675) is the negative example for the last row. The table describes expected behavior, not a certification of a firmware fix.

## Engines and parts

- Synth One occupies the third synth slot everywhere. Use the real SuperJ6 name, controls and preset terminology, not generic substitute labels or parameters. 909 TUNE and PITCH are either a single control or two distinct controls with distinct meanings, names, units and glyphs. The same shared visual system applies to all engines; no raw float lists.

## Remote

- Keep the Remote header musician-facing and test actual navigation, visible BPM actions, selected track and pattern context, and Draft vs. confirmed device ownership at desktop, portrait and phone-landscape widths. Page-01 is a retired reference; the gate records the historical SSIM but does not use it for approval. No replacement screenshot is approved by this change. Keep the copy short and musician-facing. Preserve the R22 grid, visible playhead and strong bar > beat > subdivision hierarchy on both black and white rows. The thin per-step lane stays below roll and drums; switch velocity/chance/pitch/pan by tapping its label. Dim unselected values.
- Preserve mode-free gesture editing and zoom/pan: no permanent tool row or selected-note panel. Provide discoverable keyboard operation for essential edits and zoom. Separately provide an equivalent click/tap path without dragging or multipoint gestures unless that gesture is intrinsic. A keyboard shortcut does not replace a click/tap path. Preserve cancellation, Undo and focus. Keep rows at least 16 px; check labels, controls and touch targets at desktop, portrait and phone landscape. Keep contextual help off the working surface.

## References and review

- Use one owner-approved visual reference for each affected semantic page and representative state. Older mocks may inform the work but are not simultaneous pixel targets. Preserve the required owner Remote baseline under Rule 20. Compare 0.0.26 behavior separately using matched input where the behavior existed; record a new feature as new, not as a shipping regression.
- Review native edges and spacing alongside real-input behavior. All verified collisions, lost context, unreachable or clipped controls, unreadable information and behavior regressions block acceptance; a score cannot cancel a defect. Use the focused and final gates at the points required by repository policy and the owner's explicit instructions. A mock, screenshot or identity hash is not conformance evidence.
