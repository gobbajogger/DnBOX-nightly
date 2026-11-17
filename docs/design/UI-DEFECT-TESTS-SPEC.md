> Design reference only. Rules: `RULES.md` (v2) at the repo root. Status: `docs/lanes/*.md`.

# DnBOX UI defect tests: required local gate (user rule 2026-11-16 15:48)

Goal: the obvious mistakes humans keep catching must fail automatically in the Local gate before a piece is called finished (WIP, mocks and renders are never blocked).
Run locally (NO GitHub Actions). The Local gate posts the log at the exact SHA.
Every check gets a regression fixture built from the real past defect (the user's markups), and that fixture must FAIL on the old render.

## A. Structural tests: run on the render model/layout tree (firmware screen model + Remote DOM)
1. No duplicate parameters: every on-screen control maps to a unique engine param ID per screen. Example: 909 SOUND PITCH duplicates the TUNE fork glyph.
2. No duplicate glyphs: no two widgets on one screen use the same glyph type bound to the same param.
3. Dead space: each panel's content bounding box must cover at least 70% of the panel, and no empty rectangle may exceed 12% of the screen area. Example: the empty 808 voice panel.
4. Label required: every glyph has a short text label (TUNE/ATTACK/DECAY/TONE...) of at least 2 chars, with no cryptic abbreviations unless whitelisted (P.DPTH fails).
5. Glyph-to-curve binding: sweep each param from min to max. The glyph pixels must change monotonically and visibly (at least 15% pixel delta). The glyph must render the engine's real curve; a static icon fails.
6. Attack shape: at max attack the rising edge must span at least 40% of the glyph width, and at min attack at most 10%. A flat bump fails.
7. Semantic shape: TONE must not be classified as a decay curve (compare against the reference templates per type).
8. Pan: values are clipped and labelled L50..C..R50. No other format allowed. Battery uses the R22 level icon.
9. Same design language for all engines (909/808/303/SuperJ6/Synth One): no raw float lists, and only glyphs from the shared library.

## B. Remote (piano roll / drums) tests: Playwright, local, at 1440x900, 390x844 and 844x390
10. Grid continuity: sample every key row (black AND white). Bar/beat/16th vertical lines must be present on 100% of rows at identical x. Black and white rows may differ only by background luminance. Fixture: the user's missing-lines-on-white-rows screenshot.
11. Grid hierarchy: bar lines are stronger than beat lines, which are stronger than 16th lines (measured contrast order).
12. Playhead visible while playing, and black-key shading present.
13. Minimum hit/visual size: notes are at least 6 px tall in portrait, and at least 16 note rows are visible in landscape with no clipped labels (C3 clipping fails).
14. Unselected slider-lane values render as dimmed bars, never full-intensity lines.
15. No tool row at all (no Select/Draw/Erase, no zoom tool); edits, zoom and pan are gestures; no selected-note side panel.
16. Gestures: scripted pinch snaps to 1/2/4/8 bars, two-finger pan moves the view, Ctrl/Cmd+wheel zooms, Shift+wheel scrolls time, and tap-drag edits with no modes.
17. Top bar matches page-01.png (visual diff against the canonical image).
18. No cryptic status text (e.g. "1/16 · 1-16 / 16"). Every visible string comes from a reviewed copy list.

## C. Generic render hygiene (all screens)
19. Text overflow/clipping: no text box exceeds its container and no glyph overlaps a label (bbox intersection = 0).
20. Minimum contrast of 4.5:1 for labels and minimum font size per target. KIT/ACCENT being tiny fails.
21. Alignment: widgets on the same row share a baseline within 1 px, and spacing is consistent within 2 px.
22. Regression vs ALL previous approved mocks: per-region visual diff. Any region that was correct before and changed must be justified in the PR.
23. Canonical-reference visual diff: one canonical image per screen, and no merge or deploy if the diff exceeds the threshold.
24. Animation: glyph transitions are eased and measured at 30-60 fps, with no frame drops in the capture, and anti-aliased edges are present.

## D. Process
- Each candid review = the automated report plus a human per-screen defect list with 0-10 scores. Anything under 10 is not done.
- Every newly found human defect becomes a new automated test plus a fixture in the same PR. Never fix a defect without adding its test.
- Deliver the tests as one atomic PR (tests, fixtures and runner script), with the passing log at the exact pushed SHA, first run (a pass that needed a rerun counts as flaky).
