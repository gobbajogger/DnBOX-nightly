# Desktop drum voice names

The owner page 2 drawing names the eleven 909 voices. The wide product shows those names and the corresponding 808 names on a shared 176px column. It keeps the existing step IDs, shared R22 vectors, selected voice ink, abbreviated compact presentation and aligned thin lane.

An isolated build from `ada3fef` with the proposed voice rail passed the existing six Node regressions. Independent Chromium 151 checked both kits at 1440×900, 1280×800, 844×390 and 390×844. All eight states kept 176 editable steps. Each 1440×900 state exposed all 176 to center hits at 50.25×40 px. Accent pads were 50.25×44 px. At 844×390, both kits retained all 96 complete first-bank pads and the unchanged compact glyph rail. The portrait rail retained the short names. A real touch, Undo and Redo passed in all eight states.

The prototype expanded at 1280px and left only 40.25px for Accent width. The accepted patch begins at 1340px and a 700px minimum height, so 1280px retains its original rail. The stylesheet difference from the browser prototype changes only that breakpoint. At 1440px both versions use the same CSS declarations. The checked geometry and the one new native screenshot apply to the 1440px owner page. The tolerant difference from page 2 falls from 17.0351% to 16.8103%. Whole-page 2% parity remains open. [Source hashes, measurements and full-page comparison](measurements.json)

The included browser script reproduces the measured prototype. The retained 1280px result explains the accepted breakpoint. The accepted product preserves the 1440px geometry without another render. [Focused Chromium witness](prototype-browser.py)
