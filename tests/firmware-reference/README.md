# Firmware screen reference

The HTML reference at `reference/screens/` runs the keyboard’s C display code in WebAssembly. The selector labels how each fixture reaches its state. The historical four-screen page remains at `reference/current-ui.html`. The interactive audio instrument has its own runtime and button controls.

| Source and selection | Named states |
| --- | ---: |
| FWUI primary screen archive at firmware `61827a714ca7b240c01a55ed347b5fd7b847c7c2`, including 20 persisted edits | 1,712 |
| Additional normal startup, recovery, calibration and Chicago wave states | 22 |
| Model-specific guard frames using Elite and Pro guest register records | 10 |
| Synth One INIT per-part editor and frame ownership, with the optional Sound provider `80b7e1db59e5c3eceb2b3530e80c2cedf29c5b7f` | 94 |

The guard and Synth One tests use the FWUI evidence at `3e67b59c8e4dd3d5994680d857ec4e2ea755ab6d`. The Synth One build composes the FWUI changes relative to `76040daa5b52d686a8b7b544296ba5d79610a95d` onto the named Sound provider. The remaining reference modules use the FWUI shipping source directly.

The independent native RGB hashes are in `native-rgb.tsv`. A fresh GCC walk of the 1,712 primary states matched all corresponding published, decoded archive PNGs. The later fixtures retain separate model provenance and duplicate observations. The two standalone stock images use a different expansion for PNG colors. Their original panel words match `boot-custom-text` and `view-08-part-00-voice-00-page-00`. The [stock replay record](../../evidence/web-routes/fwui-stock.json) contains the target, emulator and framebuffer identities for both models.

## Rebuild the browser modules

Supply a local DnBOX Git repository containing the three named commits, their common base, and the original synth inputs that pass `tools/check_original_inputs.py`. The build uses Zig 0.14.1, a native C compiler, Python with Pillow, Git, and the firmware’s normal host asset generators. It runs the reference producers in a temporary directory and writes the seven hash-verified browser modules to an empty external directory.

```sh
python3 tests/firmware-reference/build-reference.py "$DNBOX_FIRMWARE_REPO" "$DNBOX_FWUI_RUNTIME" "$ZIG"
```

With both `DNBOX_FWUI_RUNTIME` and `DNBOX_EMULATOR_RUNTIME` set, the Web build installs the qualified display and audio modules. A source-only build keeps the historical screen page available. A build requesting the native runtime requires all seven pinned screen modules. Neither the firmware source checkout nor the private input headers are copied to the website.

```sh
python3 tests/firmware-reference-browser.py
```

The browser test checks all 1,838 selectable state IDs and 1,912 capture events. It compares the decoded canvas PNG with the native RGB hash. It separately uses the public group and state controls, captures the displayed LCD at three viewport sizes, checks rapid reselection, and restores the selected URL fragment after reload. The “Compare with native frame” button hashes the displayed canvas and checks the selected state against the same staged native hashes. Browser tests exercise a match, an intentionally incorrect hash and a selection change during comparison.
