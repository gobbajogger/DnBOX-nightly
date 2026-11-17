# Source-native text projection (unbound)

This decoder uses the actual generated Barlow crop-LZ glyph data and native RGB565 blending/advance behavior, not a CSS font approximation. Font data remains SIL OFL 1.1 under the included Barlow-OFL.txt; source decoder is derived from GPL-3.0-only gfx.c.

The staged generator and three input font files regenerate the exact header SHA256 5d895596344a94798b95b86137805bdb685b2e0263f20d2824dea37dbf99e352. Source-tree receipt binds generator, fonts, license and gfx.c to firmware 2bfae5ef1fce4cb71c7002722c141613e04521de. All six current font roles are retained.

Run python3 build-reference.py, node parity.mjs and node --test font.test.mjs. The C reference is extracted from captured/hash-checked actual gfx.c and compiled with a staged header. 1,032 comparisons exercise valid glyph domains, native folding/fallback, strings, full/partial clipping and RGB565 pixels at fixed colors. Reference bytes are checked around replay. Unsupported characters in numeric-only FONT_L reject before drawing: its native question-mark fallback is outside that table, so undefined native reads are not emulated.

This is unbound supplementary source rendering, not an app replacement, current full-screen layout, live animation, browser qualification or lane PASS. It contains licensed font source data, not denied runtime glyph captures. No compiled reference executable is published.
