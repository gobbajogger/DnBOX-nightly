# Independent website route review

Reviewer: `parity`, independent of the implementation. Consolidated comparison source: `914d68e8ed50698ea77c9d18c221c404629b9332`. The candidate preserves merge `6326d8a68eccb214930535d3abf6f364f560c970` and adds the installer wording, restore-padding and project-guide changes. Exact reviewed product source manifest SHA-256: `a598a87e4d358ea40944e5f72587f38b9dd14c0e6df2ad06c89d79f34df1d77c`.

**PASS for the 19 web entry routes at three sizes.** Playwright 1.62.0, bundled Chrome 151.0.7922.34, normal sandbox, device scale 1, emulated touch on both phone viewports, local HTTP and the pinned ten-file 4758 emulator. All 57 final navigations returned 200 with no page errors, failed HTTP resource responses or horizontal page overflow. The reviewer inspected the initial rendered views and the task copy; the Remote review waited for its interactive roll. Base had 13 page overflows in portrait and one in landscape. This exercise covers browser behavior and content; it establishes no physical device result, full firmware pixel parity or score for other lanes.

The table gives document widths in pixels at 1440×900, 390×844 and 844×390, in that order.

| Route | User task or preserved reference | Base widths | Reviewed widths |
|---|---|---|---|
| `index.html` | Explore sounds or open the Remote | 1440 / 474 / 844 | 1440 / 390 / 844 |
| `breaks/index.html` | Import loops and audition them locally | 1440 / 390 / 844 | 1440 / 390 / 844 |
| `builds/index.html` | Filter recorded builds and open their evidence | 1440 / 596 / 844 | 1440 / 390 / 844 |
| `help/index.html` | Set up standalone play, SMC and Loopy | 1440 / 474 / 844 | 1440 / 390 / 844 |
| `install/index.html` | Choose a build or switch to samples and projects | 1440 / 394 / 844 | 1440 / 390 / 844 |
| `manual/index.html` | Make, play, save and recover a project | 1440 / 474 / 844 | 1440 / 390 / 844 |
| `manual/legacy.html` | Find the keyboard controls and playing chapters | 1440 / 474 / 844 | 1440 / 390 / 844 |
| `manual/original/index.html` | Read the preserved FM-1 manual | 1440 / 474 / 844 | 1440 / 390 / 844 |
| `manual/projects-guide.html` | Connect or inspect a project and keep a backup | 1440 / 474 / 844 | 1440 / 390 / 844 |
| `manual/protocol.html` | Look up the preserved firmware identifiers | 1440 / 474 / 844 | 1440 / 390 / 844 |
| `new/index.html` | Read current and withdrawn build notices | 1440 / 474 / 844 | 1440 / 390 / 844 |
| `presets/index.html` | Open a file, rename a sound and keep the result | 1440 / 474 / 844 | 1440 / 390 / 844 |
| `presets/legacy/index.html` | Inspect and back up earlier preset files | 1440 / 390 / 844 | 1440 / 390 / 844 |
| `projects/index.html` | Inspect, import or export a live project | 1440 / 390 / 844 | 1440 / 390 / 844 |
| `remote/index.html` | Work with the example sequence after startup | 1440 / 390 / 844 | 1440 / 390 / 844 |
| `remote/device/index.html` | Choose instrument ports and check the connection | 1440 / 695 / 1000 | 1440 / 390 / 844 |
| `remote/identity/index.html` | Pair matching MIDI input and output | 1440 / 390 / 844 | 1440 / 390 / 844 |
| `starting-breaks/index.html` | Listen to five breaks and choose a set | 1440 / 390 / 844 | 1440 / 390 / 844 |
| `tools/index.html` | Open Samples, Projects, Remote or preset tools | 1440 / 474 / 844 | 1440 / 390 / 844 |

The Projects guide previously exposed development-server instructions before the user could find the project tool. In the repaired guide, all three viewports reached **Find USB MIDI keyboard** through its Projects link. The optional **File format and MIDI protocol** disclosure opened. Recovery guidance remained accessible. The static link inventory found 391 same-origin links on the 19 entry pages. Every path existed. Both `#projects` links without a static HTML ID activated the actual Projects tab; the keyboard-manual Appendix C bookmark also navigated correctly. The dedicated historical and developer reference pages retain their explicit purpose. No unresolved defect was observed in the reviewed route and guide checks.

## Reproduce

From a checkout, build with `DNBOX_EMULATOR_RUNTIME` pointing to the ten files matching `scripts/emulator-runtime-pin.json`. Use the bundled Playwright browser. The script prints a result for each route and viewport, including each HTML SHA-256. To inspect screenshots, add `--screenshots PATH`. For the base workspace, add `--baseline` to record its old widths and skip the revised guide checks.

```sh
node scripts/build-product-site.mjs
python3 evidence/web-routes/check-web-routes.py .output/product-site
```

## Qualification identities

- Rendered product tree, 230 files, SHA-256 `45760c01e462c7dd24f1d736c419fa7c2859b36c4f600ced569e47e93829c41f` of the UTF-8 manifest. Sort by relative path, one line per file containing SHA-256, two spaces, relative path and LF.
- `install/index.html` SHA-256 `16dae111b42a206dbb3482b15463615043901d3088c7f65b3c78cb6b66a13b95`.
- `projects/index.html` SHA-256 `c789361a3a49aa3773ec7d04a9783b96305cc8f0f5a07f6f44dbd7cfd73f5321`.
- `manual/projects-guide.html` SHA-256 `df765645514e17c04500034e736efd3dc7880780cdef62c330dcd0b418c36c92`.

## Publication rehearsal

Published Pages commit `f8cd241f745e149452a7a83e977792ac7c847cfa` contains 599 files. The 230-file built product has 53 overlapping paths (44 identical, 9 changed) and 177 additions. A fast-forward publication commit must preserve the 546 existing Pages-only paths, including all 18 firmware packages, `.nojekyll`, package assignments and installer compatibility tests. Both `versions.json` files have SHA-256 `527bf68e895ef8f6adaa66e35b368a4492ef5422cde4a43d9b9b461672833e88` (37 versions, 74 model entries). Both `build-status.json` files have Git blob ID `47622519bba0c305f7997ec8093b8f08e0ba1285`. The exact published `install/tests/slot-backup-compat.test.mjs` (Git blob `daa77b345faec8fb2b11c8b1adb161a780847611`) passed all 16 software tests against each installer. This includes legacy warnings, normal backup/restore and admission negatives. Served production bytes require their own verification after publication.
