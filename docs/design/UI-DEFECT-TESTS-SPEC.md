> Acceptance criteria for the [current R22 design contract](UI-SOURCE-OF-TRUTH.md). This specification does not change [RULES.md](../../RULES.md), the release gates, or what the existing automation has implemented.

# DnBOX UI defect tests

Use exact input and source pins. Combine automated checks with native-size review when a judgment cannot be reduced to geometry or a pixel count. For each verified defect, keep a reproducible negative fixture and a representative clean control. A failure, a missing run and a check that does not apply are different outcomes. A known failure cannot be converted to PASS by a missing detector.

## A. Structural and glyph tests

1. **Ownership and uniqueness.** Check label, live glyph and value against the same semantic parameter, scope and owner. Reject duplicate editable readouts, including the 909 TUNE/PITCH fork when the two controls mean the same thing. Permit distinct parameters that share a glyph family and deliberate read-only context.
2. **Density and hierarchy.** The older 70% content and 12% empty-area measures are diagnostic prompts, not release thresholds. Fail clipped or unreachable controls, obscured or missing context, unreadable packing, or filler/duplicates. Keep controls aligned with the knobs that own them. A clear, sparse calibration screen is a valid clean fixture.
3. **Labels and values.** Check short recognizable labels, meaningful units or readable discrete state names, pan L50…C…R50, and the four-level R22 battery icon with calibrated percentage where applicable. Check label/value baselines and role-appropriate typography.
4. **Glyph meaning.** Check a curve against the actual engine response or a discrete glyph against the corresponding state. Check a time-based Attack edge against real short/long envelope timing. Use TONE-versus-DECAY image classification as a diagnostic, not as a replacement for engine semantics.
5. **Glyph style.** Check comparable glyphs within a page and across related pages: compatible stroke weight, native curved/diagonal edge treatment, alignment and legibility. Separate full envelopes, mini curves and status markers. Do not require blur on pixel-aligned rails or equal size across different roles.
6. **Glyph behavior.** Exercise real controls through the relevant initial, intermediate, extreme and settled states. Check actual continuous movement or wrap, discrete detents, hit, hold, lock and playback feedback as applicable. No universal monotonic or 15% pixel-delta threshold. Measure live renderer timing independently of GIF sampling. Replay matched 0.0.26 input for existing behavior and record explicitly approved deltas.

For the [TUNE worked example](UI-SOURCE-OF-TRUTH.md#worked-component-808909-tune), capture a settled idle frame, a real tuning edit with logical value readback, and a separate pad hit at the unchanged value through recovery. A turning-only GIF cannot pass the hit case. Check unrelated controls and the settled tuning readout for unintended changes.

## B. Remote tests

Run affected page and interaction checks locally at 1440×900, 390×844 and 844×390.

1. Grid lines align at identical x across all black and white rows; bar > beat > subdivision contrast. Playhead is visible while playing. In portrait, preserve the six-pixel minimum visual note height; in landscape, check at least 16 visible note rows and unclipped labels. Check usable interaction targets separately from painted note size, including adjacent and overlapping notes.
2. The thin slider lane remains aligned under roll and drums; label tap changes velocity/chance/pitch/pan. Unselected bars stay dim. No persistent tool row or selected-note panel.
3. Check the specified gesture paths (pinch 1/2/4/8 bars, two-finger pan, Ctrl/Cmd+wheel zoom, Shift+wheel time scrolling, mode-free edits). For the same essential action, prove [keyboard-only operation](https://www.w3.org/TR/WCAG22/#keyboard) and [click/tap-only operation without dragging](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements) separately. Use one pointer and no keyboard for the latter; apply the gesture exception only where the movement itself is essential. Compare the resulting edit or view state, and check focus, cancellation, Undo and retained draft state.
4. Compare the approved header with the same part, transport and layout. Check reviewed musician-facing copy and portrait/landscape usability without clipping or horizontal overflow.

## C. Native render and evidence

1. At actual size, check text and glyph bounds including antialias coverage, overlaps, longest realistic strings, value extrema, and consistent spacing and baseline. Keep required step strips, overlay context and visible controls within the viewport. An inactive bank need not render if its real route remains available.
2. Use 4.5:1 for normal text and 3:1 as a starting check for essential nontext indicators against their actual adjacent colors. Inspect thin strokes and small text at native size in both themes, selected/unselected, pending and dimmed as relevant. Never rely solely on color. Check a visible queued-mute digit against its selection fill, not only the plain background.
3. Keep one approved visual baseline per affected page and representative state. Compare equivalent inputs and state; preserve intentional approved differences with evidence. Older mocks are historical references, not simultaneous approval gates. Inspect real animation/interaction separately from static images and GIF sampling.
4. Use the smallest representative state set: normal route, relevant extreme, live/held response, and overlay return or cancel where applicable. Keep negative and clean fixtures for the same criterion. Screenshots alone cannot prove behavior, and a matching document hash proves identity only.

## D. Release discipline

- Follow the existing focused and final gates, exact-SHA evidence and independent screen review in repository policy and the owner's explicit instructions. Keep the ownership, test, build and release requirements intact. No GitHub Actions.
- Fix and cover new defects in the same change where applicable. Record which criteria were exercised, failures and unimplemented checks distinctly. Retain the reason and both outcomes for a rerun; don’t hide a flaky first run. An independent review score does not override a failed criterion.
- Calibration examples: a fixed-TUNE drum hit missing its real feedback fails even if a knob sweep changes the glyph; clipped 808 KIT controls or a lost step strip fail; sparse calibration, a valid discrete Miami selector without interpolation, and unlike graph roles with different widths do not fail for those facts alone.
