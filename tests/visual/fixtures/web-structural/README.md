# Web structural slice

Local-only GPL-3.0-only checks 1–4 from `UI-DEFECT-TESTS-SPEC.md`. This is not
24-check qualification, a screenshot approval, a release gate PASS, or a claim
that the current UI passes. The caller owns navigation and evidence source pins.

## Collector interface

```python
from web_structural_slice import collect_structural
report = collect_structural(page)  # actual sync Playwright Page, read-only
```

The JSON has `checks` with integer IDs 1–4, `status`, `failures`, and raw
`measurements`, plus controls, glyphs, panel paint rectangles, screen geometry,
thresholds, caption policy, collection errors, limitations, and `accepted`.
Missing controls/glyphs/panels are `NOT_RUN`, never a vacuous PASS. An unreadable
canvas fails acceptance. Check 1 compares typed `(kind,a,b,c,bank,part)` engine
identities, not labels, display paths, or occurrence indices. Source-sound slots
are part of identity. Check 2 compares glyph type and that same typed identity.
Two valid, distinct engine refs are never invented duplicates.

Panel content is actual text Range boxes, SVG painted graphics, image bounds,
and canvas foreground bounds after removing the exact modal face color.
Wrapper boxes, padding, borders, background rectangles and hit targets do not
count. Full panel border-box geometry is used, with its viewport-clipped visible
rectangle separately recorded. Partially visible panels are NOT_RUN until complete
coverage is collected, never misclassified empty because unseen content was clipped. No semantic empty-space exemption, panel padding
deduction, threshold rounding, or injected notes is used. Content bbox area must
be at least **0.70** of panel area; the exact axis-aligned largest empty rectangle
must be at most **0.12** of full screen area. The latter is calculated by an exact
coordinate-compressed sweep, not sampled on a coarse grid.

Captions come only from visible painted caption text, never `data-param`,
accessible names, tooltips or inferred parameter names. The explicit vocabulary
and abbreviation allowlist are exported in the report. `P.DPTH` and `P.DEPTH`
fail; `PITCH DEPTH` passes. This test vocabulary is not an assertion of a complete
owner-approved copy list. Unknown nonempty captions remain REVIEW_REQUIRED; they are not invented missing labels.

Limits: this is DOM foreground geometry, not a screenshot occlusion audit. Canvas
foreground extraction assumes the modal color is its face; unreadable canvases
cannot pass. Raster image alpha/content is not inspected; their visible element
bounds are reported. Other checks own clipping, curve semantics and animation.

## Fixture provenance

See `manifest.json` for immutable R3 input hashes. These are source excerpts and
synthetic mutations, not raw captures or reconstructions claimed as originals.

* `r3-909-distinct-fork.html`: exact R3 `controlSection` output for 909 voice 00.
  Tune is `1:0:0:0`, Pitch is `1:0:0:5`. They are different engine refs and checks
  1/2 must pass. Its cryptic `P.DEPTH` caption must fail check 4. The semantic
  similarity of the Tune/Pitch fork is not a duplicate-binding proof.
* `duplicate-ref-mutant.html`: explicit mutation binding Pitch to Tune's ref and
  glyph type. Checks 1/2 must fail. This is not labelled the original defect.
* `r3-808-sparse.html`: minimized real R3 SOUND+KIT source SVG groups, unchanged
  240×220 source viewport, unrelated read-only pattern context removed. Check 3
  must fail its sparse controls-only layout.
* `r3-808-full-source.html`: complete exact R3 SVG body, including its pattern
  context. Observational case with no assumed status; full old render evidence
  must not be substituted by the minimized counterpart.
* `r3-cryptic-caption.html`: exact R3 P.DEPTH control excerpt. Check 4 must fail.
* Missing/hidden/aria-only caption cases are explicit source mutations; check 4
  must fail. Dense positive layout is a synthetic detector calibration only.

CSS is a compact projection of relevant R3 selectors, not an assertion of pixel
identity to a full old render. No old/current browser outcome is inferred from
pure tests or fixture construction.

## Commands

Pure logic, no browser claim:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 tests/visual/fixtures/web-structural/test_structural.py
```

Actual browser fixtures, with Chromium's sandbox explicitly **enabled**:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 tests/visual/fixtures/web-structural/browser_fixtures.py --fixtures-only --output /tmp/web-structural-first.json
```

For independently permitted native execution with already-served exact source
roots, add `--old-url URL_TO_IMMUTABLE_R3_REMOTE/ --current-url URL_TO_CURRENT_REMOTE/`
and `--old-root PATH_TO_IMMUTABLE_R3_REMOTE --current-root PATH_TO_CURRENT_REMOTE`.
The roots produce before/after exact file manifests; absent roots are explicitly
unpinned and source stability is `NOT_RUN`. Serving-to-local-root identity still
needs independent verification by the native owner.
The runner visits 1440×900, 390×844 and 844×390, actual part selections and roll,
sound, mix views without mutating the model to manufacture content.

Exit 0 means fixture expectations matched, **not** that current UI passed. Actual
old/current reports have separate exits. Exit 1 means a fixture mismatch; exit 2
means browser/runner failure, with missing observations explicitly `NOT_RUN` and
null old/current exits. No security setting workaround is included. A sandbox
denial must not be retried through a bypass or laundered into equivalent proof.

Fixture expectation success is reported separately as fixturesAccepted. It is
not product acceptance; default collection remains non-passing without complete
current-source evidence. `--fixtures-only` explicitly selects calibration mode.
