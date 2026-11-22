# BREAK slice selector correctness

Base source: `3c5a9142b5013ffc6d5178825a0e4fc10692be4e`. Native firmware: `f1786ebec2616477163b62b029c7e77405a9c3de`; full ui.c SHA256 `8f9b86dcbe801297cd0a60427c0e942f0536b03a9c7a3f40c99bf9b51cc24629`.

The actual `BRKSLICE_P` descriptors name raw 0/1/2/3 as 4/8/16/32. Before this fix, raw1 retained its captured label8 but edits to raw0/2/3 displayed the index0/2/3. The app source-event regression reproduced expected4/actual0. Both row labels fell through to the LEVEL family; the separate native fixture test reproduced expectedBREAK SLICES/actualLEVEL. RED logs are retained.

`tools/probe-break-slice-glyph.py` compiles exact pinned descriptor, named-switch fallback, box and radius source fragments; only the final rbox drawing sink is intercepted to record native geometry/ink. It captures two banks × four positions. The Remote projects cx0/y33 to cx20/y5 in the existing40×24 cell: four filled6×9 rounded pips, gap2, radius2, exactly one primary and three guide. The fixture and replay compare byte-for-byte. This proves native geometry/selection/style, not pixel-identical rounded-corner antialiasing or a full firmware UI run.

The pure module scopes label/role behavior to kind11, targets0/1, voice0, parameter0, sourceBank-1 and each exact BREAK source ID. It changes neither raw0..3 Draft data nor native admission. Source-event tests exercise allfour positions on both A/B rows, inspect/edit/reopen, Undo/Redo, rawnumeric export and true Draft reimport with fresh history. Ten existing-plus-new app cases and three focused role/identity tests pass. These are actual app source events with DOM doubles, not browser/physical proof.

The rectangle payload requires the independently integrated shared SVG/canvas renderer (`rects` with x,y,w,h,radius, ink primary/guide). This isolated patch does not duplicate that renderer and does not claim its browser result. Default labels stay8; role rendering changes the four BREAK Sound default frames, to be refreshed once by the parent after final source integration. Other current reference views stay outside this selector change.

Reproduce:

```sh
python3 tools/probe-break-slice-glyph.py /path/to/f178 /tmp/break-slice-native.json
cmp /tmp/break-slice-native.json tests/product-remote/fixtures/break-slice-native-f178.json
node --test tests/product-remote/break-slice-glyph.test.mjs
node tests/product-workspace/app-sound-regression.mjs
```

No shared branch writes, commits, browser capture, firmware rebuild, device write or upload were performed by this patch author. Earlier workspace capture/archive paths became unreachable after the environment snapshot reset and are not represented as delivered artifacts.
