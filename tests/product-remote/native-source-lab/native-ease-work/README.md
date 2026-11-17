# Isolated current-native presentation easing

Source b341 `ui_glyph_renderer.h`, not the older browser reference. The unbound JavaScript step retains float32 analytic integration, native omega, real elapsed interval, >=1000ms snap and native position/velocity thresholds. It does not modify committed controls or audio.

The C fixture extracts the actual ui_ease_tick function, presets one active slot and supplies elapsed milliseconds. Source/header bytes are captured/hash-checked and staged before compilation; binary hash is checked around execution.1,820 state/target/elapsed cases are bit-identical, including zero elapsed, slow frames and large unsigned elapsed values.

Not covered: actual16-slot cache ownership, family/descriptor matching, frame-eviction policy, real clock wrapping/initialization, browser RAF ownership or visible motion. The function consumes elapsed values; this does not establish a clock implementation. No app binding or full native/browser qualification.
