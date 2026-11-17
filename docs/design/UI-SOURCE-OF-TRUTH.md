> Design reference only. Rules: `RULES.md` (v2) at the repo root. Status: `docs/lanes/*.md`.

# DnBOX UI source of truth (owner rules as of 2026-11-16 17:22). Every page must match. The gate checks against this.

## Design system = the 909/808 R22 pages (the only up-to-date pages)
- One header on every page: NAME · P# · transport ■/▶ · BPM · R22 battery level icon. The same height and font. Any UNSAVED pill is identical on all pages.
- Footer: one style for all pages, or none (the drum pages have none). No cryptic "<> ↑↓ PARA →".
- One R22 panel radius token. No old radius values anywhere.
- One control unit = LABEL (short: TUNE/ATTACK/DECAY/TONE...) + live glyph + VALUE with a unit, always together. Never split across rows or panels, and never shown twice on a page.
- Type scale at 240x240: label ≥8 px, value ≥11 px. Even 4-column grid, consistent gutters and baselines.
- One selected-state style, one section/page marker style ("SOUND 1/3").
- No dead space: panels are filled by real controls, and there are no large empty canvases.
- Pan is L50..C..R50. Values are in musical units (st, ms, Hz, dB, %), never raw 0-127 unless it's genuinely MIDI velocity.

## Glyphs
- One shared animated R22 glyph library: live engine-curve readouts, eased at 30-60 fps, anti-aliased.
- KEEP the improved 17:00-batch glyphs (the user approved them) as locked references.
- REDO: the SuperJ6 WAVE, SUB and LFO RATE glyphs (they must clearly show the value). Attack must be an obvious value-driven edge. 808 TONE must not look like a decay.

## Engines and parts
- the retired engine is REMOVED and replaced by Synth One, everywhere (firmware, Remote, website, mocks, fixtures).
- SuperJ6, not "Juno": use the real SuperJ6 parameter set and names (from the engine/presets), and none of the old generic Juno params.
- Every engine (909, 808, SuperJ6, Synth One, Chicago, Miami, the bass) uses the same design system. No raw float lists.
- 909: TUNE and PITCH must not duplicate each other (one control, or two distinct ones with distinct names, units and glyphs).

## Remote
- Top bar matches page-01.png. No tool modes (no Select/Draw/Erase row); every edit, zoom and pan is a gesture (pinch snaps to 1/2/4/8 bars, two-finger pan, Ctrl/Cmd+wheel, Shift+wheel).
- Grid lines on every row; black and white keys differ only by shade. Playhead, and a strong bar > beat > 16th hierarchy.
- Rows ≥16 px, notes are touchable, no clipped labels, no header collisions at 390x844 or 844x390.
- A FunkyBeats-derived lane of thin per-step sliders (velocity/chance/pitch/pan), switched by tapping the lane label, unselected values dimmed. Pattern/song/launch chips and the mixer, in R22 styling.
- No selected-note side panel.

## Process
- Any visible collision or duplicate caps a screen at 5/10. Done means 10/10.
- Every defect found becomes a gate fixture. Everything runs locally (no GitHub Actions), with the log posted at the exact SHA, first run.
- One atomic batch per area. Compare against all previous approved mocks; any drift is a regression.
