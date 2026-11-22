> Current R22 design contract for firmware, Remote and web. Repository policy and release qualification remain in [RULES.md](../../RULES.md). See the [UI defect test specification](UI-DEFECT-TESTS-SPEC.md) for how to verify this contract.

# DnBOX UI source of truth

## Design system

- **Informative without crowding or wasted space.** Show what the musician needs for the current action, once, with room to read it. Use available space for real controls, graphs or musical context. Purposeful whitespace is correct for a prompt, an empty state, or an unassigned physical knob. Never fill space with a duplicate readout, fake control or decorative graph.
- Use the 909/808 R22 component system, the approved 17:00-batch glyphs, and one shared panel radius, type scale, marker and spacing system. Group related controls inside one bounded, flat panel. Prefer one four-column panel for four related physical knobs. Keep each column bound to its real knob, with aligned baselines and consistent gutters. A full-width engine envelope is a distinct layout role, not a row of four miniature controls.
- Keep a consistent header: page NAME, pattern or relevant held-step/song context, transport, BPM and the four-level R22 battery icon (percentage once calibrated). Keep height, font and UNSAVED treatment consistent. An overlay may temporarily use the relevant context slot; dismissal restores the prior context. Keep any step strip required for the current sequence or edit visible. Pages with no footer function need no footer.
- Each editable unit is one short readable LABEL, one shared live glyph and one VALUE with its musical unit where applicable, kept together and bound to the same parameter, scope and owner. Show the editable readout once per page. A clearly read-only header BPM or selection cue is not a second editable control. Use musical units (st, ms, Hz, dB, %), no raw 0–127 unless it is genuinely MIDI velocity, and no made-up unit for enums, musical divisions or on/off. Pan reads L50…C…R50. At 240×240, label type is at least 8 px and value type at least 11 px; check actual readability as well as nominal size.
- Use consistent, non-color-only indications for selection, hold, pending and applied states. Check actual text and indicator contrast against adjacent backgrounds at native size in both themes, including selected/dimmed states where the information is needed. Do not trade away legibility for density; do not use explanatory filler on working firmware or Remote surfaces.

## Glyphs: meaning, style and behavior

- **Meaning:** show the actual engine response for a curve, or a clearly semantic symbol for a discrete or binary state. Full envelopes use actual engine data and preserve partial stages and their timing; do not add cosmetic topology or fake waveform states. SuperJ6 WAVE, SUB and LFO RATE must clearly show the current setting; time-based Attack must show a rising edge and 808 TONE must not read as DECAY.
- **Style:** compare like roles on the same page and across related pages and engines. Use compatible visual weight, stroke thickness, alignment, color hierarchy and native antialiasing on curved or diagonal edges. A native, pixel-aligned rail need not be softened. Mini curves, full-width envelopes and status markers may have intentionally different weights and sizes.
- **Behavior:** with real inputs, show the actual response to knob movement, discrete detents, holds, locks, hits or playback where these apply. Continuous controls follow the parameter's real response; cyclic controls wrap; detents change to their real discrete states. A changed knob value does not prove hit feedback at a fixed value. Preserve 0.0.26 behavior where the feature existed unless the owner explicitly approved a change. Do not infer renderer cadence from a GIF's export rate.

## Engines and parts

- Synth One occupies the third synth slot everywhere. Use the real SuperJ6 name, controls and preset terminology, not generic substitute labels or parameters. 909 TUNE and PITCH are either a single control or two distinct controls with distinct meanings, names, units and glyphs. The same shared visual system applies to all engines; no raw float lists.

## Remote

- Keep the approved page-01 header, compared in the same part, transport and layout state. Keep the copy short and musician-facing. Preserve the R22 grid, visible playhead and strong bar > beat > subdivision hierarchy on both black and white rows. The thin per-step lane stays below roll and drums; switch velocity/chance/pitch/pan by tapping its label. Dim unselected values.
- Preserve mode-free gesture editing and zoom/pan: no permanent tool row or selected-note panel. Provide discoverable keyboard and non-drag or single-pointer alternatives for essential edits and zoom when a gesture is not intrinsic. Preserve cancellation, Undo and focus. Keep rows at least 16 px; check labels, controls and touch targets at desktop, portrait and phone landscape. Keep contextual help off the working surface.

## References and review

- Use one owner-approved visual reference for each affected semantic page and representative state. Older mocks may inform the work but are not simultaneous pixel targets. Preserve the required owner Remote baseline under Rule 20. Compare 0.0.26 behavior separately using matched input where the behavior existed; record a new feature as new, not as a shipping regression.
- Review native edges and spacing alongside real-input behavior. All verified collisions, lost context, unreachable or clipped controls, unreadable information and behavior regressions block acceptance; a score cannot cancel a defect. Use the focused and final gates at the points required by repository policy and the owner's explicit instructions. A mock, screenshot or identity hash is not conformance evidence.
