# Independent Remote owner review

The starting source is `cd54ee5d27be20d706ebf68d1a3c959319c35a57`. The first corrected source was built locally at `a160e7d56732e3111702e567a81b54353a721327`. Its published counterpart `5ee28037ebc55bad744f0c7d1f69eab22bb49f6a` has the same Git tree `721461c82f1d0580878fc117940563dbe2a36374`. An independent rebuild with the pinned emulator and firmware-reference bundles generated 304 files and `diff -qr` found zero byte differences against the candidate browser target.

The owner PDF SHA-256 is `db826c9cbeb84971f2d030c847043a21749ad4172e30739773494df0c9acca17`. Pages 1–13 are 1440×900, pages 14–20 are 844×390, pages 21–23 are 390×844, and page 24 is an evidence appendix. There is no 1024×640 owner drawing. The registered visual gate's 32 Workspace slots instead use eight states at four sizes, including 1024×640. The prior Integration proposals at `938c6aa6f49564c59df58517f68c44eb97dfa84b` were explicitly preserved as unapproved. Their full-size files and manifest can support historical comparisons. Approval of a matched 32-frame set is still open. [Owner PDF](../../../docs/design/OWNER-BASELINE-1836.pdf) · [Owner corrections](../../../docs/design/OWNER-BASELINE-1836-NOTES.md) · [Registered gate](../../../tests/visual/visual_gate.py)

The starting Chromium run completed 26 captured configurations across all 23 product pages, with zero page errors and zero horizontal document overflow at the drawing sizes. Its same-size pixel-difference range was 5.97%–26.73%. The combined comparison reuses starting frames for unchanged states, includes fresh changed page 2 and 15 states, and uses available exact 5ee2803 Sound family frames. It contains 26 original-size side-by-sides. None met 2% against the drawing. Page 15 improves from 26.73% to 25.49% while exposing all six rows and sixteen steps. Page 2 is 17.04% and page 18 is 11.69%. [Starting measurements](cd54ee5-owner-pixels.json) · [Per-frame combined provenance](owner-native-pairs.json)

The final candidate `995d5493386fad889ca8106758567c9fe80a47d5` reuses the existing Projects v2 capture. Its product source differs from the final site sources only in the inactive narrow-landscape CSS at this viewport. The page 12 difference falls to 6.42% and all 13 actions remain above the fold. All 26 owner comparisons remain above 2%. [Final candidate pair inventory](995d549-owner-native-pairs.json)

The narrow 640×360 repro reaches the open More control by letting Chromium scroll the overflow-hidden body. On the first candidate and starting revision, the 909 menu button initially extended to x=665 on a 640px viewport. Opening it moved the body 25px, placing the brand at x=−13 and the workspace at x=−25. The root element and window both retained horizontal scroll of zero, so a check of only document width or window scroll would miss this defect. [Independent narrow diagnosis](narrow-diagnosis.json)

The narrow fix places engine choices on their own row. At 640×360 and 736×414, real clicks on More for the default Bass A and both kits kept the brand at x=12, the menu and viewport fully in bounds, body width equal to client width, and scroll offsets zero. The complete-product fixture also passed in both layouts for both kits. The lower-density grid at these widths retains inner scrolling. [Narrow candidate measurements](narrow-c50255d-green.json)

## Control and source findings

| Scope | Review disposition |
|---|---|
| Page 15, 844×390 | The owner PDF shows six voice symbols and sixteen whole steps next to Sound. Starting 909 and 808 each expose 33 complete pads. The corrected rendering exposes all 96 at owner size and at 740×390. The first-bank pad body uses 28.25×24 px at 844×390. The focused product regression and the separate review exercised real touches and rolling back the local Draft edits. The new icons use the shared R22 registry. The selected 909 step’s measured text-to-fill contrast rises from 1.85:1 to 6.02:1. The PDF’s active/inactive voice ink, panel geometry and other artwork differ. |
| Page 15, adjacent Sound | The PDF shows two controls with paired nudge buttons and dedicated Step locks and Voice sound destinations. The product keeps the selected voice source frame, voice selector and one thin programmable step lane. The selected full voice frame preserves more controls, with the Draft source labels and units. Stock arbitrary per-voice step lock is unqualified. |
| Page 18, 844×390 | Six compact Draft control units fit with readable labels, SVG glyphs, native-unit values and paired nudges. The product shows kit Velocity 100% in the sixth slot. The PDF draws Accent 127, a distinct 909 parameter (kit voice 11 param 0 versus existing 909 Velocity sensitivity param 1). Conflating those settings would edit the wrong stock address. |
| 17:00 glyph lock | The dated owner rule and PDF notes describe the approved batch without a filename, asset list, digest or Git commit. The 363 R22 gallery SVGs and later source-map archive are independently pinned. The separate November 17 glyph ZIP names 44 R22, 22 R22+fix and five R23 decisions. It does not identify the November 16 batch. Project-room recovery identified the review at 07:12:59Z, two attachment targets and approval at 07:20:23Z for the Juno, Chicago, Miami and FX families. The attachment bytes and file-by-file selection remain inaccessible. [Recovered attachment metadata](owner-glyph-review-metadata.json) |
| Stock binding | The current qualification is software-only. The real-engine fixture verifies stored scalar reads, queued edit, guard and fresh inverse read over an archived firmware simulator bridge. The current stock source answers identity and returns zero bytes to DNR2 HELLO, so its versioned parameter catalog path is still missing. The separate stock-host TouchOSC fixture exercises the actual layout scripts for musical notes and feedback. |

The complete owner control index maps 996 drawing entries to 93 shared observations. Remaining producer gaps include actual per-part position and arbitrary native locks (M023, M026, M027, M030), per-part peak and independent mute/solo (M043–M045, M082), gain reduction and Tape activity (M049, M052, M056), pattern operations and cue at wrap (M059), BREAK free motion (M069), stock project backup/read and MIDI export (M072–M076), and stock catalog admission (M006, M078). M057’s independent Delay type action was added in `2783027` after the indexed historical capture. Some of the 996 entries are gestures the owner explicitly changed in writing. They are not missing firmware bindings. [Owner control crosswalk](../../remote-owner-pages-20261121/owner-control-crosswalk/README.md) · [Glyph provenance audit](../../remote-qualification-20261120/r22-glyph-qualification.json) · [Stock and simulator receipt](../engine-protocol/README.md)

## Registered Workspace set at 995d549

The unfiltered Local gate supplied eight desktop Remote PNGs before its installer package DNS lookup failed. The exact-source visual retry supplied the remaining 24 after the 651,730-byte shipping Pro package was recovered and matched the committed digest. The retry completed all 116 captures and five sequence/header checks with zero page or header errors. The gate reported all 116 captures as NOBASE. The retained set uses the original eight desktop images plus 24 retry images. Six repeated desktop PNGs were byte-identical. In the other two, 78 pixels changed by at most two RGB channel units and zero exceeded the pixel tolerance. [Registered captures and repeat verification](995d549-registered-references.json) · [Source, freeze, fonts and input identities](995d549-reference-capture-inputs.json)

All 32 Integration proposal reference files from `938c6aa6` verified against their native dimensions and recorded byte hashes. Against these unapproved proposals, the current product is within 2% for four of eight 1440×900 states, six of eight 1024×640 states, zero of eight 844×390 states and six of eight 390×844 states. The largest change, 11.01% on landscape Patterns, includes the new selected-part grid and adjacent action panel. The compact landscape roll and thinner lane also differ from the historical pictures. These numerical comparisons describe source changes. They do not supply approved baseline comparisons. [Per-state proposal measurements](995d549-proposal-pixels.json)

Both full-size archives were uploaded to LoopyX0X37 Project Sources. The authenticated Sources listing showed both completed rows and zero pending upload progress bars. See [upload receipt](../project-sources-upload.json).

| Archive | SHA-256 |
|---|---|
| `lane-remote-resume-0130-995d5493386f-owner-pdf-pairs.tar.gz` | `52c891e8ba34ff6cf3b5cef170fb8b6e6653be415133bae1e6b9d67700c62fa6` |
| `lane-remote-resume-0130-995d5493386f-registered-32.tar.gz` | `bc4c88ceb88555e71451f13d1e7add1a621a100a24d512993be560be75d88dca` |

## Drum voice selection update

The selected Sound voice now uses the kit color. The other ten rail labels and drawings use pale foreground ink. This matches the selected-orange/pale split visible on page 15 and the first six rows on page 2. Several later marks on page 2 are dark, while the product uses the same readable inactive ink for all eleven voices. The product retains the original shared R22 vector bytes.

An independent sandboxed Chromium run exercised both kits at 1440×900 and 844×390. Changing the selected Sound voice from Bass drum to Snare moved the current marker and changed exactly two rail colors. All 176 step identities, their states and the eleven SVG drawings remained intact. The Draft changed only its voice context. A real step 16 edit survived the selection change, and Undo and Redo restored the exact note states while keeping Snare selected. [Browser and pixel measurements](voice-selection-comparison.json)

Whole-page difference from the drawings changes from 17.0362% to 17.0351% on page 2 and from 25.4855% to 25.4782% on page 15. All 1,057 and 460 tolerant before/after pixels respectively lie in the voice rail columns. The original 17:00 attachment bytes and whole-page approval remain open.

## Reproduction

From the repository root, render the PDF at 72 DPI with Poppler, build the real product, and run the independent capture probes. Set `DNBOX_EMULATOR_RUNTIME` and `DNBOX_FWUI_RUNTIME` to their qualified local pin directories when building with native runtime support. Use the branch commit that supplied the built sources for `HEAD_SHA`.

```sh
mkdir -p "$OUT"/pdf
pdftoppm -f 1 -l 24 -r 72 -png docs/design/OWNER-BASELINE-1836.pdf "$OUT"/pdf/owner
node scripts/build-product-site.mjs --output "$OUT"/site
python3 evidence/remote-owner-pages-20261121/owner-control-crosswalk/capture.py "$PWD" "$OUT"/owner-actual --site "$OUT"/site
python3 evidence/remote-resume-0130/owner-review/browser.py "$OUT"/site "$OUT"/drums --head "$HEAD_SHA"
python3 evidence/remote-resume-0130/owner-review/references.py "$OUT"/site "$OUT"/registered --head "$HEAD_SHA"
python3 evidence/remote-resume-0130/owner-review/compare.py owner "$OUT"/pdf "$OUT"/owner-actual "$OUT"/owner-pairs
python3 evidence/remote-resume-0130/owner-review/compare.py proposal "$INTEGRATION_PROPOSAL" "$OUT"/registered "$OUT"/proposal-pairs
```

A pixel counts as distinct when any RGB channel differs by more than 25.5 units, following the registered comparator. Exact RGB counts are retained alongside that tolerant ratio. Native pair images have the reference on the left and the real product on the right, without scaling, color remapping, or UI changes. PNG differences against unaffiliated, historical or intentionally superseded content cannot give final owner approval.
