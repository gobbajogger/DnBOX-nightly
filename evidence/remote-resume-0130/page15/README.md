# Owner page 15 complete-product density regression

Starting source `cd54ee5d27be20d706ebf68d1a3c959319c35a57`, pinned normally sandboxed Chromium 151.0.7922.34. The new complete-product test fails on the original CSS: only 33 pads (3 voices × 11 steps) are completely visible and center-hittable at 844×390. The compact landscape fix exposes all 96 owner-drawn pads (6×16) on both 909 and 808. Each pad is 28.25×24 CSS pixels at that size; existing bank, Accent and Review navigation retains 44px targets.

The same test taps step16 on voices1 and6, observes the edit and Undo, navigates to voices7–11 and Accent with real keyboard/touch input, then returns to all96 first-bank pads. It checks all176 mounted steps, both document axes, adjacent Sound bounds and unclipped thin-lane readouts across twelve complete product states: both kits at844×390,740×390,900×390,1080×390,390×844 and1440×900. No page errors occurred. The first candidate's lane values were clipped because the general44px button minimum exceeded its32px lane; the fix gives drum-lane controls their actual lane height, with a regression on readout bounds.

The voice rails now use the existing shared R22 instrument inventory (G001–G012), retaining correct kit identity/order and accessible voice names. This establishes source identity to `glyph-registry.mjs`; it does not establish identity to the still-unresolved owner-approved17:00 batch. The numeric pad ink now contrasts against active orange fills.

`before.json` and `after.json` preserve measured rectangles and all first-viewport pad coordinates. Full-size before/after PNGs and logs are retained outside Git in `.cache/owner-review/` pending the requested Project Sources upload. Final exact-head rerun and independent review are recorded in the lane qualification ledger when available. This focused result is not2% whole-screen parity, physical hardware proof or a full lane PASS.

Reproduce: `python3 tests/product-remote/page15-density-browser.py --output .output/page15-density-proof`.

## Narrow hidden-scroll repair and final scope

Independent review reproduced an additional root overflow at640×360: body scroll width665for909 and690forBassA despite documentElement reporting640. Clicking More shifted body.scrollLeft to25 and clipped the whole header. Putting engines on their own row below740px leaves title/transport/history/More on the second row. At640×360 and736×414, independent real clicks now keep both body dimensions equal and all four root scroll offsets zero for BassA/909/808. Inner drum scrolling remains available at those narrower sizes. The final product fixture adds both sizes (16kit/viewport states total) and checks actual body width and hidden offsets, not just documentElement. [Independent proof](../owner-review/narrow-c50255d-green.json).

The full source gate retains unapproved candidate PNGs with NOBASE status; it creates no approval or baseline. One final registered32frame set will be reused for the handoff. The current scope is software-only. Host and emulator results establish only their recorded software behavior; physical testing is outside scope and is not a completion dependency.
