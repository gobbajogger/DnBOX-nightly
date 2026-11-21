# Firmware screen renderer coverage

The original screen walk left 20 of its 118 inventoried C functions unobserved. Supplemental native and browser fixtures exercise eight of those functions. Ten have no reachable caller in the pinned application. The stock page dispatcher excludes two more. All eight exercised functions have selectable framebuffer evidence among the 1,838 state IDs. This audit identifies no additional reachable screen from these 20 functions. [Original inventory][inventory] · [Upstream native execution and source audit][gaps]

The production revision is `61827a714ca7b240c01a55ed347b5fd7b847c7c2`, with evidence from `3e67b59c8e4dd3d5994680d857ec4e2ea755ab6d`. The stock UI and the optional Synth One INIT/Sound composition have identical `firmware/src/app/ui.c`, SHA-256 `b8f62007b7ad72b5c0f1a665777bd5e0a54adf14756e8d9efeb10a9508f09365`. The ordinary panel, calibration and guard checks include independent linked Elite and Pro target emulation. A route that requires injected fault data, malformed data or a boot condition remains labelled accordingly. [Native routes][routes] · [Stock replay record](fwui-stock.json) · [Web oracle][oracle]

## Supplemental render executions

| Function | Exercise and selectable state examples | Source |
| --- | --- | --- |
| `fm1_fault` | The full fault handler displays diagnostics and requests a timed reset. `boot-crash-diagnostics`, `guard-elite-first-fault` and `guard-pro-first-fault` cover the generic capture and both model-specific register displays. | [main_fm1.c:2229][fault] |
| `enter_uboot` | Both direct and USB update paths call the function and reach the modeled bootloader endpoint. `boot-uboot` and `boot-uboot-usb` are selectable. | [main_fm1.c:2252][uboot] |
| `safe_main` | Guarded startup, safe retry and recovery render `boot-safe-mode`, `safe-retry-without-crash` and the two models’ `guard-*-safe-play-retry` frames. | [main_fm1.c:2285][safe] |
| `fm1_main` | Accepted flash, startup ownership and held-update branches run the main loop. Frames include `startup-store-owned`, `startup-store-cleared` and `update-hold-0`. | [main_fm1.c:2349][main] |
| `fm1_cstart` | The startup fixture runs the full entry over isolated linker regions. The startup path yields `boot-default` and the two `boot-post-crash-core-*` frames. The early bootloader threshold exits before drawing. | [main_fm1.c:2588][cstart] |
| `panel_setup` | Calibration enters button and encoder prompts, handles timeouts and reaches `calibration-saved-clear`. Examples include `calibration-title` and `calibration-encoder-timeout-clear`. | [panel.c:82][panel] |
| `lcd_init` | The LCD command/data fixture records the full-frame initialization clear as `lcd-init-clear`. | [lcd.c:161][lcd] |
| `draw_wave_glyph` | The malformed Chicago sibling lock enters the fallback on a full oscillator page. `chicago-wave-invalid-lock` and its valid control are selectable. Removing the painter changes 43 pixels in the malformed case. | [ui.c:7099][wave] · [Painter elision comparison][wave-proof] |

## Static reachability in the pinned application

All ten helpers below lack a path from an application entry. Exact identifier searches include indirect references and distinguish local variables with the same name. All ten are absent as named functions from the final linked Elite and Pro ELFs. The call relationships provide the source-level evidence. [Original helper review][source-review] · [Final stock source update][gaps]

| Function | Reference chain in the pinned source | Source |
| --- | --- | --- |
| `ui_position_badge` | Only the static definition occurs. | [ui.c:5485][position] |
| `nav_arrow` | Only `header_pattern_cue` calls it. That helper has no caller. | [ui.c:5524][nav] · [Call site][cue-call] |
| `row_picture` | Only `matrix_row_hint` calls it. That helper has no caller. | [ui.c:5530][row] · [Call site][row-call] |
| `header_pattern_badge` | Only `header_pattern_cue` calls it. That helper has no caller. | [ui.c:5534][badge] · [Call site][cue-call] |
| `header_pattern_cue` | Only the static definition occurs. | [ui.c:5544][cue] |
| `matrix_row_hint` | Only the static definition occurs. | [ui.c:5937][matrix-row] |
| `matrix_next_hint` | Only the static definition occurs. | [ui.c:5947][matrix-next] |
| `lane` | The painter’s definition is its sole function occurrence. Other uses of the name in the UI translation unit are local values or fields. | [ui.c:6150][lane] |
| `cv_blit_from` | Only the static definition occurs. | [gfx.c:117][blit] |
| `strip_value_fit` | Only the static definition occurs at this revision. The earlier bass-matrix call was removed. | [ui.c:7322][strip] |

| Function | Exclusion by stock page dispatch | Source |
| --- | --- | --- |
| `dg_tail` | Its two calls inside `drum_strip_glyph` require `DG_DECAY` or `DG_NTAIL`. The only stock call into that function passes the constant `DG_LEVEL`. The tail has no named symbol in either linked target. | [Tail cases][tail] · [Stock call][drum-call] |
| `original_cell_value` | Its only call requires a 303 engine, bass engine, preset or status reference. Page construction emits those for bass `V_PART` pages, which return from `draw_knobs` before the call. The sequencer preset emits `R_BPATSND`. The optional Synth One cells use `R_S1PATCH`. | [Page construction][pages] · [Early return][early] · [Call predicate][cell-call] |

The final stock ELFs used for this audit are recorded in the [stock replay record](fwui-stock.json). Both have 542 bytes of linked code for `draw_wave_glyph`, 260 for `drum_strip_glyph`, 98 for `enter_uboot` and 6,784 for `fm1_cstart`, consistent with the exact-revision upstream symbol report. The static exclusions add zero measured captures. [Final stock source update][gaps]

[oracle]: ../../tests/firmware-reference/native-rgb.tsv
[inventory]: https://github.com/gobbajogger/DnBOX/blob/3e67b59c8e4dd3d5994680d857ec4e2ea755ab6d/docs/lanes/fwui/screens/stable-renderer-ids.tsv
[gaps]: https://github.com/gobbajogger/DnBOX/blob/3e67b59c8e4dd3d5994680d857ec4e2ea755ab6d/docs/lanes/fwui/current/native-gaps.json
[source-review]: https://github.com/gobbajogger/DnBOX/blob/3e67b59c8e4dd3d5994680d857ec4e2ea755ab6d/docs/lanes/fwui/current/renderer-gaps.json
[routes]: https://github.com/gobbajogger/DnBOX/blob/3e67b59c8e4dd3d5994680d857ec4e2ea755ab6d/docs/lanes/fwui/current/native-routes/README.md
[wave-proof]: https://github.com/gobbajogger/DnBOX/blob/3e67b59c8e4dd3d5994680d857ec4e2ea755ab6d/docs/lanes/fwui/current/native-routes/wave-frame.json
[fault]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/main_fm1.c#L2229
[uboot]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/main_fm1.c#L2252
[safe]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/main_fm1.c#L2285
[main]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/main_fm1.c#L2349
[cstart]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/main_fm1.c#L2588
[panel]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/panel.c#L82
[lcd]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/lcd.c#L161
[blit]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/gfx.c#L117
[wave]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/ui.c#L7099
[position]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/ui.c#L5485
[nav]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/ui.c#L5524
[cue-call]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/ui.c#L5550
[row]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/ui.c#L5530
[row-call]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/ui.c#L5942
[badge]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/ui.c#L5534
[cue]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/ui.c#L5544
[matrix-row]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/ui.c#L5937
[matrix-next]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/ui.c#L5947
[lane]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/ui.c#L6150
[strip]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/ui.c#L7322
[tail]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/ui.c#L8430
[drum-call]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/ui.c#L8752
[pages]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/ui.c#L1640
[early]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/ui.c#L8666
[cell-call]: https://github.com/gobbajogger/DnBOX/blob/61827a714ca7b240c01a55ed347b5fd7b847c7c2/firmware/src/app/ui.c#L8765
