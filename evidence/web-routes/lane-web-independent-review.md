# Independent Web review

Baseline source `583f622961fc9975fac746592ce6c483073c4170`. Qualified build 265 files. Playwright bundled Chromium 151.0.7922.34 with normal sandbox, device scale one, desktop 1440×900, phone portrait 390×844 and landscape 844×390. The baseline log records 81 successful route navigations including supplemental routes and three direct local-file editions, 79 full-size captures, no horizontal document overflow, and local-file installer directory-listing errors. Desktop Build History and original manual captured layouts but their full-page screenshots reached the 30-second timeout. Full-size phone evidence exists for both.

Scores reflect clarity, layout and visible task access. The changed surfaces were rechecked independently at all three sizes. Scores for unchanged surfaces remain baseline observations.

| Surface | Baseline | Revised | Observation |
|---|---:|---:|---|
| Home and engine previews | 8 | 9 | Musician-facing introduction and “Watch control demo” now describe the silent visual demonstration. |
| Samples | 7 | 7 | Working document layout with native file control and dense support text. |
| Build History | 5 | — | 198 records rendered at desktop height 71,935 px. Owner’s separate transport-failure check covers filtering. |
| Help | 8 | 8 | Clear sections, dense device steps. |
| Installer | 4 | 9 | Single site header and primary task first. Optional starting breaks are disclosed in context. |
| Manual | 9 | 9 | Tasks and sections are easy to find. |
| Legacy manual | 8 | 8 | Archival layout has a contents list and long reading flow. |
| Original manual | 8 | 8 | Long preserved source, phone screenshots complete. |
| Project files guide | 7 | 8 | DnBOX heading replaces retired brand. Detailed format guidance remains behind disclosure. |
| Protocol reference | 8 | 8 | Intended developer reference, usable table layout. |
| What’s new | 8 | 8 | Clear status, one additional empty H1. |
| Preset rename | 9 | 9 | Clear file workflow and status. |
| Legacy presets | 8 | 8 | Open and review stages are separated and usable. |
| Projects | 7 | 8 | DnBOX page title and intact import/export controls. |
| Remote | 8 | 8 | Compact workspace shell is visible, the functional suite evaluates ready state separately. |
| Remote device | 8 | 8 | Connection task fits all viewports. |
| Remote identity | 7 | 7 | Separate prototype typography and native-looking connection button. |
| Starting Breaks | 5 | 9 | Labeled count, aligned samples, empty rows removed, selection and download proven at each size. |
| Tools | 9 | 9 | Clear tools and destinations. |
| Offline installer | 6 | 9 | Embedded Barlow, consistent background, explicit child HTML and no page errors. |
| Offline samples | 7 | 9 | Embedded Barlow and consistent background. |
| Offline projects | 5 | 9 | Shared dark theme replaces lone light surface and inline Barlow loads. |

## Evidence

- `lane-web-583f622-route-audit/audit.json` contains full-size image digests, response status, document dimensions, fonts and page errors. Phone History and all five Manual surfaces are included.
- `lane-web-583f622-nav-and-preview.log` records the reproduced duplicate installer headers and Home copy at all three sizes.
- `candidate-revised-route-audit.log` records 15 mounted observations. `lane-web-candidate-revised-route-audit/` contains full-size before/after pairs. Its older offline installer observations are superseded by the rebuilt direct-file run below.
- `candidate-final-starting-breaks.log` records the final count and resulting 110,844-byte `DnBOX-starting-breaks.x0xslots` download at all three sizes, and hashes the refreshed image files.
- `candidate-offline-audit.log` records 9 direct `file://` views with network disabled. Barlow 400/700 loaded in each, body background was rgb(16, 23, 21), no errors or overflow. Full-size pairs are in `lane-web-candidate-offline-route-audit/`.
- `qualified-gate.log` records the exact baseline gate. Clean/setup/no-loss/limits/build pass. Unit stage stops on a retired-name occurrence in authorization policy text in RULES.md. Check its last line for the separate browser outcome. The structural fixture detector passed 9 fixture observations in `fixture.log`.
