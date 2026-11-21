# Page 8 · Delay type

The owner drawing labels the selector **Delay type** and shows **Tape** beside the five pairs of sends. The separate Reverb and Delay panels each have four knobs. M057 identifies the selector. [Owner PDF, page 8](../../../docs/design/OWNER-BASELINE-1836.pdf) · [Captured control inventory](../owner-control-crosswalk/controls.tsv)

| Draft value | Mode |
| --- | --- |
| 0 | DIGI |
| 1 | TAPE |

DnBOX `246ea3718c6c72ba80bbd1aafcd5356f871c78c8` identifies the independent scalar as `T_FX/0/FX_DL_TYPE`, parameter 13. Its descriptor resets to 0. The factory sound in `engine_sound_defaults` sets this parameter to 1, which supplies the starting value of the example Draft. The original sends page reads that same scalar. The one-knob firmware Tape macro changes both type and Wear. The Draft selector changes only type. [FX descriptor and setter](https://github.com/gobbajogger/DnBOX/blob/246ea3718c6c72ba80bbd1aafcd5356f871c78c8/firmware/src/dsp/fxbus.c#L48) · [Factory sound](https://github.com/gobbajogger/DnBOX/blob/246ea3718c6c72ba80bbd1aafcd5356f871c78c8/firmware/src/app/engine.c#L820) · [Original sends page](https://github.com/gobbajogger/DnBOX/blob/246ea3718c6c72ba80bbd1aafcd5356f871c78c8/firmware/src/app/ui.c#L6199) · [Original macro](https://github.com/gobbajogger/DnBOX/blob/246ea3718c6c72ba80bbd1aafcd5356f871c78c8/firmware/src/app/ui.c#L882)

The product catalog from `ffd31a735acc5721d1f90a30fc1ceb283aad6fc5` lists ID 1550 as the stored unsigned integer target `DlType`, range 0–1. The Draft view uses the existing digital waveform or tape-reel drawing for the selected value. The native Mix map admits 29 controls and has no entry for this parameter. [Product catalog](../../../web/product-site/remote/catalog.json) · [Native Mix mapping](../../../web/product-site/remote/runtime-mix-map.mjs)

The C probe calls the original descriptor and setter with Wear held at 37. It records the stored pot, DSP type and independent Wear for TAPE → DIGI → TAPE. To reproduce, generate the host tables in the pinned DnBOX checkout using its regular host build, then run these commands from this directory with `FW` set to that absolute checkout path. [Probe](probe.c) · [Observed output](provider.txt)

```sh
cc -std=c11 -Os -ffunction-sections -fdata-sections \
  -I "$FW/firmware/src/dsp" -I "$FW/build/gen" probe.c \
  "$FW/firmware/src/dsp/fxbus.c" "$FW/firmware/src/dsp/drum909.c" \
  "$FW/firmware/src/dsp/x0x_param.c" -Wl,--gc-sections -lm -o /tmp/dnbox-delay-type
/tmp/dnbox-delay-type
```
