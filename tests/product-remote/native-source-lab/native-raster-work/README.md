# Isolated native rounded-AA raster

Source-only port of current b341 `ui_glyph_renderer.h` stroke and `ui.c` px_blend. This is not the legacy Remote Wu-AA renderer. Full64×48, zero-origin, full clipping-band, idle-color contexts only. No browser canvas, panel layout, dynamic color, easing or device qualification.

`build-reference.py` captures/hash-checks the three original source files, extracts the exact functions, stages source/header bytes, compiles only the staged reference with contraction disabled and verifies source bytes afterward. Its local executable is hash-checked around parity execution. No executable is for publication.

`parity.mjs` supplies float32 native Tune/Attack geometry across raw0..127/four source scales, plus clipping and zero-length edge cases. It compares every RGB565 byte for1,028 cases, not a weak checksum. Native pixels remain transient child-process buffers and are never saved to an archive or uploaded. This does not retry the denied glyph-buffer publication.

Run `python build-reference.py && node parity.mjs` from this directory. Current relative inputs are the pinned local source fixtures; package closure is not yet a standalone public test.
