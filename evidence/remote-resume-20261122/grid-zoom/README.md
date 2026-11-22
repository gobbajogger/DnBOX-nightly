# Remote zoom grid regression checkpoint

Parent commit: `913120550b2634abae684390a05057cc9d9b3ee8`
Branch: `lane/remote-resume`
Changed: `web/product-site/remote/grid.mjs`, `tests/product-workspace/grid-collapse.test.mjs`

The original renderer rounded a positive 0.1 CSS-pixel width to an SVG of zero width; it also emitted 16 path strokes regardless of whether multiple subdivisions mapped to the same physical pixel. This causes an invisible grid or duplicated strokes during an extreme pinch/gesture zoom in the Remote roll. For normal widths, the 16 independent pixel positions are preserved.

## Reproduction

Node v22.16.0, the original `grid.mjs` content fetched from GitHub blob `44cf854b83321fd497f97e0a4b2c07d28c9668ee` and copied into an isolated directory with the new regression fixture:

```text
$ node --test tests/product-workspace/grid-collapse.test.mjs
not ok 1 - zoomed-out time grid paints each physical pixel at most once
error: zero-width SVG for 0.1
ok 2 - normal viewport bar/beat/subdivision hierarchy is unchanged
# tests 2
# pass 1
# fail 1
```

After clamping the SVG width to at least 1 physical pixel and deduplicating each coordinate while preferring the bar stroke over beat and step:

```text
$ node --test tests/product-workspace/grid-collapse.test.mjs
ok 1 - zoomed-out time grid paints each physical pixel at most once
ok 2 - normal viewport bar/beat/subdivision hierarchy is unchanged
# tests 2
# pass 2
# fail 0
```

Reproduction logs created 2026-11-22T00:40:09Z. `BEFORE.log` SHA-256 `e4dc1e5d1ad26c4b8dac5bc6505c8db48a9da64c7e2f26407dbfa8f2902d1292`; `AFTER.log` SHA-256 `0b4937bc8cf8b47ff506e1de78cd594423acb9d15e60116dd7240f73ab6f3c02`.

## Boundary of proof

Focused red/green Node execution used a source-identical isolated module, *not* an entire current repository checkout. The previously recorded full gate suffered disk exhaustion. Full exact-head Local/edge/browser qualification, owner PDF and 844×390 screenshots, 240×240 firmware comparison, original SuperJ6 literal tempo labels, and physical keyboard proof are **not verified** by this fixture. No built firmware or `.img` is claimed.
