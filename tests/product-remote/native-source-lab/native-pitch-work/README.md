# Source-native dependent kick geometry

Unbound b341 Depth/Pitch geometry. Tune/Depth/Pitch numeric SI values come from the exact reviewed actual engine fixture, not display strings or generic percent/frequency mappings. The native frequency formula, clamps,16ms hold and both glyph branches are retained. Pitch is evaluated before Tune fallback, and Depth0 correctly makes Pitch constant; Depth127 exposes its actual dependency.

29,954 native math cases and9,216 geometry cases/534,528 float32 coordinates pass against captured/staged native C references. Geometry covers every selected raw value and a sampled3×3 dependency grid at four native scales, not every possible combination. C reference substitutes explicit numeric SI values; it is not a full current engine/runtime integration. No app binding, native transport, raster, browser or live-motion qualification.

Run node parity.mjs, python build-geometry.py, then node geometry-parity.mjs. Original source and numeric output hashes are checked before use; compilation consumes only staged captured source/header bytes, verified around compilation. Geometry binary hash is checked around execution. Local executables are not for publication.
