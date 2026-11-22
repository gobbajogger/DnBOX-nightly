# BREAK preview reveal at the portrait scroll boundary

The unchanged registered composition suite failed on `995d5493386fad889ca8106758567c9fe80a47d5` at 390×844. A focused replay visited each part’s Patterns, opened Song, then opened BREAK and revealed each of its five Play buttons with the same browser scroll and focus calls.

| 390×844 Preview Play, second row | Original | Candidate |
|---|---:|---:|
| Play button lower edge | 808.359375 px | 804.359375 px |
| Scroll-pane lower edge | 808 px | 808 px |
| Visible height of 44 px control | 43.640625 px | 44 px |
| Play buttons passing the unchanged 0.2 px bounds assertion | 4/5 | 5/5 |

Chromium rounded the auto-scroll position to 4 CSS pixels at the fractional layout boundary. The portrait BREAK scroller now reserves the existing 4 px R22 unit as block scroll padding. The same scroll and focus landed four pixels farther inside the pane. The inset affects scroll positioning and leaves normal layout dimensions alone. The 304-file before and after outputs had identical paths and differed only in the expected Remote stylesheet. Both checks had zero page errors, MIDI calls or document overflow. [Geometry and asset hashes](receipt.json)

The unchanged registered suite passed its full Draft journey at 1440×900 and 390×844 after the patch, including the real preview playback, termination, failure state and Generator edits. At 844×390 it reached a separate earlier drum-grid assertion on line 208 that requires 39.9×39.9 px per step. The existing owner-density landscape CSS sets 24 px steps. The one-line portrait inset has no effect at 844×390. The Draft failure prevented the subsequent native observer phase from running. [Unchanged registered-suite log](registered-composition.log.gz)

## Landscape bank and observer follow-up

The composition fixture now verifies the explicit 844×390 owner-density contract. It checks 24 px minimum compact steps and retains 40 px elsewhere. The existing page-15 bounds and center-hit measurement verifies all 96 starting pads. Trusted horizontal wheel events leave the three scroll panes and every measured step edge unchanged. Physical vertical wheel positions reach all 176 pads for each kit. The original 176 Tab checks, reverse-tab checks, first and last center hits and the 0.2 px clipping assertion still run.

After changing the density fixture, the real observer phase exposed the same rounding problem in a different scroll pane. With the native envelope visible, tabbing into the first drum Sound control reached bottom 390.453125 in the 390 px viewport with only 49.84375 of its 50.296875 px height visible. The active observer scroller was `#other-view`, with scroll position 33. Applying the 4 px block scroll inset to that active scroller qualified both landscape observer voices without changing their content or bounding assertions. Both inset rules are inactive in the eight default registered Remote states.

The final registered composition rerun passed Draft at 1440×900, 390×844 and 844×390. The real pinned WASM observer then passed both 909 BD/SD at all three sizes. [Complete registered result](composition-complete.txt) · [Original observer clipping trace](observer-landscape-red.log.gz) · [Inputs and contract measurements](receipt.json)
