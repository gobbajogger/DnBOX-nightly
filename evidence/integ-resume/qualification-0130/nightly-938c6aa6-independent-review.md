# Independent screen review for Nightly 938c6aa6

Candidate 938c6aa6f49564c59df58517f68c44eb97dfa84b. Consolidated comparator 583f622961fc9975fac746592ce6c483073c4170. I did not build the code under review. Scope covers the eight registered Remote Workspace states and the Build History, Manual landing, Original FM-1 and Legacy Manual routes. The current browser capture files supplied the after evidence. The tracked, previously approved website references supplied the before images. Remote has no registered before PNGs. Its committed source tree and previous independent screenshots review supplied the before evidence.

## Remote Workspace

I inspected all 32 current proposals at 1440×900, 1024×640, 844×390 and 390×844 against the owner PDF and its correction notes. The matching Remote source tree object at both Git commits is ddaf1e515eb464ab7db093d2a3922f80ee736067, and the Remote redirect blob is likewise identical. The issues below are inherited. The prior independent review in evidence/integ-current-base/remote-review.md had already identified the desktop design gaps. The proposal run produced exactly 32 images, four grid checks, one header SSIM check (0.9059 against the 0.90 threshold), zero header failures and zero page errors. These are useful mechanical checks. The owner review stays open, and all 32 images remain as separate proposals.

| State and reference | Current observation | Regression test for the repair |
|---|---|---|
| Sequence, chance, pitch, pan; PDF pages 1, 3, 21 and correction notes | The owner’s green Bass A becomes gray when inactive and amber on selection. Expression fills span almost the full step width. At 390 px two adjacent Chance values appear as one “100%100%” run. The independent Chromium regression measured a −0.25 px text gap and clipping for steps 5–6. Controls at 1440 and 844 px passed with +64.875 and +28.625 px of separation, respectively. The portrait view scores 5/10 under the collision rule. The playhead and tool-free, inspector-free layout appear as expected. | Extend the Remote browser fixture to assert selected and unselected Bass A token colors, narrow centered step fill with the full-width hit area, and separation of adjacent maximum-width labels at the two phone sizes. Inspect web/product-site/remote/app.mjs:92, step-lane.mjs:51 and style.css:92,345–349. |
| Chicago Sound; PDF page 4 and correction notes | Wave renders as SAW. There is no raw parameter list. The oscillator, filter and envelope content is split across individual cards rather than presented in the owner's single-panel composition. At both phone sizes the first frame needs vertical scrolling to expose the envelope. | Test for a single Chicago sound panel containing the oscillator, filter and envelope groups, with one label/glyph/value per control. Check reachability by keyboard and touch at both phone sizes. Inspect web/product-site/remote/app.mjs:200, with the related panel implementation at :210. |
| Mix; PDF pages 6, 16, 23 | The five real faders and the Master section are visible, along with per-part Sound shortcuts. The strips lack Mute, Solo and Part controls. | Require five strips each exposing the owner’s Mute/Solo/Part actions with accessible labels and working state changes, including below-fold scrolling as needed in landscape. Inspect web/product-site/remote/app.mjs:193,201, funkybeats-view.mjs:82 and mix-workspace.mjs:2. |
| Patterns; PDF pages 9, 19 | With Bass A selected the launcher still starts on 909 and contains all five sets of 32 patterns. The selected-part operations panel is absent. | Select Bass A at each phone size and require 32 visible choices scoped to it and named Cut, Copy, Paste and Clear actions. Exercise one action to confirm only the selected part changes. Inspect web/product-site/remote/app.mjs:202 and funkybeats-view.mjs:47. |
| Projects; PDF pages 12, 20 | Draft save/open/review controls are present. Project backup, original presets and MIDI export are entry links to separate tools. The baseline calls for direct backup/export and restore inspection, original preset operations and MIDI range/export at this workspace. | Assert the corresponding accessible actions are present and actionable on the Projects surface with a synthetic project and no device write, including a valid and invalid restore. Inspect web/product-site/remote/app.mjs:196. |

## Manual

I checked the opening and closing areas visually and independently compared all decoded RGB pixels in all six phone renders with the corresponding tracked reference. Zero pixels differed. Measured values are the PNG dimensions.

| Route | 390×844 render | 844×390 render |
|---|---:|---:|
| Manual landing | 390×2,476 | 844×2,045 |
| Original FM-1 reference | 390×40,703 | 844×29,993 |
| Legacy DnBOX Manual | 390×45,592 | 844×30,429 |

The keyboard, hash, print, legacy and fit browser journey also passed at 1440×900, 390×844 and 844×390. The manual journey records desktop functional coverage. The six independent pixel comparisons above cover phones. No fresh desktop visual before/after image is claimed here.

## Build History

| Viewport | Inherited reference | Candidate | Registered result |
|---|---:|---:|---|
| 390×844 | 390×104,451 | 390×105,158 | FAIL, size mismatch |
| 844×390 | 844×73,342 | 844×73,793 | FAIL, size mismatch |

I inspected before and after opening and footer regions at both sizes. Both inherited images showed 197 of 197 records and opened on 0.0.25.1. Both candidates showed 198 of 198, a separate startup/restart report for Elite and Pro, the 0.0.26 release card with 0.0.25.1 fallback, an inventory link and the retained 0.0.25.1 card. The footers and navigation looked intact. The added report and record explain the expected height growth. A passing render and an intentional height increase do not change the registered comparison result. Browser screen capture reported no horizontal overflow and no page/header errors on the phone routes.

One inherited content defect also blocks approval. The 0.0.25.1 archived card says in present tense that 94197fc8 is a hardware-test build “not offered here,” while the current release card immediately above offers 0.0.26 from the same source. The archive badge provides context, but the visible body needs explicit past-tense date/context. Preserve the historical detail in provenance. Add checks to tests/edge-release-docs.test.mjs and the phone browser smoke test for an unambiguous visible distinction between the current public release and the historical Nightly checkpoint, keeping the current release, fallback, both model names and all 197 archived record IDs. The writable source for the visible conflict is web/product-site/builds/index.html:21. This is a handoff finding for the Web lane. Current package bytes and live public release parity were outside this review.

The old registered PNGs contain 197 records. For the exact source comparison, I fetched consolidated HTML blob 48e26205b7e8efd0421c0005a8f3eb83019847f7 from GitHub and compared it with candidate blob 49b0a85d9112b29cb731edef7967dd3561a98e33. The consolidated source already contains the 0.0.26 release. Both files contain the same 198 unique IDs in precisely the same order, and the after HTML order matches all 198 current history.json IDs. No rows disappeared or changed order. Both versions of the archive card contain the present-tense wording.

## Scores and evidence pins

Remote design scores use this review’s judgment against the owner PDF and correction notes. Sequence, Pitch and Pan score 6/10 at all four sizes for the inherited note/slider differences. Chance scores 6/10 at 1440×900, 1024×640 and 844×390, and 5/10 at 390×844 for clipping. Chicago Sound scores 7/10, Mix 7/10, Patterns 6/10 and Projects 7/10 at all four sizes for the owner-baseline gaps described above. The Remote comparisons reproduce the documented gaps. The portrait Chance defect also has a fresh executable measurement. The six Manual phone visuals score 10/10 within the listed default-state scope. Build History scores 8/10 within both phone scopes for its conflicting archive copy. The desktop website visual score remains open. The gated default viewports are distinct from manual interaction and print checks.

The sibling review image manifest records 32 Remote proposals, eight phone candidate captures and their eight before-image hashes. The History continuity JSON records both exact HTML object IDs and the current HTML and history.json SHA-256 values. The standalone remote-chance-spacing.py and its log are also siblings. The test's 3 px readability threshold is a proposed fixture rule; the observed negative gap and clipped glyphs substantiate the issue independently of that threshold.

## Native 240×240 scope

The firmware merge at 5b5cb2420077ef8c3559c8a0e0aa4a5d6e8e34d7 (published equivalent tree 8609f75308f10874a7ba4aec1c1fb309023c100b) has no delta under firmware/ relative to its current consolidated parent f1786ebec2616477163b62b029c7e77405a9c3de. The four inspected Remote sizes are browser views. The native 240×240 firmware scope does not apply to the website changes above. Existing native renders in the firmware ledger describe their own source pins. I did not rerun native firmware rendering here.

Rule 9(c) remains open for the lane. Remote is on hold against the owner design, and Build History comparison and current-copy clarification remain open. Manual phone renders meet the inherited references.
